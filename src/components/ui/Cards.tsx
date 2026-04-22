import React from 'react';
import { cn } from '@/src/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  icon: LucideIcon;
  color: string;
  bg: string;
  val: string | number;
  lbl: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<CardProps> = ({ icon: Icon, color, bg, val, lbl, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex-1 min-w-[120px] bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all border-2 border-transparent hover:shadow-md hover:-translate-y-0.5",
        isActive && "shadow-md -translate-y-0.5"
      )}
      style={isActive ? { borderColor: color, background: bg } : {}}
    >
      <div 
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" 
        style={{ background: isActive ? color : bg }}
      >
        <Icon size={18} color={isActive ? "#fff" : color} />
      </div>
      <div>
        <div className="font-sans text-xl font-medium leading-none" style={{ color }}>{val}</div>
        <div className={cn("text-[11px] text-gray-500 mt-0.5", isActive && "font-medium")} style={isActive ? { color } : {}}>{lbl}</div>
        {isActive && (
          <div className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider" style={{ color }}>
            ● Filtered
          </div>
        )}
      </div>
      {isActive && (
        <div 
          className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full" 
          style={{ background: color }}
        />
      )}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode, className?: string, style?: React.CSSProperties }> = ({ children, className, style }) => (
  <span 
    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", className)}
    style={style}
  >
    {children}
  </span>
);
