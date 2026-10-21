import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", elevated = false }) => {
  return (
    <div
      className={`${
        elevated ? "bg-[#121F31]" : "bg-[#0D1726]"
      } border border-[#26374B] rounded-xl overflow-hidden shadow-sm ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  actions,
  className = "",
}) => {
  return (
    <div className={`px-5 py-3.5 border-b border-[#26374B] flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && <div className="text-[#37C9D6] shrink-0">{icon}</div>}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#F1F5FA] tracking-tight">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-[#A5B3C4] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "p-5",
}) => {
  return <div className={className}>{children}</div>;
};
