/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import mongoose, { Schema, Document } from "mongoose";

export interface IRunway extends Document {
  key: string;
  icao: string;
  designator: string;
  true_bearing?: number | null;
  length?: number | null;
  width?: number | null;
  surface?: string | null;
  strength?: string | null;
  thr_latitude?: number | null;
  thr_longitude?: number | null;
  thr_elevation?: number | null;
  tdz_elevation?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
  tora?: number | null;
  toda?: number | null;
  asda?: number | null;
  lda?: number | null;
  remarks?: string | null;
}

const RunwaySchema = new Schema<IRunway>({
  key: { type: String, required: true, unique: true, index: true },
  icao: { type: String, required: true, index: true },
  designator: { type: String, required: true },
  true_bearing: { type: Number, default: null },
  length: { type: Number, default: null },
  width: { type: Number, default: null },
  surface: { type: String, default: null },
  strength: { type: String, default: null },
  thr_latitude: { type: Number, default: null },
  thr_longitude: { type: Number, default: null },
  thr_elevation: { type: Number, default: null },
  tdz_elevation: { type: Number, default: null },
  end_latitude: { type: Number, default: null },
  end_longitude: { type: Number, default: null },
  tora: { type: Number, default: null },
  toda: { type: Number, default: null },
  asda: { type: Number, default: null },
  lda: { type: Number, default: null },
  remarks: { type: String, default: null },
}, { timestamps: true });

export const Runway = mongoose.model<IRunway>("Runway", RunwaySchema);
