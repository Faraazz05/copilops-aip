/**
 * CopilOPS Aeronautical Data Platform - Operational Geospatial Map Viewer
 * Author: Mohd Faraz (https://faraazz05.github.io)
 *
 * Implements:
 * - Quiet, high-contrast CartoDB Positron basemap with fallback
 * - Decluttered default view (EBBR, EBLG, EBCI only; routes/navaids/waypoints OFF initially)
 * - Single-airway highlighting with reconstructed polyline disclaimer
 * - Selectable controlled & special-use airspace (CTA/TMA, EBR, EBD) with verified geometry
 * - Reusable provenance inspector panel for selected features
 * - Smart bounds fitting & map resize invalidation
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Polygon,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Layers,
  CheckSquare,
  Square,
  Crosshair,
  RotateCcw,
  Search,
  X,
  Info,
  ShieldAlert,
  Route as RouteIcon,
  Compass,
  FileText,
  MapPin,
  Eye,
} from "lucide-react";
import { IAirport, IRoute, INavaid, IWaypoint, IAirspace } from "../types";
import { ProvenanceCard } from "./ProvenanceCard";

// Target airport coordinates
const TARGET_COORDS: Record<string, [number, number]> = {
  EBBR: [50.901389, 4.484444],
  EBLG: [50.637417, 5.443222],
  EBCI: [50.459200, 4.453819],
};

// Basemap Tile Providers
const BASEMAP_TILES = {
  positron: {
    name: "CartoDB Positron (Quiet Neutral)",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    subdomains: "abcd",
  },
  osm: {
    name: "OpenStreetMap Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    subdomains: "abc",
  },
};

interface MapViewerProps {
  airports: IAirport[];
  routes: IRoute[];
  navaids: INavaid[];
  waypoints: IWaypoint[];
  airspaces?: IAirspace[];
  onSelectAirport?: (icao: string) => void;
}

// Map helper to auto-fit bounds and handle resize
const MapController: React.FC<{
  targetBounds: L.LatLngBoundsExpression | null;
  onFitComplete?: () => void;
}> = ({ targetBounds, onFitComplete }) => {
  const map = useMap();

  useEffect(() => {
    // Invalidate size on mount & container change
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    if (targetBounds) {
      map.fitBounds(targetBounds, {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [300, 40],
        maxZoom: 14,
        animate: true,
      });
      if (onFitComplete) onFitComplete();
    }
  }, [targetBounds, map, onFitComplete]);

  return null;
};

export const MapViewer: React.FC<MapViewerProps> = ({
  airports,
  routes,
  navaids,
  waypoints,
  airspaces = [],
  onSelectAirport,
}) => {
  // Phase 2.1 Default layer visibility
  const [showTargetAirports, setShowTargetAirports] = useState(true);
  const [showOtherAirports, setShowOtherAirports] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showNavaids, setShowNavaids] = useState(false);
  const [showWaypoints, setShowWaypoints] = useState(false);
  const [showTmaCta, setShowTmaCta] = useState(true);
  const [showRestricted, setShowRestricted] = useState(false);

  // Basemap Selection
  const [basemapKey, setBasemapKey] = useState<"positron" | "osm">("positron");

  // Route Selection & Highlighting (Phase 2.3)
  const [selectedRouteName, setSelectedRouteName] = useState<string | null>(null);
  const [routeSearch, setRouteSearch] = useState("");

  // Feature Selection for Provenance Inspector
  const [selectedFeature, setSelectedFeature] = useState<{
    type: "airport" | "route" | "navaid" | "waypoint" | "airspace";
    data: any;
  } | null>(null);

  // Bounds fitting trigger
  const [fitBoundsTarget, setFitBoundsTarget] = useState<L.LatLngBoundsExpression | null>(null);

  // Unresolved Airspace Modal toggle
  const [showUnresolvedAirspace, setShowUnresolvedAirspace] = useState(false);

  // Initial overview bounds covering Belgium & target airports
  const overviewBounds: L.LatLngBoundsExpression = [
    [49.5, 2.5],
    [51.5, 6.4],
  ];

  // Target airports bounds
  const targetAirportsBounds: L.LatLngBoundsExpression = [
    [50.4, 4.4],
    [50.95, 5.5],
  ];

  // Action: Fit target airports
  const handleFitTargetAirports = () => {
    setFitBoundsTarget(targetAirportsBounds);
  };

  // Action: Reset overview
  const handleResetOverview = () => {
    setSelectedRouteName(null);
    setSelectedFeature(null);
    setFitBoundsTarget(overviewBounds);
  };

  // Action: Fit selected feature
  const handleFitSelectedFeature = (feat: any, type: string) => {
    if (type === "airport" && feat.latitude && feat.longitude) {
      setFitBoundsTarget([
        [feat.latitude - 0.05, feat.longitude - 0.05],
        [feat.latitude + 0.05, feat.longitude + 0.05],
      ]);
    } else if (type === "route" && feat.segments) {
      const allCoords: [number, number][] = [];
      feat.segments.forEach((seg: any) => {
        if (seg.coordinates) {
          seg.coordinates.forEach((pt: number[]) => allCoords.push([pt[0], pt[1]]));
        }
      });
      if (allCoords.length >= 2) {
        setFitBoundsTarget(L.latLngBounds(allCoords));
      }
    } else if (type === "airspace" && feat.geometry?.coordinates) {
      const ring = feat.geometry.coordinates[0];
      const pts = ring.map((pt: number[]) => [pt[1], pt[0]] as [number, number]);
      if (pts.length >= 3) {
        setFitBoundsTarget(L.latLngBounds(pts));
      }
    } else if ((type === "navaid" || type === "waypoint") && feat.latitude && feat.longitude) {
      setFitBoundsTarget([
        [feat.latitude - 0.03, feat.longitude - 0.03],
        [feat.latitude + 0.03, feat.longitude + 0.03],
      ]);
    }
  };

  // Active selected route object
  const activeRoute = useMemo(() => {
    if (!selectedRouteName) return null;
    return routes.find((r) => r.designator === selectedRouteName) || null;
  }, [routes, selectedRouteName]);

  // Filtered routes list for search
  const filteredRouteList = useMemo(() => {
    if (!routeSearch) return routes;
    return routes.filter(
      (r) =>
        r.designator.toLowerCase().includes(routeSearch.toLowerCase()) ||
        r.waypoint_sequence.toLowerCase().includes(routeSearch.toLowerCase())
    );
  }, [routes, routeSearch]);

  // Airspaces separated into verified geometries vs unresolved
  const verifiedAirspaces = useMemo(() => {
    return airspaces.filter((a) => a.geometry && a.geometry.coordinates);
  }, [airspaces]);

  const unresolvedAirspaces = useMemo(() => {
    return airspaces.filter((a) => !a.geometry);
  }, [airspaces]);

  // Airspace subsets
  const tmaCtaAirspaces = useMemo(() => {
    return verifiedAirspaces.filter((a) =>
      ["TMA", "CTA", "UIR", "FIR", "CTR", "CONTROLLED_AIRSPACE"].includes(a.airspace_type)
    );
  }, [verifiedAirspaces]);

  const specialUseAirspaces = useMemo(() => {
    return verifiedAirspaces.filter((a) =>
      ["RESTRICTED", "DANGER", "PROHIBITED", "UAS_ZONE"].includes(a.airspace_type)
    );
  }, [verifiedAirspaces]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden font-sans select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-4 z-[1000] flex flex-wrap items-center gap-2">
        {/* Fit Target Airports */}
        <button
          onClick={handleFitTargetAirports}
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition"
          title="Fit view to primary EBBR, EBLG, EBCI target airports"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>Fit Target Airports</span>
        </button>

        {/* Reset Overview */}
        <button
          onClick={handleResetOverview}
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition"
          title="Reset map to full Belgian FIR overview"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset Overview</span>
        </button>

        {/* Route Selector Dropdown & Search (Phase 2.3) */}
        <div className="relative">
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs shadow-xl backdrop-blur-md">
            <RouteIcon className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
            <select
              value={selectedRouteName || ""}
              onChange={(e) => {
                const desig = e.target.value || null;
                setSelectedRouteName(desig);
                if (desig) {
                  const r = routes.find((x) => x.designator === desig);
                  if (r) {
                    setSelectedFeature({ type: "route", data: r });
                    handleFitSelectedFeature(r, "route");
                  }
                } else {
                  if (selectedFeature?.type === "route") setSelectedFeature(null);
                }
              }}
              className="bg-transparent text-slate-200 text-xs font-mono font-semibold focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">
                — Select Single Route to Highlight —
              </option>
              {filteredRouteList.map((r) => (
                <option key={r.designator} value={r.designator} className="bg-slate-900 text-slate-200">
                  {r.designator} ({r.rnp_type}) - {r.waypoint_count} pts
                </option>
              ))}
            </select>

            {selectedRouteName && (
              <button
                onClick={() => {
                  setSelectedRouteName(null);
                  if (selectedFeature?.type === "route") setSelectedFeature(null);
                }}
                className="ml-2 text-slate-400 hover:text-white"
                title="Clear route highlight"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Unresolved Airspace Drawer Trigger */}
        <button
          onClick={() => setShowUnresolvedAirspace(!showUnresolvedAirspace)}
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2.5 py-1.5 rounded-lg shadow-xl text-xs flex items-center gap-1.5 backdrop-blur-md transition"
          title="Inspect airspaces excluded from map geometry due to border or arc limitations"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Airspace Verification Log ({unresolvedAirspaces.length})</span>
        </button>
      </div>

      {/* Floating Layer Controls (Right Top) */}
      <div className="absolute top-3 right-4 z-[1000] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-2 w-64">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 font-semibold text-slate-200">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Map Layer Controls</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">AIRAC 2026-10-01</span>
        </div>

        {/* Basemap Switcher */}
        <div className="pt-0.5 pb-1 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80">
          <span>Basemap Style:</span>
          <div className="flex gap-1 font-mono text-[10px]">
            <button
              onClick={() => setBasemapKey("positron")}
              className={`px-1.5 py-0.5 rounded ${
                basemapKey === "positron" ? "bg-cyan-500 text-white font-bold" : "bg-slate-800 text-slate-300"
              }`}
            >
              Positron
            </button>
            <button
              onClick={() => setBasemapKey("osm")}
              className={`px-1.5 py-0.5 rounded ${
                basemapKey === "osm" ? "bg-cyan-500 text-white font-bold" : "bg-slate-800 text-slate-300"
              }`}
            >
              OSM
            </button>
          </div>
        </div>

        {/* 1. Target Airports (Default ON) */}
        <button
          onClick={() => setShowTargetAirports(!showTargetAirports)}
          className="flex items-center justify-between w-full text-slate-300 hover:text-white py-0.5"
        >
          <div className="flex items-center space-x-2">
            {showTargetAirports ? (
              <CheckSquare className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5 border border-white/50"></span>
              Target Airports
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 font-semibold">3 (EBBR, EBLG, EBCI)</span>
        </button>

        {/* 2. All Aerodromes (Default OFF) */}
        <button
          onClick={() => setShowOtherAirports(!showOtherAirports)}
          className="flex items-center justify-between w-full text-slate-300 hover:text-white py-0.5"
        >
          <div className="flex items-center space-x-2">
            {showOtherAirports ? (
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              Secondary Aerodromes
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{airports.length - 3}</span>
        </button>

        {/* 3. Controlled Airspace (CTA / TMA) */}
        <button
          onClick={() => setShowTmaCta(!showTmaCta)}
          className="flex items-center justify-between w-full text-slate-300 hover:text-white py-0.5"
        >
          <div className="flex items-center space-x-2">
            {showTmaCta ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="flex items-center">
              <span className="w-2.5 h-1.5 bg-blue-500/60 border border-blue-400 mr-1.5 inline-block"></span>
              Control Areas (TMA / CTA)
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{tmaCtaAirspaces.length} verified</span>
        </button>

        {/* 4. Special-Use Airspace (Restricted EBR & Danger EBD) */}
        <button
          onClick={() => setShowRestricted(!showRestricted)}
          className="flex items-center justify-between w-full text-slate-300 hover:text-white py-0.5"
        >
          <div className="flex items-center space-x-2">
            {showRestricted ? (
              <CheckSquare className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="flex items-center">
              <span className="w-2.5 h-1.5 bg-rose-500/60 border border-rose-400 mr-1.5 inline-block"></span>
              Special-Use (EBR / EBD)
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{specialUseAirspaces.length} verified</span>
        </button>

        {/* 5. ATS Airways Network (Default OFF) */}
        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className="flex items-center justify-between w-full text-slate-300 hover:text-white py-0.5"
        >
          <div className="flex items-center space-x-2">
            {showRoutes ? (
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="flex items-center">
              <span className="w-3 h-0.5 bg-amber-500 mr-1.5 inline-block"></span>
              Full ATS Route Network
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{routes.length}</span>
        </button>

        {/* 6. Radio Navaids (Default OFF) */}
        <button
          onClick={() => setShowNavaids(!showNavaids)}
          className="flex items-center justify-between w-full text-slate-300 hover:text-white py-0.5"
        >
          <div className="flex items-center space-x-2">
            {showNavaids ? (
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-sm bg-purple-500 mr-1.5"></span>
              Radio Navaids
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{navaids.length}</span>
        </button>

        {/* 7. Waypoints (Default OFF) */}
        <button
          onClick={() => setShowWaypoints(!showWaypoints)}
          className="flex items-center justify-between w-full text-slate-300 hover:text-white py-0.5"
        >
          <div className="flex items-center space-x-2">
            {showWaypoints ? (
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5"></span>
              Waypoints (ENR 4.4)
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{waypoints.length}</span>
        </button>
      </div>

      {/* Selected Feature Provenance Card (Left Bottom) */}
      {selectedFeature && (
        <div className="absolute bottom-6 left-4 z-[1000]">
          {selectedFeature.type === "airport" && (
            <ProvenanceCard
              title={selectedFeature.data.name}
              subtitle={selectedFeature.data.operator}
              entityType="Aerodrome"
              entityKey={selectedFeature.data.icao}
              provenance={selectedFeature.data.provenance}
              validationStatus={selectedFeature.data.provenance?.validation_status || "PUBLISHED"}
              fields={[
                { label: "Elevation", value: selectedFeature.data.elevation, unit: "FT", section: `${selectedFeature.data.icao} AD 2.2` },
                { label: "Magnetic Var", value: selectedFeature.data.magnetic_variation, unit: `° (${selectedFeature.data.magnetic_variation_year || "—"})`, section: `${selectedFeature.data.icao} AD 2.2` },
                { label: "RFFS Category", value: selectedFeature.data.rffs_category || "Not published", section: `${selectedFeature.data.icao} AD 2.6` },
                { label: "ATS Operating Hours", value: selectedFeature.data.hours?.ats || "Not published", section: `${selectedFeature.data.icao} AD 2.3` },
                { label: "ARP Coordinates", value: `${selectedFeature.data.latitude?.toFixed(4)}° N, ${selectedFeature.data.longitude?.toFixed(4)}° E`, section: `${selectedFeature.data.icao} AD 2.2` },
                { label: "Runway Count", value: selectedFeature.data.runways?.length || 0, section: `${selectedFeature.data.icao} AD 2.12` },
              ]}
              onClose={() => setSelectedFeature(null)}
            />
          )}

          {selectedFeature.type === "route" && (
            <ProvenanceCard
              title={`Airway ${selectedFeature.data.designator}`}
              subtitle={`Navigation Specification: ${selectedFeature.data.rnp_type}`}
              entityType="ATS Airway"
              entityKey={selectedFeature.data.designator}
              provenance={selectedFeature.data.provenance}
              validationStatus="RECONSTRUCTED_FROM_FIXES"
              disclaimer="Polyline connects published fixes in sequence; does not represent surveyed route centerline."
              fields={[
                { label: "Navigation Spec", value: selectedFeature.data.rnp_type, section: "ENR 3.2" },
                { label: "Availability", value: selectedFeature.data.availability || "Not published", section: "ENR 3.2" },
                { label: "Waypoint Count", value: selectedFeature.data.waypoint_count, section: "ENR 3.2" },
                { label: "Segments", value: selectedFeature.data.segments?.length || 0, section: "ENR 3.2" },
              ]}
              rawBoundaryText={`Waypoint Sequence: ${selectedFeature.data.waypoint_sequence}`}
              onClose={() => {
                setSelectedFeature(null);
                setSelectedRouteName(null);
              }}
            />
          )}

          {selectedFeature.type === "airspace" && (
            <ProvenanceCard
              title={selectedFeature.data.name}
              subtitle={`Classification: ${selectedFeature.data.classification || "N/A"}`}
              entityType={selectedFeature.data.airspace_type}
              entityKey={selectedFeature.data.designator}
              provenance={selectedFeature.data.provenance}
              validationStatus={selectedFeature.data.validation_status}
              validationIssues={selectedFeature.data.validation_issues}
              fields={[
                { label: "Upper Limit", value: selectedFeature.data.upper_limit },
                { label: "Lower Limit", value: selectedFeature.data.lower_limit },
                { label: "Vertical Reference", value: selectedFeature.data.vertical_limit_reference || "Standard" },
                { label: "Controlling Unit", value: selectedFeature.data.controlling_authority || "Brussels ACC" },
                { label: "Activity / Schedule", value: selectedFeature.data.activation_schedule || "H24" },
                { label: "Temporal Type", value: selectedFeature.data.temporal_type || "PERMANENT" },
              ]}
              rawBoundaryText={selectedFeature.data.boundary_text}
              onClose={() => setSelectedFeature(null)}
            />
          )}

          {selectedFeature.type === "navaid" && (
            <ProvenanceCard
              title={selectedFeature.data.name}
              subtitle={`Type: ${selectedFeature.data.type}`}
              entityType="Radio Navaid"
              entityKey={selectedFeature.data.identifier}
              provenance={selectedFeature.data.provenance}
              fields={[
                { label: "Frequency", value: selectedFeature.data.frequency, unit: selectedFeature.data.frequency_unit || "MHZ" },
                { label: "Operating Hours", value: selectedFeature.data.hours || "Not published" },
                { label: "Coordinates", value: `${selectedFeature.data.latitude?.toFixed(5)}° N, ${selectedFeature.data.longitude?.toFixed(5)}° E` },
                { label: "Associated Aerodrome", value: selectedFeature.data.aerodrome || "En-route" },
              ]}
              onClose={() => setSelectedFeature(null)}
            />
          )}

          {selectedFeature.type === "waypoint" && (
            <ProvenanceCard
              title={`Reporting Point ${selectedFeature.data.identifier}`}
              subtitle="En-route Navigation Fix"
              entityType="Waypoint"
              entityKey={selectedFeature.data.identifier}
              provenance={selectedFeature.data.provenance}
              fields={[
                { label: "Latitude", value: `${selectedFeature.data.latitude?.toFixed(6)}° N` },
                { label: "Longitude", value: `${selectedFeature.data.longitude?.toFixed(6)}° E` },
                { label: "Associated Routes", value: selectedFeature.data.routes_enr_3_2 || "None listed" },
              ]}
              rawBoundaryText={selectedFeature.data.raw_text}
              onClose={() => setSelectedFeature(null)}
            />
          )}
        </div>
      )}

      {/* Unresolved Airspace Modal / Drawer */}
      {showUnresolvedAirspace && (
        <div className="absolute inset-y-0 right-0 z-[1100] w-96 bg-slate-900/98 backdrop-blur-md border-l border-slate-800 shadow-2xl p-5 overflow-y-auto text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-white text-sm">Airspace Verification Log</h3>
                <p className="text-[10px] text-slate-400">Deterministic Boundary Integrity State</p>
              </div>
            </div>
            <button
              onClick={() => setShowUnresolvedAirspace(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="bg-amber-950/40 border border-amber-900/60 p-3 rounded-lg text-amber-200 text-[11px] leading-relaxed">
            <b>Safety Notice:</b> In strict compliance with geospatial data engineering standards, CopilOPS never fabricates polygon coordinates or closes rings with guessed vertices. Airspaces that reference non-surveyed international borders or complex circular arcs are excluded from the visual vector layer and retained as verified text records below.
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-slate-400 font-mono text-[11px] pb-1 border-b border-slate-800">
              <span>Excluded Airspaces ({unresolvedAirspaces.length})</span>
              <span>Reason</span>
            </div>

            {unresolvedAirspaces.map((a) => (
              <div
                key={a.id}
                onClick={() => {
                  setSelectedFeature({ type: "airspace", data: a });
                  setShowUnresolvedAirspace(false);
                }}
                className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 hover:border-cyan-500/50 cursor-pointer transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-400">{a.designation}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    {a.validation_status}
                  </span>
                </div>
                <div className="text-slate-200 text-[11px] font-semibold">{a.name}</div>
                <div className="text-slate-400 text-[10px] font-mono truncate">{a.boundary_text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Legend (Bottom Right) */}
      <div className="absolute bottom-3 right-4 z-[900] bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg shadow-xl text-[10px] text-slate-300 space-y-1.5 hidden sm:block">
        <div className="font-semibold text-slate-200 border-b border-slate-700/60 pb-1 flex items-center justify-between gap-4">
          <span>Map Hierarchy Legend</span>
          <span className="text-slate-400 font-normal">CartoDB Positron</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white"></span>
            <span>Target Airport</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Aerodrome</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 bg-blue-500/40 border border-blue-400 inline-block"></span>
            <span>CTA / TMA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 bg-rose-500/50 border border-rose-400 inline-block"></span>
            <span>Restricted (EBR)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
            <span>ATS Airway</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-purple-500 rounded-sm inline-block"></span>
            <span>Navaid</span>
          </div>
        </div>
        <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-800">
          Geographic reference only. Not for in-flight navigation.
        </div>
      </div>

      {/* Main Leaflet Map Container */}
      <MapContainer
        center={[50.75, 4.47]}
        zoom={8}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapController
          targetBounds={fitBoundsTarget}
          onFitComplete={() => setFitBoundsTarget(null)}
        />

        {/* Selected Basemap TileLayer (CartoDB Positron default) */}
        <TileLayer
          attribution={BASEMAP_TILES[basemapKey].attribution}
          url={BASEMAP_TILES[basemapKey].url}
          subdomains={BASEMAP_TILES[basemapKey].subdomains}
          maxZoom={19}
        />

        {/* 1. Controlled Airspace (TMA / CTA Polygons) */}
        {showTmaCta &&
          tmaCtaAirspaces.map((air) => {
            if (!air.geometry?.coordinates) return null;
            const positions = air.geometry.coordinates[0].map((pt: number[]) => [pt[1], pt[0]] as [number, number]);
            const isSelected = selectedFeature?.type === "airspace" && selectedFeature?.data?.id === air.id;

            return (
              <Polygon
                key={air.id}
                positions={positions}
                pathOptions={{
                  color: isSelected ? "#06b6d4" : "#2563eb",
                  fillColor: isSelected ? "#06b6d4" : "#3b82f6",
                  fillOpacity: isSelected ? 0.35 : 0.12,
                  weight: isSelected ? 2.5 : 1.2,
                  dashArray: "4 3",
                }}
                eventHandlers={{
                  click: () => setSelectedFeature({ type: "airspace", data: air }),
                }}
              >
                <Tooltip sticky>
                  <span className="font-mono font-bold text-xs">
                    {air.name} ({air.airspace_type})
                  </span>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* 2. Special-Use Airspace (Restricted EBR & Danger EBD Polygons) */}
        {showRestricted &&
          specialUseAirspaces.map((air) => {
            if (!air.geometry?.coordinates) return null;
            const positions = air.geometry.coordinates[0].map((pt: number[]) => [pt[1], pt[0]] as [number, number]);
            const isSelected = selectedFeature?.type === "airspace" && selectedFeature?.data?.id === air.id;
            const isDanger = air.airspace_type === "DANGER";
            const color = isSelected ? "#06b6d4" : isDanger ? "#ea580c" : "#e11d48";
            const fillColor = isSelected ? "#06b6d4" : isDanger ? "#f97316" : "#f43f5e";

            return (
              <Polygon
                key={air.id}
                positions={positions}
                pathOptions={{
                  color: color,
                  fillColor: fillColor,
                  fillOpacity: isSelected ? 0.4 : 0.2,
                  weight: isSelected ? 3 : 1.8,
                  dashArray: isDanger ? "6 3" : undefined,
                }}
                eventHandlers={{
                  click: () => setSelectedFeature({ type: "airspace", data: air }),
                }}
              >
                <Tooltip sticky>
                  <span className="font-mono font-bold text-xs">
                    {air.designation} - {air.name} ({air.upper_limit}/{air.lower_limit})
                  </span>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* 3. Full ATS Route Network (Subdued unless active) */}
        {showRoutes &&
          routes.map((rt) => {
            const isRouteHighlighted = selectedRouteName === rt.designator;
            return rt.segments.map((seg, sIdx) => {
              if (!seg.coordinates || seg.coordinates.length < 2) return null;
              return (
                <Polyline
                  key={`all-${rt.designator}-${sIdx}`}
                  positions={seg.coordinates as [number, number][]}
                  pathOptions={{
                    color: isRouteHighlighted ? "#06b6d4" : selectedRouteName ? "#94a3b8" : "#f59e0b",
                    weight: isRouteHighlighted ? 3.5 : selectedRouteName ? 1 : 1.8,
                    opacity: isRouteHighlighted ? 1 : selectedRouteName ? 0.25 : 0.55,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedRouteName(rt.designator);
                      setSelectedFeature({ type: "route", data: rt });
                      handleFitSelectedFeature(rt, "route");
                    },
                  }}
                >
                  <Tooltip sticky>
                    <span className="font-mono text-xs font-bold">
                      {rt.designator}: {seg.from_point} &rarr; {seg.to_point}
                    </span>
                  </Tooltip>
                </Polyline>
              );
            });
          })}

        {/* 4. Single Selected Route Highlight (Phase 2.3) */}
        {activeRoute && !showRoutes &&
          activeRoute.segments.map((seg, sIdx) => {
            if (!seg.coordinates || seg.coordinates.length < 2) return null;
            return (
              <Polyline
                key={`sel-${activeRoute.designator}-${sIdx}`}
                positions={seg.coordinates as [number, number][]}
                pathOptions={{
                  color: "#0284c7",
                  weight: 3.5,
                  opacity: 0.95,
                }}
                eventHandlers={{
                  click: () => setSelectedFeature({ type: "route", data: activeRoute }),
                }}
              >
                <Tooltip sticky>
                  <span className="font-mono text-xs font-bold">
                    {activeRoute.designator}: {seg.from_point} &rarr; {seg.to_point}
                  </span>
                </Tooltip>
              </Polyline>
            );
          })}

        {/* 5. Radio Navaids (Default OFF) */}
        {showNavaids &&
          navaids.map((nav) => {
            if (!nav.latitude || !nav.longitude) return null;
            const isSelected = selectedFeature?.type === "navaid" && selectedFeature?.data?.key === nav.key;
            return (
              <CircleMarker
                key={nav.key}
                center={[nav.latitude, nav.longitude]}
                radius={isSelected ? 6 : 4}
                pathOptions={{
                  color: isSelected ? "#06b6d4" : "#9333ea",
                  fillColor: isSelected ? "#0891b2" : "#a855f7",
                  fillOpacity: 0.9,
                  weight: isSelected ? 2.5 : 1.5,
                }}
                eventHandlers={{
                  click: () => setSelectedFeature({ type: "navaid", data: nav }),
                }}
              >
                <Tooltip direction="top">
                  <span className="font-mono font-bold text-xs">{nav.identifier} ({nav.type})</span>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* 6. Waypoints (Default OFF, Hover tooltips, no clutter) */}
        {showWaypoints &&
          waypoints.map((wp) => {
            const isSelected = selectedFeature?.type === "waypoint" && selectedFeature?.data?.identifier === wp.identifier;
            return (
              <CircleMarker
                key={wp.identifier}
                center={[wp.latitude, wp.longitude]}
                radius={isSelected ? 5 : 2.5}
                pathOptions={{
                  color: isSelected ? "#06b6d4" : "#0284c7",
                  fillColor: isSelected ? "#22d3ee" : "#38bdf8",
                  fillOpacity: 0.85,
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => setSelectedFeature({ type: "waypoint", data: wp }),
                }}
              >
                <Tooltip direction="top">
                  <span className="font-mono font-bold text-xs">{wp.identifier}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* 7. Secondary Aerodromes (Default OFF, Subdued) */}
        {showOtherAirports &&
          airports
            .filter((a) => !a.is_target && a.latitude && a.longitude)
            .map((ad) => {
              const isSelected = selectedFeature?.type === "airport" && selectedFeature?.data?.icao === ad.icao;
              return (
                <CircleMarker
                  key={ad.icao}
                  center={[ad.latitude!, ad.longitude!]}
                  radius={isSelected ? 7 : 4.5}
                  pathOptions={{
                    color: isSelected ? "#06b6d4" : "#059669",
                    fillColor: isSelected ? "#22d3ee" : "#10b981",
                    fillOpacity: 0.8,
                    weight: isSelected ? 2.5 : 1.2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedFeature({ type: "airport", data: ad }),
                  }}
                >
                  <Tooltip direction="top">
                    <span className="font-mono font-bold text-xs">{ad.icao} - {ad.name}</span>
                  </Tooltip>
                </CircleMarker>
              );
            })}

        {/* 8. Target Airports (EBBR, EBLG, EBCI - Prominent, Default ON) */}
        {showTargetAirports &&
          airports
            .filter((a) => a.is_target && a.latitude && a.longitude)
            .map((ad) => {
              const isSelected = selectedFeature?.type === "airport" && selectedFeature?.data?.icao === ad.icao;
              return (
                <CircleMarker
                  key={ad.icao}
                  center={[ad.latitude!, ad.longitude!]}
                  radius={isSelected ? 11 : 8.5}
                  pathOptions={{
                    color: isSelected ? "#06b6d4" : "#b91c1c",
                    fillColor: isSelected ? "#0891b2" : "#dc2626",
                    fillOpacity: 0.95,
                    weight: isSelected ? 3.5 : 2.5,
                  }}
                  eventHandlers={{
                    click: () => setSelectedFeature({ type: "airport", data: ad }),
                  }}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <span className="font-mono font-bold text-xs text-red-700 bg-white/95 px-1.5 py-0.5 rounded shadow border border-red-300">
                      {ad.icao}
                    </span>
                  </Tooltip>

                  <Popup>
                    <div className="p-2 font-sans text-xs min-w-[250px] space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <div>
                          <span className="font-mono font-extrabold text-base text-red-500">{ad.icao}</span>
                          <span className="text-[10px] text-slate-400 block font-semibold">{ad.name}</span>
                        </div>
                        <span className="text-[9px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          PRIMARY TARGET
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300">
                        Operator: <b className="text-white">{ad.operator}</b>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                        <div>Elevation: <b className="text-white">{ad.elevation ?? "—"} FT</b></div>
                        <div>RFFS: <b className="text-white">{ad.rffs_category || "Not published"}</b></div>
                        <div>Mag Var: <b className="text-white">{ad.magnetic_variation ?? "—"}°</b></div>
                        <div>ATS Hours: <b className="text-white">{ad.hours?.ats || "Not published"}</b></div>
                      </div>

                      <div className="pt-1">
                        <span className="text-slate-400 text-[10px] font-semibold">Published Runways:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ad.runways.map((r) => (
                            <span key={r.designator} className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-300">
                              RWY {r.designator} ({r.lda ?? "—"}M)
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => onSelectAirport && onSelectAirport(ad.icao)}
                          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1 px-2 rounded text-xs transition text-center"
                        >
                          Open Cockpit &rarr;
                        </button>
                        <button
                          onClick={() => setSelectedFeature({ type: "airport", data: ad })}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs border border-slate-700"
                        >
                          Provenance
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
      </MapContainer>
    </div>
  );
};
