import { IAirport, IRoute, INavaid, IWaypoint, IIssue, IChange, IAirspace } from "./types";

const API_BASE = "/api";

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) return await res.json();
  } catch {}
  return {
    status: "local",
    edition: "2026-10-01",
    counts: {
      airports_count: 33,
      runways_count: 96,
      routes_count: 51,
      navaids_count: 82,
      waypoints_count: 303,
      airspaces_count: 130,
      valid_airspaces_count: 63,
      issues_count: 137
    }
  };
}

export async function fetchAirports(targetOnly: boolean = false): Promise<IAirport[]> {
  try {
    const url = targetOnly ? `${API_BASE}/airports?target=true` : `${API_BASE}/airports`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch {}
  const fallback = await import("../../server/data/aeronautical_data.json");
  const list = fallback.airports as unknown as IAirport[];
  return targetOnly ? list.filter((a) => a.is_target) : list;
}

export async function fetchAirport(icao: string): Promise<IAirport | null> {
  try {
    const res = await fetch(`${API_BASE}/airports/${icao}`);
    if (res.ok) return await res.json();
  } catch {}
  const fallback = await import("../../server/data/aeronautical_data.json");
  const list = fallback.airports as unknown as IAirport[];
  return list.find((a) => a.icao === icao.toUpperCase()) || null;
}

export async function fetchRoutes(): Promise<IRoute[]> {
  try {
    const res = await fetch(`${API_BASE}/routes`);
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch {}
  const fallback = await import("../../server/data/aeronautical_data.json");
  return fallback.routes as unknown as IRoute[];
}

export async function fetchNavaids(): Promise<INavaid[]> {
  try {
    const res = await fetch(`${API_BASE}/navaids`);
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch {}
  const fallback = await import("../../server/data/aeronautical_data.json");
  return fallback.navaids as unknown as INavaid[];
}

export async function fetchWaypoints(limit: number = 500): Promise<IWaypoint[]> {
  try {
    const url = limit ? `${API_BASE}/waypoints?limit=${limit}` : `${API_BASE}/waypoints`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch {}
  const fallback = await import("../../server/data/aeronautical_data.json");
  return (fallback.waypoints as unknown as IWaypoint[]).slice(0, limit);
}

export async function fetchAirspaces(validOnly: boolean = false): Promise<IAirspace[]> {
  try {
    const url = validOnly ? `${API_BASE}/airspaces?valid_only=true` : `${API_BASE}/airspaces`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch {}
  const fallback = await import("../../server/data/aeronautical_data.json");
  const list = (fallback.airspaces || []) as unknown as IAirspace[];
  return validOnly ? list.filter((a) => a.geometry !== null) : list;
}

export async function fetchChanges(): Promise<IChange[]> {
  try {
    const res = await fetch(`${API_BASE}/changes`);
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch {}
  const fallback = await import("../../server/data/aeronautical_data.json");
  return fallback.changes as unknown as IChange[];
}

export async function fetchIssues(): Promise<IIssue[]> {
  try {
    const res = await fetch(`${API_BASE}/issues`);
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch {}
  const fallback = await import("../../server/data/aeronautical_data.json");
  return fallback.issues as unknown as IIssue[];
}
