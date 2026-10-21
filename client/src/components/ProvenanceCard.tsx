/**
 * CopilOPS Aeronautical Data Platform - Reusable Feature Provenance & Data Integrity Component
 * Author: Mohd Faraz (https://faraazz05.github.io)
 */
import React from "react";
import { ExternalLink, ShieldCheck, AlertCircle, FileText, Calendar, CheckCircle2, Info } from "lucide-react";
import { IProvenance } from "../types";

interface ProvenanceCardProps {
  title: string;
  subtitle?: string;
  entityType: string;
  entityKey: string;
  provenance?: IProvenance;
  fields?: Array<{
    label: string;
    value: string | number | null | undefined;
    unit?: string | null;
    section?: string;
    status?: string;
    rawText?: string;
  }>;
  rawBoundaryText?: string;
  validationStatus?: string;
  validationIssues?: string[];
  disclaimer?: string;
  onClose?: () => void;
}

export const ProvenanceCard: React.FC<ProvenanceCardProps> = ({
  title,
  subtitle,
  entityType,
  entityKey,
  provenance,
  fields,
  rawBoundaryText,
  validationStatus,
  validationIssues,
  disclaimer,
  onClose,
}) => {
  const effectiveDate = provenance?.effective_date || "2026-10-01";
  const sourceSection = provenance?.section || "skeyes Belgium & Luxembourg eAIP";
  const sourceFile = provenance?.source_file || "eAIP Package";
  const sourceUrl = provenance?.source_url || "https://ops.skeyes.be";
  const status = validationStatus || provenance?.validation_status || "PUBLISHED";

  const getStatusBadge = (st: string) => {
    switch (st.toUpperCase()) {
      case "VALID":
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            OFFICIAL VERIFIED
          </span>
        );
      case "RECONSTRUCTED_FROM_FIXES":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
            <Info className="w-3 h-3 text-amber-400" />
            RECONSTRUCTED POLYLINE
          </span>
        );
      case "BORDER_UNRESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            BORDER SPLINE EXCLUDED
          </span>
        );
      case "ARC_UNRESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            ARC UNRESOLVED
          </span>
        );
      case "NOT_PUBLISHED":
      case "COORDINATES_NOT_PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            NOT PUBLISHED IN SOURCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            {st}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 text-xs space-y-3 max-w-md w-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-sm text-cyan-400">{entityKey}</span>
            <span className="text-slate-400 uppercase text-[10px] font-semibold bg-slate-800 px-1.5 py-0.5 rounded">
              {entityType}
            </span>
          </div>
          <h3 className="font-semibold text-slate-100 text-sm mt-0.5">{title}</h3>
          {subtitle && <p className="text-slate-400 text-[11px]">{subtitle}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-sm font-bold"
            title="Close inspector"
          >
            ✕
          </button>
        )}
      </div>

      {/* Validation Status Badge */}
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Integrity Status:</span>
        {getStatusBadge(status)}
      </div>

      {/* Structured Fields Grid */}
      {fields && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          {fields.map((f, idx) => (
            <div key={idx} className="space-y-0.5">
              <span className="text-[10px] text-slate-400 block truncate">{f.label}</span>
              <div className="font-mono font-semibold text-slate-100 text-xs">
                {f.value !== null && f.value !== undefined ? (
                  <span>
                    {String(f.value)} {f.unit ? <span className="text-[10px] text-slate-400">{f.unit}</span> : null}
                  </span>
                ) : (
                  <span className="text-slate-500 italic font-sans text-[11px]">Not published</span>
                )}
              </div>
              {f.section && <span className="text-[9px] text-cyan-400/80 block">{f.section}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Raw Boundary Text (for airspace / fixes) */}
      {rawBoundaryText && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Official Boundary Definition (AIP):</span>
          <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] text-slate-300 max-h-24 overflow-y-auto leading-relaxed select-all">
            {rawBoundaryText}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {disclaimer && (
        <div className="bg-amber-950/40 border border-amber-900/60 p-2 rounded text-[11px] text-amber-300/90 leading-tight">
          ⚠️ <b>Operational Note:</b> {disclaimer}
        </div>
      )}

      {/* Validation Issues / Limitations */}
      {validationIssues && validationIssues.length > 0 && (
        <div className="bg-red-950/40 border border-red-900/60 p-2 rounded space-y-1 text-[11px] text-red-300">
          <b className="block font-semibold">Geometry Verification Notes:</b>
          <ul className="list-disc pl-4 space-y-0.5">
            {validationIssues.map((iss, i) => (
              <li key={i}>{iss}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Source Provenance Metadata Footer */}
      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-cyan-400" />
            Section: <b className="text-slate-200">{sourceSection}</b>
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Calendar className="w-3 h-3 text-emerald-400" />
            AIRAC: <b className="text-slate-200">{effectiveDate}</b>
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="truncate max-w-[220px]" title={sourceFile}>
            File: <span className="font-mono text-slate-300">{sourceFile}</span>
          </span>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Verify Source <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
