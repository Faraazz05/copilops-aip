import { Router, Request, Response } from "express";
import { Route } from "../models/Route";
import { isMongoConnected, getLocalData } from "../db";

export const routesRouter = Router();

// GET /api/routes
routesRouter.get("/", async (req: Request, res: Response) => {
  try {
    if (isMongoConnected) {
      const routes = await Route.find().sort({ designator: 1 });
      return res.json({ count: routes.length, data: routes });
    }

    const list = getLocalData().routes || [];
    res.json({ count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/routes/:designator
routesRouter.get("/:designator", async (req: Request, res: Response) => {
  try {
    const desig = req.params.designator.toUpperCase();

    if (isMongoConnected) {
      const route = await Route.findOne({ designator: desig });
      if (!route) return res.status(404).json({ error: `Route ${desig} not found` });
      return res.json(route);
    }

    const route = (getLocalData().routes || []).find((r: any) => r.designator.toUpperCase() === desig);
    if (!route) return res.status(404).json({ error: `Route ${desig} not found` });
    res.json(route);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
