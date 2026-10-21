/**
 * CopilOPS — Aviation Operations Intelligence
 * ATS Airways & Geodesic Segments Explorer (ENR 3.2)
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */

import React, { useState } from "react";
import { IRoute } from "../types";
import {
  Route as RouteIcon,
  Search,
  Navigation,
  FileText,
  Info,
  Calendar,
  X,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "./common/Card";
import { StatusBadge } from "./common/StatusBadge";
import { EmptyState } from "./common/EmptyState";

interface AirwaysViewerProps {
  routes: IRoute[];
}

export const AirwaysViewer: React.FC<AirwaysViewerProps> = ({ routes }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<IRoute | null>(routes[0] || null);

  const filtered = routes.filter(
    (r) =>
      r.designator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.waypoint_sequence.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.rnp_type && r.rnp_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Top Header Card with Search */}
      <div className="bg-[#0D1726] border border-[#26374B] p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#121F31] border border-[#26374B] text-[#E9B45B] flex items-center justify-center">
              <RouteIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F1F5FA] tracking-tight">
                  Belgian ATS Route Network (ENR 3.2)
                </h2>
                <StatusBadge variant="amber" mono size="xs">
                  {routes.length} Published Routes
                </StatusBadge>
              </div>
              <p className="text-xs text-[#A5B3C4] mt-0.5">
                Upper &amp; RNAV ATS airways extracted from official skeyes publication with published RNP specifications.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#74869C] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search airway (e.g. L607, KOK, RNAV)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#070D18] border border-[#26374B] rounded-lg pl-9 pr-8 py-2 text-xs text-[#F1F5FA] placeholder-[#74869C] focus:outline-none focus:ring-1 focus:ring-[#37C9D6] font-mono"
            aria-label="Search route"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-[#74869C] hover:text-[#F1F5FA]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Route List & Detailed Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Route List */}
        <Card className="h-[640px] flex flex-col">
          <div className="p-3 bg-[#070D18] border-b border-[#26374B] text-[10px] font-mono uppercase tracking-wider text-[#74869C] flex justify-between items-center">
            <span>Airway Designator</span>
            <span>RNP Specification</span>
          </div>

          <div className="overflow-y-auto divide-y divide-[#26374B]/50 flex-1">
            {filtered.length === 0 ? (
              <EmptyState
                icon={RouteIcon}
                title="No airways found"
                description={`No ATS routes match query "${searchTerm}".`}
                action={
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-xs text-[#37C9D6] hover:underline"
                  >
                    Clear Search
                  </button>
                }
              />
            ) : (
              filtered.map((r) => {
                const isSelected = selectedRoute?.designator === r.designator;
                return (
                  <button
                    key={r.designator}
                    onClick={() => setSelectedRoute(r)}
                    className={`w-full text-left p-3 transition-colors flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-[#121F31] border-l-4 border-[#37C9D6]"
                        : "hover:bg-[#121F31]/40"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#F1F5FA]">
                          {r.designator}
                        </span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#37C9D6]" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#74869C] font-mono truncate max-w-[170px]">
                        {r.waypoint_sequence || "Direct"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <StatusBadge variant="neutral" mono size="xs">
                        {r.rnp_type}
                      </StatusBadge>
                      <span className="block text-[10px] text-[#74869C] font-mono mt-1">
                        {r.waypoint_count} fixes
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Column: Route Technical Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRoute ? (
            <Card>
              <CardHeader
                icon={<RouteIcon className="w-5 h-5 text-[#E9B45B]" />}
                title={
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#F1F5FA]">
                      AIRWAY {selectedRoute.designator}
                    </span>
                    <StatusBadge variant="amber" mono size="xs">
                      {selectedRoute.rnp_type}
                    </StatusBadge>
                  </div>
                }
                subtitle={`Published Availability: ${selectedRoute.availability || "Standard H24"}`}
                badge={
                  <span className="text-[11px] font-mono text-[#74869C] bg-[#070D18] px-2 py-0.5 rounded border border-[#26374B]">
                    {selectedRoute.segments.length} Segments
                  </span>
                }
              />

              <CardContent className="p-5 space-y-5">
                {/* Operational Safety Disclaimer Notice */}
                <div className="flex items-start gap-2 bg-[#E9B45B]/10 border border-[#E9B45B]/30 p-3 rounded-lg text-xs text-[#E9B45B] leading-relaxed">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <b>Cartographic Reconstructed Polyline Notice:</b> In strict accordance with ENR 3.2 data provenance, drawn polyline vectors connect published waypoint reporting points in sequence. They illustrate the logical airway topology but do not represent officially surveyed geodetic centerlines.
                  </div>
                </div>

                {/* Waypoint Flow Diagram */}
                <div>
                  <h4 className="text-[10px] uppercase font-mono font-semibold text-[#74869C] tracking-wider mb-2 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#37C9D6]" /> Ordered Waypoint Sequence
                  </h4>
                  <div className="bg-[#070D18] p-3.5 rounded-lg border border-[#26374B] flex flex-wrap gap-2 items-center">
                    {selectedRoute.waypoint_sequence.split(" -> ").map((wp, idx, arr) => (
                      <React.Fragment key={idx}>
                        <span className="font-mono font-bold text-xs bg-[#121F31] text-[#37C9D6] px-2.5 py-1 rounded border border-[#26374B]">
                          {wp}
                        </span>
                        {idx < arr.length - 1 && (
                          <span className="text-[#74869C] font-bold text-xs">&rarr;</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Geodesic Segments Table */}
                <div>
                  <h4 className="text-[10px] uppercase font-mono font-semibold text-[#74869C] tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#A5B3C4]" /> Route Segments Breakdown
                  </h4>
                  <div className="bg-[#070D18] border border-[#26374B] rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs text-[#A5B3C4]">
                      <thead className="bg-[#0D1726] text-[10px] uppercase font-mono text-[#74869C] border-b border-[#26374B]">
                        <tr>
                          <th className="px-4 py-2.5">Segment Index</th>
                          <th className="px-4 py-2.5">From Fix</th>
                          <th className="px-4 py-2.5">To Fix</th>
                          <th className="px-4 py-2.5 text-right">Distance</th>
                          <th className="px-4 py-2.5">Coordinates Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#26374B]/50 font-mono">
                        {selectedRoute.segments.map((seg, idx) => (
                          <tr key={idx} className="hover:bg-[#121F31]/40 transition-colors">
                            <td className="px-4 py-2 text-[#74869C]">#{idx + 1}</td>
                            <td className="px-4 py-2 font-bold text-[#F1F5FA]">{seg.from_point}</td>
                            <td className="px-4 py-2 font-bold text-[#F1F5FA]">{seg.to_point}</td>
                            <td className="px-4 py-2 text-right">
                              {seg.distance ? `${seg.distance} NM` : "—"}
                            </td>
                            <td className="px-4 py-2 text-[11px] text-[#74869C]">
                              {seg.coordinates ? `${seg.coordinates.length} pts` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Provenance & Citation */}
                <div className="pt-3 border-t border-[#26374B] flex flex-wrap items-center justify-between text-xs text-[#74869C]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#47C995]" />
                      AIRAC: <b>2026-10-01</b>
                    </span>
                    <span>&bull;</span>
                    <span>Source: skeyes ENR 3.2</span>
                  </div>
                  <a
                    href="https://ops.skeyes.be"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#37C9D6] hover:underline flex items-center gap-1"
                  >
                    <span>View ENR 3.2 Publication</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16">
                <EmptyState
                  icon={RouteIcon}
                  title="No route selected"
                  description="Select an airway from the left list to inspect its navigation specifications and waypoint flow."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
