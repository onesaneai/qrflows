// Vercel Serverless function wrapper for the Express app.
// Vercel will call this default export for each request.
import { createApp } from '../server/app';

let cachedApp: any = null;

// Keep the handler untyped to avoid @vercel/node type dependency in the build.
export default async function handler(req: any, res: any) {
  try {
    console.log('Handler called:', req.method, req.url);
    
    if (!process.env.PROJECT_ID) {
      console.error('Missing required env vars. Make sure Firebase config is set in Vercel.');
      return res.status(500).json({ 
        error: 'Server configuration incomplete. Contact administrator.' 
      });
    }

    if (!cachedApp) {
      console.log('Creating Express app instance...');
      try {
        cachedApp = await createApp();
        console.log('Express app created successfully');
      } catch (e) {
        console.error('Failed to create Express app:', e);
        throw e;
      }
    }

    // Express apps are callable (req, res) => void
    return cachedApp(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}
