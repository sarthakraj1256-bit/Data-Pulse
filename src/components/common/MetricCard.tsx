import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'error' | 'neutral' | 'accent';
  };
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  className = '',
}) => {
  const badgeStyles = {
    success: 'bg-[#277A58]/10 text-[#277A58] border-[#277A58]/20',
    warning: 'bg-[#B77722]/10 text-[#B77722] border-[#B77722]/20',
    error: 'bg-[#B4233D]/10 text-[#B4233D] border-[#B4233D]/20',
    neutral: 'bg-[#756772]/10 text-[#756772] border-[#756772]/20',
    accent: 'bg-[#641B32]/10 text-[#641B32] border-[#641B32]/20',
  };

  return (
    <div
      className={`bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-2xl p-5 transition-all duration-200 hover:border-[#B94B68]/40 hover:shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase text-[#756772]">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-[#FFF8EF] text-[#641B32] border border-[#D9A0AE]/20">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#29212A]">
          {value}
        </div>
        {badge && (
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              badgeStyles[badge.variant || 'accent']
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-[#756772] leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};
