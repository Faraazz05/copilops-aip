/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { Airport } from "./models/Airport";
import { Runway } from "./models/Runway";
import { Navaid } from "./models/Navaid";
import { Waypoint } from "./models/Waypoint";
import { Route } from "./models/Route";
import { Issue } from "./models/Issue";
import { Change } from "./models/Change";

const DATA_FILE = path.join(__dirname, "../data/aeronautical_data.json");

export let isMongoConnected = false;
let localDataCache: any = null;

export function getLocalData() {
  if (!localDataCache) {
    if (fs.existsSync(DATA_FILE)) {
      localDataCache = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } else {
      localDataCache = { airports: [], runways: [], navaids: [], waypoints: [], routes: [], issues: [], changes: [] };
    }
  }
  return localDataCache;
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/copilops_aip";
  try {
    mongoose.set("strictQuery", false);
    // Timeout quickly if local mongo is not running
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    isMongoConnected = true;
    console.log(`[Database] Connected to MongoDB: ${mongoose.connection.host}`);
    await seedDatabaseIfEmpty();
  } catch (err: any) {
    isMongoConnected = false;
    console.warn(`[Database] MongoDB not reachable (${err.message}). Using extracted JSON data provider.`);
  }
}

export async function seedDatabaseIfEmpty(): Promise<void> {
  if (!isMongoConnected) return;

  const count = await Airport.countDocuments();
  if (count > 0) {
    console.log(`[Database] MongoDB already contains ${count} airports. Skipping seed.`);
    return;
  }

  const data = getLocalData();
  console.log(`[Database] Seeding MongoDB with extracted aeronautical dataset...`);

  if (data.airports?.length) await Airport.insertMany(data.airports);
  if (data.runways?.length) await Runway.insertMany(data.runways);
  if (data.navaids?.length) await Navaid.insertMany(data.navaids);
  if (data.waypoints?.length) await Waypoint.insertMany(data.waypoints);
  if (data.routes?.length) await Route.insertMany(data.routes);
  if (data.issues?.length) await Issue.insertMany(data.issues);
  if (data.changes?.length) await Change.insertMany(data.changes);

  console.log(`[Database] Seed complete: ${data.airports.length} airports, ${data.routes.length} routes, ${data.waypoints.length} waypoints.`);
}
