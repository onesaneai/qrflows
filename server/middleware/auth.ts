import { Request, Response, NextFunction } from "express";
import { auth } from "../firebase-admin";

// Extend Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
    }
  }
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];
    
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    
    next();
  } catch (error: any) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}
