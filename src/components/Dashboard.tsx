import React from 'react';
import { StatCard, Badge } from './ui/Cards';
import { Announcement, PatientRecord } from '@/src/types';
import { calcScore, isOverdue } from '@/src/lib/hrp-logic';
import { daysUntil, fmtDate } from '@/src/lib/utils';
import { 
  Users, 
  Baby, 
  TriangleAlert, 
  AlertCircle, 
  Activity, 
  CalendarClock,
  Megaphone,
  Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface DashboardProps {
  data: PatientRecord[];
  announcements: Announcement[];
  filterMode: string;
  onFilterClick: (f: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, announcements, filterMode, onFilterClick }) => {
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
  })).slice(0, 8); // top 8 for readability

  // Chart Data: Risk distribution
  const riskDist = [
    { name: 'Critical', value: critical.length, color: '#C5221F' },
    { name: 'High', value: high.length, color: '#E37400' },
    { name: 'Other Active', value: active.length - critical.length - high.length, color: '#188038' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cards Row */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        <StatCard 
          icon={Users} color="#4f46e5" bg="#f5f3ff" val={data.length} lbl="Total Registry" 
          isActive={filterMode === ''} onClick={() => onFilterClick('')}
        />
        <StatCard 
          icon={Baby} color="#10b981" bg="#ecfdf5" val={active.length} lbl="Active Pregnancies" 
          isActive={filterMode === 'active'} onClick={() => onFilterClick('active')}
        />
        <StatCard 
          icon={Activity} color="#ef4444" bg="#fef2f2" val={critical.length} lbl="Critical Risk" 
          isActive={filterMode === 'crit'} onClick={() => onFilterClick('crit')}
        />
        <StatCard 
          icon={AlertCircle} color="#f59e0b" bg="#fffbeb" val={high.length} lbl="High Risk" 
          isActive={filterMode === 'high'} onClick={() => onFilterClick('high')}
        />
        <StatCard 
          icon={TriangleAlert} color="#ef4444" bg="#fef2f2" val={overdue.length} lbl="Overdue Visit" 
          isActive={filterMode === 'overdue'} onClick={() => onFilterClick('overdue')}
        />
        <StatCard 
          icon={CalendarClock} color="#f59e0b" bg="#fffbeb" val={edd15.length} lbl="EDD ≤ 15 Days" 
          isActive={filterMode === 'edd15'} onClick={() => onFilterClick('edd15')}
        />
      </div>

      {/* Visualisation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Block-wise Breakdown Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
          <h3 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider text-[11px]">
            <Activity size={16} className="text-primary" strokeWidth={2.5} />
            Active Cases by Block
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={blockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.6} />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4,4,0,0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
          <h3 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider text-[11px]">
            <TriangleAlert size={16} className="text-orange-500" strokeWidth={2.5} />
            Risk Distribution
          </h3>
          <div className="h-[240px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  stroke="none"
                  dataKey="value"
                >
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Announcements / General Content Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 uppercase tracking-wider text-[11px]">
              <Megaphone size={16} className="text-primary" strokeWidth={2.5} />
              District Announcements & Updates
            </h3>
            <Badge className="bg-slate-50 text-slate-500 border-slate-200">Content Collection</Badge>
          </div>
          
          <div className="space-y-4">
            {announcements.length > 0 ? announcements.map((item) => (
              <div key={item.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-primary/20 transition-colors group">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{item.title}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    <Clock size={12} />
                    {item.createdAt?.toDate ? fmtDate(item.createdAt.toDate().toISOString()) : 'Recent'}
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
                <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Posted by: {item.authorName || 'District Admin'}</span>
                  <button className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">Read More</button>
                </div>
              </div>
            )) : (
              <div className="py-12 border-2 border-dashed border-slate-100 rounded-xl text-center">
                <Clock size={32} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-xs font-medium">No announcements found. Stay tuned for district updates.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
