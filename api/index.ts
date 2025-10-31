// Vercel Serverless function wrapper for the Express app.
// Vercel will call this default export for each request.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app';

let cachedApp: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  // Express apps are callable (req, res) => void
  return cachedApp(req, res);
}
