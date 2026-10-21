import { Router, Request, Response } from "express";
import { Waypoint } from "../models/Waypoint";
import { isMongoConnected, getLocalData } from "../db";

export const waypointsRouter = Router();

// GET /api/waypoints
waypointsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const max = limit ? parseInt(String(limit), 10) : 500;

    if (isMongoConnected) {
      const waypoints = await Waypoint.find().limit(max).sort({ identifier: 1 });
      return res.json({ count: waypoints.length, data: waypoints });
    }

    const list = (getLocalData().waypoints || []).slice(0, max);
    res.json({ count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
