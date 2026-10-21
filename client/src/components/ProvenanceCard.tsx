/**
 * CopilOPS — Aviation Operations Intelligence
 * Author: Mohd Faraz (https://faraazz05.github.io)
 * Reusable Feature Provenance & Data Integrity Inspector
 */

import React, { useState } from "react";
import {
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle2,
  Info,
  Copy,
  Check,
  X,
} from "lucide-react";
import { IProvenance } from "../types";
import { StatusBadge, BadgeVariant } from "./common/StatusBadge";

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
  const [copied, setCopied] = useState(false);

  const effectiveDate = provenance?.effective_date || "2026-10-01";
  const sourceSection = provenance?.section || "skeyes Belgium & Luxembourg eAIP";
  const sourceFile = provenance?.source_file || "eAIP Package";
  const sourceUrl = provenance?.source_url || "https://ops.skeyes.be";
  const status = validationStatus || provenance?.validation_status || "PUBLISHED";

  const getStatusBadgeInfo = (st: string): { label: string; variant: BadgeVariant; desc?: string } => {
    switch (st.toUpperCase()) {
      case "VALID":
      case "PUBLISHED":
        return { label: "OFFICIAL VERIFIED", variant: "green" };
      case "RECONSTRUCTED_FROM_FIXES":
        return {
          label: "RECONSTRUCTED FIX SEQUENCE",
          variant: "amber",
          desc: "Derived by connecting published fix coordinates; not a surveyed centerline.",
        };
      case "BORDER_UNRESOLVED":
        return {
          label: "NON-SURVEYED BORDER (EXCLUDED)",
          variant: "amber",
          desc: "Polygon contains complex international boundary vertices not published as survey points.",
        };
      case "ARC_UNRESOLVED":
        return {
          label: "ARC GEOMETRY UNRESOLVED",
          variant: "amber",
          desc: "Airspace contains circular arc descriptions without explicit vertex enumeration.",
        };
      case "NOT_PUBLISHED":
      case "COORDINATES_NOT_PUBLISHED":
        return { label: "NOT PUBLISHED IN SOURCE", variant: "neutral" };
      default:
        return { label: st, variant: "cyan" };
    }
  };

  const badgeInfo = getStatusBadgeInfo(status);

  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0D1726] border border-[#26374B] rounded-xl shadow-2xl p-4 text-xs space-y-3.5 max-w-md w-full font-sans">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#26374B] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold text-[#37C9D6] tracking-wider">
              {entityType}
            </span>
            <span className="text-[#26374B]">&bull;</span>
            <span className="font-mono text-xs font-semibold text-[#F1F5FA]">{entityKey}</span>
          </div>
          <h4 className="font-bold text-[#F1F5FA] text-sm leading-tight">{title}</h4>
          {subtitle && <p className="text-[11px] text-[#A5B3C4]">{subtitle}</p>}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#74869C] hover:text-[#F1F5FA] hover:bg-[#121F31] transition-colors"
            title="Close details panel"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Validation Status Badge & Operational Disclaimer */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#74869C] tracking-wider">
            Validation State
          </span>
          <StatusBadge variant={badgeInfo.variant} mono size="xs" dot>
            {badgeInfo.label}
          </StatusBadge>
        </div>

        {badgeInfo.desc && (
          <p className="text-[11px] text-[#E9B45B] bg-[#E9B45B]/10 border border-[#E9B45B]/20 rounded-md p-2">
            {badgeInfo.desc}
          </p>
        )}

        {disclaimer && (
          <div className="flex items-start gap-1.5 text-[11px] text-[#A5B3C4] bg-[#070D18] p-2 rounded-md border border-[#26374B]">
            <Info className="w-3.5 h-3.5 text-[#37C9D6] shrink-0 mt-0.5" />
            <span>{disclaimer}</span>
          </div>
        )}

        {validationIssues && validationIssues.length > 0 && (
          <div className="bg-[#F16C78]/10 border border-[#F16C78]/30 rounded-md p-2 space-y-1">
            <span className="text-[10px] font-mono font-bold text-[#F16C78] uppercase">
              Validation Diagnostics:
            </span>
            <ul className="list-disc list-inside text-[11px] text-[#F16C78] space-y-0.5">
              {validationIssues.map((iss, i) => (
                <li key={i}>{iss}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Attribute Values Grid */}
      {fields && fields.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-semibold text-[#74869C] tracking-wider block">
            Published Attributes
          </span>
          <div className="bg-[#070D18] rounded-lg border border-[#26374B] divide-y divide-[#26374B]/60 overflow-hidden">
            {fields.map((f, idx) => (
              <div key={idx} className="px-2.5 py-1.5 flex items-center justify-between text-xs">
                <span className="text-[#A5B3C4] text-[11px]">{f.label}</span>
                <span className="font-mono text-[#F1F5FA] font-medium text-right">
                  {f.value !== null && f.value !== undefined ? (
                    <>
                      <span>{String(f.value)}</span>
                      {f.unit && <span className="text-[10px] text-[#74869C] ml-1">{f.unit}</span>}
                    </>
                  ) : (
                    <span className="text-[#74869C] italic text-[11px] font-sans">Not published</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Source / Boundary Text */}
      {rawBoundaryText && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-[#74869C]">
            <span className="uppercase font-semibold tracking-wider">Raw Publication Text</span>
            <button
              onClick={() => handleCopyRaw(rawBoundaryText)}
              className="flex items-center gap-1 text-[#37C9D6] hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-[#47C995]" />
                  <span className="text-[#47C995]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-[#070D18] p-2 rounded-lg border border-[#26374B] font-mono text-[11px] text-[#A5B3C4] max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
            {rawBoundaryText}
          </div>
        </div>
      )}

      {/* Provenance Metadata & Official Link */}
      <div className="pt-2 border-t border-[#26374B] text-[11px] text-[#74869C] space-y-1.5">
        <div className="flex items-center justify-between font-mono">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#47C995]" />
            <span>Effective Date:</span>
          </span>
          <span className="text-[#F1F5FA] font-medium">{effectiveDate}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-[#37C9D6]" />
            <span>Section:</span>
          </span>
          <span className="text-[#A5B3C4] font-mono truncate max-w-[200px]" title={sourceSection}>
            {sourceSection}
          </span>
        </div>

        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#74869C]">Package: {sourceFile}</span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#37C9D6] hover:text-[#6C9EFF] font-medium transition-colors"
          >
            <span>skeyes eAIP</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
