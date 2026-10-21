/**
 * CopilOPS — Aviation Operations Intelligence
 * Operational Geospatial Map Viewer (CARTO Positron Basemap + Dark Aviation Console)
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */

import React, { useState, useEffect, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { IAirport, IRoute, INavaid, IWaypoint, IAirspace } from "../types";
import { ProvenanceCard } from "./ProvenanceCard";
import { StatusBadge } from "./common/StatusBadge";

// Target airport coordinates
const TARGET_COORDS: Record<string, [number, number]> = {
  EBBR: [50.901389, 4.484444],
  EBLG: [50.637417, 5.443222],
  EBCI: [50.459200, 4.453819],
};

// Basemap Tile Providers
const BASEMAP_TILES = {
  positron: {
    name: "CARTO Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    subdomains: "abcd",
  },
  osm: {
    name: "OpenStreetMap",
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
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    if (targetBounds) {
      map.fitBounds(targetBounds, {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [320, 40],
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
  // Layer visibility states (Default: Target Airports ON, TMA/CTA ON; airways, other airports, navaids, waypoints OFF)
  const [showTargetAirports, setShowTargetAirports] = useState(true);
  const [showOtherAirports, setShowOtherAirports] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showNavaids, setShowNavaids] = useState(false);
  const [showWaypoints, setShowWaypoints] = useState(false);
  const [showTmaCta, setShowTmaCta] = useState(true);
  const [showRestricted, setShowRestricted] = useState(false);

  // Basemap Selection
  const [basemapKey, setBasemapKey] = useState<"positron" | "osm">("positron");

  // Route Selection & Highlighting
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

  // Layer panel collapsed state
  const [layersOpen, setLayersOpen] = useState(true);

  // Legend collapsed state
  const [legendOpen, setLegendOpen] = useState(false);

  // Initial overview bounds covering Belgium & target airports
  const overviewBounds: L.LatLngBoundsExpression = [
    [49.45, 2.45],
    [51.55, 6.45],
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

  // Action: Fit single airport
  const handleFocusAirport = (icao: string) => {
    const coords = TARGET_COORDS[icao];
    if (coords) {
      setFitBoundsTarget([
        [coords[0] - 0.05, coords[1] - 0.05],
        [coords[0] + 0.05, coords[1] + 0.05],
      ]);
      const found = airports.find((a) => a.icao === icao);
      if (found) {
        setSelectedFeature({ type: "airport", data: found });
      }
    }
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
        [feat.latitude - 0.06, feat.longitude - 0.06],
        [feat.latitude + 0.06, feat.longitude + 0.06],
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
        [feat.latitude - 0.04, feat.longitude - 0.04],
        [feat.latitude + 0.04, feat.longitude + 0.04],
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

  // Count active layers
  const activeLayerCount = [
    showTargetAirports,
    showOtherAirports,
    showTmaCta,
    showRestricted,
    showRoutes,
    showNavaids,
    showWaypoints,
  ].filter(Boolean).length;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-[#070D18] overflow-hidden font-sans select-none">
      {/* Top Operations Toolbar */}
      <div className="absolute top-3 left-4 z-[1000] flex flex-wrap items-center gap-2 max-w-[calc(100vw-2rem)] pointer-events-auto">
        {/* Target Airport Quick Focus Group */}
        <div className="flex items-center bg-[#0D1726]/95 border border-[#26374B] rounded-lg p-1 shadow-lg backdrop-blur-sm">
          <span className="text-[10px] font-mono font-semibold text-[#74869C] px-2 uppercase">
            Focus
          </span>
          <div className="flex items-center gap-1 font-mono text-xs">
            {["EBBR", "EBLG", "EBCI"].map((icao) => (
              <button
                key={icao}
                onClick={() => handleFocusAirport(icao)}
                className="px-2 py-0.5 rounded bg-[#121F31] hover:bg-[#17263A] text-[#F1F5FA] hover:text-[#37C9D6] border border-[#26374B] transition-colors"
                title={`Focus ${icao}`}
              >
                {icao}
              </button>
            ))}
          </div>
          <button
            onClick={handleFitTargetAirports}
            className="ml-1 px-2 py-0.5 rounded text-[11px] text-[#A5B3C4] hover:text-[#F1F5FA] hover:bg-[#121F31] flex items-center gap-1 transition-colors"
            title="Fit all target airports"
          >
            <Crosshair className="w-3 h-3 text-[#37C9D6]" />
            <span className="hidden sm:inline">All 3</span>
          </button>
        </div>

        {/* Reset FIR Overview */}
        <button
          onClick={handleResetOverview}
          className="bg-[#0D1726]/95 hover:bg-[#121F31] text-[#F1F5FA] border border-[#26374B] px-2.5 py-1.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm transition-colors"
          title="Reset map view to Belgian FIR overview"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#E9B45B]" />
          <span className="hidden sm:inline">Reset FIR</span>
        </button>

        {/* Route Selector Dropdown & Quick Search */}
        <div className="relative">
          <div className="flex items-center bg-[#0D1726]/95 border border-[#26374B] rounded-lg px-2.5 py-1 text-xs shadow-lg backdrop-blur-sm">
            <RouteIcon className="w-3.5 h-3.5 text-[#E9B45B] mr-1.5 shrink-0" />
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
              className="bg-transparent text-[#F1F5FA] text-xs font-mono font-medium focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
              aria-label="Select ATS Route to Highlight"
            >
              <option value="" className="bg-[#0D1726] text-[#74869C]">
                — Select Route —
              </option>
              {filteredRouteList.map((r) => (
                <option key={r.designator} value={r.designator} className="bg-[#0D1726] text-[#F1F5FA]">
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
                className="ml-2 text-[#74869C] hover:text-[#F1F5FA]"
                title="Clear route highlight"
                aria-label="Clear route"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Airspace Verification Log Trigger */}
        <button
          onClick={() => setShowUnresolvedAirspace(!showUnresolvedAirspace)}
          className={`px-2.5 py-1.5 rounded-lg border shadow-lg text-xs flex items-center gap-1.5 backdrop-blur-sm transition-colors ${
            showUnresolvedAirspace
              ? "bg-[#17263A] text-[#37C9D6] border-[#37C9D6]/40"
              : "bg-[#0D1726]/95 hover:bg-[#121F31] text-[#A5B3C4] border-[#26374B]"
          }`}
          title="Inspect airspaces excluded from map vector geometry due to non-surveyed border or arc limitations"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-[#E9B45B]" />
          <span className="hidden md:inline">Airspace Verification Log</span>
          <span className="font-mono text-[10px] bg-[#121F31] px-1.5 py-0.2 rounded border border-[#26374B]">
            {unresolvedAirspaces.length}
          </span>
        </button>
      </div>

      {/* Floating Layer Controls Panel (Right Top) */}
      <div className="absolute top-3 right-4 z-[1000] bg-[#0D1726]/95 backdrop-blur-sm border border-[#26374B] rounded-xl shadow-2xl text-xs w-64 pointer-events-auto">
        <div
          className="flex items-center justify-between p-3 cursor-pointer select-none hover:bg-[#121F31]/40 rounded-t-xl transition-colors"
          onClick={() => setLayersOpen(!layersOpen)}
        >
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#37C9D6]" />
            <span className="font-semibold text-[#F1F5FA]">Map Layers</span>
            <span className="text-[10px] font-mono bg-[#121F31] text-[#37C9D6] px-1.5 py-0.2 rounded border border-[#26374B]">
              {activeLayerCount} active
            </span>
          </div>
          <button className="text-[#74869C] hover:text-[#F1F5FA]" aria-label="Toggle layer controls">
            {layersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {layersOpen && (
          <div className="p-3 pt-0 space-y-2 border-t border-[#26374B]/60">
            {/* Basemap Style Selector */}
            <div className="pt-2 pb-2 flex items-center justify-between text-[11px] text-[#A5B3C4] border-b border-[#26374B]/40">
              <span className="font-medium">Basemap:</span>
              <div className="flex gap-1 font-mono text-[10px]">
                <button
                  onClick={() => setBasemapKey("positron")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    basemapKey === "positron"
                      ? "bg-[#37C9D6] text-[#070D18] font-bold"
                      : "bg-[#121F31] text-[#A5B3C4] hover:text-[#F1F5FA]"
                  }`}
                >
                  Positron
                </button>
                <button
                  onClick={() => setBasemapKey("osm")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    basemapKey === "osm"
                      ? "bg-[#37C9D6] text-[#070D18] font-bold"
                      : "bg-[#121F31] text-[#A5B3C4] hover:text-[#F1F5FA]"
                  }`}
                >
                  OSM
                </button>
              </div>
            </div>

            {/* Aerodromes Group */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-semibold text-[#74869C] tracking-wider block">
                Aerodromes
              </span>

              {/* 1. Target Airports (Default ON) */}
              <button
                onClick={() => setShowTargetAirports(!showTargetAirports)}
                className="flex items-center justify-between w-full text-[#A5B3C4] hover:text-[#F1F5FA] py-1 rounded px-1 hover:bg-[#121F31]/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {showTargetAirports ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#F16C78]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#74869C]" />
                  )}
                  <span className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F16C78] mr-1.5 border border-white/60"></span>
                    Target Airports
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#74869C] font-semibold">
                  3 (EBBR, EBLG, EBCI)
                </span>
              </button>

              {/* 2. Secondary Aerodromes (Default OFF) */}
              <button
                onClick={() => setShowOtherAirports(!showOtherAirports)}
                className="flex items-center justify-between w-full text-[#A5B3C4] hover:text-[#F1F5FA] py-1 rounded px-1 hover:bg-[#121F31]/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {showOtherAirports ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#47C995]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#74869C]" />
                  )}
                  <span className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#47C995] mr-1.5"></span>
                    Secondary Aerodromes
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#74869C]">
                  {Math.max(0, airports.length - 3)}
                </span>
              </button>
            </div>

            {/* Airspace Group */}
            <div className="space-y-1 pt-1 border-t border-[#26374B]/40">
              <span className="text-[10px] uppercase font-mono font-semibold text-[#74869C] tracking-wider block">
                Airspace
              </span>

              {/* 3. Controlled Airspace (CTA / TMA) */}
              <button
                onClick={() => setShowTmaCta(!showTmaCta)}
                className="flex items-center justify-between w-full text-[#A5B3C4] hover:text-[#F1F5FA] py-1 rounded px-1 hover:bg-[#121F31]/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {showTmaCta ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#6C9EFF]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#74869C]" />
                  )}
                  <span className="flex items-center">
                    <span className="w-2.5 h-1.5 bg-[#6C9EFF]/50 border border-[#6C9EFF] mr-1.5 inline-block"></span>
                    Control Areas (TMA/CTA)
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#74869C]">
                  {tmaCtaAirspaces.length} verified
                </span>
              </button>

              {/* 4. Special-Use Airspace (EBR / EBD) */}
              <button
                onClick={() => setShowRestricted(!showRestricted)}
                className="flex items-center justify-between w-full text-[#A5B3C4] hover:text-[#F1F5FA] py-1 rounded px-1 hover:bg-[#121F31]/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {showRestricted ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#F16C78]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#74869C]" />
                  )}
                  <span className="flex items-center">
                    <span className="w-2.5 h-1.5 bg-[#F16C78]/50 border border-[#F16C78] mr-1.5 inline-block"></span>
                    Special-Use (EBR/EBD)
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#74869C]">
                  {specialUseAirspaces.length} verified
                </span>
              </button>
            </div>

            {/* Routes & Navigation Group */}
            <div className="space-y-1 pt-1 border-t border-[#26374B]/40">
              <span className="text-[10px] uppercase font-mono font-semibold text-[#74869C] tracking-wider block">
                Routes &amp; Navigation
              </span>

              {/* 5. ATS Airways Network (Default OFF) */}
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                className="flex items-center justify-between w-full text-[#A5B3C4] hover:text-[#F1F5FA] py-1 rounded px-1 hover:bg-[#121F31]/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {showRoutes ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#E9B45B]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#74869C]" />
                  )}
                  <span className="flex items-center">
                    <span className="w-3 h-0.5 bg-[#E9B45B] mr-1.5 inline-block"></span>
                    Full ATS Network
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#74869C]">{routes.length}</span>
              </button>

              {/* 6. Radio Navaids (Default OFF) */}
              <button
                onClick={() => setShowNavaids(!showNavaids)}
                className="flex items-center justify-between w-full text-[#A5B3C4] hover:text-[#F1F5FA] py-1 rounded px-1 hover:bg-[#121F31]/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {showNavaids ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#A855F7]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#74869C]" />
                  )}
                  <span className="flex items-center">
                    <span className="w-2 h-2 rounded-sm bg-[#A855F7] mr-1.5"></span>
                    Radio Navaids
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#74869C]">{navaids.length}</span>
              </button>

              {/* 7. Waypoints (Default OFF) */}
              <button
                onClick={() => setShowWaypoints(!showWaypoints)}
                className="flex items-center justify-between w-full text-[#A5B3C4] hover:text-[#F1F5FA] py-1 rounded px-1 hover:bg-[#121F31]/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {showWaypoints ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#37C9D6]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#74869C]" />
                  )}
                  <span className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#37C9D6] mr-1.5"></span>
                    Waypoints (ENR 4.4)
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#74869C]">{waypoints.length}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Feature Provenance / Details Panel (Left Bottom) */}
      {selectedFeature && (
        <div className="absolute bottom-5 left-4 z-[1000] pointer-events-auto max-h-[calc(100vh-140px)] overflow-y-auto">
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
              subtitle={`Navigation Spec: ${selectedFeature.data.rnp_type}`}
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
        <div className="absolute inset-y-0 right-0 z-[1100] w-96 bg-[#0D1726]/98 backdrop-blur-md border-l border-[#26374B] shadow-2xl p-5 overflow-y-auto text-xs space-y-4 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-[#26374B] pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#E9B45B]" />
              <div>
                <h3 className="font-bold text-[#F1F5FA] text-sm">Airspace Verification Log</h3>
                <p className="text-[10px] text-[#74869C]">Deterministic Boundary Integrity State</p>
              </div>
            </div>
            <button
              onClick={() => setShowUnresolvedAirspace(false)}
              className="text-[#74869C] hover:text-[#F1F5FA] p-1 rounded hover:bg-[#121F31]"
              aria-label="Close verification log"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#E9B45B]/10 border border-[#E9B45B]/30 p-3 rounded-lg text-[#E9B45B] text-[11px] leading-relaxed">
            <b>Safety Notice:</b> In strict compliance with geospatial data engineering standards, CopilOPS never fabricates polygon coordinates or closes rings with guessed vertices. Airspaces that reference non-surveyed international borders or complex circular arcs are excluded from the visual vector layer and retained as verified text records below.
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between text-[#74869C] font-mono text-[11px] pb-1 border-b border-[#26374B]">
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
                className="bg-[#070D18] p-2.5 rounded-lg border border-[#26374B] hover:border-[#37C9D6]/50 cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#37C9D6]">{a.designation}</span>
                  <StatusBadge variant="amber" mono size="xs">
                    {a.validation_status}
                  </StatusBadge>
                </div>
                <div className="text-[#F1F5FA] text-[11px] font-semibold">{a.name}</div>
                <div className="text-[#74869C] text-[10px] font-mono truncate">{a.boundary_text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Legend (Bottom Right) */}
      <div className="absolute bottom-3 right-4 z-[900] bg-[#0D1726]/95 backdrop-blur-sm border border-[#26374B] rounded-lg shadow-xl text-[10px] text-[#A5B3C4] pointer-events-auto hidden sm:block">
        <button
          onClick={() => setLegendOpen(!legendOpen)}
          className="w-full p-2 flex items-center justify-between gap-3 text-left hover:text-[#F1F5FA] font-medium"
        >
          <span className="font-semibold text-[#F1F5FA]">Map Legend</span>
          <span className="text-[10px] text-[#74869C]">Positron</span>
        </button>

        {legendOpen && (
          <div className="p-2.5 pt-0 border-t border-[#26374B]/60 space-y-1.5">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F16C78] border border-white"></span>
                <span>Target Airport</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#47C995]"></span>
                <span>Aerodrome</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 bg-[#6C9EFF]/40 border border-[#6C9EFF] inline-block"></span>
                <span>CTA / TMA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 bg-[#F16C78]/50 border border-[#F16C78] inline-block"></span>
                <span>Restricted (EBR)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#E9B45B] inline-block"></span>
                <span>ATS Airway</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#A855F7] rounded-sm inline-block"></span>
                <span>Navaid</span>
              </div>
            </div>
            <div className="text-[9px] text-[#74869C] pt-1 border-t border-[#26374B]/40">
              Aeronautical data reference &bull; Not for navigation
            </div>
          </div>
        )}
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
                  color: isSelected ? "#37C9D6" : "#4A7BD5",
                  fillColor: isSelected ? "#37C9D6" : "#6C9EFF",
                  fillOpacity: isSelected ? 0.35 : 0.10,
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
            const color = isSelected ? "#37C9D6" : isDanger ? "#E9B45B" : "#F16C78";
            const fillColor = isSelected ? "#37C9D6" : isDanger ? "#E9B45B" : "#F16C78";

            return (
              <Polygon
                key={air.id}
                positions={positions}
                pathOptions={{
                  color: color,
                  fillColor: fillColor,
                  fillOpacity: isSelected ? 0.4 : 0.18,
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
                    color: isRouteHighlighted ? "#37C9D6" : selectedRouteName ? "#94a3b8" : "#E9B45B",
                    weight: isRouteHighlighted ? 3.5 : selectedRouteName ? 1 : 1.8,
                    opacity: isRouteHighlighted ? 1 : selectedRouteName ? 0.25 : 0.65,
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

        {/* 4. Single Selected Route Highlight */}
        {activeRoute && !showRoutes &&
          activeRoute.segments.map((seg, sIdx) => {
            if (!seg.coordinates || seg.coordinates.length < 2) return null;
            return (
              <Polyline
                key={`sel-${activeRoute.designator}-${sIdx}`}
                positions={seg.coordinates as [number, number][]}
                pathOptions={{
                  color: "#37C9D6",
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
                  color: isSelected ? "#37C9D6" : "#7E22CE",
                  fillColor: isSelected ? "#37C9D6" : "#A855F7",
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
                  color: isSelected ? "#37C9D6" : "#0284C7",
                  fillColor: isSelected ? "#37C9D6" : "#38BDF8",
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
                    color: isSelected ? "#37C9D6" : "#059669",
                    fillColor: isSelected ? "#37C9D6" : "#47C995",
                    fillOpacity: 0.85,
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
                    color: isSelected ? "#37C9D6" : "#991B1B",
                    fillColor: isSelected ? "#37C9D6" : "#F16C78",
                    fillOpacity: 0.95,
                    weight: isSelected ? 3.5 : 2.5,
                  }}
                  eventHandlers={{
                    click: () => setSelectedFeature({ type: "airport", data: ad }),
                  }}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <span className="font-mono font-bold text-xs text-[#F16C78] bg-[#0D1726] px-1.5 py-0.5 rounded shadow border border-[#26374B]">
                      {ad.icao}
                    </span>
                  </Tooltip>

                  <Popup>
                    <div className="p-3 font-sans text-xs min-w-[260px] space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#26374B] pb-1.5">
                        <div>
                          <span className="font-mono font-extrabold text-base text-[#F16C78]">{ad.icao}</span>
                          <span className="text-[11px] text-[#A5B3C4] block font-semibold">{ad.name}</span>
                        </div>
                        <StatusBadge variant="red" mono size="xs">
                          TARGET
                        </StatusBadge>
                      </div>

                      <div className="text-[11px] text-[#A5B3C4]">
                        Operator: <b className="text-[#F1F5FA] font-medium">{ad.operator || "Not published"}</b>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#A5B3C4] bg-[#070D18] p-2 rounded-lg border border-[#26374B]">
                        <div>Elevation: <b className="text-[#F1F5FA] font-mono">{ad.elevation ?? "—"} FT</b></div>
                        <div>RFFS: <b className="text-[#F1F5FA] font-mono">{ad.rffs_category || "Not published"}</b></div>
                        <div>Mag Var: <b className="text-[#F1F5FA] font-mono">{ad.magnetic_variation ?? "—"}°</b></div>
                        <div>ATS Hours: <b className="text-[#F1F5FA] font-mono">{ad.hours?.ats || "Not published"}</b></div>
                      </div>

                      {ad.runways && ad.runways.length > 0 && (
                        <div className="pt-0.5">
                          <span className="text-[#74869C] text-[10px] font-semibold uppercase tracking-wider">Published Runways:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {ad.runways.map((r) => (
                              <span key={r.designator} className="bg-[#121F31] border border-[#26374B] px-1.5 py-0.5 rounded text-[10px] font-mono text-[#37C9D6]">
                                RWY {r.designator} ({r.lda ?? "—"}M)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1 border-t border-[#26374B]/60">
                        <button
                          onClick={() => onSelectAirport && onSelectAirport(ad.icao)}
                          className="flex-1 bg-[#37C9D6] hover:bg-[#37C9D6]/90 text-[#070D18] font-bold py-1 px-2 rounded-md text-xs transition text-center"
                        >
                          Open Cockpit &rarr;
                        </button>
                        <button
                          onClick={() => setSelectedFeature({ type: "airport", data: ad })}
                          className="bg-[#121F31] hover:bg-[#17263A] text-[#F1F5FA] px-2.5 py-1 rounded-md text-xs border border-[#26374B]"
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
