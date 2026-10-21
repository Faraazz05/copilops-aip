/**
 * CopilOPS Aeronautical Data Platform - AIRAC Cycle Diff Viewer
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import React, { useState } from "react";
import { IChange } from "../types";
import { GitCompare, CheckCircle2, AlertTriangle, PlusCircle, MinusCircle, Filter } from "lucide-react";

interface AiracDiffViewerProps {
  changes: IChange[];
}

export const AiracDiffViewer: React.FC<AiracDiffViewerProps> = ({ changes }) => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filtered = changes.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && c.entity_type !== typeFilter) return false;
    return true;
  });

  const counts = {
    MODIFIED: changes.filter((c) => c.status === "MODIFIED").length,
    NEW: changes.filter((c) => c.status === "NEW").length,
    DELETED: changes.filter((c) => c.status === "DELETED").length,
    UNCHANGED: changes.filter((c) => c.status === "UNCHANGED").length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-cyan-400" />
            AIRAC 28-Day Cycle Change Detection
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Automated diff engine comparing AIRAC cycle <span className="font-mono text-cyan-300 font-semibold">2026-09-04</span> &rarr; <span className="font-mono text-emerald-400 font-semibold">2026-10-01</span>.
          </p>
        </div>

        {/* Status Counter Pills */}
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <div className="bg-amber-950/80 border border-amber-800 text-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{counts.MODIFIED} Modified</span>
          </div>
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{counts.NEW} New</span>
          </div>
          <div className="bg-red-950/80 border border-red-800 text-red-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <MinusCircle className="w-3.5 h-3.5" />
            <span>{counts.DELETED} Deleted</span>
          </div>
          <div className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{counts.UNCHANGED} Unchanged</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-400 uppercase">Filter by Status:</span>
          {["ALL", "MODIFIED", "NEW", "DELETED", "UNCHANGED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded font-mono ${
                statusFilter === s ? "bg-cyan-500 text-white font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-400 uppercase">Entity Type:</span>
          {["ALL", "runway", "aerodrome", "route", "waypoint"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded font-mono ${
                typeFilter === t ? "bg-cyan-500 text-white font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Changes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 font-mono">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Entity Key</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3 text-slate-400">Previous Cycle (2026-09-04)</th>
                <th className="px-4 py-3 text-emerald-400">Active Cycle (2026-10-01)</th>
                <th className="px-4 py-3">AIP Section</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filtered.map((ch, idx) => {
                let badge = null;
                if (ch.status === "MODIFIED") {
                  badge = <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold">MODIFIED</span>;
                } else if (ch.status === "NEW") {
                  badge = <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">NEW</span>;
                } else if (ch.status === "DELETED") {
                  badge = <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold">DELETED</span>;
                } else {
                  badge = <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">UNCHANGED</span>;
                }

                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">{badge}</td>
                    <td className="px-4 py-3 uppercase text-slate-400">{ch.entity_type}</td>
                    <td className="px-4 py-3 font-bold text-white">{ch.entity_key}</td>
                    <td className="px-4 py-3 text-cyan-300">{ch.field}</td>
                    <td className="px-4 py-3 text-slate-400 line-through">
                      {ch.old_value !== null ? `${ch.old_value} ${ch.unit || ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-400">
                      {ch.new_value !== null ? `${ch.new_value} ${ch.unit || ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-400 text-[11px]">{ch.section || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
