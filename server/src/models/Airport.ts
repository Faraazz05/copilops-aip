/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import mongoose, { Schema, Document } from "mongoose";

export interface IRunwaySubdoc {
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
  tora?: number | null;
  toda?: number | null;
  asda?: number | null;
  lda?: number | null;
  remarks?: string | null;
}

export interface IAirport extends Document {
  icao: string;
  name: string;
  operator: string;
  latitude?: number | null;
  longitude?: number | null;
  elevation?: number | null;
  magnetic_variation?: number | null;
  magnetic_variation_year?: number | null;
  geoid_undulation?: number | null;
  direction_from_city?: string | null;
  hours: {
    operator?: string | null;
    ats?: string | null;
    customs?: string | null;
    ais?: string | null;
  };
  rffs_category?: string | null;
  runways: IRunwaySubdoc[];
  navaids: any[];
  is_target: boolean;
}

const RunwaySubSchema = new Schema<IRunwaySubdoc>({
  key: { type: String, required: true },
  icao: { type: String, required: true },
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
  tora: { type: Number, default: null },
  toda: { type: Number, default: null },
  asda: { type: Number, default: null },
  lda: { type: Number, default: null },
  remarks: { type: String, default: null },
}, { _id: false });

const AirportSchema = new Schema<IAirport>({
  icao: { type: String, required: true, unique: true, uppercase: true, index: true },
  name: { type: String, required: true },
  operator: { type: String, default: "Unknown" },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  elevation: { type: Number, default: null },
  magnetic_variation: { type: Number, default: null },
  magnetic_variation_year: { type: Number, default: null },
  geoid_undulation: { type: Number, default: null },
  direction_from_city: { type: String, default: null },
  hours: {
    operator: { type: String, default: "H24" },
    ats: { type: String, default: "H24" },
    customs: { type: String, default: "H24" },
    ais: { type: String, default: "H24" },
  },
  rffs_category: { type: String, default: "CAT 10" },
  runways: [RunwaySubSchema],
  navaids: [{ type: Schema.Types.Mixed }],
  is_target: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export const Airport = mongoose.model<IAirport>("Airport", AirportSchema);
