import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertQRCodeSchema, insertVisitSchema } from "../shared/schema.js";
import { UAParser } from "ua-parser-js";
import { authenticateUser } from "./middleware/auth.js";
import cors from 'cors';


export default async function registerRoutes(app: Express) {
  // ✅ Allow requests from your frontend
  app.use(cors({
    origin: process.env.FRONTEND_URL,  // your React app’s address
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

  // Delete the QR code and its data
  app.delete("/api/qr-codes/:id/delete", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 1️⃣ Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "QR code ID is required.",
        });
      }

      // 2️⃣ Check if QR code exists
      const qrCode = await storage.getQRCodeById(id);
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found.",
        });
      }

      // 3️⃣ Authorization: ensure the QR code belongs to the user
      if (req.user?.uid !== qrCode.userId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this QR code.",
        });
      }

      // 4️⃣ Attempt to delete from storage
      const deletedQRCode = await storage.deleteQRCode(id);
      if (!deletedQRCode) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete QR code. Please try again later.",
        });
      }

      // 5️⃣ Send success response
      return res.status(200).json({
        success: true,
        message: "QR code deleted successfully.",
        data: {
          id: deletedQRCode.id,
          title: deletedQRCode.title,
          targetUrl: deletedQRCode.targetUrl,
        },
      });

    } catch (error: any) {
      console.error("Error deleting QR code:", error);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while deleting the QR code.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
  );

  app.put("/api/qr-codes/:id/update", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, targetUrl, color } = req.body;

      // 1. Basic validation
      if (!title || !targetUrl) {
        return res.status(400).json({
          success: false,
          message: "Both 'title' and 'targetUrl' are required.",
        });
      }

      // 2. Validate color format (optional)
      if (color && !/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
        return res.status(400).json({
          success: false,
          message: "Invalid color format. Use HEX (e.g., #3b82f6).",
        });
      }

      // 3. Fetch existing QR code
      const existingQRCode = await storage.getQRCodeById(id);
      if (!existingQRCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found.",
        });
      }

      // 4. Optional: Ensure logged-in user owns this QR code
      if (req.user?.uid !== existingQRCode.userId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this QR code.",
        });
      }

      // 5. Perform update
      const updatedQRCode = await storage.updateQRCode(id, title, targetUrl, color);
      if (!updatedQRCode) {
        return res.status(500).json({
          success: false,
          message: "Failed to update QR code. Please try again.",
        });
      }

      // 6. Return success
      return res.status(200).json({
        success: true,
        message: "QR code updated successfully.",
        data: updatedQRCode,
      });

    } catch (error: any) {
      console.error("Error in /api/qr-codes/:id/update:", error);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while updating the QR code.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
  );


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
      console.log("The IP address is : ", ip)
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
          // json() can return unknown under strict typings; cast to any for now
          const geoData: any = await geoResponse.json();
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
