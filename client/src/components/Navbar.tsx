/*
 * Author: Mohd Faraz (https://faraazz05.github.io)
 * CopilOPS AIP Platform - Navigation Bar
 */

import React from "react";
import { Plane, Map, Building2, GitCompare, ShieldAlert, Route as RouteIcon, Github, Globe, ExternalLink } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats?: {
    airports_count?: number;
    runways_count?: number;
    routes_count?: number;
    navaids_count?: number;
    waypoints_count?: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "map", label: "Operations Map", icon: Map },
    { id: "airports", label: "Airport Cockpit", icon: Building2 },
    { id: "airways", label: "ATS Airways", icon: RouteIcon },
    { id: "diff", label: "AIRAC Lifecycle", icon: GitCompare },
    { id: "issues", label: "Data Quality", icon: ShieldAlert },
  ];

  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-cyan-500/20 sticky top-0 z-50 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab("map")}>
            <div className="bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 p-2 rounded-xl border border-cyan-400/40 text-cyan-300 shadow-md shadow-cyan-500/10 group-hover:border-cyan-400 transition-all">
              <Plane className="w-5 h-5 transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                  CopilOPS
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/90 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  AIP Platform
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-sans">
                Aeronautical Data Engineering Engine
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm shadow-cyan-500/20 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Items: Portfolio, Source Code, AIRAC Badge */}
          <div className="flex items-center space-x-3">
            {/* Portfolio Link */}
            <a
              href="https://faraazz05.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-300 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-cyan-500/40 transition-all font-mono group"
              title="Mohd Faraz Portfolio"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>faraazz05.github.io</span>
              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
            </a>

            {/* Source Code Button */}
            <a
              href="https://github.com/faraazz05/copilops-aip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-3 py-1.5 rounded-lg shadow-md shadow-cyan-500/20 transition-all"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Source Code</span>
            </a>

            {/* AIRAC cycle badge */}
            <div className="hidden sm:flex flex-col text-right pl-2 border-l border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">AIRAC Cycle</span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1.5 animate-ping"></span>
                2026-10-01
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
