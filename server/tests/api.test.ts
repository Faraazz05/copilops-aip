/**
 * CopilOPS Aeronautical Data Platform - Test Suite
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import request from "supertest";
import { app } from "../src/app";

describe("CopilOPS Aeronautical Data API Tests", () => {
  it("GET /api/health should return healthy status and edition", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.edition).toBe("2026-10-01");
  });

  it("GET /api/airports should return all aerodromes", async () => {
    const res = await request(app).get("/api/airports");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Verify EBBR, EBLG, EBCI are in the dataset
    const icaos = res.body.data.map((a: any) => a.icao);
    expect(icaos).toContain("EBBR");
    expect(icaos).toContain("EBLG");
    expect(icaos).toContain("EBCI");
  });

  it("GET /api/airports/EBBR should return detailed operational view", async () => {
    const res = await request(app).get("/api/airports/EBBR");
    expect(res.status).toBe(200);
    expect(res.body.icao).toBe("EBBR");
    expect(res.body.elevation).toBe(175);
    expect(res.body.magnetic_variation).toBe(2);
    expect(res.body.rffs_category).toContain("CAT 10");
    expect(Array.isArray(res.body.runways)).toBe(true);
    expect(res.body.runways.length).toBeGreaterThanOrEqual(6);

    // Check declared distances on RWY 25L
    const rwy25l = res.body.runways.find((r: any) => r.designator === "25L");
    expect(rwy25l).toBeDefined();
    expect(rwy25l.lda).toBe(3210);
    expect(rwy25l.tora).toBe(3210);
  });

  it("GET /api/routes should return ATS routes", async () => {
    const res = await request(app).get("/api/routes");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    const desigs = res.body.data.map((r: any) => r.designator);
    expect(desigs).toContain("L607");
  });

  it("GET /api/navaids should return navigation aids", async () => {
    const res = await request(app).get("/api/navaids");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  });

  it("GET /api/changes should return AIRAC diff records", async () => {
    const res = await request(app).get("/api/changes");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/issues should return AIP data anomalies", async () => {
    const res = await request(app).get("/api/issues");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/airspaces should return extracted airspaces with verified geometries", async () => {
    const res = await request(app).get("/api/airspaces");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.valid_count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Verify presence of verified special-use airspace
    const restricted = res.body.data.find((a: any) => a.designation === "EBR02");
    expect(restricted).toBeDefined();
    expect(restricted.geometry).toBeDefined();
    expect(restricted.geometry.type).toBe("Polygon");
  });
});
