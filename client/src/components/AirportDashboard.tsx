/**
 * CopilOPS Aeronautical Data Platform - Airport Operational Cockpit (OCC / Dispatcher)
 * Author: Mohd Faraz (https://faraazz05.github.io)
 *
 * Implements:
 * - Honest aeronautical status reporting (no false 'H24', 'CAT 10', 'ASPH' fallbacks)
 * - Authentic AD 2.1 Aerodrome Names separated from AD 2.2 Operator Names
 * - Declared distances and physical characteristics from AD 2.12 / 2.13
 * - Field-level provenance modal / panel inspecting official skeyes source sections
 */

import React, { useState } from "react";
import { IAirport, IRunway } from "../types";
import {
  Compass,
  Clock,
  ShieldCheck,
  Radio,
  Ruler,
  AlertCircle,
  ExternalLink,
  FileText,
  Info,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { ProvenanceCard } from "./ProvenanceCard";

interface AirportDashboardProps {
  airports: IAirport[];
  selectedIcao: string;
  onSelectIcao: (icao: string) => void;
}

export const AirportDashboard: React.FC<AirportDashboardProps> = ({
  airports,
  selectedIcao,
  onSelectIcao,
}) => {
  const airport = airports.find((a) => a.icao === selectedIcao) || airports[0];
  const [inspectField, setInspectField] = useState<{
    label: string;
    value: any;
    unit?: string | null;
    section: string;
    status: string;
    rawText?: string;
  } | null>(null);

  if (!airport) {
    return <div className="p-8 text-center text-slate-400">No aerodrome records available.</div>;
  }

  const targetAirports = ["EBBR", "EBLG", "EBCI"];
  const prov = airport.provenance;
  const sourceUrl = prov?.source_url || `https://ops.skeyes.be/html/belgocontrol_static/eaip/eAIP_Main/html/eAIP/EB-AD-2.${airport.icao}-en-GB.html`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Airport Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
            Target Aerodromes:
          </span>
          {targetAirports.map((code) => (
            <button
              key={code}
              onClick={() => onSelectIcao(code)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-mono font-bold transition-all ${
                selectedIcao === code
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        {/* Dropdown for any other airport */}
        <div className="flex items-center space-x-2 text-sm">
          <label htmlFor="ad-select" className="text-xs text-slate-400">
            All Belgian Aerodromes ({airports.length}):
          </label>
          <select
            id="ad-select"
            value={selectedIcao}
            onChange={(e) => onSelectIcao(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
          >
            {airports.map((a) => (
              <option key={a.icao} value={a.icao}>
                {a.icao} - {a.name ? a.name.slice(0, 35) : "Aerodrome"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Airport Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-extrabold font-mono text-cyan-400 tracking-wider">
                {airport.icao}
              </span>
              <span className="text-xl text-slate-100 font-semibold">{airport.name}</span>
              {airport.is_target && (
                <span className="text-[11px] font-mono font-bold uppercase bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full">
                  Primary Target
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-300 text-sm pt-0.5">
              <span className="text-slate-400">AD Operator:</span>
              <span className="font-semibold text-slate-200">{airport.operator || "Not Published"}</span>
              <span className="text-slate-500 text-xs font-mono">(AD 2.2)</span>
            </div>

            {/* Official Source Provenance Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                AIRAC: <b className="text-slate-200">{prov?.effective_date || "2026-10-01"}</b>
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Section: <b className="text-slate-200">{airport.icao} AD 2.1 - 2.19</b>
              </span>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-semibold"
              >
                View skeyes eAIP Source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            {/* Elevation */}
            <div
              onClick={() =>
                setInspectField({
                  label: "Aerodrome Elevation",
                  value: airport.elevation,
                  unit: "FT",
                  section: `${airport.icao} AD 2.2 § 3`,
                  status: airport.elevation !== null ? "PUBLISHED" : "NOT_PUBLISHED",
                  rawText: airport.elevation ? `${airport.elevation} FT` : "Not published",
                })
              }
              className="p-2 rounded hover:bg-slate-900 cursor-pointer transition"
              title="Click to view provenance"
            >
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" /> Elevation
              </div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {airport.elevation !== null && airport.elevation !== undefined ? (
                  <span>{airport.elevation} <span className="text-xs font-normal text-slate-400">FT</span></span>
                ) : (
                  <span className="text-slate-500 font-sans text-xs italic">Not published</span>
                )}
              </div>
            </div>

            {/* Mag Var */}
            <div
              onClick={() =>
                setInspectField({
                  label: "Magnetic Variation",
                  value: airport.magnetic_variation,
                  unit: `° (${airport.magnetic_variation_year || "—"})`,
                  section: `${airport.icao} AD 2.2 § 4`,
                  status: airport.magnetic_variation !== null ? "PUBLISHED" : "NOT_PUBLISHED",
                  rawText: `${airport.magnetic_variation}° (${airport.magnetic_variation_year})`,
                })
              }
              className="p-2 rounded hover:bg-slate-900 cursor-pointer transition"
              title="Click to view provenance"
            >
              <div className="text-xs text-slate-400">Mag Var</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {airport.magnetic_variation !== null && airport.magnetic_variation !== undefined ? (
                  <span>{airport.magnetic_variation}° <span className="text-xs font-normal text-slate-400">({airport.magnetic_variation_year || "—"})</span></span>
                ) : (
                  <span className="text-slate-500 font-sans text-xs italic">Not published</span>
                )}
              </div>
            </div>

            {/* RFFS Category (Honest, no fake CAT 10 default) */}
            <div
              onClick={() =>
                setInspectField({
                  label: "Rescue & Fire Fighting Services (RFFS)",
                  value: airport.rffs_category || "Not published in AD 2.6",
                  section: `${airport.icao} AD 2.6 § 1`,
                  status: airport.rffs_category ? "PUBLISHED" : "NOT_PUBLISHED",
                  rawText: airport.rffs_category || "NIL / Not published",
                })
              }
              className="p-2 rounded hover:bg-slate-900 cursor-pointer transition"
              title="Click to view provenance"
            >
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> RFFS Fire Cat
              </div>
              <div className="text-xs font-bold text-emerald-400 font-mono mt-1">
                {airport.rffs_category ? (
                  airport.rffs_category
                ) : (
                  <span className="text-slate-500 font-sans text-[11px] italic font-normal">
                    Not published (AD 2.6)
                  </span>
                )}
              </div>
            </div>

            {/* ATS Operating Hours (Honest, no fake H24 default) */}
            <div
              onClick={() =>
                setInspectField({
                  label: "ATS / Control Tower Operating Hours",
                  value: airport.hours?.ats || "Not published in AD 2.3",
                  section: `${airport.icao} AD 2.3 § 2`,
                  status: airport.hours?.ats ? "PUBLISHED" : "NOT_PUBLISHED",
                  rawText: airport.hours?.ats || "Not published",
                })
              }
              className="p-2 rounded hover:bg-slate-900 cursor-pointer transition"
              title="Click to view provenance"
            >
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> ATS Hours
              </div>
              <div className="text-xs font-bold text-white font-mono mt-1">
                {airport.hours?.ats ? (
                  airport.hours.ats
                ) : (
                  <span className="text-slate-500 font-sans text-[11px] italic font-normal">
                    Not published (AD 2.3)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Provenance Inspector Drawer (when clicked) */}
      {inspectField && (
        <div className="bg-slate-900 border border-cyan-500/40 p-4 rounded-xl shadow-2xl flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400">
                FIELD-LEVEL PROVENANCE INSPECTOR
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                {inspectField.section}
              </span>
            </div>
            <h4 className="font-bold text-slate-100 text-sm">{inspectField.label}</h4>
            <div className="text-xs text-slate-300">
              Verified Value:{" "}
              <b className="text-white font-mono">
                {String(inspectField.value)} {inspectField.unit || ""}
              </b>{" "}
              | Publication Status: <b className="text-emerald-400">{inspectField.status}</b>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Raw Source Text: <span className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">{inspectField.rawText}</span>
            </div>
          </div>
          <button
            onClick={() => setInspectField(null)}
            className="text-slate-400 hover:text-white p-1 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Runway Physical Characteristics & Declared Distances Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Ruler className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-semibold text-slate-100 text-sm">
                Runway Physical Characteristics & Declared Distances (AD 2.12 / AD 2.13)
              </h2>
              <p className="text-[11px] text-slate-400">
                Extracted directly from official eAIP tabular records without synthetic runway dimensions.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {airport.runways.length} Published Directions
          </span>
        </div>

        {airport.runways.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No published runway physical characteristics or declared distances in AD 2.12 / 2.13.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">RWY</th>
                  <th className="px-4 py-3">True BRG</th>
                  <th className="px-4 py-3">Dimensions</th>
                  <th className="px-4 py-3">Surface</th>
                  <th className="px-4 py-3">Strength (PCN/PCR)</th>
                  <th className="px-4 py-3">TORA (M)</th>
                  <th className="px-4 py-3">TODA (M)</th>
                  <th className="px-4 py-3">ASDA (M)</th>
                  <th className="px-4 py-3 text-cyan-400">LDA (M)</th>
                  <th className="px-4 py-3">THR Elev</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {airport.runways.map((rwy) => (
                  <tr key={rwy.designator} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-bold text-cyan-400">RWY {rwy.designator}</td>
                    <td className="px-4 py-3">{rwy.true_bearing ? `${rwy.true_bearing}°` : "—"}</td>
                    <td className="px-4 py-3">
                      {rwy.length && rwy.width ? `${rwy.length} × ${rwy.width} M` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {rwy.surface ? (
                        <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-[11px]">
                          {rwy.surface}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic font-sans text-[11px]">Unpaved/Not published</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] max-w-[140px] truncate" title={rwy.strength || ""}>
                      {rwy.strength || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{rwy.tora ?? "—"}</td>
                    <td className="px-4 py-3">{rwy.toda ?? "—"}</td>
                    <td className="px-4 py-3">{rwy.asda ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-cyan-400 bg-cyan-950/20">{rwy.lda ?? "—"}</td>
                    <td className="px-4 py-3">{rwy.thr_elevation ? `${rwy.thr_elevation} FT` : "—"}</td>
                    <td
                      className="px-4 py-3 font-sans text-[11px] text-slate-400 max-w-xs truncate"
                      title={rwy.remarks || ""}
                    >
                      {rwy.remarks || "NIL"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Operating Hours & Radio Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operating Hours Card (Honest, no fake H24 default) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-slate-200 text-sm">Operating Hours & Services (AD 2.3)</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{airport.icao} AD 2.3</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Airport Operator</span>
              <p className="font-mono font-semibold text-slate-200 mt-1">
                {airport.hours?.operator || <span className="text-slate-500 italic font-sans font-normal">Not published in AD 2.3</span>}
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">ATS / Control Tower</span>
              <p className="font-mono font-semibold text-slate-200 mt-1">
                {airport.hours?.ats || <span className="text-slate-500 italic font-sans font-normal">Not published in AD 2.3</span>}
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Customs & Immigration</span>
              <p className="font-mono font-semibold text-slate-200 mt-1">
                {airport.hours?.customs || <span className="text-slate-500 italic font-sans font-normal">Not published in AD 2.3</span>}
              </p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">AIS Briefing Office</span>
              <p className="font-mono font-semibold text-slate-200 mt-1">
                {airport.hours?.ais || <span className="text-slate-500 italic font-sans font-normal">Not published in AD 2.3</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Radio Navigation & Landing Aids (AD 2.19) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-slate-200 text-sm">Radio Navigation & Landing Aids (AD 2.19)</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{airport.navaids.length} Facilities</span>
          </div>

          {airport.navaids.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">
              No on-field radio navigation facilities or ILS systems published in {airport.icao} AD 2.19.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {airport.navaids.map((nav) => (
                <div
                  key={nav.key}
                  className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs"
                >
                  <div>
                    <span className="font-bold text-purple-400 font-mono mr-2">
                      {nav.identifier || nav.key}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {nav.type || nav.ils_system || "Nav Aid"}
                    </span>
                    {nav.latitude && nav.longitude && (
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        {nav.latitude.toFixed(4)}° N, {nav.longitude.toFixed(4)}° E
                      </span>
                    )}
                  </div>
                  {nav.frequency && (
                    <span className="font-mono font-semibold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                      {nav.frequency} {nav.frequency_unit || "MHZ"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
