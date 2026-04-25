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
          "flex items-center gap-3 px-4 py-2 cursor-pointer text-[12px] transition-all duration-200 border-l-4",
          isActive 
            ? "bg-indigo-50/50 text-indigo-600 font-bold border-indigo-600" 
            : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
        )}
      >
        <Icon size={16} style={{ color: !isActive ? color : undefined }} className="shrink-0" />
        <span className="truncate">{label}</span>
        <span className={cn(
          "ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold",
          isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
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
        <div className="md:hidden fixed inset-0 bg-black/40 z-[149]" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-[150] w-64 bg-white border-r border-slate-200 transition-all duration-300 overflow-y-auto flex flex-col shrink-0",
        collapsed && "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden border-none"
      )}>
        <div className="flex-1 py-4 space-y-1">
          <div className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">View Controller</div>
          {navItem('all', LayoutDashboard, 'District Register', stats.all)}
          {navItem('active', Baby, 'Active Pregnancies', stats.active, '#10b981')}
          {navItem('delivered', Hospital, 'Delivered Cases', stats.delivered, '#3b82f6')}
          {navItem('post42', History, 'Post-Deliv > 42 Days', stats.post42, '#f59e0b')}
          {navItem('eddOverdue', AlertOctagon, 'EDD Crossed', stats.eddOverdue, '#ef4444')}
          
          <div className="mx-4 my-3 h-px bg-slate-100" />
          
          <div className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Risk Surveillance</div>
          {navItem('overdue', TriangleAlert, 'Overdue Follow-up', stats.overdueVisit, '#dc2626')}
          {navItem('edd15', CalendarDays, 'EDD within 15 days', stats.edd15, '#ea580c')}
          {navItem('highrisk', Target, 'Has High-Risk Flags', stats.hasRisk, '#4f46e5')}

          <div className="mx-4 my-3 h-px bg-slate-100" />

          <div className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Tools & Actions</div>
          <button onClick={onShowAI} className="w-full flex items-center gap-3 px-4 py-2 text-[12px] text-purple-600 font-bold hover:bg-purple-50 transition-colors border-none cursor-pointer">
            <Sparkles size={16} /> AI District Insights
          </button>
          <button onClick={onShowMsg} className="w-full flex items-center gap-3 px-4 py-2 text-[12px] text-indigo-600 font-bold hover:bg-indigo-50 transition-colors border-none cursor-pointer">
            <Send size={16} /> Messaging Centre
          </button>
          <button onClick={onShowSched} className="w-full flex items-center gap-3 px-4 py-2 text-[12px] text-orange-600 font-bold hover:bg-orange-50 transition-colors border-none cursor-pointer">
            <AlarmClock size={16} /> Alert Scheduler
          </button>
          <div className="grid grid-cols-2 gap-px px-4 py-1">
             <button onClick={onShowReports} className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 transition-all gap-1 text-slate-500 hover:text-indigo-600 cursor-pointer">
                <BarChart4 size={14} />
                <span className="text-[8px] font-black uppercase">Reports</span>
             </button>
             <button onClick={onShowDPH} className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all gap-1 text-slate-500 hover:text-slate-900 cursor-pointer">
                <FileText size={14} />
                <span className="text-[8px] font-black uppercase">DPH Abstract</span>
             </button>
          </div>
          {userRole === 'admin' && (
            <button onClick={onShowUsers} className="w-full flex items-center gap-3 px-4 py-2 text-[12px] text-slate-600 font-bold hover:bg-slate-100 transition-colors border-none cursor-pointer">
              <Users size={16} /> User Management
            </button>
          )}

          <div className="mx-4 my-3 h-px bg-slate-100" />

          <div className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Block Hierarchy</div>
          <div className="px-2 space-y-0.5">
            {Object.keys(blockMap).sort().map(block => (
              <div key={block} className="space-y-0.5">
                <div 
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[12px] rounded-xl transition-all duration-200",
                    activeBlock === block && !activePHC 
                      ? "bg-indigo-600 text-white font-bold" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                  onClick={() => {
                    toggleBlock(block);
                    onBlockChange(block);
                  }}
                >
                  <ChevronRight size={12} className={cn("transition-transform", openBlocks.includes(block) && "rotate-90")} />
                  <span className="truncate">{block}</span>
                  <span className={cn("ml-auto text-[8px] font-black", activeBlock === block && !activePHC ? "text-white/80" : "text-slate-300")}>
                    {data.filter(r => r.b === block).length}
                  </span>
                </div>
                
                {openBlocks.includes(block) && (
                  <div className="ml-4 pl-2 border-l border-slate-100 space-y-0.5 animate-in slide-in-from-left-1 duration-200">
                    {[...blockMap[block]].sort().map(phc => (
                      <div 
                        key={phc}
                        onClick={() => onPHCChange(block, phc)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1 text-[11px] rounded-lg transition-colors cursor-pointer",
                          activePHC === phc ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <Hospital size={10} className="shrink-0" />
                        <span className="truncate">{phc}</span>
                        <span className="ml-auto text-[8px] opacity-60">
                          {data.filter(r => r.b === block && r.p === phc).length}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <Cloud size={10} /> Sync Infrastructure
          </div>
          
          <div className="space-y-1.5">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full",
                     dbStatus === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                     dbStatus === 'syncing' ? "bg-blue-500 animate-pulse" : "bg-red-500"
                   )} />
                   <span className="text-[10px] font-bold text-slate-600 uppercase">Cloud Link</span>
                </div>
                <Database size={10} className="text-slate-300" />
             </div>

             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full", 
                     syncing ? "bg-blue-500 animate-pulse" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                   )} />
                   <span className="text-[10px] font-bold text-slate-600 uppercase">Sheet Link</span>
                </div>
                <RefreshCw size={10} className={cn("text-slate-300", syncing && "animate-spin")} />
             </div>

             <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-2 bg-white px-2 py-1.5 rounded-lg border border-slate-100 font-mono tracking-tighter">
               <Clock size={10} />
               <span>Synced: {lastSynced || 'Never'}</span>
             </div>

             <button 
               onClick={onSync}
               disabled={syncing}
               className={cn(
                 "w-full mt-2 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 border-none cursor-pointer",
                 syncing 
                   ? "bg-slate-100 text-slate-400 cursor-not-allowed border-none shadow-none" 
                   : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
               )}
             >
               <RefreshCw size={12} className={cn(syncing && "animate-spin")} />
               {syncing ? 'UPDATING...' : 'Sync Master'}
             </button>
          </div>
        </div>
      </aside>
    </>
  );
};
