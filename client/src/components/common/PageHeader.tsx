import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  actions,
  meta,
}) => {
  return (
    <div className="bg-[#0D1726] border border-[#26374B] p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && <div className="text-[#37C9D6]">{icon}</div>}
          <h2 className="text-lg font-bold text-[#F1F5FA] tracking-tight">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-[#A5B3C4] leading-relaxed max-w-3xl">{subtitle}</p>}
        {meta && <div className="pt-1.5 flex flex-wrap items-center gap-3 text-xs">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
};
