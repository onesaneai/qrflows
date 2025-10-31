import {
  type User,
  type InsertUser,
  type QRCode,
  type InsertQRCode,
  type Visit,
  type InsertVisit,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { database } from "./firebase-admin";

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
