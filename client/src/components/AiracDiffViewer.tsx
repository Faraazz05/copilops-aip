/**
 * CopilOPS — Aviation Operations Intelligence
 * AIRAC 28-Day Cycle Change Detection & Audit Interface
 * Author: Mohd Faraz (https://faraazz05.github.io)
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
  Search,
  X,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "./common/Card";
import { StatusBadge, BadgeVariant } from "./common/StatusBadge";
import { EmptyState } from "./common/EmptyState";

interface AiracDiffViewerProps {
  changes: IChange[];
}

export const AiracDiffViewer: React.FC<AiracDiffViewerProps> = ({ changes }) => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filtered = changes.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && c.entity_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.entity_key.toLowerCase().includes(q) ||
        c.field.toLowerCase().includes(q) ||
        (c.section && c.section.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const counts = {
    TOTAL: changes.length,
    MODIFIED: changes.filter((c) => c.status === "MODIFIED").length,
    NEW: changes.filter((c) => c.status === "NEW").length,
    DELETED: changes.filter((c) => c.status === "DELETED").length,
    UNCHANGED: changes.filter((c) => c.status === "UNCHANGED").length,
  };

  const fromEdition = changes[0]?.from_edition || "2026-09-03";
  const toEdition = changes[0]?.to_edition || "2026-10-01";
  const isVerified = changes.some((c) => c.comparison_verified === true);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MODIFIED":
        return (
          <StatusBadge variant="amber" mono size="xs">
            MODIFIED
          </StatusBadge>
        );
      case "NEW":
        return (
          <StatusBadge variant="green" mono size="xs">
            NEW
          </StatusBadge>
        );
      case "DELETED":
        return (
          <StatusBadge variant="red" mono size="xs">
            DELETED
          </StatusBadge>
        );
      case "UNCHANGED":
      default:
        return (
          <StatusBadge variant="neutral" mono size="xs">
            UNCHANGED
          </StatusBadge>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-[#0D1726] border border-[#26374B] p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#121F31] border border-[#26374B] text-[#37C9D6] flex items-center justify-center">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F1F5FA] tracking-tight">
                  AIRAC 28-Day Cycle Change Detection &amp; Audit
                </h2>
                <StatusBadge variant="cyan" mono size="xs">
                  28-Day Cycle
                </StatusBadge>
              </div>
              <p className="text-xs text-[#A5B3C4] mt-0.5">
                Automated change verification comparing cycle{" "}
                <span className="font-mono text-[#37C9D6] font-medium">{fromEdition}</span> &rarr;{" "}
                <span className="font-mono text-[#47C995] font-medium">{toEdition}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Compact Status Counter Summary */}
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <button
            onClick={() => setStatusFilter(statusFilter === "MODIFIED" ? "ALL" : "MODIFIED")}
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
              statusFilter === "MODIFIED"
                ? "bg-[#E9B45B] text-[#070D18] border-[#E9B45B] font-bold"
                : "bg-[#070D18] text-[#E9B45B] border-[#26374B] hover:border-[#E9B45B]/50"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{counts.MODIFIED} Modified</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "NEW" ? "ALL" : "NEW")}
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
              statusFilter === "NEW"
                ? "bg-[#47C995] text-[#070D18] border-[#47C995] font-bold"
                : "bg-[#070D18] text-[#47C995] border-[#26374B] hover:border-[#47C995]/50"
            }`}
          >
            <PlusCircle className="w-3 h-3" />
            <span>{counts.NEW} New</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "DELETED" ? "ALL" : "DELETED")}
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
              statusFilter === "DELETED"
                ? "bg-[#F16C78] text-[#070D18] border-[#F16C78] font-bold"
                : "bg-[#070D18] text-[#F16C78] border-[#26374B] hover:border-[#F16C78]/50"
            }`}
          >
            <MinusCircle className="w-3 h-3" />
            <span>{counts.DELETED} Deleted</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "UNCHANGED" ? "ALL" : "UNCHANGED")}
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
              statusFilter === "UNCHANGED"
                ? "bg-[#A5B3C4] text-[#070D18] border-[#A5B3C4] font-bold"
                : "bg-[#070D18] text-[#74869C] border-[#26374B] hover:border-[#74869C]/50"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{counts.UNCHANGED} Unchanged</span>
          </button>
        </div>
      </div>

      {/* Transparent Cycle Evidence & Verification State Notice */}
      <div className="bg-[#0D1726] border border-[#26374B] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <Info className="w-4 h-4 text-[#37C9D6] shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-[#A5B3C4] leading-relaxed">
            <b className="text-[#F1F5FA]">AIRAC Edition Reconciliation:</b> Official Active Edition is{" "}
            <span className="font-mono text-[#47C995] font-semibold">{toEdition} (AMDT 010/2026)</span>. The preceding ICAO 28-day cycle was{" "}
            <span className="font-mono text-[#37C9D6] font-semibold">{fromEdition} (AMDT 009/2026)</span>.
            {!isVerified && (
              <span className="text-[#E9B45B] block text-[11px] mt-0.5">
                Note: Local archive currently contains the authoritative raw eAIP package for {toEdition}; change records below reflect baseline comparison diffs pending ingestion of prior cycle snapshot.
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 font-mono text-[11px] px-2.5 py-1 rounded-md bg-[#070D18] border border-[#26374B] text-[#74869C]">
          Cycle: <b className="text-[#37C9D6]">28 Days</b>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#0D1726] border border-[#26374B] p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#74869C]" />
          <span className="font-semibold text-[#74869C] uppercase text-[10px] tracking-wider">Status:</span>
          {["ALL", "MODIFIED", "NEW", "DELETED", "UNCHANGED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors ${
                statusFilter === s
                  ? "bg-[#37C9D6] text-[#070D18] font-bold"
                  : "bg-[#070D18] text-[#A5B3C4] hover:bg-[#121F31] border border-[#26374B]"
              }`}
            >
              {s}
            </button>
          ))}

          <span className="text-[#26374B] mx-1">|</span>

          <span className="font-semibold text-[#74869C] uppercase text-[10px] tracking-wider">Entity:</span>
          {["ALL", "runway", "aerodrome", "route", "waypoint"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors ${
                typeFilter === t
                  ? "bg-[#37C9D6] text-[#070D18] font-bold"
                  : "bg-[#070D18] text-[#A5B3C4] hover:bg-[#121F31] border border-[#26374B]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#74869C] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search key, field, section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070D18] border border-[#26374B] rounded-lg pl-8 pr-7 py-1.5 text-xs text-[#F1F5FA] placeholder-[#74869C] focus:outline-none focus:ring-1 focus:ring-[#37C9D6]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-[#74869C] hover:text-[#F1F5FA]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#A5B3C4]">
            <thead className="bg-[#070D18] text-[10px] uppercase font-mono text-[#74869C] border-b border-[#26374B]">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Entity Key</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Prior Value ({fromEdition})</th>
                <th className="px-4 py-3 text-[#47C995]">Current Value ({toEdition})</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Source Section</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26374B]/50 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#74869C] font-sans">
                    <EmptyState
                      icon={GitCompare}
                      title="No changes match criteria"
                      description="Try adjusting status or entity filters."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#121F31]/40 transition-colors">
                    <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-[#74869C] uppercase text-[10px]">{c.entity_type}</td>
                    <td className="px-4 py-3 font-bold text-[#F1F5FA]">{c.entity_key}</td>
                    <td className="px-4 py-3 text-[#37C9D6]">{c.field}</td>
                    <td className="px-4 py-3 text-[#74869C] line-through">
                      {c.old_value !== null ? c.old_value : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#F1F5FA] bg-[#070D18]/50">
                      {c.new_value !== null ? c.new_value : "—"}
                    </td>
                    <td className="px-4 py-3 text-[#74869C]">{c.unit || "—"}</td>
                    <td className="px-4 py-3 font-sans text-xs text-[#A5B3C4]">
                      <span className="bg-[#070D18] px-1.5 py-0.5 rounded border border-[#26374B] text-[11px]">
                        {c.section || "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
