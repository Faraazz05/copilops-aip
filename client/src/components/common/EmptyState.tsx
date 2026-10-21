import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = "py-12 px-4",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-[#121F31] border border-[#26374B] flex items-center justify-center text-[#74869C] mb-3">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-[#F1F5FA]">{title}</h4>
      {description && <p className="text-xs text-[#A5B3C4] max-w-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
