import { z } from "zod";

// User types
export interface User {
  id: string;
  username: string;
  password: string;
}

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// QR Code types
export interface QRCode {
  id: string;
  userId: string;
  title: string;
  targetUrl: string;
  slug: string;
  color: string;
  createdAt: number;
}

export const insertQRCodeSchema = z.object({
  userId: z.string(),
  title: z.string().min(1, "Title is required"),
  targetUrl: z.string().url("Must be a valid URL"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").default("#3b82f6"),
});

export type InsertQRCode = z.infer<typeof insertQRCodeSchema>;

// Visit types
export interface Visit {
  id: string;
  qrCodeId: string;
  ip: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  device: string | null;
  timestamp: number;
}

export const insertVisitSchema = z.object({
  qrCodeId: z.string(),
  ip: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  device: z.string().optional(),
});

export type InsertVisit = z.infer<typeof insertVisitSchema>;
