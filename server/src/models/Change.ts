/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import mongoose, { Schema, Document } from "mongoose";

export interface IChange extends Document {
  from_edition: string;
  to_edition: string;
  status: "NEW" | "MODIFIED" | "DELETED" | "UNCHANGED";
  entity_type: string;
  entity_key: string;
  field: string;
  old_value?: string | null;
  new_value?: string | null;
  unit?: string | null;
  section?: string | null;
}

const ChangeSchema = new Schema<IChange>({
  from_edition: { type: String, required: true, index: true },
  to_edition: { type: String, required: true, index: true },
  status: { type: String, required: true, enum: ["NEW", "MODIFIED", "DELETED", "UNCHANGED"], index: true },
  entity_type: { type: String, required: true },
  entity_key: { type: String, required: true },
  field: { type: String, required: true },
  old_value: { type: String, default: null },
  new_value: { type: String, default: null },
  unit: { type: String, default: null },
  section: { type: String, default: null },
}, { timestamps: true });

export const Change = mongoose.model<IChange>("Change", ChangeSchema);
