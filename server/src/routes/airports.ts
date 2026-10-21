import { Router, Request, Response } from "express";
import { Airport } from "../models/Airport";
import { isMongoConnected, getLocalData } from "../db";

export const airportsRouter = Router();

// GET /api/airports
airportsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { target, q } = req.query;

    if (isMongoConnected) {
      const filter: any = {};
      if (target === "true") filter.is_target = true;
      if (q) {
        filter.$or = [
          { icao: new RegExp(String(q), "i") },
          { name: new RegExp(String(q), "i") },
        ];
      }
      const airports = await Airport.find(filter).sort({ is_target: -1, icao: 1 });
      return res.json({ count: airports.length, data: airports });
    }

    // Fallback: local JSON provider
    let list = getLocalData().airports || [];
    if (target === "true") list = list.filter((a: any) => a.is_target);
    if (q) {
      const search = String(q).toLowerCase();
      list = list.filter((a: any) => a.icao.toLowerCase().includes(search) || a.name.toLowerCase().includes(search));
    }
    res.json({ count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/airports/:icao
airportsRouter.get("/:icao", async (req: Request, res: Response) => {
  try {
    const icao = req.params.icao.toUpperCase();

    if (isMongoConnected) {
      const airport = await Airport.findOne({ icao });
      if (!airport) return res.status(404).json({ error: `Airport ${icao} not found` });
      return res.json(airport);
    }

    const airport = (getLocalData().airports || []).find((a: any) => a.icao === icao);
    if (!airport) return res.status(404).json({ error: `Airport ${icao} not found` });
    res.json(airport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
