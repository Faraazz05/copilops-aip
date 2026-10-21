/**
 * CopilOPS Aeronautical Data Platform
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import mongoose, { Schema, Document } from "mongoose";

export interface IIssue extends Document {
  severity: "ERROR" | "WARN";
  code: string;
  entity_type: string;
  entity_key: string;
  section: string;
  message: string;
}

const IssueSchema = new Schema<IIssue>({
  severity: { type: String, required: true, enum: ["ERROR", "WARN"], index: true },
  code: { type: String, required: true, index: true },
  entity_type: { type: String, default: "-" },
  entity_key: { type: String, default: "-" },
  section: { type: String, default: "-" },
  message: { type: String, required: true },
}, { timestamps: true });

export const Issue = mongoose.model<IIssue>("Issue", IssueSchema);
