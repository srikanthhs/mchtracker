import React from 'react';
import { StatCard, Badge } from './ui/Cards';
import { Announcement, PatientRecord } from '../types';
import { calcScore, isOverdue } from '../lib/hrp-logic';
import { daysUntil, fmtDate } from '../lib/utils';
import { 
  Users, 
  Baby, 
  TriangleAlert, 
  AlertCircle, 
  Activity, 
  CalendarClock,
  Megaphone,
  Clock,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface DashboardProps {
  data: PatientRecord[];
  announcements: Announcement[];
  filterMode: string;
  onFilterClick: (f: string) => void;
  scopeName?: string;
  isSyncing?: boolean;
  lastSynced?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  data, announcements, filterMode, onFilterClick,
  scopeName = 'District', isSyncing, lastSynced
}) => {
  const active = data.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion');
  const critical = active.filter(r => calcScore(r.r) >= 5);
  const high = active.filter(r => {
    const s = calcScore(r.r);
    return s >= 3 && s < 5;
  });
  const overdue = active.filter(r => isOverdue(r));
  const edd15 = active.filter(r => {
    const d = daysUntil(r.e);
    return d !== null && d >= 0 && d <= 15;
  });

  // Chart Data: Block-wise active count
  const blocks = [...new Set(data.map(r => r.b))].sort();
  const blockChartData = blocks.map(b => ({
    name: b,
    count: active.filter(r => r.b === b).length
  })).sort((a,b) => b.count - a.count).slice(0, 8); 

  // Chart Data: Risk distribution
  const riskDist = [
    { name: 'Critical', value: critical.length, color: '#C5221F' },
    { name: 'High', value: high.length, color: '#E37400' },
    { name: 'Other Active', value: active.length - critical.length - high.length, color: '#188038' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-bold tracking-tight text-on-surface">{scopeName} Overview</h2>
            <Badge className="bg-primary/10 text-primary border-primary/20">Live</Badge>
          </div>
          <p className="text-on-surface-variant font-medium">Real-time health surveillance for Mayiladuthurai Maternal Care</p>
        </div>

        <div className="flex items-center gap-3 bg-surface border border-outline/20 px-4 py-2 rounded-2xl shadow-sm">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-tight">Meters Sync Status</span>
              <span className="text-xs font-bold text-on-surface">{data.length} Records in View</span>
           </div>
           <div className={cn(
             "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
             isSyncing ? "bg-primary text-white animate-pulse" : "bg-primary/10 text-primary"
           )}>
              <RefreshCw size={18} className={cn(isSyncing && "animate-spin")} />
           </div>
        </div>
      </header>

      {data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[32px] border border-dashed border-outline/40">
           <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
              <Users size={40} />
           </div>
           <h3 className="text-xl font-bold text-slate-800 mb-2">No Maternal Records Displayed</h3>
           <p className="text-slate-500 text-sm mb-6 max-w-sm text-center">There are no records matching the current block or PHC filters. Try selecting a different location in the sidebar.</p>
           <div className="flex gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-md hover:bg-indigo-700 transition-all"
              >
                Refresh Dashboard
              </button>
           </div>
        </div>
      ) : (
        <>
          {/* Cards Row */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none -mx-4 px-4">
            <StatCard 
              icon={Users} color="#1a73e8" bg="#e8f0fe" val={data.length} lbl="Total Registry" 
              isActive={filterMode === 'all' || filterMode === ''} onClick={() => onFilterClick('all')}
            />
            <StatCard 
              icon={Baby} color="#188038" bg="#e6f4ea" val={active.length} lbl="Active Pregnancies" 
              isActive={filterMode === 'active'} onClick={() => onFilterClick('active')}
            />
            <StatCard 
              icon={Activity} color="#d93025" bg="#fce8e6" val={critical.length} lbl="Critical Risk" 
              isActive={filterMode === 'crit'} onClick={() => onFilterClick('crit')}
            />
            <StatCard 
              icon={AlertCircle} color="#e37400" bg="#fef7e0" val={high.length} lbl="High Risk" 
              isActive={filterMode === 'high'} onClick={() => onFilterClick('high')}
            />
            <StatCard 
              icon={TriangleAlert} color="#d93025" bg="#fce8e6" val={overdue.length} lbl="Overdue Visits" 
              isActive={filterMode === 'overdue'} onClick={() => onFilterClick('overdue')}
            />
            <StatCard 
              icon={CalendarClock} color="#f29900" bg="#feefc3" val={edd15.length} lbl="EDD ≤ 15 Days" 
              isActive={filterMode === 'edd15'} onClick={() => onFilterClick('edd15')}
            />
          </div>

          {/* Visualisation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Block-wise Breakdown Chart */}
            <div className="bg-surface p-8 rounded-[32px] border border-outline/30 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-on-surface tracking-tight flex items-center gap-2">
                    <Activity size={20} className="text-primary" />
                    Active Cases by Block
                  </h3>
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-variant/50 px-2 py-1 rounded-md">Top 8 Blocks</div>
              </div>
              <div className="h-[280px] w-full flex items-center justify-center">
                {blockChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={blockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dadce0" opacity={0.4} />
                      <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontWeight: 500}} dy={10} />
                      <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#5f6368', fontWeight: 500}} />
                      <Tooltip cursor={{fill: '#f1f3f4'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="count" fill="#1a73e8" radius={[8,8,0,0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-3">
                      <Activity size={24} />
                    </div>
                    <p className="text-sm font-medium text-on-surface-variant">No data available for blocks</p>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Distribution Chart */}
            <div className="bg-surface p-8 rounded-[32px] border border-outline/30 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-on-surface tracking-tight flex items-center gap-2">
                    <TriangleAlert size={20} className="text-orange-500" />
                    Risk Segmentation
                  </h3>
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-variant/50 px-2 py-1 rounded-md">Percentage Distribution</div>
              </div>
              <div className="h-[280px] w-full flex items-center justify-center">
                {active.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={105}
                        paddingAngle={8}
                        stroke="none"
                        dataKey="value"
                      >
                        {riskDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{fontSize: '13px', fontWeight: 500, color: '#202124'}} verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-3">
                      <TriangleAlert size={24} />
                    </div>
                    <p className="text-sm font-medium text-on-surface-variant">No risk data to display</p>
                  </div>
                )}
              </div>
            </div>

            {/* Announcements Section */}
            <div className="bg-surface p-8 rounded-[32px] border border-outline/30 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-on-surface tracking-tight flex items-center gap-3">
                  <Megaphone size={20} className="text-primary" />
                  District Administrative Updates
                </h3>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Live Updates</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.length > 0 ? announcements.map((item) => (
                  <div key={item.id} className="p-6 bg-surface-variant/10 rounded-[24px] border border-outline/20 hover:border-primary/40 transition-all group cursor-pointer hover:shadow-md hover:bg-white">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors leading-snug">{item.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant font-bold whitespace-nowrap bg-surface px-2 py-1 rounded-full shadow-sm">
                        <Clock size={12} />
                        {item.createdAt?.toDate ? fmtDate(item.createdAt.toDate().toISOString()) : 'Recent'}
                      </div>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-4 line-clamp-3">{item.content}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">DA</div>
                         <span className="text-[11px] text-on-surface font-bold">Admin</span>
                      </div>
                      <button className="text-xs font-bold text-primary hover:underline">Full Details</button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-2 py-16 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-surface-variant/30 flex items-center justify-center text-on-surface-variant/20 mb-4">
                       <Megaphone size={32} />
                    </div>
                    <p className="text-on-surface font-bold">No announcements yet</p>
                    <p className="text-on-surface-variant text-sm">Official district notices will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
