import React, { useState, useMemo } from 'react';
import { cn } from '@/src/lib/utils';
import { PatientRecord } from '@/src/types';
import { 
  LayoutDashboard, 
  UserRound, 
  Baby, 
  TriangleAlert, 
  AlarmClock, 
  History, 
  ChevronRight, 
  Hospital,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  data: PatientRecord[];
  activeFilter: string;
  activeBlock: string;
  activePHC: string;
  onFilterChange: (type: string) => void;
  onBlockChange: (block: string) => void;
  onPHCChange: (block: string, phc: string) => void;
  onShowAI: () => void;
  onShowSched: () => void;
  collapsed: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  data, activeFilter, activeBlock, activePHC,
  onFilterChange, onBlockChange, onPHCChange, onShowAI, onShowSched,
  collapsed, onClose
}) => {
  const [openBlocks, setOpenBlocks] = useState<string[]>([]);

  const blockMap = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    data.forEach(r => {
      if (!m[r.b]) m[r.b] = new Set();
      m[r.b].add(r.p);
    });
    return m;
  }, [data]);

  const toggleBlock = (b: string) => {
    setOpenBlocks(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const navItem = (id: string, icon: any, label: string, badgeValue: number) => {
    const isActive = activeFilter === id;
    const Icon = icon;
    return (
      <div 
        onClick={() => onFilterChange(id)}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-all duration-200 border-l-4",
          isActive 
            ? "bg-indigo-50/50 text-indigo-600 font-semibold border-indigo-600" 
            : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span className="truncate">{label}</span>
        <span className="ml-auto bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full min-w-[24px] text-center shrink-0">
          {badgeValue}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!collapsed && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-[149]" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-[150] w-64 bg-white border-r border-gray-200 transition-all duration-300 overflow-y-auto",
        collapsed && "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"
      )}>
        <div className="py-4 space-y-1">
          <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Views</div>
          {navItem('all', LayoutDashboard, 'All Records', data.length)}
          {navItem('active', Baby, 'Active Cases', data.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion').length)}
          {navItem('delivered', Hospital, 'Delivered', data.filter(r => r.ds === 'Delivered').length)}
          
          <div className="mx-4 my-2 h-px bg-gray-100" />
          
          <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Alerts</div>
          {navItem('overdue', TriangleAlert, 'Overdue Visits', 24)} {/* Placeholder count */}
          <div 
            onClick={onShowAI}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm text-purple-600 hover:bg-purple-50 rounded-r-full mr-2 transition-colors"
          >
            <Sparkles size={18} />
            <span>AI Insights</span>
            <span className="ml-auto bg-purple-100 text-purple-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold">NEW</span>
          </div>
          <div 
            onClick={onShowSched}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm text-gray-600 hover:bg-gray-100 rounded-r-full mr-2 transition-colors"
          >
            <AlarmClock size={18} />
            <span>Alert Scheduler</span>
          </div>

          <div className="mx-4 my-2 h-px bg-gray-100" />

          <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Block Hierarchy</div>
          {Object.keys(blockMap).sort().map(block => (
            <div key={block} className="space-y-0.5">
              <div 
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 cursor-pointer text-[13px] border-l-4 transition-all duration-200",
                  activeBlock === block && !activePHC 
                    ? "bg-indigo-50/50 text-indigo-600 font-semibold border-indigo-600" 
                    : "text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                )}
                onClick={() => {
                  toggleBlock(block);
                  onBlockChange(block);
                }}
              >
                <ChevronRight size={14} className={cn("transition-transform", openBlocks.includes(block) && "rotate-90")} />
                <span className="truncate">{block}</span>
                <span className="ml-auto text-[10px] text-gray-400 font-normal">
                  {data.filter(r => r.b === block).length}
                </span>
              </div>
              
              {openBlocks.includes(block) && (
                <div className="pl-6 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                  {[...blockMap[block]].sort().map(phc => (
                    <div 
                      key={phc}
                      onClick={() => onPHCChange(block, phc)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-1.5 cursor-pointer text-[12px] text-gray-500 hover:text-blue-600 transition-colors rounded-r-full mr-2",
                        activePHC === phc && "bg-blue-50 text-blue-600 font-medium"
                      )}
                    >
                      <Hospital size={12} className="shrink-0" />
                      <span className="truncate">{phc}</span>
                      <span className="ml-auto text-[9px] opacity-70">
                        {data.filter(r => r.b === block && r.p === phc).length}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};
