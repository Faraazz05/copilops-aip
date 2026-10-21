/**
 * CopilOPS Aeronautical Data Platform - Airways & Geodesic Segments
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import React, { useState } from "react";
import { IRoute } from "../types";
import { Route as RouteIcon, Search, Navigation } from "lucide-react";

interface AirwaysViewerProps {
  routes: IRoute[];
}

export const AirwaysViewer: React.FC<AirwaysViewerProps> = ({ routes }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<IRoute | null>(routes[0] || null);

  const filtered = routes.filter((r) =>
    r.designator.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.waypoint_sequence.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RouteIcon className="w-6 h-6 text-amber-400" />
            Belgian ATS Routes & Airways (ENR 3.2)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Upper & RNAV ATS route network extracted from official skeyes publication with RNP specifications.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search route (e.g. L607, KOK)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Selector List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
            <span>Published Routes ({filtered.length})</span>
            <span>RNP Spec</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
            {filtered.map((r) => {
              const isSelected = selectedRoute?.designator === r.designator;
              return (
                <button
                  key={r.designator}
                  onClick={() => setSelectedRoute(r)}
                  className={`w-full text-left p-3.5 transition flex items-center justify-between ${
                    isSelected ? "bg-amber-500/10 border-l-4 border-amber-500" : "hover:bg-slate-800/40"
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold text-base text-amber-400">{r.designator}</span>
                    <p className="text-xs text-slate-400 truncate max-w-[180px] mt-0.5">
                      {r.waypoint_sequence || "Direct sequence"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {r.rnp_type}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-1">{r.waypoint_count} pts</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Route Details */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          {selectedRoute ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-2xl font-mono font-extrabold text-amber-400">
                    AIRWAY {selectedRoute.designator}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Navigation Specification: <span className="font-semibold text-white">{selectedRoute.rnp_type || "Unspecified"}</span> | Availability: <span className="text-white">{selectedRoute.availability || "Not Published"}</span>
                  </p>
                  <p className="text-[11px] text-amber-300/80 mt-1">
                    ⚠️ <b>Operational Note:</b> Polyline geometry connects published fixes in sequence (ENR 3.2 / ENR 4.4); it does not represent an officially surveyed or certified route centerline.
                  </p>
                </div>
                <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                  {selectedRoute.segments.length} Airway Segments
                </div>
              </div>

              {/* Waypoint Sequence Diagram */}
              <div>
                <h4 className="text-xs uppercase font-mono font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-400" /> Waypoint Flow
                </h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-2 items-center">
                  {selectedRoute.waypoint_sequence.split(" -> ").map((wp, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span className="font-mono font-bold text-sm bg-slate-800 text-cyan-300 px-2.5 py-1 rounded border border-slate-700">
                        {wp}
                      </span>
                      {idx < arr.length - 1 && <span className="text-slate-600 font-bold">&rarr;</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Segment Distances Table */}
              <div>
                <h4 className="text-xs uppercase font-mono font-semibold text-slate-400 mb-2">
                  Segment Breakdown & Geodesic Distances
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">From Point</th>
                        <th className="p-2.5">To Point</th>
                        <th className="p-2.5 text-right">Distance (NM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {selectedRoute.segments.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-bold text-cyan-400">{s.from_point}</td>
                          <td className="p-2.5 font-bold text-cyan-400">{s.to_point}</td>
                          <td className="p-2.5 text-right text-white font-semibold">{s.distance ? `${s.distance} NM` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">Select an airway from the list to view its segments.</div>
          )}

          <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-3 mt-4">
            Source: Belgium eAIP ENR 3.2 (Upper ATS Routes) | Validated across 28-day AIRAC cycle.
          </div>
        </div>
      </div>
    </div>
  );
};
