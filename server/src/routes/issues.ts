import { Router, Request, Response } from "express";
import { Issue } from "../models/Issue";
import { isMongoConnected, getLocalData } from "../db";

export const issuesRouter = Router();

// GET /api/issues
issuesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { severity, code } = req.query;

    if (isMongoConnected) {
      const filter: any = {};
      if (severity) filter.severity = String(severity).toUpperCase();
      if (code) filter.code = String(code).toUpperCase();
      const issues = await Issue.find(filter).sort({ severity: 1, code: 1 });
      return res.json({ count: issues.length, data: issues });
    }

    let list = getLocalData().issues || [];
    if (severity) list = list.filter((i: any) => i.severity === String(severity).toUpperCase());
    if (code) list = list.filter((i: any) => i.code === String(code).toUpperCase());
    res.json({ count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
