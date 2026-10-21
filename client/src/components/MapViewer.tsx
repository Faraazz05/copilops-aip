/**
 * CopilOPS Aeronautical Data Platform - Map Viewer
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import React, { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip } from "react-leaflet";
import { IAirport, IRoute, INavaid, IWaypoint } from "../types";
import { Layers, CheckSquare, Square } from "lucide-react";

interface MapViewerProps {
  airports: IAirport[];
  routes: IRoute[];
  navaids: INavaid[];
  waypoints: IWaypoint[];
  onSelectAirport?: (icao: string) => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  airports,
  routes,
  navaids,
  waypoints,
  onSelectAirport
}) => {
  const [showTargetAirports, setShowTargetAirports] = useState(true);
  const [showOtherAirports, setShowOtherAirports] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showNavaids, setShowNavaids] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(false);

  // Center on Belgium (approx 50.5° N, 4.5° E)
  const center: [number, number] = [50.5, 4.47];

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden">
      {/* Floating Layer Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-lg shadow-2xl text-xs space-y-2 w-56">
        <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-700 font-semibold text-slate-200">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Selectable Map Layers</span>
        </div>

        <button
          onClick={() => setShowTargetAirports(!showTargetAirports)}
          className="flex items-center space-x-2 text-left w-full text-slate-300 hover:text-white"
        >
          {showTargetAirports ? <CheckSquare className="w-3.5 h-3.5 text-red-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></span>
            Target (EBBR, EBLG, EBCI)
          </span>
        </button>

        <button
          onClick={() => setShowOtherAirports(!showOtherAirports)}
          className="flex items-center space-x-2 text-left w-full text-slate-300 hover:text-white"
        >
          {showOtherAirports ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span>
            All Aerodromes ({airports.length})
          </span>
        </button>

        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className="flex items-center space-x-2 text-left w-full text-slate-300 hover:text-white"
        >
          {showRoutes ? <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
          <span className="flex items-center">
            <span className="w-3 h-0.5 bg-amber-500 mr-1.5 inline-block"></span>
            ATS Airways ({routes.length})
          </span>
        </button>

        <button
          onClick={() => setShowNavaids(!showNavaids)}
          className="flex items-center space-x-2 text-left w-full text-slate-300 hover:text-white"
        >
          {showNavaids ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 mr-1.5"></span>
            Navaids ({navaids.length})
          </span>
        </button>

        <button
          onClick={() => setShowWaypoints(!showWaypoints)}
          className="flex items-center space-x-2 text-left w-full text-slate-300 hover:text-white"
        >
          {showWaypoints ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-cyan-400 mr-1.5"></span>
            Waypoints ({waypoints.length})
          </span>
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={8}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ATS Airways / Routes */}
        {showRoutes &&
          routes.map((rt) =>
            rt.segments.map((seg, sIdx) => {
              if (!seg.coordinates || seg.coordinates.length < 2) return null;
              return (
                <Polyline
                  key={`${rt.designator}-${sIdx}`}
                  positions={seg.coordinates as [number, number][]}
                  pathOptions={{ color: "#f59e0b", weight: 2.2, opacity: 0.7 }}
                >
                  <Tooltip sticky>
                    <span className="font-mono font-bold text-xs">
                      {rt.designator} ({rt.rnp_type}): {seg.from_point} &rarr; {seg.to_point}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <b className="text-amber-400 text-sm">Route {rt.designator}</b>
                      <div className="text-slate-300 mt-1">
                        Segment: <span className="font-mono font-semibold">{seg.from_point} &rarr; {seg.to_point}</span>
                      </div>
                      {seg.distance && <div className="text-slate-400">Distance: {seg.distance} NM</div>}
                      <div className="text-slate-400">Specification: {rt.rnp_type}</div>
                      <div className="text-slate-400">Availability: {rt.availability}</div>
                      <div className="text-slate-500 text-[10px] mt-1">Sequence: {rt.waypoint_sequence}</div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })
          )}

        {/* Waypoints */}
        {showWaypoints &&
          waypoints.map((wp) => (
            <CircleMarker
              key={wp.identifier}
              center={[wp.latitude, wp.longitude]}
              radius={3}
              pathOptions={{ color: "#38bdf8", fillColor: "#0284c7", fillOpacity: 0.8, weight: 1 }}
            >
              <Tooltip>
                <span className="font-mono font-bold text-xs">{wp.identifier}</span>
              </Tooltip>
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <b className="text-cyan-400 text-sm">{wp.identifier}</b>
                  <div className="text-slate-300 font-mono mt-1">
                    {wp.latitude.toFixed(6)}° N, {wp.longitude.toFixed(6)}° E
                  </div>
                  {wp.routes_enr_3_2 && <div className="text-slate-400 mt-1">Routes: {wp.routes_enr_3_2}</div>}
                  <div className="text-slate-500 text-[10px] mt-1">Source: Belgium eAIP ENR 4.4</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Radio Navaids */}
        {showNavaids &&
          navaids.map((nav) => {
            if (!nav.latitude || !nav.longitude) return null;
            return (
              <CircleMarker
                key={nav.key}
                center={[nav.latitude, nav.longitude]}
                radius={5}
                pathOptions={{ color: "#a855f7", fillColor: "#9333ea", fillOpacity: 0.9, weight: 1.5 }}
              >
                <Tooltip>
                  <span className="font-mono font-bold text-xs">{nav.identifier} ({nav.type})</span>
                </Tooltip>
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <b className="text-purple-400 text-sm">{nav.name} ({nav.identifier})</b>
                    <div className="text-slate-300 mt-1">Type: <span className="font-semibold">{nav.type}</span></div>
                    {nav.frequency && (
                      <div className="text-slate-300 font-mono">
                        Frequency: {nav.frequency} {nav.frequency_unit || "MHZ"}
                      </div>
                    )}
                    <div className="text-slate-400 font-mono">
                      {nav.latitude.toFixed(6)}° N, {nav.longitude.toFixed(6)}° E
                    </div>
                    {nav.aerodrome && <div className="text-slate-400">Aerodrome: {nav.aerodrome}</div>}
                    <div className="text-slate-500 text-[10px] mt-1">Source: Belgium eAIP ENR 4.1 / AD 2.19</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Other Aerodromes */}
        {showOtherAirports &&
          airports
            .filter((a) => !a.is_target && a.latitude && a.longitude)
            .map((ad) => (
              <CircleMarker
                key={ad.icao}
                center={[ad.latitude!, ad.longitude!]}
                radius={5}
                pathOptions={{ color: "#10b981", fillColor: "#059669", fillOpacity: 0.85, weight: 1.5 }}
              >
                <Tooltip>
                  <span className="font-mono font-bold text-xs">{ad.icao}</span>
                </Tooltip>
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <b className="text-emerald-400 text-sm">{ad.icao} - {ad.name}</b>
                    {ad.elevation && <div className="text-slate-300">Elevation: {ad.elevation} FT</div>}
                    <div className="text-slate-400">Runways: {ad.runways.map((r) => r.designator).join(", ") || "NIL"}</div>
                    <button
                      onClick={() => onSelectAirport && onSelectAirport(ad.icao)}
                      className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1 px-2 rounded text-[11px]"
                    >
                      Open Operational View
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

        {/* Target Airports (EBBR, EBLG, EBCI) */}
        {showTargetAirports &&
          airports
            .filter((a) => a.is_target && a.latitude && a.longitude)
            .map((ad) => (
              <CircleMarker
                key={ad.icao}
                center={[ad.latitude!, ad.longitude!]}
                radius={10}
                pathOptions={{ color: "#ef4444", fillColor: "#dc2626", fillOpacity: 0.9, weight: 3 }}
              >
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <span className="font-mono font-bold text-xs text-red-600 bg-white/95 px-1 py-0.5 rounded shadow">
                    {ad.icao}
                  </span>
                </Tooltip>
                <Popup>
                  <div className="p-2 font-sans text-xs min-w-[240px]">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-2">
                      <b className="text-red-400 text-base">{ad.icao}</b>
                      <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded">
                        Target Airport
                      </span>
                    </div>
                    <div className="text-slate-200 font-semibold">{ad.operator}</div>
                    <div className="grid grid-cols-2 gap-1 text-slate-300 mt-2">
                      <div>Elevation: <b className="text-white">{ad.elevation} FT</b></div>
                      <div>RFFS: <b className="text-white">{ad.rffs_category}</b></div>
                      <div>Mag Var: <b className="text-white">{ad.magnetic_variation}°</b></div>
                      <div>Hours: <b className="text-white">{ad.hours.ats}</b></div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-700">
                      <b className="text-slate-300">Runways ({ad.runways.length}):</b>
                      <div className="mt-1 space-y-1">
                        {ad.runways.map((r) => (
                          <div key={r.designator} className="flex justify-between text-[11px] font-mono bg-slate-800/80 p-1 rounded">
                            <span className="font-bold text-cyan-400">RWY {r.designator}</span>
                            <span className="text-slate-300">{r.tora}M / {r.lda}M</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectAirport && onSelectAirport(ad.icao)}
                      className="mt-3 w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1.5 px-2 rounded text-xs transition"
                    >
                      Open Operational Cockpit &rarr;
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
      </MapContainer>
    </div>
  );
};
