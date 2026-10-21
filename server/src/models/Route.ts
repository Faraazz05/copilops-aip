/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import mongoose, { Schema, Document } from "mongoose";

export interface IRouteSegment {
  key: string;
  from_point: string;
  to_point: string;
  distance?: number | null;
  coordinates: number[][];
}

export interface IRoute extends Document {
  designator: string;
  rnp_type: string;
  availability: string;
  waypoint_sequence: string;
  waypoint_count: number;
  segments: IRouteSegment[];
}

const RouteSegmentSchema = new Schema<IRouteSegment>({
  key: { type: String, required: true },
  from_point: { type: String, required: true },
  to_point: { type: String, required: true },
  distance: { type: Number, default: null },
  coordinates: { type: [[Number]], default: [] },
}, { _id: false });

const RouteSchema = new Schema<IRoute>({
  designator: { type: String, required: true, unique: true, index: true },
  rnp_type: { type: String, default: "RNAV 5" },
  availability: { type: String, default: "H24" },
  waypoint_sequence: { type: String, default: "" },
  waypoint_count: { type: Number, default: 0 },
  segments: [RouteSegmentSchema],
}, { timestamps: true });

export const Route = mongoose.model<IRoute>("Route", RouteSchema);
