import { Router, Request, Response } from "express";
import { getLocalData } from "../db";

export const airspacesRouter = Router();

// GET /api/airspaces
airspacesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { type, valid_only } = req.query;
    let list = getLocalData().airspaces || [];

    if (type) {
      list = list.filter((a: any) => a.airspace_type === String(type).toUpperCase());
    }
    if (valid_only === "true") {
      list = list.filter((a: any) => a.geometry !== null);
    }

    res.json({
      count: list.length,
      valid_count: list.filter((a: any) => a.geometry !== null).length,
      data: list
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/airspaces/:id
airspacesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const list = getLocalData().airspaces || [];
    const item = list.find((a: any) => a.id === id || a.designation.toUpperCase() === id.toUpperCase());
    if (!item) {
      return res.status(404).json({ error: `Airspace feature '${id}' not found` });
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
