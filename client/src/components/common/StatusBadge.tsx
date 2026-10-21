import React from "react";

export type BadgeVariant = "cyan" | "blue" | "green" | "amber" | "red" | "neutral" | "purple";

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "xs" | "sm" | "md";
  mono?: boolean;
  dot?: boolean;
  className?: string;
  title?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  cyan: {
    bg: "bg-[#37C9D6]/10",
    text: "text-[#37C9D6]",
    border: "border-[#37C9D6]/30",
    dot: "bg-[#37C9D6]",
  },
  blue: {
    bg: "bg-[#6C9EFF]/10",
    text: "text-[#6C9EFF]",
    border: "border-[#6C9EFF]/30",
    dot: "bg-[#6C9EFF]",
  },
  green: {
    bg: "bg-[#47C995]/10",
    text: "text-[#47C995]",
    border: "border-[#47C995]/30",
    dot: "bg-[#47C995]",
  },
  amber: {
    bg: "bg-[#E9B45B]/10",
    text: "text-[#E9B45B]",
    border: "border-[#E9B45B]/30",
    dot: "bg-[#E9B45B]",
  },
  red: {
    bg: "bg-[#F16C78]/10",
    text: "text-[#F16C78]",
    border: "border-[#F16C78]/30",
    dot: "bg-[#F16C78]",
  },
  purple: {
    bg: "bg-[#A855F7]/10",
    text: "text-[#C084FC]",
    border: "border-[#A855F7]/30",
    dot: "bg-[#A855F7]",
  },
  neutral: {
    bg: "bg-[#17263A]",
    text: "text-[#A5B3C4]",
    border: "border-[#26374B]",
    dot: "bg-[#74869C]",
  },
};

const sizeStyles = {
  xs: "text-[10px] px-1.5 py-0.5",
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  variant = "neutral",
  size = "xs",
  mono = false,
  dot = false,
  className = "",
  title,
}) => {
  const v = variantStyles[variant];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${v.bg} ${v.text} ${v.border} ${sizeStyles[size]} ${
        mono ? "font-mono" : "font-sans"
      } ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${v.dot}`} />}
      <span>{children}</span>
    </span>
  );
};
