/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { airportsRouter } from "./routes/airports";
import { runwaysRouter } from "./routes/runways";
import { routesRouter } from "./routes/routes";
import { navaidsRouter } from "./routes/navaids";
import { waypointsRouter } from "./routes/waypoints";
import { changesRouter } from "./routes/changes";
import { issuesRouter } from "./routes/issues";
import { isMongoConnected, getLocalData } from "./db";

export const app = express();

app.use(cors());
app.use(express.json());

// API health & metadata
app.get("/api/health", (req: Request, res: Response) => {
  const data = getLocalData();
  res.json({
    status: "healthy",
    mongo_connected: isMongoConnected,
    edition: data?.metadata?.edition || "2026-10-01",
    counts: data?.metadata?.stats || {},
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes
app.use("/api/airports", airportsRouter);
app.use("/api/runways", runwaysRouter);
app.use("/api/routes", routesRouter);
app.use("/api/navaids", navaidsRouter);
app.use("/api/waypoints", waypointsRouter);
app.use("/api/changes", changesRouter);
app.use("/api/issues", issuesRouter);

// Serve frontend static build if present (for single-container deployment)
const clientBuild = path.join(__dirname, "../../client/dist");
app.use(express.static(clientBuild));
app.get("*", (req: Request, res: Response, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientBuild, "index.html"), (err) => {
    if (err) next();
  });
});
