import {
  type User,
  type InsertUser,
  type QRCode,
  type InsertQRCode,
  type Visit,
  type InsertVisit,
} from "../shared/schema.js";
import { randomUUID } from "crypto";
import { database } from "./firebase-admin.js";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // QR Code methods
  createQRCode(qrCode: InsertQRCode): Promise<QRCode>;
  getQRCodesByUserId(userId: string): Promise<QRCode[]>;
  getQRCodeById(id: string): Promise<QRCode | undefined>;
  getQRCodeBySlug(slug: string): Promise<QRCode | undefined>;

  // Visit methods
  createVisit(visit: InsertVisit): Promise<Visit>;
  getVisitsByQRCodeId(qrCodeId: string): Promise<Visit[]>;
}

export class FirebaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const snapshot = await database.ref(`users/${id}`).once('value');
    return snapshot.val() || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const snapshot = await database.ref('users')
      .orderByChild('username')
      .equalTo(username)
      .once('value');

    const users = snapshot.val();
    if (!users) return undefined;

    const userId = Object.keys(users)[0];
    return users[userId];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    await database.ref(`users/${id}`).set(user);
    return user;
  }

  // QR Code methods
  async createQRCode(insertQRCode: InsertQRCode): Promise<QRCode> {
    const id = randomUUID();
    const qrCode: QRCode = {
      ...insertQRCode,
      id,
      color: insertQRCode.color || "#3b82f6",
      createdAt: Date.now(),
    };
    await database.ref(`qrCodes/${id}`).set(qrCode);
    await database.ref(`userQRCodes/${qrCode.userId}/${id}`).set(true);
    await database.ref(`slugIndex/${qrCode.slug}`).set(id);
    return qrCode;
  }

  async getQRCodesByUserId(userId: string): Promise<QRCode[]> {
    const userQRCodesSnapshot = await database.ref(`userQRCodes/${userId}`).once('value');
    const qrCodeIds = userQRCodesSnapshot.val();

    if (!qrCodeIds) return [];

    const qrCodes: QRCode[] = [];
    for (const id of Object.keys(qrCodeIds)) {
      const snapshot = await database.ref(`qrCodes/${id}`).once('value');
      const qrCode = snapshot.val();
      if (qrCode) qrCodes.push(qrCode);
    }

    return qrCodes.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getQRCodeById(id: string): Promise<QRCode | undefined> {
    const snapshot = await database.ref(`qrCodes/${id}`).once('value');
    return snapshot.val() || undefined;
  }

  async getQRCodeBySlug(slug: string): Promise<QRCode | undefined> {
    const idSnapshot = await database.ref(`slugIndex/${slug}`).once('value');
    const id = idSnapshot.val();
    if (!id) return undefined;
    return this.getQRCodeById(id);
  }

  async deleteQRCode(id: string): Promise<QRCode | undefined> {
    try {
      const qrSnapshot = await database.ref(`qrCodes/${id}`).once('value');
      const qrCode: QRCode | null = qrSnapshot.val();
      if (!qrCode) return undefined;

      const updates: Record<string, null> = {};
      updates[`qrCodes/${id}`] = null;
      if (qrCode.slug) updates[`slugIndex/${qrCode.slug}`] = null;
      if (qrCode.userId) updates[`userQRCodes/${qrCode.userId}/${id}`] = null;

      const qrCodeVisitsSnapshot = await database.ref(`qrCodeVisits/${id}`).once('value');
      const visitIds = qrCodeVisitsSnapshot.val();
      if (visitIds) {
        for (const visitId of Object.keys(visitIds)) {
          updates[`visits/${visitId}`] = null;
        }
      }
      updates[`qrCodeVisits/${id}`] = null;

      await database.ref().update(updates);
      return qrCode;
    } catch {
      return undefined;
    }
  }

  async updateQRCode(
    id: string,
    title: string,
    targetUrl: string,
    color: string
  ): Promise<QRCode | undefined> {
    try {
      const qrSnapshot = await database.ref(`qrCodes/${id}`).once('value');
      const qrCode: QRCode | null = qrSnapshot.val();
      if (!qrCode) return undefined;

      // Prepare updated fields
      const updatedQRCode = {
        ...qrCode,
        title,
        targetUrl,
        color,
        updatedAt: Date.now(),
      };

      // Update only the qrCode record
      await database.ref(`qrCodes/${id}`).update({
        title,
        targetUrl,
        color,
        updatedAt: Date.now(),
      });

      return updatedQRCode;
    } catch (error) {
      console.error("Error updating QR code:", error);
      return undefined;
    }
  }


  // Visit methods
  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const id = randomUUID();
    const visit: Visit = {
      ...insertVisit,
      id,
      ip: insertVisit.ip ?? null,
      city: insertVisit.city ?? null,
      country: insertVisit.country ?? null,
      countryCode: insertVisit.countryCode ?? null,
      device: insertVisit.device ?? null,
      timestamp: Date.now(),
    };
    await database.ref(`visits/${id}`).set(visit);
    await database.ref(`qrCodeVisits/${visit.qrCodeId}/${id}`).set(true);
    return visit;
  }

  async getVisitsByQRCodeId(qrCodeId: string): Promise<Visit[]> {
    const qrCodeVisitsSnapshot = await database.ref(`qrCodeVisits/${qrCodeId}`).once('value');
    const visitIds = qrCodeVisitsSnapshot.val();

    if (!visitIds) return [];

    const visits: Visit[] = [];
    for (const id of Object.keys(visitIds)) {
      const snapshot = await database.ref(`visits/${id}`).once('value');
      const visit = snapshot.val();
      if (visit) visits.push(visit);
    }

    return visits.sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const storage = new FirebaseStorage();
