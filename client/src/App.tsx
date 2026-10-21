/**
 * CopilOPS — Aviation Operations Intelligence
 * Main Application Shell & State Controller
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */

import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { MapViewer } from "./components/MapViewer";
import { AirportDashboard } from "./components/AirportDashboard";
import { AirwaysViewer } from "./components/AirwaysViewer";
import { AiracDiffViewer } from "./components/AiracDiffViewer";
import { DataQualityViewer } from "./components/DataQualityViewer";
import { IAirport, IRoute, INavaid, IWaypoint, IIssue, IChange, IAirspace } from "./types";
import {
  fetchAirports,
  fetchRoutes,
  fetchNavaids,
  fetchWaypoints,
  fetchAirspaces,
  fetchChanges,
  fetchIssues,
  fetchHealth,
} from "./api";
import { Loader2, Plane } from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("map");
  const [selectedIcao, setSelectedIcao] = useState<string>("EBBR");
  const [loading, setLoading] = useState<boolean>(true);

  const [airports, setAirports] = useState<IAirport[]>([]);
  const [routes, setRoutes] = useState<IRoute[]>([]);
  const [navaids, setNavaids] = useState<INavaid[]>([]);
  const [waypoints, setWaypoints] = useState<IWaypoint[]>([]);
  const [airspaces, setAirspaces] = useState<IAirspace[]>([]);
  const [changes, setChanges] = useState<IChange[]>([]);
  const [issues, setIssues] = useState<IIssue[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [adData, rData, nData, wData, airData, cData, iData, hData] = await Promise.all([
          fetchAirports(),
          fetchRoutes(),
          fetchNavaids(),
          fetchWaypoints(),
          fetchAirspaces(),
          fetchChanges(),
          fetchIssues(),
          fetchHealth(),
        ]);

        setAirports(adData || []);
        setRoutes(rData || []);
        setNavaids(nData || []);
        setWaypoints(wData || []);
        setAirspaces(airData || []);
        setChanges(cData || []);
        setIssues(iData || []);
        setStats(hData?.counts || {});
      } catch (err) {
        console.error("Failed to load aeronautical data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSelectAirport = (icao: string) => {
    setSelectedIcao(icao);
    setActiveTab("airports");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070D18] flex flex-col items-center justify-center space-y-4 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-[#0D1726] border border-[#26374B] text-[#37C9D6] flex items-center justify-center">
          <Plane className="w-6 h-6 transform -rotate-45" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[#F1F5FA] tracking-tight">
            CopilOPS — Aviation Operations Intelligence
          </h2>
          <p className="text-xs text-[#74869C] font-mono">
            Loading Belgium &amp; Luxembourg eAIP Datasets (AIRAC 2026-10-01)...
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#37C9D6] font-mono pt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Validating aeronautical models...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070D18] text-[#F1F5FA] flex flex-col font-sans selection:bg-[#37C9D6]/20">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

      <main className="flex-1">
        {activeTab === "map" && (
          <MapViewer
            airports={airports}
            routes={routes}
            navaids={navaids}
            waypoints={waypoints}
            airspaces={airspaces}
            onSelectAirport={handleSelectAirport}
          />
        )}

        {activeTab === "airports" && (
          <AirportDashboard
            airports={airports}
            selectedIcao={selectedIcao}
            onSelectIcao={setSelectedIcao}
          />
        )}

        {activeTab === "airways" && <AirwaysViewer routes={routes} />}

        {activeTab === "diff" && <AiracDiffViewer changes={changes} />}

        {activeTab === "issues" && <DataQualityViewer issues={issues} />}
      </main>

      <Footer stats={stats} />
    </div>
  );
};
