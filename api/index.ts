// api/index.ts
import express from "express";
import cors from "cors";
import router from "../server/routes"; // optional if you have routes

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
