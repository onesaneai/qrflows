// api/index.ts// api/index.ts

import { createApp } from '../server/app.js';import { createApp } from '../server/app.js';



let cachedApp: any = null;let cachedApp: any = null;



// Keep the handler untyped to avoid @vercel/node type dependency in the build.// Keep the handler untyped to avoid @vercel/node type dependency in the build.

export default async function handler(req: any, res: any) {export default async function handler(req: any, res: any) {

  try {  try {

    console.log('Handler called:', req.method, req.url);    console.log('Handler called:', req.method, req.url);

        

    if (!process.env.PROJECT_ID) {    if (!process.env.PROJECT_ID) {

      console.error('Missing required env vars. Make sure Firebase config is set in Vercel.');      console.error('Missing required env vars. Make sure Firebase config is set in Vercel.');

      return res.status(500).json({       return res.status(500).json({ 

        error: 'Server configuration incomplete. Contact administrator.'         error: 'Server configuration incomplete. Contact administrator.' 

      });      });

    }    }



    if (!cachedApp) {    if (!cachedApp) {

      console.log('Creating Express app instance...');      console.log('Creating Express app instance...');

      try {      try {

        cachedApp = await createApp();        cachedApp = await createApp();

        console.log('Express app created successfully');        console.log('Express app created successfully');

      } catch (e) {      } catch (e) {

        console.error('Failed to create Express app:', e);        console.error('Failed to create Express app:', e);

        throw e;        throw e;

      }      }

    }    }



    // Express apps are callable (req, res) => void    // Express apps are callable (req, res) => void

    return cachedApp(req, res);    return cachedApp(req, res);

  } catch (error) {  } catch (error) {

    console.error('Serverless function error:', error);    console.error('Serverless function error:', error);

    return res.status(500).json({     return res.status(500).json({ 

      error: 'Internal server error',      error: 'Internal server error',

      details: process.env.NODE_ENV === 'development' ? String(error) : undefined      details: process.env.NODE_ENV === 'development' ? String(error) : undefined

    });    });

  }  }

}}

const app = express();
app.use(cors());
app.use(express.json());

// Example route
app.get("/", (req, res) => {
  res.send("✅ Express + Vercel is working!");
});

// Example nested route
app.get("/hello", (req, res) => {
  res.json({ message: "Hello from Express!" });
});

// If you have external routes:
app.use("/api", router);

// DO NOT call app.listen() here — Vercel does that automatically
export default app;
