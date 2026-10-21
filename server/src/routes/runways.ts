import { Router, Request, Response } from "express";
import { Runway } from "../models/Runway";
import { isMongoConnected, getLocalData } from "../db";

export const runwaysRouter = Router();

// GET /api/runways
runwaysRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { icao } = req.query;

    if (isMongoConnected) {
      const filter = icao ? { icao: String(icao).toUpperCase() } : {};
      const runways = await Runway.find(filter).sort({ icao: 1, designator: 1 });
      return res.json({ count: runways.length, data: runways });
    }

    let list = getLocalData().runways || [];
    if (icao) list = list.filter((r: any) => r.icao === String(icao).toUpperCase());
    res.json({ count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
