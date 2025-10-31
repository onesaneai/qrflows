import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQRCodeSchema, insertVisitSchema } from "@shared/schema";
import { UAParser } from "ua-parser-js";
import { authenticateUser } from "./middleware/auth";
import cors from 'cors';


export async function registerRoutes(app: Express) {
  // ✅ Allow requests from your frontend
  app.use(cors({
    origin: 'http://localhost:5173',  // your React app’s address
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));

  // QR Code routes (protected)
  app.post("/api/qr-codes", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;
      const data = insertQRCodeSchema.parse({ ...req.body, userId });
      const qrCode = await storage.createQRCode(data);
      res.json(qrCode);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/qr-codes", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;
      const qrCodes = await storage.getQRCodesByUserId(userId);
      res.json(qrCodes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/qr-codes/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;
      const qrCode = await storage.getQRCodeById(req.params.id);

      if (!qrCode) {
        return res.status(404).json({ error: "QR code not found" });
      }

      if (qrCode.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You don't own this QR code" });
      }

      res.json(qrCode);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/qr-codes/:id/analytics", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;
      const qrCode = await storage.getQRCodeById(req.params.id);

      if (!qrCode) {
        return res.status(404).json({ error: "QR code not found" });
      }

      if (qrCode.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You don't own this QR code" });
      }

      const visits = await storage.getVisitsByQRCodeId(req.params.id);

      // Calculate analytics
      const totalScans = visits.length;
      const uniqueIPs = new Set(visits.map(v => v.ip).filter(Boolean)).size;

      // Group by date
      const visitsByDate = visits.reduce((acc: Record<string, number>, visit) => {
        const date = visit.timestamp;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Group by country
      const visitsByCountry = visits.reduce((acc: Record<string, number>, visit) => {
        if (visit.country) {
          acc[visit.country] = (acc[visit.country] || 0) + 1;
        }
        return acc;
      }, {});

      // Group by device
      const visitsByDevice = visits.reduce((acc: Record<string, number>, visit) => {
        const device = visit.device || 'Unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});

      res.json({
        qrCode,
        totalScans,
        uniqueVisitors: uniqueIPs,
        visitsByDate,
        visitsByCountry,
        visitsByDevice,
        recentVisits: visits.slice(0, 10),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Redirect route with tracking (public - no auth required)
  app.get("/r/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const qrCode = await storage.getQRCodeBySlug(slug);

      if (!qrCode) {
        return res.status(404).send("QR code not found");
      }



      // Get visitor IP
      let ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';

      // Parse User-Agent for device info
      const parser = new UAParser(req.headers['user-agent']);
      const deviceType = parser.getDevice().type || 'desktop';
      const device = deviceType === 'mobile' ? 'Mobile' : 'Desktop';
      console.log("Device type is : ", device)
      // Fetch geolocation data from ipapi.co
      let city = null;
      let country = null;
      let countryCode = null;

      try {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          city = geoData.city;
          country = geoData.country_name;
          countryCode = geoData.country_code;
        }
        else {
          console.error('Failed to fetch geolocation data:', geoResponse.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch geolocation:', error);
      }

      // Log the visit
      await storage.createVisit({
        qrCodeId: qrCode.id,
        ip,
        city,
        country,
        countryCode,
        device,
      });

      // Redirect to target URL
      res.redirect(qrCode.targetUrl);
    } catch (error: any) {
      console.error('Redirect error:', error);
      res.status(500).send("Error processing redirect");
    }
  });
  

  return app;
}
