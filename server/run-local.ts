// server/run-local.ts
// Small local runner that starts the express app on the configured PORT.
import { createApp } from "./app";

(async () => {
  const app = await createApp();
  const port = parseInt(process.env.PORT || "5000", 10);
  app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));
})();
