// server/index.ts
// Backwards-compatible index that starts a local server. For serverless environments
// (Vercel) use the `api/index.ts` wrapper which imports `createApp` instead.
import { createApp } from "./app";

(async () => {
  const app = await createApp();
  const port = parseInt(process.env.PORT || '5000', 10);
  app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));
})();
