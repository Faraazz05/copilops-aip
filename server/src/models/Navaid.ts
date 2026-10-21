/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import mongoose, { Schema, Document } from "mongoose";

export interface INavaid extends Document {
  key: string;
  identifier: string;
  name: string;
  type: string;
  frequency?: number | null;
  frequency_unit?: string | null;
  hours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  aerodrome?: string | null;
  ils_system?: string | null;
  ils_category?: string | null;
  remarks?: string | null;
  section?: string | null;
}

const NavaidSchema = new Schema<INavaid>({
  key: { type: String, required: true, unique: true, index: true },
  identifier: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true, index: true },
  frequency: { type: Number, default: null },
  frequency_unit: { type: String, default: "MHZ" },
  hours: { type: String, default: "H24" },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  aerodrome: { type: String, default: null, index: true },
  ils_system: { type: String, default: null },
  ils_category: { type: String, default: null },
  remarks: { type: String, default: null },
  section: { type: String, default: "ENR 4.1" },
}, { timestamps: true });

export const Navaid = mongoose.model<INavaid>("Navaid", NavaidSchema);
