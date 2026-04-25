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
        "flex-1 min-w-[160px] bg-surface rounded-[28px] p-5 flex flex-col gap-3 cursor-pointer transition-all border border-outline/30 hover:shadow-md hover:bg-surface-variant/20 group relative overflow-hidden",
        isActive && "bg-primary-container border-primary/20 shadow-none ring-1 ring-primary/10"
      )}
    >
      <div 
        className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
          isActive ? "bg-primary text-white" : "bg-surface-variant text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary"
        )}
        style={isActive ? {} : { color }}
      >
        <Icon size={24} />
      </div>
      <div>
        <div className={cn(
          "text-2xl font-bold tracking-tight mb-0.5",
          isActive ? "text-on-primary-container" : "text-on-surface"
        )}>{val}</div>
        <div className={cn(
          "text-[12px] font-medium leading-tight",
          isActive ? "text-on-primary-container/70" : "text-on-surface-variant"
        )}>{lbl}</div>
      </div>
      {isActive && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode, className?: string, style?: React.CSSProperties }> = ({ children, className, style }) => (
  <span 
    className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold tracking-tight", className)}
    style={style}
  >
    {children}
  </span>
);
