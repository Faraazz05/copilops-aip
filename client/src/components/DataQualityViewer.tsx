/**
 * CopilOPS Aeronautical Data Platform - Data Quality Inspector
 * Author: Mohd Faraz (https://faraazz05.github.io)
 *
 * Implements:
 * - Clean separation between:
 *   1) Detected by Latest Pipeline Run (live issue records persisted from database/extraction)
 *   2) Documented Educational Examples / Historical Edge Cases (curated case studies)
 * - Accurate dynamic counters matching active filter and dataset
 * - Section links, edition tracking, and severity breakdown
 */

import React, { useState, useMemo } from "react";
import { IIssue } from "../types";
import {
  ShieldAlert,
  AlertTriangle,
  Bug,
  CheckCircle,
  ExternalLink,
  Filter,
  Search,
  BookOpen,
  Activity,
  Layers,
  FileText,
} from "lucide-react";

interface DataQualityViewerProps {
  issues: IIssue[];
}

export const DataQualityViewer: React.FC<DataQualityViewerProps> = ({ issues }) => {
  // View mode toggle: 'live' (pipeline run) vs 'curated' (educational examples)
  const [activeView, setActiveView] = useState<"live" | "curated">("live");

  // Filters for live pipeline issues
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [codeFilter, setCodeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Curated historical edge-case studies (explicitly labeled as examples)
  const documentedExamples = [
    {
      id: "CASE-1",
      title: "1. Missing Latitude Hemisphere Letter (EBCI AD 2.12)",
      code: "COORD_PARSE_RECOVERY",
      severity: "WARN",
      location: "EB-AD-2.EBCI-en-GB.html, RWY 24 end coordinate",
      edition: "2026-10-01",
      rawText: "502720.59 \\n 0042618.93E",
      explanation:
        "Official publication omitted the mandatory hemisphere designator 'N' on latitude (published as 502720.59 instead of 502720.59N).",
      handling:
        "Pipeline detected coordinate within national FIR bounds, logged an explicit non-fatal warning issue, and deterministically recovered 50.455719° N without silent data loss.",
      status: "Documented Parser Recovery Case",
    },
    {
      id: "CASE-2",
      title: "2. Non-Unique Morse Identifiers for Marker Beacons (AD 2.19)",
      code: "DUPLICATE_NATURAL_KEY",
      severity: "WARN",
      location: "EBBR, EBLG, EBCI AD 2.19",
      edition: "2026-10-01",
      rawText: "OM identifier: 'dash / dash' | MM identifier: 'dot / dash'",
      explanation:
        "Multiple physically distinct marker beacons share the identical audio string 'dash / dash' at the same airport (e.g. 3 Outer Markers at EBBR for 25L, 25R, 01).",
      handling:
        "Pipeline reads runway threshold associations from the remarks column and generates disambiguated composite natural keys (e.g. OM-RWY01-EBBR, OM-RWY25L-EBBR).",
      status: "Documented Architecture Disambiguation Case",
    },
    {
      id: "CASE-3",
      title: "3. Mathematical Unicode Glyph in Runway Dimensions (EBTN AD 2.12)",
      code: "TYPOGRAPHY_NORMALIZATION",
      severity: "WARN",
      location: "EB-AD-2.EBTN-en-GB.html, AD 2.12",
      edition: "2026-10-01",
      rawText: "728 × 30 (Unicode multiplication glyph \\u00d7)",
      explanation:
        "EBTN aerodrome publishes the mathematical multiplication sign '×' instead of the standard ASCII 'x' used in other aerodrome tables.",
      handling:
        "Regex pattern accepts [xX\\u00d7] to safely extract numerical length (728 M) and width (30 M) without parse errors.",
      status: "Documented Typography Resilience Case",
    },
    {
      id: "CASE-4",
      title: "4. Narrow & Thin Non-Breaking Spaces in Declared Distances (AD 2.13)",
      code: "WHITESPACE_NORMALIZATION",
      severity: "WARN",
      location: "Throughout AD 2.12 and AD 2.13 across all aerodromes",
      edition: "2026-10-01",
      rawText: "2\\u2009987 M or 3\\u2009690 M (Thin Space \\u2009, Narrow NBSP \\u202f)",
      explanation:
        "Numbers are formatted with Unicode thin spaces for typographical layout, which causes standard float/integer parsers to fail.",
      handling:
        "Pipeline strips typography whitespace before strict integer/float parsing, guaranteeing declared distance preservation.",
      status: "Documented Whitespace Sanitation Case",
    },
    {
      id: "CASE-5",
      title: "5. Unpaved Runway Threshold Coordinate Omission (AD 2.12)",
      code: "UNPAVED_COORD_OMISSION",
      severity: "WARN",
      location: "EBAM, EBBT, EBCF, EBGB, EBSH AD 2.12",
      edition: "2026-10-01",
      rawText: "Empty table cells (\"\") without explicit NIL or '-'",
      explanation:
        "Grass aerodromes frequently leave runway threshold coordinate cells empty without publishing explicit NIL tokens.",
      handling:
        "Pipeline treats empty threshold cells as unprovided coordinates rather than corrupted syntax, avoiding crashes or markers at (0, 0).",
      status: "Documented Null Semantics Case",
    },
    {
      id: "CASE-6",
      title: "6. Textual Pointer in Numerical Station Elevation Field (EBMB AD 2.2)",
      code: "CROSS_REFERENCE_POINTER",
      severity: "WARN",
      location: "EBMB AD 2.2",
      edition: "2026-10-01",
      rawText: "See AD 2.EBBR .",
      explanation:
        "Military aerodrome references civilian airport instead of publishing a numerical elevation in feet.",
      handling:
        "Pipeline captures ELEV_PARSE warning, preserves the raw textual pointer, and excludes synthetic elevation.",
      status: "Documented Cross-Reference Case",
    },
    {
      id: "CASE-7",
      title: "7. Merged VHF Frequency & TACAN Channel Cells (ENR 4.1)",
      code: "FREQUENCY_CHANNEL_PAIRING",
      severity: "WARN",
      location: "EB-ENR-4.1-en-GB.html",
      edition: "2026-10-01",
      rawText: "114.900 MHZ CH 96X / 113.500 MHZ (CH 82X)",
      explanation:
        "Paired VHF frequencies and TACAN channels are merged in a single table cell with inconsistent punctuation across records.",
      handling:
        "Dual independent regex matchers extract both MHz frequency and channel values separately.",
      status: "Documented Punctuation Extraction Case",
    },
  ];

  // Distinct issue codes present in real pipeline issues
  const distinctCodes = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i) => set.add(i.code));
    return Array.from(set).sort();
  }, [issues]);

  // Filtered live pipeline issues
  const filteredLiveIssues = useMemo(() => {
    return issues.filter((i) => {
      if (severityFilter !== "ALL" && i.severity !== severityFilter) return false;
      if (codeFilter !== "ALL" && i.code !== codeFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          i.code.toLowerCase().includes(q) ||
          i.entity_key.toLowerCase().includes(q) ||
          i.section.toLowerCase().includes(q) ||
          i.message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [issues, severityFilter, codeFilter, searchTerm]);

  const liveCounts = useMemo(() => {
    return {
      TOTAL: issues.length,
      ERROR: issues.filter((i) => i.severity === "ERROR").length,
      WARN: issues.filter((i) => i.severity === "WARN").length,
    };
  }, [issues]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">
              AIP Data Quality, Validation & Ambiguities Inspector
            </h2>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Deterministic validation rules capturing real-world ambiguities and publication anomalies in the official skeyes eAIP.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveView("live")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeView === "live"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Detected in Latest Pipeline Run ({liveCounts.TOTAL})</span>
          </button>

          <button
            onClick={() => setActiveView("curated")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeView === "curated"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documented Examples / Edge Cases ({documentedExamples.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DETECTED BY LATEST PIPELINE RUN */}
      {activeView === "live" && (
        <div className="space-y-4">
          {/* Status summary banner */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-semibold uppercase text-[11px]">
                Active Pipeline Edition: <b className="text-white font-mono">2026-10-01</b>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">
                Filtered Results: <b className="text-cyan-400 font-mono">{filteredLiveIssues.length}</b> of {liveCounts.TOTAL}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="bg-red-950/80 border border-red-800 text-red-300 px-2.5 py-1 rounded-md text-[11px]">
                {liveCounts.ERROR} Fatal Errors
              </span>
              <span className="bg-amber-950/80 border border-amber-800 text-amber-300 px-2.5 py-1 rounded-md text-[11px]">
                {liveCounts.WARN} Non-Fatal Warnings
              </span>
            </div>
          </div>

          {/* Filtering toolbar */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Severity:</span>
              {["ALL", "WARN", "ERROR"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                    severityFilter === s
                      ? "bg-cyan-500 text-white font-bold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {s}
                </button>
              ))}

              <span className="text-slate-500 mx-1">|</span>

              <span className="text-slate-400 font-semibold uppercase text-[10px]">Issue Code:</span>
              <select
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none"
              >
                <option value="ALL">ALL CODES ({distinctCodes.length})</option>
                {distinctCodes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search entity, section, message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Issues table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] uppercase font-mono text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Entity Type</th>
                    <th className="px-4 py-3">Entity Key</th>
                    <th className="px-4 py-3">AIP Section</th>
                    <th className="px-4 py-3">Diagnostic Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredLiveIssues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-sans">
                        No issues match the active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLiveIssues.map((iss, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-2.5">
                          {iss.severity === "ERROR" ? (
                            <span className="bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              ERROR
                            </span>
                          ) : (
                            <span className="bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              WARN
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-cyan-400">{iss.code}</td>
                        <td className="px-4 py-2.5 text-slate-400 uppercase text-[10px]">{iss.entity_type}</td>
                        <td className="px-4 py-2.5 font-bold text-white">{iss.entity_key}</td>
                        <td className="px-4 py-2.5 text-slate-300 font-sans text-[11px]">
                          <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                            {iss.section}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-300 text-xs leading-tight">
                          {iss.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DOCUMENTED EXAMPLES / CURATED CASES */}
      {activeView === "curated" && (
        <div className="space-y-4">
          <div className="bg-amber-950/30 border border-amber-900/60 p-4 rounded-xl text-xs text-amber-200/90 leading-relaxed">
            <b>Educational Reference Section:</b> The case studies below represent documented parser recovery mechanisms and historical anomalies identified in official eAIP publications. They are provided as illustrative architectural references and are clearly distinguished from the live extraction issues logged above.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentedExamples.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      {c.code}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1">{c.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                    {c.severity}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Location:</span>
                    <b className="text-slate-200 font-mono">{c.location}</b>
                  </div>

                  <div className="bg-slate-950 p-2 rounded border border-slate-800/80 font-mono text-[11px] text-amber-300">
                    <span className="text-slate-500 block text-[9px] uppercase">Raw AIP Text:</span>
                    {c.rawText}
                  </div>

                  <div className="text-slate-300 text-xs leading-relaxed pt-1">
                    <b className="text-slate-400 block text-[11px]">Publication Ambiguity:</b>
                    {c.explanation}
                  </div>

                  <div className="text-emerald-300/90 text-xs leading-relaxed pt-1 border-t border-slate-800/60">
                    <b className="text-emerald-400 block text-[11px]">Deterministic Pipeline Solution:</b>
                    {c.handling}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
