import { Router, Request, Response } from "express";
import { Change } from "../models/Change";
import { isMongoConnected, getLocalData } from "../db";

export const changesRouter = Router();

// GET /api/changes
changesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;

    if (isMongoConnected) {
      const filter: any = {};
      if (status) filter.status = String(status).toUpperCase();
      if (type) filter.entity_type = String(type).toLowerCase();
      const changes = await Change.find(filter).sort({ status: 1, entity_key: 1 });
      return res.json({ count: changes.length, data: changes });
    }

    let list = getLocalData().changes || [];
    if (status) list = list.filter((c: any) => c.status === String(status).toUpperCase());
    if (type) list = list.filter((c: any) => c.entity_type === String(type).toLowerCase());
    res.json({ count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
