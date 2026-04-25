import React, { useState, useMemo } from 'react';
import { cn, daysUntil } from '@/src/lib/utils';
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
  Sparkles,
  Cloud,
  Database,
  RefreshCw,
  Clock,
  Send,
  BarChart4,
  Users,
  AlertOctagon,
  CalendarDays,
  Target,
  FileText
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
  onShowMsg: () => void;
  onShowReports: () => void;
  onShowDPH: () => void;
  onShowUsers: () => void;
  collapsed: boolean;
  userRole: string;
  dbStatus: 'online' | 'error' | 'syncing';
  syncing: boolean;
  lastSynced: string | null;
  onSync: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  data, activeFilter, activeBlock, activePHC,
  onFilterChange, onBlockChange, onPHCChange, onShowAI, onShowSched, 
  onShowMsg, onShowReports, onShowDPH, onShowUsers,
  collapsed, userRole, dbStatus, syncing, lastSynced, onSync, onClose
}) => {
  const [openBlocks, setOpenBlocks] = useState<string[]>([]);

  const stats = useMemo(() => {
    return {
      all: data.length,
      active: data.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion').length,
      delivered: data.filter(r => r.ds === 'Delivered').length,
      post42: data.filter(r => r.ds === 'Delivered' && r.dd && (new Date().getTime() - new Date(r.dd).getTime()) / 86400000 > 42).length,
      eddOverdue: data.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion' && r.e && (daysUntil(r.e) ?? 0) < 0).length,
      overdueVisit: data.filter(r => {
        if (r.ds === 'Delivered' || r.ds === 'Abortion' || !r.lv) return false;
        const nv = new Date(new Date(r.lv).getTime() + 15 * 86400000);
        return nv.getTime() < new Date().setHours(0,0,0,0);
      }).length,
      edd15: data.filter(r => {
        const d = daysUntil(r.e);
        return r.ds !== 'Delivered' && r.ds !== 'Abortion' && d !== null && d >= 0 && d <= 15;
      }).length,
      hasRisk: data.filter(r => r.r && r.r.length > 0).length
    };
  }, [data]);

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

  const navItem = (id: string, icon: any, label: string, badgeValue: number, color?: string) => {
    const isActive = activeFilter === id;
    const Icon = icon;
    return (
      <div 
        onClick={() => onFilterChange(id)}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 mx-3 rounded-full cursor-pointer text-[13px] transition-all duration-200",
          isActive 
            ? "bg-primary-container text-on-primary-container font-semibold" 
            : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
        )}
      >
        <Icon size={18} style={{ color: !isActive ? color : undefined }} className="shrink-0" />
        <span className="truncate flex-1">{label}</span>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-bold",
          isActive ? "bg-on-primary-container/10 text-on-primary-container" : "bg-surface-variant/50 text-on-surface-variant"
        )}>
          {badgeValue}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!collapsed && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-[149] backdrop-blur-sm" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-[150] w-72 bg-white transition-all duration-300 overflow-y-auto flex flex-col shrink-0 border-r border-outline/50",
        collapsed && "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden border-none"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-lg">M</div>
             <div>
                <h2 className="text-sm font-bold text-on-surface tracking-tight">Mayiladuthurai</h2>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">District Health</p>
             </div>
          </div>
        </div>

        <div className="flex-1 space-y-1 pb-8">
          <div className="px-6 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] mb-1">Navigation</div>
          {navItem('all', LayoutDashboard, 'District Register', stats.all)}
          {navItem('active', Baby, 'Active Pregnancies', stats.active, '#10b981')}
          {navItem('delivered', Hospital, 'Delivered Cases', stats.delivered, '#3b82f6')}
          {navItem('post42', History, 'Post-Deliv > 42 Days', stats.post42, '#f59e0b')}
          {navItem('eddOverdue', AlertOctagon, 'EDD Crossed', stats.eddOverdue, '#ef4444')}
          
          <div className="mx-6 my-4 h-[1px] bg-outline/30" />
          
          <div className="px-6 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] mb-1">Risk Surveillance</div>
          {navItem('overdue', TriangleAlert, 'Overdue Follow-up', stats.overdueVisit, '#dc2626')}
          {navItem('edd15', CalendarDays, 'EDD within 15 days', stats.edd15, '#ea580c')}
          {navItem('highrisk', Target, 'High-Risk Flags', stats.hasRisk, '#4f46e5')}

          <div className="mx-6 my-4 h-[1px] bg-outline/30" />

          <div className="px-6 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] mb-1">Tools & Reports</div>
          <button onClick={onShowAI} className="w-full flex items-center gap-3 px-4 py-2.5 mx-3 rounded-full text-[13px] text-purple-600 font-bold hover:bg-purple-50 transition-colors border-none cursor-pointer">
            <Sparkles size={18} /> AI District Insights
          </button>
          <button onClick={onShowMsg} className="w-full flex items-center gap-3 px-4 py-2.5 mx-3 rounded-full text-[13px] text-indigo-600 font-bold hover:bg-indigo-50 transition-colors border-none cursor-pointer">
            <Send size={18} /> Messaging Centre
          </button>
          <button onClick={onShowSched} className="w-full flex items-center gap-3 px-4 py-2.5 mx-3 rounded-full text-[13px] text-orange-600 font-bold hover:bg-orange-50 transition-colors border-none cursor-pointer">
            <AlarmClock size={18} /> Alert Scheduler
          </button>
          
          <div className="px-6 py-2 mt-4 space-y-1">
             <button onClick={onShowReports} className="w-full flex items-center gap-3 px-4 py-2.5 -mx-3 rounded-full text-[13px] text-on-surface hover:bg-surface-variant transition-colors group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
                  <BarChart4 size={16} />
                </div>
                <span className="font-medium">Statistical Reports</span>
             </button>
             <button onClick={onShowDPH} className="w-full flex items-center gap-3 px-4 py-2.5 -mx-3 rounded-full text-[13px] text-on-surface hover:bg-surface-variant transition-colors group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
                  <FileText size={16} />
                </div>
                <span className="font-medium">DPH Abstract</span>
             </button>
          </div>

          {userRole === 'admin' && (
            <button onClick={onShowUsers} className="w-full flex items-center gap-3 px-4 py-2.5 mx-3 rounded-full text-[13px] text-on-surface font-semibold hover:bg-surface-variant transition-colors border-none cursor-pointer">
              <Users size={18} /> User Management
            </button>
          )}

          <div className="mx-6 my-4 h-[1px] bg-outline/30" />

          <div className="px-6 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] mb-1">Block Hierarchy</div>
          <div className="px-3 space-y-0.5">
            {Object.keys(blockMap).sort().map(block => (
              <div key={block} className="space-y-0.5">
                <div 
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer text-[13px] rounded-full transition-all duration-200",
                    activeBlock === block && !activePHC 
                      ? "bg-primary text-white font-bold shadow-md" 
                      : "text-on-surface hover:bg-surface-variant"
                  )}
                  onClick={() => {
                    toggleBlock(block);
                    onBlockChange(block);
                  }}
                >
                  <ChevronRight size={14} className={cn("transition-transform", openBlocks.includes(block) && "rotate-90")} />
                  <span className="truncate flex-1">{block}</span>
                  <span className={cn("text-[9px] font-bold px-1.5 rounded-full", activeBlock === block && !activePHC ? "bg-white/20 text-white" : "bg-surface-variant text-on-surface-variant")}>
                    {data.filter(r => r.b === block).length}
                  </span>
                </div>
                
                {openBlocks.includes(block) && (
                  <div className="ml-4 pl-4 border-l border-outline/30 space-y-0.5 my-1">
                    {[...blockMap[block]].sort().map(phc => (
                      <div 
                        key={phc}
                        onClick={() => onPHCChange(block, phc)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-full transition-colors cursor-pointer",
                          activePHC === phc ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
                        )}
                      >
                        <Hospital size={12} className="shrink-0" />
                        <span className="truncate">{phc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-surface-variant/30 mt-auto border-t border-outline/20">
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2 mb-3">
            <Cloud size={12} /> Sync Status
          </div>
          
          <div className="p-3 bg-surface rounded-2xl border border-outline/30 space-y-3 shadow-sm">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className={cn(
                     "w-2 h-2 rounded-full",
                     dbStatus === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                     dbStatus === 'syncing' ? "bg-blue-500 animate-pulse" : "bg-red-500"
                   )} />
                   <span className="text-[10px] font-bold text-on-surface uppercase">Live Link</span>
                </div>
                <Database size={14} className="text-on-surface-variant" />
             </div>

             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className={cn(
                     "w-2 h-2 rounded-full", 
                     syncing ? "bg-blue-500 animate-pulse" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                   )} />
                   <span className="text-[10px] font-bold text-on-surface uppercase">Sheet Sync</span>
                </div>
                <RefreshCw size={14} className={cn("text-on-surface-variant", syncing && "animate-spin")} />
             </div>

             <div className="text-[9px] text-on-surface-variant/60 font-mono text-center">
               Last: {lastSynced || 'Never'}
             </div>

             <button 
               onClick={onSync}
               disabled={syncing}
               className={cn(
                 "w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 border-none cursor-pointer",
                 syncing 
                   ? "bg-surface-variant text-transparent cursor-not-allowed shadow-none" 
                   : "bg-primary text-white hover:bg-[#1557b0] shadow-blue-100"
               )}
             >
               {syncing ? <RefreshCw size={14} className="animate-spin text-primary" /> : <><RefreshCw size={14} /> Refresh</>}
             </button>
          </div>
        </div>
      </aside>
    </>
  );
};
