// server/app.ts
// Creates and configures the Express app but does NOT call `listen()`.
// This allows the app to be used both locally (with a short-lived listener)
// and inside serverless functions (where Vercel will call the handler per request).

import dotenv from "dotenv";
import path from "path";

// Prefer the server/.env file when running locally.
dotenv.config({ path: path.join(process.cwd(), "server", ".env") });

import express from "express";
import registerRoutes from "./routes.js";  // Add .js extension for ESM

// Extend IncomingMessage so middleware that sets rawBody compiles
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export async function createApp() {
  function log(message: string) {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    console.log(`${formattedTime} [express] ${message}`);
  }

  const app = express();

  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).json = function (...args: any[]) {
      capturedJsonResponse = args[0];
      return (originalResJson as any).apply(res, args);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  // Register app routes (this is async because some storages may initialize)
  await registerRoutes(app);

  // Error handler (does not throw after responding when used in serverless)
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    try {
      res.status(status).json({ message });
    } catch (e) {
      // If response already finished, just log.
      console.error('Failed to send error response:', e);
    }

    // Log error for observability (but do not rethrow in serverless handler)
    console.error(err);
  });

  return app;
}
