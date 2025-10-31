// Vercel Serverless function wrapper for the Express app.
// Vercel will call this default export for each request.
import { createApp } from '../server/app';

let cachedApp: any = null;

// Keep the handler untyped to avoid @vercel/node type dependency in the build.
export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  // Express apps are callable (req, res) => void
  return cachedApp(req, res);
}
