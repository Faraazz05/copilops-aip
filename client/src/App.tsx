/*
 * Author: Mohd Faraz (https://faraazz05.github.io)
 * CopilOPS AIP Platform - Main Application Component
 */

import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { MapViewer } from "./components/MapViewer";
import { AirportDashboard } from "./components/AirportDashboard";
import { AirwaysViewer } from "./components/AirwaysViewer";
import { AiracDiffViewer } from "./components/AiracDiffViewer";
import { DataQualityViewer } from "./components/DataQualityViewer";
import { IAirport, IRoute, INavaid, IWaypoint, IIssue, IChange } from "./types";
import {
  fetchAirports,
  fetchRoutes,
  fetchNavaids,
  fetchWaypoints,
  fetchChanges,
  fetchIssues,
  fetchHealth
} from "./api";
import { Loader2 } from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("map");
  const [selectedIcao, setSelectedIcao] = useState<string>("EBBR");
  const [loading, setLoading] = useState<boolean>(true);

  const [airports, setAirports] = useState<IAirport[]>([]);
  const [routes, setRoutes] = useState<IRoute[]>([]);
  const [navaids, setNavaids] = useState<INavaid[]>([]);
  const [waypoints, setWaypoints] = useState<IWaypoint[]>([]);
  const [changes, setChanges] = useState<IChange[]>([]);
  const [issues, setIssues] = useState<IIssue[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [adData, rData, nData, wData, cData, iData, hData] = await Promise.all([
          fetchAirports(),
          fetchRoutes(),
          fetchNavaids(),
          fetchWaypoints(),
          fetchChanges(),
          fetchIssues(),
          fetchHealth()
        ]);

        setAirports(adData);
        setRoutes(rData);
        setNavaids(nData);
        setWaypoints(wData);
        setChanges(cData);
        setIssues(iData);
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <p className="text-slate-300 font-mono text-sm tracking-wide">
          Loading CopilOPS Aeronautical Data (AIRAC 2026-10-01)...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

      <main className="flex-1">
        {activeTab === "map" && (
          <MapViewer
            airports={airports}
            routes={routes}
            navaids={navaids}
            waypoints={waypoints}
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
