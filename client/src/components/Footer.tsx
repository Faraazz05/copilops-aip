/*
 * Author: Mohd Faraz (https://faraazz05.github.io)
 * CopilOPS AIP Platform - Footer Component
 */

import React from "react";
import { Plane, Globe, Github, ExternalLink, Heart, ShieldCheck } from "lucide-react";

interface FooterProps {
  stats?: {
    airports_count?: number;
    runways_count?: number;
    routes_count?: number;
    navaids_count?: number;
    waypoints_count?: number;
    airspaces_count?: number;
    valid_airspaces_count?: number;
    issues_count?: number;
  };
}

export const Footer: React.FC<FooterProps> = ({ stats }) => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-xs text-slate-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Info Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/30 text-cyan-400">
              <Plane className="w-5 h-5 transform -rotate-45" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">CopilOPS Aeronautical Data Platform</span>
              <p className="text-[11px] text-slate-500">
                Official Belgium & Luxembourg eAIP (skeyes) Data Pipeline & Operational Cockpit
              </p>
            </div>
          </div>

          {/* Extracted Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
              <b className="text-cyan-400">{stats?.airports_count ?? 33}</b> Aerodromes
            </span>
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
              <b className="text-cyan-400">{stats?.runways_count ?? 96}</b> Runways
            </span>
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
              <b className="text-amber-400">{stats?.routes_count ?? 51}</b> ATS Routes
            </span>
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
              <b className="text-purple-400">{stats?.navaids_count ?? 82}</b> Navaids
            </span>
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
              <b className="text-emerald-400">{stats?.waypoints_count ?? 303}</b> Waypoints
            </span>
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
              <b className="text-blue-400">{stats?.airspaces_count ?? 130}</b> Airspaces ({stats?.valid_airspaces_count ?? 63} verified)
            </span>
          </div>
        </div>

        {/* Bottom Attribution & Author Portfolio */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center space-x-2 text-slate-300">
            <span>Engineered with precision by</span>
            <a
              href="https://faraazz05.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 flex items-center gap-1 transition"
            >
              Mohd Faraz
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-600">•</span>
            <span>Technical Assessment for CopilOPS</span>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-4">
            <a
              href="https://faraazz05.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-cyan-400 transition"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>faraazz05.github.io</span>
            </a>

            <a
              href="https://github.com/faraazz05/copilops-aip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-cyan-400 transition"
            >
              <Github className="w-3.5 h-3.5 text-slate-300" />
              <span>GitHub Repository</span>
            </a>

            <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded text-[10px] font-mono">
              <ShieldCheck className="w-3 h-3" />
              <span>Deterministic Data Validated</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
