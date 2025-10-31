// api/index.ts
import { createApp } from '../server/app.js';

let cachedApp: any = null;

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

    return cachedApp(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}
