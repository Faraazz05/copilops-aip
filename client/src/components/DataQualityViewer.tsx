/**
 * CopilOPS Aeronautical Data Platform - Data Quality Inspector
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import React, { useState } from "react";
import { IIssue } from "../types";
import { ShieldAlert, AlertTriangle, Bug, CheckCircle } from "lucide-react";

interface DataQualityViewerProps {
  issues: IIssue[];
}

export const DataQualityViewer: React.FC<DataQualityViewerProps> = ({ issues }) => {
  const [filterCode, setFilterCode] = useState<string>("ALL");

  const documentedCases = [
    {
      title: "1. Missing Hemisphere Letter on Runway Coordinates (EBCI AD 2.12)",
      code: "MISSING_HEMISPHERE",
      severity: "WARN",
      location: "EB-AD-2.EBCI-en-GB.html, RWY 24 end coordinate",
      rawText: "502720.59 \\n 0042618.93E",
      explanation: "Official publication omitted mandatory hemisphere designator 'N' on latitude (502720.59 instead of 502720.59N).",
      solution: "Pipeline detects missing hemisphere within national airspace bounds, emits non-swallowed warning, and reconstructs 50.455719° decimal degrees."
    },
    {
      title: "2. Duplicate Morse Audio Identifiers for Marker Beacons (AD 2.19)",
      code: "DUPLICATE_KEY",
      severity: "WARN",
      location: "EBBR, EBLG, EBCI AD 2.19",
      rawText: "OM identifier: 'dash / dash' | MM identifier: 'dot / dash'",
      explanation: "Multiple physically distinct marker beacons share the identical identifier string 'dash / dash' at the same airport (e.g. 3 OMs at EBBR).",
      solution: "Pipeline inspects the remarks column for runway threshold associations and generates unique natural keys (e.g. OM-RWY01-EBBR, OM-RWY25L-EBBR)."
    },
    {
      title: "3. Unicode Multiplication Sign in Runway Dimensions (EBTN AD 2.12)",
      code: "DIM_PARSE",
      severity: "WARN",
      location: "EB-AD-2.EBTN-en-GB.html, AD 2.12",
      rawText: "728 × 30 (using Unicode \\u00d7)",
      explanation: "EBTN uses the mathematical multiplication glyph '×' instead of standard ASCII 'x' used in other aerodromes.",
      solution: "Regex pattern accepts [xX\\u00d7] to safely extract length and width."
    },
    {
      title: "4. Narrow Non-Breaking Spaces in Declared Distances (AD 2.13)",
      code: "DIST_PARSE",
      severity: "WARN",
      location: "Throughout AD 2.12 and 2.13 across all airports",
      rawText: "2\\u2009987 M or 3\\u2009690 M",
      explanation: "Numbers are formatted with Unicode thin spaces (\\u2009) and narrow no-break spaces (\\u202f) for human typography.",
      solution: "Pipeline strips typography whitespace before strict floating point conversion."
    },
    {
      title: "5. Unpaved Runway Threshold Coordinate Omission (AD 2.12)",
      code: "COORD_PARSE",
      severity: "WARN",
      location: "EBAM, EBBT, EBCF, EBGB, EBSH AD 2.12",
      rawText: "Empty table cells (\"\") without explicit NIL or '-'",
      explanation: "Grass aerodromes frequently leave threshold coordinate cells empty without publishing NIL.",
      solution: "Treated as intentionally unprovided coordinates rather than corrupted syntax."
    },
    {
      title: "6. Textual Pointer in Numerical Station Elevation Field (EBMB AD 2.2)",
      code: "ELEV_PARSE",
      severity: "WARN",
      location: "EBMB AD 2.2",
      rawText: "See AD 2.EBBR .",
      explanation: "Military aerodrome references civilian airport instead of publishing a numerical elevation in feet.",
      solution: "Pipeline captures ELEV_PARSE warning and stores raw textual pointer without crashing."
    },
    {
      title: "7. Concatenated Frequency & TACAN/DME Channel Cells (ENR 4.1)",
      code: "FREQ_PARSE",
      severity: "WARN",
      location: "EB-ENR-4.1-en-GB.html",
      rawText: "114.900 MHZ CH 96X / 113.500 MHZ (CH 82X)",
      explanation: "Paired VHF frequencies and TACAN channels are merged in single table cell with inconsistent punctuation.",
      solution: "Dual independent regex matchers extract both MHz frequency and channel values."
    }
  ];

  const filteredIssues = filterCode === "ALL" ? issues : issues.filter(i => i.code === filterCode);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            AIP Data Quality, Validation & Ambiguities Inspector
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Deterministic validation rules capturing real-world ambiguities and publication anomalies in the official skeyes eAIP.
          </p>
        </div>
        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
          Total Anomalies Logged: <b className="text-amber-400">{issues.length}</b>
        </div>
      </div>

      {/* Documented AIP Findings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Bug className="w-4 h-4 text-cyan-400" />
          Documented skeyes AIP Edge Cases Handled by Engine
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentedCases.map((doc, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-slate-200 text-sm">{doc.title}</h4>
                <span className="text-[10px] font-mono uppercase bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                  {doc.code}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500">Raw Source: </span>{doc.rawText}
              </div>
              <p className="text-xs text-slate-300">{doc.explanation}</p>
              <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 p-2.5 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span><b>Engine Handling: </b>{doc.solution}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Logged Database Issues */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mt-8">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-slate-100">Live Ingestion Anomaly Records (Database Table: issues)</h3>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-mono">
            <span className="text-slate-400 mr-1">Code:</span>
            {["ALL", "STRUCTURE_CHANGED", "FREQ_PARSE", "MISSING_HEMISPHERE", "DIM_PARSE"].map((c) => (
              <button
                key={c}
                onClick={() => setFilterCode(c)}
                className={`px-2 py-1 rounded ${
                  filterCode === c ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-3">Severity</th>
                <th className="p-3">Code</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Entity Key</th>
                <th className="p-3">Section</th>
                <th className="p-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredIssues.slice(0, 100).map((issue, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      issue.severity === "ERROR" ? "bg-red-950 text-red-300 border border-red-800" : "bg-amber-950 text-amber-300 border border-amber-800"
                    }`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="p-3 text-cyan-300">{issue.code}</td>
                  <td className="p-3 text-slate-400 uppercase">{issue.entity_type}</td>
                  <td className="p-3 font-bold text-white">{issue.entity_key}</td>
                  <td className="p-3 text-slate-400">{issue.section}</td>
                  <td className="p-3 font-sans text-slate-300 max-w-sm truncate" title={issue.message}>
                    {issue.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
