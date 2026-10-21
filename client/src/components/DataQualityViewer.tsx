/**
 * CopilOPS — Aviation Operations Intelligence
 * AIP Data Quality, Validation & Edge-Case Ambiguities Inspector
 * Author: Mohd Faraz (https://faraazz05.github.io)
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
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "./common/Card";
import { StatusBadge } from "./common/StatusBadge";
import { EmptyState } from "./common/EmptyState";

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

  // Expanded issue for deep inspection
  const [expandedIssueIdx, setExpandedIssueIdx] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Curated historical edge-case studies (explicitly labeled as documented references)
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Top Header Card with View Switcher */}
      <div className="bg-[#0D1726] border border-[#26374B] p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#121F31] border border-[#26374B] text-[#E9B45B] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F1F5FA] tracking-tight">
                  AIP Data Quality &amp; Integrity Inspector
                </h2>
                <StatusBadge variant="cyan" mono size="xs">
                  AIRAC 2026-10-01
                </StatusBadge>
              </div>
              <p className="text-xs text-[#A5B3C4] mt-0.5">
                Deterministic validation rules capturing real-world publication anomalies in the official skeyes eAIP.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center bg-[#070D18] p-1 rounded-lg border border-[#26374B] text-xs">
          <button
            onClick={() => setActiveView("live")}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === "live"
                ? "bg-[#17263A] text-[#F1F5FA] border border-[#26374B] shadow-sm"
                : "text-[#74869C] hover:text-[#F1F5FA]"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#37C9D6]" />
            <span>Latest Pipeline Run ({liveCounts.TOTAL})</span>
          </button>

          <button
            onClick={() => setActiveView("curated")}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === "curated"
                ? "bg-[#17263A] text-[#F1F5FA] border border-[#26374B] shadow-sm"
                : "text-[#74869C] hover:text-[#F1F5FA]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#E9B45B]" />
            <span>Documented Edge Cases ({documentedExamples.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DETECTED BY LATEST PIPELINE RUN */}
      {activeView === "live" && (
        <div className="space-y-4">
          {/* Status summary banner */}
          <div className="bg-[#0D1726] border border-[#26374B] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-[#74869C] font-semibold uppercase text-[10px] tracking-wider">
                Pipeline Edition: <b className="text-[#F1F5FA] font-mono">2026-10-01</b>
              </span>
              <span className="text-[#26374B]">&bull;</span>
              <span className="text-[#74869C]">
                Filtered Results: <b className="text-[#37C9D6] font-mono">{filteredLiveIssues.length}</b> of {liveCounts.TOTAL}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="bg-[#F16C78]/10 border border-[#F16C78]/30 text-[#F16C78] px-2.5 py-0.5 rounded-md text-[11px] font-medium">
                {liveCounts.ERROR} Fatal Errors
              </span>
              <span className="bg-[#E9B45B]/10 border border-[#E9B45B]/30 text-[#E9B45B] px-2.5 py-0.5 rounded-md text-[11px] font-medium">
                {liveCounts.WARN} Non-Fatal Warnings
              </span>
            </div>
          </div>

          {/* Filtering toolbar */}
          <div className="bg-[#0D1726] border border-[#26374B] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#74869C]" />
              <span className="text-[#74869C] font-semibold uppercase text-[10px] tracking-wider">Severity:</span>
              {["ALL", "WARN", "ERROR"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors ${
                    severityFilter === s
                      ? "bg-[#37C9D6] text-[#070D18] font-bold"
                      : "bg-[#070D18] text-[#A5B3C4] hover:bg-[#121F31] border border-[#26374B]"
                  }`}
                >
                  {s}
                </button>
              ))}

              <span className="text-[#26374B] mx-1">|</span>

              <span className="text-[#74869C] font-semibold uppercase text-[10px] tracking-wider">Issue Code:</span>
              <select
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="bg-[#070D18] border border-[#26374B] text-[#F1F5FA] text-xs rounded-md px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-[#37C9D6] cursor-pointer"
              >
                <option value="ALL">ALL CODES ({distinctCodes.length})</option>
                {distinctCodes.map((c) => (
                  <option key={c} value={c} className="bg-[#0D1726] text-[#F1F5FA]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#74869C] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search entity, section, message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#070D18] border border-[#26374B] rounded-lg pl-8 pr-7 py-1.5 text-xs text-[#F1F5FA] placeholder-[#74869C] focus:outline-none focus:ring-1 focus:ring-[#37C9D6]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-2 text-[#74869C] hover:text-[#F1F5FA]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Issues Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#A5B3C4]">
                <thead className="bg-[#070D18] text-[10px] uppercase font-mono text-[#74869C] border-b border-[#26374B]">
                  <tr>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Entity Type</th>
                    <th className="px-4 py-3">Entity Key</th>
                    <th className="px-4 py-3">AIP Section</th>
                    <th className="px-4 py-3">Diagnostic Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26374B]/50 font-mono">
                  {filteredLiveIssues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[#74869C] font-sans">
                        <EmptyState
                          icon={ShieldAlert}
                          title="No issues found"
                          description="No validation diagnostics match the selected filter criteria."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredLiveIssues.map((iss, idx) => {
                      const isExpanded = expandedIssueIdx === idx;
                      return (
                        <React.Fragment key={idx}>
                          <tr
                            onClick={() => setExpandedIssueIdx(isExpanded ? null : idx)}
                            className="hover:bg-[#121F31]/50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-2.5">
                              {iss.severity === "ERROR" ? (
                                <StatusBadge variant="red" mono size="xs">
                                  ERROR
                                </StatusBadge>
                              ) : (
                                <StatusBadge variant="amber" mono size="xs">
                                  WARN
                                </StatusBadge>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-[#37C9D6]">{iss.code}</td>
                            <td className="px-4 py-2.5 text-[#74869C] uppercase text-[10px]">{iss.entity_type}</td>
                            <td className="px-4 py-2.5 font-bold text-[#F1F5FA]">{iss.entity_key}</td>
                            <td className="px-4 py-2.5 text-[#A5B3C4] font-sans text-[11px]">
                              <span className="bg-[#070D18] px-1.5 py-0.5 rounded border border-[#26374B]">
                                {iss.section}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-sans text-[#F1F5FA] text-xs leading-tight">
                              <div className="flex items-center justify-between gap-2">
                                <span className="line-clamp-1">{iss.message}</span>
                                <span className="text-[#74869C] text-[10px]">
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </span>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail Row */}
                          {isExpanded && (
                            <tr className="bg-[#070D18]/80 font-sans">
                              <td colSpan={6} className="px-5 py-3 border-b border-[#26374B]">
                                <div className="space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[#F1F5FA]">
                                      Detailed Diagnostic Inspection:
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(`${iss.code} | ${iss.entity_key} | ${iss.message}`);
                                      }}
                                      className="flex items-center gap-1 text-[#37C9D6] hover:underline font-mono text-[11px]"
                                    >
                                      {copiedText ? (
                                        <>
                                          <Check className="w-3 h-3 text-[#47C995]" />
                                          <span className="text-[#47C995]">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy Report</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-[#A5B3C4] leading-relaxed bg-[#0D1726] p-3 rounded-lg border border-[#26374B] font-mono text-xs">
                                    {iss.message}
                                  </p>
                                  <div className="flex items-center gap-4 text-[11px] text-[#74869C]">
                                    <span>Detected by: <b className="text-[#A5B3C4]">{iss.detected_by || "Deterministic AIP Validator"}</b></span>
                                    <span>&bull;</span>
                                    <span>Edition: <b className="text-[#A5B3C4]">{iss.edition || "2026-10-01"}</b></span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: DOCUMENTED EXAMPLES / CURATED CASES */}
      {activeView === "curated" && (
        <div className="space-y-4">
          <div className="bg-[#0D1726] border border-[#26374B] p-4 rounded-xl text-xs text-[#A5B3C4] leading-relaxed flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-[#E9B45B] shrink-0 mt-0.5" />
            <div>
              <b className="text-[#F1F5FA]">Educational Reference Section:</b> The case studies below represent documented parser recovery mechanisms and historical anomalies identified in official eAIP publications. They illustrate how CopilOPS deterministically overcomes publication ambiguities and non-standard syntax without crashing or losing data.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentedExamples.map((c) => (
              <Card key={c.id}>
                <CardHeader
                  icon={<FileText className="w-4 h-4 text-[#37C9D6]" />}
                  title={
                    <span className="text-sm font-bold text-[#F1F5FA]">{c.title}</span>
                  }
                  badge={
                    <StatusBadge variant="amber" mono size="xs">
                      {c.code}
                    </StatusBadge>
                  }
                />

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-1.5 text-[#74869C]">
                    <span>Location:</span>
                    <b className="text-[#F1F5FA] font-mono">{c.location}</b>
                  </div>

                  <div className="bg-[#070D18] p-2.5 rounded-lg border border-[#26374B] font-mono text-[11px] text-[#E9B45B] space-y-1">
                    <span className="text-[#74869C] block text-[9px] uppercase font-bold tracking-wider">
                      Raw eAIP Publication Text:
                    </span>
                    <div className="select-all whitespace-pre-wrap">{c.rawText}</div>
                  </div>

                  <div className="text-[#A5B3C4] leading-relaxed">
                    <span className="text-[10px] font-bold text-[#74869C] uppercase tracking-wider block mb-0.5">
                      Publication Ambiguity:
                    </span>
                    {c.explanation}
                  </div>

                  <div className="text-[#47C995] leading-relaxed pt-2 border-t border-[#26374B]/60 bg-[#47C995]/5 -mx-4 -mb-4 p-4 rounded-b-xl border-t">
                    <span className="text-[10px] font-bold text-[#47C995] uppercase tracking-wider block mb-0.5">
                      Deterministic Pipeline Resolution:
                    </span>
                    {c.handling}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
