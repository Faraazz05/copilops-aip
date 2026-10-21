/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import mongoose, { Schema, Document } from "mongoose";

export interface IWaypoint extends Document {
  identifier: string;
  latitude: number;
  longitude: number;
  routes_enr_3_2?: string | null;
  routes_other?: string | null;
  raw_text?: string | null;
  section?: string | null;
}

const WaypointSchema = new Schema<IWaypoint>({
  identifier: { type: String, required: true, unique: true, index: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  routes_enr_3_2: { type: String, default: null },
  routes_other: { type: String, default: null },
  raw_text: { type: String, default: "" },
  section: { type: String, default: "ENR 4.4" },
}, { timestamps: true });

export const Waypoint = mongoose.model<IWaypoint>("Waypoint", WaypointSchema);
