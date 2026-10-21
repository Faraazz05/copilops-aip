/**
 * CopilOPS — Aviation Operations Intelligence
 * Author: Mohd Faraz (https://faraazz05.github.io)
 * Professional Operational Footer
 */

import React from "react";
import { Plane, Globe, Github, ExternalLink, ShieldCheck } from "lucide-react";

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
    <footer className="bg-[#070D18] border-t border-[#26374B] text-xs text-[#74869C] py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Main Metadata Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-[#26374B]/60">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-[#0D1726] border border-[#26374B] text-[#37C9D6] flex items-center justify-center">
              <Plane className="w-3.5 h-3.5 transform -rotate-45" />
            </div>
            <div>
              <span className="font-semibold text-[#F1F5FA] text-xs">
                CopilOPS — Aviation Operations Intelligence
              </span>
              <p className="text-[11px] text-[#74869C]">
                Aeronautical data pipeline & operational console &bull; Belgium &amp; Luxembourg eAIP
              </p>
            </div>
          </div>

          {/* Dataset Metrics Badges */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <span className="bg-[#0D1726] border border-[#26374B] px-2 py-0.5 rounded text-[#A5B3C4]">
              <b className="text-[#F1F5FA]">{stats?.airports_count ?? 33}</b> AD
            </span>
            <span className="bg-[#0D1726] border border-[#26374B] px-2 py-0.5 rounded text-[#A5B3C4]">
              <b className="text-[#F1F5FA]">{stats?.runways_count ?? 96}</b> RWY
            </span>
            <span className="bg-[#0D1726] border border-[#26374B] px-2 py-0.5 rounded text-[#A5B3C4]">
              <b className="text-[#E9B45B]">{stats?.routes_count ?? 51}</b> ATS
            </span>
            <span className="bg-[#0D1726] border border-[#26374B] px-2 py-0.5 rounded text-[#A5B3C4]">
              <b className="text-[#C084FC]">{stats?.navaids_count ?? 82}</b> NAV
            </span>
            <span className="bg-[#0D1726] border border-[#26374B] px-2 py-0.5 rounded text-[#A5B3C4]">
              <b className="text-[#37C9D6]">{stats?.waypoints_count ?? 303}</b> FIX
            </span>
            <span className="bg-[#0D1726] border border-[#26374B] px-2 py-0.5 rounded text-[#A5B3C4]">
              <b className="text-[#6C9EFF]">{stats?.valid_airspaces_count ?? 63}</b> Airspace Polygons
            </span>
          </div>
        </div>

        {/* Bottom Attribution & Integrity Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center space-x-2 text-[#A5B3C4]">
            <span>Developed by</span>
            <a
              href="https://faraazz05.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#37C9D6] hover:underline flex items-center gap-1"
            >
              Mohd Faraz
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>&bull;</span>
            <span className="text-[#74869C]">Aeronautical Data Engineering Assessment</span>
          </div>

          <div className="flex items-center space-x-3 text-[#74869C]">
            <a
              href="https://github.com/faraazz05/copilops-aip"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F1F5FA] flex items-center gap-1 transition-colors"
            >
              <Github className="w-3 h-3" />
              <span>GitHub</span>
            </a>
            <span>&bull;</span>
            <a
              href="https://ops.skeyes.be"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F1F5FA] flex items-center gap-1 transition-colors"
            >
              <span>skeyes eAIP Source</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>&bull;</span>
            <span className="font-mono text-[10px] text-[#47C995] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              AIRAC 2026-10-01 Verified
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
