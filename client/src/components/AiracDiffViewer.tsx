/**
 * CopilOPS Aeronautical Data Platform - AIRAC Cycle Diff Viewer
 * Author: Mohd Faraz (https://faraazz05.github.io)
 *
 * Implements:
 * - Evidence-based AIRAC effective dates: canonical 2026-09-03 -> 2026-10-01 (28-day cycle interval)
 * - Transparent status notes distinguishing verified cycle diffs from demonstration baseline records
 * - Filtering by status (NEW, MODIFIED, DELETED, UNCHANGED) and entity type
 */

import React, { useState } from "react";
import { IChange } from "../types";
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  Filter,
  Info,
  Calendar,
  Layers,
} from "lucide-react";

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

  const fromEdition = changes[0]?.from_edition || "2026-09-03";
  const toEdition = changes[0]?.to_edition || "2026-10-01";
  const isVerified = changes.some((c) => c.comparison_verified === true);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <GitCompare className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">
              AIRAC 28-Day Cycle Change Detection & Audit
            </h2>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Automated change detection comparing AIRAC cycle{" "}
            <span className="font-mono text-cyan-300 font-semibold">{fromEdition}</span> &rarr;{" "}
            <span className="font-mono text-emerald-400 font-semibold">{toEdition}</span> (28-day cycle interval).
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

      {/* Transparent Cycle Evidence & Verification State Notice */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="text-slate-300">
            <b>AIRAC Edition Reconciliation:</b> Official Active Edition is{" "}
            <span className="font-mono text-emerald-400 font-semibold">2026-10-01 (AMDT 010/2026)</span>. The preceding ICAO 28-day cycle was{" "}
            <span className="font-mono text-cyan-300 font-semibold">2026-09-03 (AMDT 009/2026)</span>.
            {!isVerified && (
              <span className="text-amber-300 block text-[11px] mt-0.5">
                Note: Local data archive currently contains the complete raw package for 2026-10-01; comparison records below represent demonstration baseline diffs pending local ingestion of prior 2026-09-03 snapshot files.
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 font-mono text-[11px] px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
          Cycle Interval: <b className="text-cyan-400">28 Days</b>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-400 uppercase text-[10px]">Filter Status:</span>
          {["ALL", "MODIFIED", "NEW", "DELETED", "UNCHANGED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded font-mono text-[11px] ${
                statusFilter === s
                  ? "bg-cyan-500 text-white font-bold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-400 uppercase text-[10px]">Entity Type:</span>
          {["ALL", "runway", "aerodrome", "route", "waypoint"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded font-mono text-[11px] ${
                typeFilter === t
                  ? "bg-cyan-500 text-white font-bold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
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
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] uppercase font-mono text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Entity Key</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Prior Value ({fromEdition})</th>
                <th className="px-4 py-3 text-emerald-400">Current Value ({toEdition})</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Source Section</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No change records match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      {c.status === "MODIFIED" && (
                        <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          MODIFIED
                        </span>
                      )}
                      {c.status === "NEW" && (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          NEW
                        </span>
                      )}
                      {c.status === "DELETED" && (
                        <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          DELETED
                        </span>
                      )}
                      {c.status === "UNCHANGED" && (
                        <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px]">
                          UNCHANGED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 uppercase text-[10px]">{c.entity_type}</td>
                    <td className="px-4 py-3 font-bold text-white">{c.entity_key}</td>
                    <td className="px-4 py-3 text-cyan-300">{c.field}</td>
                    <td className="px-4 py-3 text-slate-400 line-through">
                      {c.old_value !== null ? c.old_value : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-white bg-slate-950/40">
                      {c.new_value !== null ? c.new_value : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.unit || "—"}</td>
                    <td className="px-4 py-3 font-sans text-xs text-slate-300">
                      <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 text-[11px]">
                        {c.section || "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
