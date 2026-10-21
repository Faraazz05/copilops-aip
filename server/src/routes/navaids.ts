import { Router, Request, Response } from "express";
import { Navaid } from "../models/Navaid";
import { isMongoConnected, getLocalData } from "../db";

export const navaidsRouter = Router();

// GET /api/navaids
navaidsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { type, aerodrome } = req.query;

    if (isMongoConnected) {
      const filter: any = {};
      if (type) filter.type = new RegExp(String(type), "i");
      if (aerodrome) filter.aerodrome = String(aerodrome).toUpperCase();
      const navaids = await Navaid.find(filter).sort({ identifier: 1 });
      return res.json({ count: navaids.length, data: navaids });
    }

    let list = getLocalData().navaids || [];
    if (type) list = list.filter((n: any) => n.type.toLowerCase().includes(String(type).toLowerCase()));
    if (aerodrome) list = list.filter((n: any) => n.aerodrome === String(aerodrome).toUpperCase());
    res.json({ count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
