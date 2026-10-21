/**
 * CopilOPS — Aviation Operations Intelligence
 * Author: Mohd Faraz (https://faraazz05.github.io)
 * Top Navigation Bar & Operations Shell
 */

import React, { useState } from "react";
import {
  Plane,
  Map,
  Building2,
  GitCompare,
  ShieldAlert,
  Route as RouteIcon,
  Github,
  Globe,
  ExternalLink,
  Menu,
  X,
  CheckCircle2,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "map", label: "Operations Map", icon: Map },
    { id: "airports", label: "Airport Cockpit", icon: Building2 },
    { id: "airways", label: "ATS Airways", icon: RouteIcon },
    { id: "diff", label: "AIRAC Lifecycle", icon: GitCompare },
    { id: "issues", label: "Data Quality", icon: ShieldAlert },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#0D1726] border-b border-[#26374B] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Identity */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none group"
            onClick={() => handleTabClick("map")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleTabClick("map");
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-[#121F31] border border-[#26374B] text-[#37C9D6] flex items-center justify-center transition-colors group-hover:border-[#37C9D6]/50">
              <Plane className="w-4 h-4 transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-[#F1F5FA]">
                  CopilOPS
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider bg-[#17263A] text-[#37C9D6] px-1.5 py-0.5 rounded border border-[#26374B]">
                  AIP Ops
                </span>
              </div>
              <span className="text-[11px] text-[#74869C] block -mt-0.5 font-medium">
                Aviation Operations Intelligence
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#070D18] p-1 rounded-lg border border-[#26374B]">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                    isActive
                      ? "bg-[#17263A] text-[#F1F5FA] font-semibold border border-[#26374B] shadow-sm"
                      : "text-[#A5B3C4] hover:text-[#F1F5FA] hover:bg-[#121F31]"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-[#37C9D6]" : "text-[#74869C]"
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Metadata & Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Authoritative AIRAC Cycle Indicator */}
            <div className="hidden lg:flex items-center space-x-2 bg-[#070D18] px-2.5 py-1 rounded-lg border border-[#26374B] font-mono text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#47C995] shrink-0" />
              <span className="text-[#74869C] text-[11px]">AIRAC</span>
              <span className="text-[#F1F5FA] font-medium text-[11px]">2026-10-01</span>
              <span className="text-[10px] text-[#A5B3C4] bg-[#121F31] px-1 py-0.2 rounded border border-[#26374B]">
                AMDT 010
              </span>
            </div>

            {/* Source Code Link */}
            <a
              href="https://github.com/faraazz05/copilops-aip"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center space-x-1.5 text-xs text-[#A5B3C4] hover:text-[#F1F5FA] bg-[#121F31] hover:bg-[#17263A] border border-[#26374B] px-2.5 py-1.5 rounded-lg transition-colors font-medium"
              title="View repository on GitHub"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Source</span>
            </a>

            {/* Author Portfolio */}
            <a
              href="https://faraazz05.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center space-x-1.5 text-xs text-[#A5B3C4] hover:text-[#37C9D6] bg-[#121F31] hover:bg-[#17263A] border border-[#26374B] px-2.5 py-1.5 rounded-lg transition-colors font-mono"
              title="Author Portfolio"
            >
              <Globe className="w-3.5 h-3.5 text-[#37C9D6]" />
              <span className="text-[11px]">faraazz05</span>
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-[#A5B3C4] hover:text-[#F1F5FA] bg-[#121F31] border border-[#26374B]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#26374B] space-y-1">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#17263A] text-[#F1F5FA] border border-[#26374B]"
                      : "text-[#A5B3C4] hover:bg-[#121F31] hover:text-[#F1F5FA]"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-[#37C9D6]" : "text-[#74869C]"
                      }`}
                    />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#37C9D6]" />
                  )}
                </button>
              );
            })}

            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#74869C] px-3">
              <span>AIRAC 2026-10-01</span>
              <a
                href="https://github.com/faraazz05/copilops-aip"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#37C9D6] hover:underline flex items-center gap-1"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
