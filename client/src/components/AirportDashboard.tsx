/**
 * CopilOPS Aeronautical Data Platform - Airport Dashboard
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import React, { useState } from "react";
import { IAirport } from "../types";
import { Plane, Compass, Clock, ShieldCheck, Radio, Ruler, AlertCircle } from "lucide-react";

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

  if (!airport) {
    return <div className="p-8 text-center text-slate-400">No airport data available.</div>;
  }

  const targetAirports = ["EBBR", "EBLG", "EBCI"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Airport Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Target Airports:</span>
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
          <label htmlFor="ad-select" className="text-xs text-slate-400">All Aerodromes:</label>
          <select
            id="ad-select"
            value={selectedIcao}
            onChange={(e) => onSelectIcao(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-cyan-500 focus:border-cyan-500"
          >
            {airports.map((a) => (
              <option key={a.icao} value={a.icao}>
                {a.icao} - {a.name.slice(0, 30)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Airport Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-extrabold font-mono text-cyan-400 tracking-wider">
                {airport.icao}
              </span>
              <span className="text-xl text-slate-200 font-semibold">{airport.name}</span>
              {airport.is_target && (
                <span className="text-xs font-semibold uppercase bg-red-950 text-red-400 border border-red-800/80 px-2 py-0.5 rounded-full">
                  Primary Assessment Airport
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">{airport.operator}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" /> Elevation
              </div>
              <div className="text-lg font-bold text-white font-mono">{airport.elevation ?? "—"} <span className="text-xs font-normal text-slate-400">FT</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Mag Variation</div>
              <div className="text-lg font-bold text-white font-mono">{airport.magnetic_variation ?? "—"}° <span className="text-xs font-normal text-slate-400">({airport.magnetic_variation_year})</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> RFFS Fire Cat
              </div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-1">{airport.rffs_category || "CAT 10"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> ATS Hours
              </div>
              <div className="text-sm font-bold text-white font-mono mt-1">{airport.hours?.ats || "H24"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Runway Physical Characteristics & Declared Distances Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Ruler className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-slate-100">Runway Physical Characteristics & Declared Distances (AD 2.12 / 2.13)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{airport.runways.length} Published Runway Directions</span>
        </div>

        {airport.runways.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No runway characteristics published for this aerodrome.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">RWY</th>
                  <th className="px-4 py-3">True BRG</th>
                  <th className="px-4 py-3">Dimensions</th>
                  <th className="px-4 py-3">Surface</th>
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
                    <td className="px-4 py-3 font-bold text-cyan-400">{rwy.designator}</td>
                    <td className="px-4 py-3">{rwy.true_bearing ? `${rwy.true_bearing}°` : "—"}</td>
                    <td className="px-4 py-3">{rwy.length && rwy.width ? `${rwy.length} x ${rwy.width} M` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">
                        {rwy.surface || "ASPH"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{rwy.tora ?? "—"}</td>
                    <td className="px-4 py-3">{rwy.toda ?? "—"}</td>
                    <td className="px-4 py-3">{rwy.asda ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-cyan-400 bg-cyan-950/20">{rwy.lda ?? "—"}</td>
                    <td className="px-4 py-3">{rwy.thr_elevation ? `${rwy.thr_elevation} FT` : "—"}</td>
                    <td className="px-4 py-3 font-sans text-xs text-slate-400 max-w-xs truncate" title={rwy.remarks || ""}>
                      {rwy.remarks || "NIL"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Hours & Radio Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operating Hours Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-slate-200">Operating Hours & Services (AD 2.3)</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Airport Operator</span>
              <p className="font-mono font-semibold text-slate-200 mt-0.5">{airport.hours?.operator || "H24"}</p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">ATS / Control Tower</span>
              <p className="font-mono font-semibold text-slate-200 mt-0.5">{airport.hours?.ats || "H24"}</p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Customs & Immigration</span>
              <p className="font-mono font-semibold text-slate-200 mt-0.5">{airport.hours?.customs || "H24"}</p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">AIS Briefing Office</span>
              <p className="font-mono font-semibold text-slate-200 mt-0.5">{airport.hours?.ais || "H24"}</p>
            </div>
          </div>
        </div>

        {/* Radio Navigation & Landing Aids */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Radio className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-slate-200">Radio Navigation & ILS Facilities (AD 2.19)</h3>
          </div>
          {airport.navaids.length === 0 ? (
            <p className="text-slate-500 text-sm">No dedicated on-field radio navaids published.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {airport.navaids.map((nav: any) => (
                <div key={nav.key} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-xs">
                  <div>
                    <span className="font-bold text-purple-400 font-mono mr-2">{nav.identifier || nav.key}</span>
                    <span className="text-slate-300 font-medium">{nav.type || nav.ils_system || "Nav Aid"}</span>
                  </div>
                  {nav.frequency && (
                    <span className="font-mono font-semibold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
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
