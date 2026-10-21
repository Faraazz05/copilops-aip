/**
 * CopilOPS — Aviation Operations Intelligence
 * Airport Operational Cockpit (OCC / Flight Dispatcher View)
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */

import React, { useState } from "react";
import { IAirport, IRunway } from "../types";
import {
  Compass,
  Clock,
  ShieldCheck,
  Radio,
  Ruler,
  AlertCircle,
  ExternalLink,
  FileText,
  Calendar,
  CheckCircle2,
  Building2,
  Info,
  X,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "./common/Card";
import { StatusBadge } from "./common/StatusBadge";
import { MetricCard } from "./common/MetricCard";

interface AirportDashboardProps {
  airports: IAirport[];
  selectedIcao: string;
  onSelectIcao: (icao: string) => void;
}

export const AirportDashboard: React.FC<AirportDashboardProps> = ({
  airports,
  selectedIcao,
  onSelectIcao,
}) => {
  const airport = airports.find((a) => a.icao === selectedIcao) || airports[0];
  const [inspectField, setInspectField] = useState<{
    label: string;
    value: any;
    unit?: string | null;
    section: string;
    status: string;
    rawText?: string;
  } | null>(null);

  if (!airport) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-[#74869C]">
        No aerodrome records available.
      </div>
    );
  }

  const targetAirports = ["EBBR", "EBLG", "EBCI"];
  const prov = airport.provenance;
  const sourceUrl =
    prov?.source_url ||
    `https://ops.skeyes.be/html/belgocontrol_static/eaip/eAIP_Main/html/eAIP/EB-AD-2.${airport.icao}-en-GB.html`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Aerodrome Selector Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1726] border border-[#26374B] p-3.5 rounded-xl shadow-sm">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="text-[10px] font-mono font-semibold text-[#74869C] uppercase tracking-wider mr-1">
            Target Aerodromes:
          </span>
          {targetAirports.map((code) => {
            const isSelected = selectedIcao === code;
            return (
              <button
                key={code}
                onClick={() => onSelectIcao(code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                  isSelected
                    ? "bg-[#F16C78] text-white shadow-sm"
                    : "bg-[#121F31] text-[#A5B3C4] hover:bg-[#17263A] hover:text-[#F1F5FA] border border-[#26374B]"
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>

        {/* Dropdown for any other aerodrome */}
        <div className="flex items-center space-x-2 text-xs">
          <label htmlFor="ad-select" className="text-[#74869C] whitespace-nowrap">
            All Aerodromes ({airports.length}):
          </label>
          <select
            id="ad-select"
            value={selectedIcao}
            onChange={(e) => onSelectIcao(e.target.value)}
            className="bg-[#070D18] border border-[#26374B] text-[#F1F5FA] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#37C9D6] font-mono cursor-pointer"
          >
            {airports.map((a) => (
              <option key={a.icao} value={a.icao} className="bg-[#0D1726] text-[#F1F5FA]">
                {a.icao} - {a.name ? a.name.slice(0, 32) : "Aerodrome"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Airport Cockpit Header Card */}
      <div className="bg-[#0D1726] border border-[#26374B] p-6 rounded-xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <span className="text-3xl font-extrabold font-mono text-[#37C9D6] tracking-wider">
                {airport.icao}
              </span>
              <span className="text-xl text-[#F1F5FA] font-semibold">{airport.name}</span>
              {airport.is_target ? (
                <StatusBadge variant="red" mono size="xs">
                  PRIMARY TARGET
                </StatusBadge>
              ) : (
                <StatusBadge variant="neutral" mono size="xs">
                  SECONDARY AD
                </StatusBadge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#A5B3C4]">
              <span className="text-[#74869C]">Aerodrome Operator:</span>
              <span className="font-semibold text-[#F1F5FA]">
                {airport.operator || "Not Published"}
              </span>
              <span className="text-[#74869C] font-mono text-[10px]">(AD 2.2)</span>
            </div>

            {/* Official Source Provenance Metadata Bar */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#74869C]">
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-[#47C995]" />
                AIRAC: <b className="text-[#F1F5FA] font-medium">{prov?.effective_date || "2026-10-01"}</b>
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#37C9D6]" />
                Section: <b className="text-[#A5B3C4] font-mono">{airport.icao} AD 2.1 - 2.19</b>
              </span>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#37C9D6] hover:underline font-medium"
              >
                <span>skeyes eAIP Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#070D18] p-3 rounded-xl border border-[#26374B] shrink-0">
            {/* Elevation */}
            <div
              onClick={() =>
                setInspectField({
                  label: "Aerodrome Elevation",
                  value: airport.elevation,
                  unit: "FT",
                  section: `${airport.icao} AD 2.2 § 3`,
                  status: airport.elevation !== null ? "PUBLISHED" : "NOT_PUBLISHED",
                  rawText: airport.elevation !== null ? `${airport.elevation} FT` : "Not published",
                })
              }
              className="p-2.5 rounded-lg hover:bg-[#121F31] cursor-pointer transition-colors border border-transparent hover:border-[#26374B]"
              title="Click to inspect elevation provenance"
            >
              <div className="text-[11px] text-[#74869C] flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#37C9D6]" /> Elevation
              </div>
              <div className="text-base font-bold text-[#F1F5FA] font-mono mt-0.5">
                {airport.elevation !== null && airport.elevation !== undefined ? (
                  <span>
                    {airport.elevation} <span className="text-[11px] font-normal text-[#74869C]">FT</span>
                  </span>
                ) : (
                  <span className="text-[#74869C] font-sans text-xs italic font-normal">Not published</span>
                )}
              </div>
            </div>

            {/* Mag Var */}
            <div
              onClick={() =>
                setInspectField({
                  label: "Magnetic Variation",
                  value: airport.magnetic_variation,
                  unit: `° (${airport.magnetic_variation_year || "—"})`,
                  section: `${airport.icao} AD 2.2 § 4`,
                  status: airport.magnetic_variation !== null ? "PUBLISHED" : "NOT_PUBLISHED",
                  rawText: `${airport.magnetic_variation}° (${airport.magnetic_variation_year})`,
                })
              }
              className="p-2.5 rounded-lg hover:bg-[#121F31] cursor-pointer transition-colors border border-transparent hover:border-[#26374B]"
              title="Click to inspect mag var provenance"
            >
              <div className="text-[11px] text-[#74869C]">Mag Var</div>
              <div className="text-base font-bold text-[#F1F5FA] font-mono mt-0.5">
                {airport.magnetic_variation !== null && airport.magnetic_variation !== undefined ? (
                  <span>
                    {airport.magnetic_variation}°{" "}
                    <span className="text-[10px] font-normal text-[#74869C]">
                      ({airport.magnetic_variation_year || "—"})
                    </span>
                  </span>
                ) : (
                  <span className="text-[#74869C] font-sans text-xs italic font-normal">Not published</span>
                )}
              </div>
            </div>

            {/* RFFS Category */}
            <div
              onClick={() =>
                setInspectField({
                  label: "Rescue & Fire Fighting Services (RFFS)",
                  value: airport.rffs_category || "Not published in AD 2.6",
                  section: `${airport.icao} AD 2.6 § 1`,
                  status: airport.rffs_category ? "PUBLISHED" : "NOT_PUBLISHED",
                  rawText: airport.rffs_category || "NIL / Not published",
                })
              }
              className="p-2.5 rounded-lg hover:bg-[#121F31] cursor-pointer transition-colors border border-transparent hover:border-[#26374B]"
              title="Click to inspect RFFS category provenance"
            >
              <div className="text-[11px] text-[#74869C] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#47C995]" /> Fire Category
              </div>
              <div className="text-xs font-bold text-[#47C995] font-mono mt-1">
                {airport.rffs_category ? (
                  airport.rffs_category
                ) : (
                  <span className="text-[#74869C] font-sans text-[11px] italic font-normal">
                    Not published (AD 2.6)
                  </span>
                )}
              </div>
            </div>

            {/* ATS Operating Hours */}
            <div
              onClick={() =>
                setInspectField({
                  label: "ATS / Control Tower Operating Hours",
                  value: airport.hours?.ats || "Not published in AD 2.3",
                  section: `${airport.icao} AD 2.3 § 2`,
                  status: airport.hours?.ats ? "PUBLISHED" : "NOT_PUBLISHED",
                  rawText: airport.hours?.ats || "Not published",
                })
              }
              className="p-2.5 rounded-lg hover:bg-[#121F31] cursor-pointer transition-colors border border-transparent hover:border-[#26374B]"
              title="Click to inspect ATS operating hours provenance"
            >
              <div className="text-[11px] text-[#74869C] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#E9B45B]" /> ATS Tower
              </div>
              <div className="text-xs font-bold text-[#F1F5FA] font-mono mt-1">
                {airport.hours?.ats ? (
                  airport.hours.ats
                ) : (
                  <span className="text-[#74869C] font-sans text-[11px] italic font-normal">
                    Not published (AD 2.3)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Provenance Inspector Drawer (when clicked) */}
      {inspectField && (
        <div className="bg-[#0D1726] border border-[#37C9D6]/40 p-4 rounded-xl shadow-2xl flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[#37C9D6] uppercase tracking-wider">
                FIELD-LEVEL PROVENANCE INSPECTOR
              </span>
              <span className="text-[10px] bg-[#121F31] px-2 py-0.5 rounded text-[#A5B3C4] font-mono border border-[#26374B]">
                {inspectField.section}
              </span>
            </div>
            <h4 className="font-bold text-[#F1F5FA] text-sm">{inspectField.label}</h4>
            <div className="text-xs text-[#A5B3C4]">
              Verified Value:{" "}
              <b className="text-[#F1F5FA] font-mono">
                {String(inspectField.value)} {inspectField.unit || ""}
              </b>{" "}
              | Publication Status: <b className="text-[#47C995]">{inspectField.status}</b>
            </div>
            <div className="text-[11px] text-[#74869C] font-mono">
              Raw Source Text:{" "}
              <span className="text-[#A5B3C4] bg-[#070D18] px-1.5 py-0.5 rounded border border-[#26374B]">
                {inspectField.rawText}
              </span>
            </div>
          </div>
          <button
            onClick={() => setInspectField(null)}
            className="text-[#74869C] hover:text-[#F1F5FA] p-1 text-sm font-bold"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Runway Physical Characteristics & Declared Distances Table */}
      <Card>
        <CardHeader
          icon={<Ruler className="w-4 h-4 text-[#37C9D6]" />}
          title="Runway Physical Characteristics & Declared Distances (AD 2.12 / AD 2.13)"
          subtitle="Official skeyes tabular records with authenticated runway declared distances."
          badge={
            <StatusBadge variant="neutral" mono size="xs">
              {airport.runways.length} Published Directions
            </StatusBadge>
          }
        />

        {airport.runways.length === 0 ? (
          <div className="p-8 text-center text-[#74869C] text-xs">
            No published runway physical characteristics or declared distances in AD 2.12 / 2.13.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#A5B3C4]">
              <thead className="bg-[#070D18] text-[10px] uppercase font-mono text-[#74869C] border-b border-[#26374B] sticky top-0">
                <tr>
                  <th className="px-4 py-3">RWY</th>
                  <th className="px-4 py-3">True BRG</th>
                  <th className="px-4 py-3">Dimensions</th>
                  <th className="px-4 py-3">Surface</th>
                  <th className="px-4 py-3">Strength (PCN/PCR)</th>
                  <th className="px-4 py-3 text-right">TORA (M)</th>
                  <th className="px-4 py-3 text-right">TODA (M)</th>
                  <th className="px-4 py-3 text-right">ASDA (M)</th>
                  <th className="px-4 py-3 text-right text-[#37C9D6]">LDA (M)</th>
                  <th className="px-4 py-3 text-right">THR Elev</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26374B]/60 font-mono">
                {airport.runways.map((rwy) => (
                  <tr key={rwy.designator} className="hover:bg-[#121F31]/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-[#37C9D6]">RWY {rwy.designator}</td>
                    <td className="px-4 py-3">{rwy.true_bearing ? `${rwy.true_bearing}°` : "—"}</td>
                    <td className="px-4 py-3">
                      {rwy.length && rwy.width ? `${rwy.length} × ${rwy.width} M` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {rwy.surface ? (
                        <span className="bg-[#121F31] border border-[#26374B] text-[#F1F5FA] px-1.5 py-0.5 rounded text-[10px]">
                          {rwy.surface}
                        </span>
                      ) : (
                        <span className="text-[#74869C] italic font-sans text-[11px]">Unpaved</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] max-w-[130px] truncate" title={rwy.strength || ""}>
                      {rwy.strength || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#F1F5FA]">{rwy.tora ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{rwy.toda ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{rwy.asda ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#37C9D6] bg-[#37C9D6]/5">
                      {rwy.lda ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rwy.thr_elevation ? `${rwy.thr_elevation} FT` : "—"}
                    </td>
                    <td
                      className="px-4 py-3 font-sans text-[11px] text-[#74869C] max-w-xs truncate"
                      title={rwy.remarks || ""}
                    >
                      {rwy.remarks || "NIL"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Grid: Operating Hours & Radio Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operating Hours Card (Honest, no fake H24 fallback) */}
        <Card>
          <CardHeader
            icon={<Clock className="w-4 h-4 text-[#E9B45B]" />}
            title="Operating Hours & Services (AD 2.3)"
            subtitle="Published operational availability by aerodrome section."
            badge={
              <span className="text-[10px] font-mono text-[#74869C]">{airport.icao} AD 2.3</span>
            }
          />

          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#070D18] p-3 rounded-lg border border-[#26374B]">
                <span className="text-[10px] uppercase font-semibold text-[#74869C] block">
                  Airport Operator
                </span>
                <p className="font-mono font-medium text-[#F1F5FA] mt-1">
                  {airport.hours?.operator || (
                    <span className="text-[#74869C] italic font-sans font-normal">
                      Not published in AD 2.3
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-[#070D18] p-3 rounded-lg border border-[#26374B]">
                <span className="text-[10px] uppercase font-semibold text-[#74869C] block">
                  ATS / Control Tower
                </span>
                <p className="font-mono font-medium text-[#F1F5FA] mt-1">
                  {airport.hours?.ats || (
                    <span className="text-[#74869C] italic font-sans font-normal">
                      Not published in AD 2.3
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-[#070D18] p-3 rounded-lg border border-[#26374B]">
                <span className="text-[10px] uppercase font-semibold text-[#74869C] block">
                  Customs &amp; Immigration
                </span>
                <p className="font-mono font-medium text-[#F1F5FA] mt-1">
                  {airport.hours?.customs || (
                    <span className="text-[#74869C] italic font-sans font-normal">
                      Not published in AD 2.3
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-[#070D18] p-3 rounded-lg border border-[#26374B]">
                <span className="text-[10px] uppercase font-semibold text-[#74869C] block">
                  AIS Briefing Office
                </span>
                <p className="font-mono font-medium text-[#F1F5FA] mt-1">
                  {airport.hours?.ais || (
                    <span className="text-[#74869C] italic font-sans font-normal">
                      Not published in AD 2.3
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Radio Navigation & Landing Aids (AD 2.19) */}
        <Card>
          <CardHeader
            icon={<Radio className="w-4 h-4 text-[#A855F7]" />}
            title="Radio Navigation & Landing Aids (AD 2.19)"
            subtitle="On-field ILS, VOR, DME, and marker beacons."
            badge={
              <StatusBadge variant="purple" mono size="xs">
                {airport.navaids.length} Facilities
              </StatusBadge>
            }
          />

          <CardContent className="p-4">
            {airport.navaids.length === 0 ? (
              <p className="text-[#74869C] text-xs py-6 text-center">
                No on-field radio navigation facilities or ILS systems published in {airport.icao} AD 2.19.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {airport.navaids.map((nav) => (
                  <div
                    key={nav.key}
                    className="flex items-center justify-between bg-[#070D18] p-2.5 rounded-lg border border-[#26374B] text-xs hover:border-[#37C9D6]/40 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-[#C084FC] font-mono mr-2">
                        {nav.identifier || nav.key}
                      </span>
                      <span className="text-[#F1F5FA] font-medium">
                        {nav.type || nav.ils_system || "Nav Aid"}
                      </span>
                      {nav.latitude && nav.longitude && (
                        <span className="text-[10px] text-[#74869C] font-mono block mt-0.5">
                          {nav.latitude.toFixed(4)}° N, {nav.longitude.toFixed(4)}° E
                        </span>
                      )}
                    </div>
                    {nav.frequency && (
                      <span className="font-mono font-semibold text-[#37C9D6] bg-[#121F31] border border-[#26374B] px-2 py-0.5 rounded text-[11px]">
                        {nav.frequency} {nav.frequency_unit || "MHZ"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
