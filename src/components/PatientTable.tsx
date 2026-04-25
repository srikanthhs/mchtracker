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
    <div className="bg-surface rounded-[28px] border border-outline/30 overflow-hidden shadow-sm animate-in fade-in duration-700">
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface tracking-tight">District Patients</h2>
          <p className="text-xs text-on-surface-variant font-medium">Mayiladuthurai Maternal Registry</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, PICME or address..."
              onChange={(e) => onSearch(e.target.value)}
              className="pl-12 pr-6 py-3 bg-surface-variant/40 border-none rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all w-full md:w-80 text-on-surface placeholder:text-on-surface-variant/60"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {onSync && (
              <button 
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-[13px] font-bold hover:bg-[#1557b0] transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isSyncing ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                Sync Center
              </button>
            )}
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-variant text-on-surface-variant text-[13px] font-bold hover:bg-outline/20 transition-all cursor-pointer">
              <Download size={16} /> CSV
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-surface-variant/20 border-y border-outline/10">
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Mother Information</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Age</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Gravida</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Due Date</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Risk Analysis</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Follow-up</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Location Details</th>
              <th className="px-6 py-2 border-b border-outline/10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/5">
            {data.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-24 text-center">
                   <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-surface-variant/40 flex items-center justify-center text-on-surface-variant/30">
                        <Search size={32} />
                      </div>
                      <div className="max-w-xs mx-auto">
                        <p className="text-lg font-bold text-on-surface">No records matched</p>
                        <p className="text-sm text-on-surface-variant">Check your search terms or filters to find what you're looking for.</p>
                      </div>
                   </div>
                </td>
              </tr>
            ) : (
              data.map((r, i) => {
                const score = calcScore(r.r);
                const cat = getRiskCat(score);
                const vs = getVisitStatus(r);
                return (
                  <tr 
                    key={r.id || `${r.n}-${i}`}
                    onClick={() => onRowClick(r)}
                    className="group hover:bg-surface-variant/40 cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-primary"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
                           {r.n.charAt(0)}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-on-surface group-hover:text-primary transition-colors">{r.n}</span>
                            <span className="text-[10px] text-on-surface-variant/70 font-mono font-bold">{r.id || 'NO PICME ID'}</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-sm text-on-surface-variant font-medium">{r.a || '—'}</td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-[13px] text-on-surface font-bold bg-surface-variant/50 px-2 py-0.5 rounded-md">
                        {r.g || '?'}/{r.pa || '?'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[14px] text-on-surface font-bold tabular-nums">
                      {fmtDate(r.e)}
                    </td>
                    <td className="px-6 py-5">
                      <Badge 
                        style={{ background: cat.bg === '#C5221F' ? '#fde8e8' : cat.bg === '#E37400' ? '#fff4e5' : '#e6fffa', color: cat.color, border: `1px solid ${cat.color}30` }}
                      >
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                          <span className="font-bold text-[10px] uppercase">{cat.label}</span>
                          <span className="ml-1 opacity-60">({score})</span>
                        </div>
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      {vs ? (
                        <div className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1", 
                          vs.label === 'Overdue' ? "bg-red-50 text-red-600 border-red-100" :
                          vs.label === 'Upcoming' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                          {vs.label === 'Overdue' && <AlertCircle size={10} />}
                          {vs.label}
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {r.ds === 'Delivered' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                           <CheckCircle size={14} /> Delivered
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase tracking-wider">
                           <Clock size={14} /> Antenatal
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs text-on-surface font-bold">{r.p}</span>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{r.b}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="p-2 rounded-full bg-surface-variant/50 group-hover:bg-primary group-hover:text-white transition-all inline-flex items-center justify-center">
                        <ChevronRight size={16} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="px-8 py-5 border-t border-outline/10 bg-surface flex items-center justify-between">
        <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">
           Showing {data.length} Registered Mothers
        </p>
        <div className="flex gap-2">
           <button className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors">Previous</button>
           <button className="px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
};

const ChevronRight = ({size}: {size: number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
