import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string | null;
  secondary?: React.ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  status?: "published" | "missing" | "inferred" | "custom";
  interactive?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  secondary,
  icon: Icon,
  iconColor = "text-[#37C9D6]",
  onClick,
  interactive = false,
  className = "",
}) => {
  const isMissing = value === null || value === undefined || value === "";

  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`p-3 bg-[#0D1726] border border-[#26374B] rounded-xl transition-all duration-150 ${
        interactive
          ? "cursor-pointer hover:bg-[#121F31] hover:border-[#37C9D6]/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#37C9D6]"
          : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between text-xs text-[#74869C] mb-1">
        <span className="flex items-center gap-1.5 font-medium truncate">
          {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />}
          <span className="truncate">{label}</span>
        </span>
        {interactive && (
          <span className="text-[10px] text-[#37C9D6] font-mono shrink-0">AD</span>
        )}
      </div>

      <div className="mt-1">
        {isMissing ? (
          <span className="text-xs text-[#74869C] italic">Not published</span>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold font-mono text-[#F1F5FA] tracking-tight">
              {String(value)}
            </span>
            {unit && <span className="text-xs text-[#A5B3C4] font-mono">{unit}</span>}
          </div>
        )}
      </div>

      {secondary && <div className="mt-1.5 text-[11px] text-[#A5B3C4]">{secondary}</div>}
    </div>
  );
};
