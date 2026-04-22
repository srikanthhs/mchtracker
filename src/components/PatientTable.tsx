import React from 'react';
import { PatientRecord } from '@/src/types';
import { cn, fmtDate } from '@/src/lib/utils';
import { calcScore, getRiskCat, getVisitStatus } from '@/src/lib/hrp-logic';
import { Badge } from './ui/Cards';
import { Search, Download, Upload, Phone, Sparkles } from 'lucide-react';

interface TableProps {
  data: PatientRecord[];
  onRowClick: (rec: PatientRecord) => void;
  onSearch: (q: string) => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export const PatientTable: React.FC<TableProps> = ({ data, onRowClick, onSearch, onSync, isSyncing }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden animate-in fade-in duration-700">
      <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest ml-1">Patient Register</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search patients..."
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-border rounded-lg text-xs focus:bg-white focus:border-primary focus:ring-2 focus:ring-indigo-50 focus:outline-none transition-all w-full md:w-64 text-slate-600"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {onSync && (
              <button 
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {isSyncing ? (
                  <div className="w-3 h-3 border-2 border-indigo-700/30 border-t-indigo-700 rounded-full animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Sync Sheets
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <Download size={14} /> CSV
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-border">Mother Name</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-border text-center">Age</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-border text-center">G/P</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-border">EDD</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-border">Risk Status</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-border">Visit Status</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-border">Delivery</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-border">Location</th>
              <th className="px-4 py-1 text-[10px] border-b border-border"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r, i) => {
              const score = calcScore(r.r);
              const cat = getRiskCat(score);
              const vs = getVisitStatus(r);
              return (
                <tr 
                  key={r.id || `${r.n}-${i}`}
                  onClick={() => onRowClick(r)}
                  className="group hover:bg-indigo-50/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">{r.n}</span>
                      <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{r.id || 'No PICME'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-600 font-medium">{r.a || '—'}</td>
                  <td className="px-4 py-3.5 text-center text-[11px] text-slate-500 font-bold tracking-tighter">
                    {r.g || '?'}/{r.pa || '?'}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-slate-900 font-bold tabular-nums">
                    {fmtDate(r.e)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge 
                      style={{ background: cat.bg, color: cat.color, border: '1px solid currentColor', opacity: 0.85 }}
                    >
                      <span className="font-extrabold">{score}</span> {cat.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    {vs ? (
                      <Badge className={cn("rounded-md", vs.cls)}>{vs.label}</Badge>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {r.ds === 'Delivered' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">Live</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-100 rounded-md">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-700 font-semibold">{r.p}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{r.b}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-indigo-100 text-slate-400 group-hover:text-primary transition-all">
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ChevronRight = ({size}: {size: number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
