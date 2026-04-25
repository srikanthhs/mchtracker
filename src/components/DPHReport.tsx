import React from 'react';
import { motion } from 'motion/react';
import { X, Printer, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import { PatientRecord } from '../types';
import { cn, fmtDate } from '../lib/utils';
import { calcScore, getRiskCat, isOverdue, getNextVisitDate } from '../lib/hrp-logic';

interface DPHReportProps {
  patients: PatientRecord[];
  onClose: () => void;
}

export const DPHReport: React.FC<DPHReportProps> = ({ patients, onClose }) => {
  const blocks = [...new Set(patients.map(r => r.b))].sort();
  
  const blockData = blocks.map(bl => {
    const bp = patients.filter(r => r.b === bl);
    const active = bp.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion');
    const scores = active.map(r => calcScore(r.r));
    const crit = scores.filter(s => s >= 10).length;
    const high = scores.filter(s => s >= 6 && s < 10).length;
    const mod  = scores.filter(s => s >= 3 && s < 6).length;
    const low  = scores.filter(s => s >= 1 && s < 3).length;
    const noflag = scores.filter(s => s === 0).length;
    const od = active.filter(r => isOverdue(r)).length;
    const edd30 = active.filter(r => {
        const d = daysUntil(r.e);
        return d !== null && d >= 0 && d <= 30;
    }).length;
    const del = bp.filter(r => r.ds === 'Delivered').length;
    return { bl, total: bp.length, active: active.length, crit, high, mod, low, noflag, od, edd30, del };
  });

  const totals = blockData.reduce((acc, r) => ({
    total: acc.total + r.total,
    active: acc.active + r.active,
    crit: acc.crit + r.crit,
    high: acc.high + r.high,
    mod: acc.mod + r.mod,
    low: acc.low + r.low,
    noflag: acc.noflag + r.noflag,
    od: acc.od + r.od,
    edd30: acc.edd30 + r.edd30,
    del: acc.del + r.del
  }), { total:0, active:0, crit:0, high:0, mod:0, low:0, noflag:0, od:0, edd30:0, del:0 });

  function daysUntil(d: string) {
    if (!d) return null;
    const diff = new Date(d).getTime() - new Date().setHours(0,0,0,0);
    return Math.floor(diff / 86400000);
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 print:p-0 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col my-auto text-slate-950 print:shadow-none print:rounded-none print:static print:w-full"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 print:hidden">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                 <FileText size={20} />
              </div>
              <div>
                 <h2 className="text-lg font-black tracking-tight">DPH Periodic Abstract</h2>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Tamil Nadu Directorate of Public Health Standards</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg active:scale-95 transition-all">
                 <Printer size={16} /> Print Report
              </button>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 space-y-10 print:p-2">
           <div className="text-center space-y-2 border-b border-slate-200 pb-10">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">District HRP Surveillance Summary</h1>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Mayiladuthurai District · 2026 Cohort</p>
              <div className="flex justify-center gap-6 pt-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                 <span>Run Date: {new Date().toLocaleDateString('en-IN')}</span>
                 <span>Ref: HRP/DPH/MYL-${new Date().getFullYear()}</span>
              </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Enrolled', val: totals.total, color: 'text-slate-900', bg: 'bg-slate-50' },
                { label: 'Current Active', val: totals.active, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Critical Burden', val: totals.crit, color: 'text-red-700', bg: 'bg-red-50' },
                { label: 'Delivered', val: totals.del, color: 'text-indigo-700', bg: 'bg-indigo-50' }
              ].map(c => (
                <div key={c.label} className={cn("p-6 rounded-3xl border border-slate-100/50", c.bg)}>
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{c.label}</div>
                   <div className={cn("text-4xl font-black tracking-tighter", c.color)}>{c.val}</div>
                </div>
              ))}
           </div>

           {/* Table */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                 <TrendingUp size={16} className="text-indigo-600" />
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Block-wise Statistical Variance</h3>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                       <tr>
                          <th className="p-4">Administrative Block</th>
                          <th className="p-4 text-center">Registrations</th>
                          <th className="p-4 text-center">Active</th>
                          <th className="p-4 text-center text-red-600">Critical</th>
                          <th className="p-4 text-center text-orange-600">High</th>
                          <th className="p-4 text-center text-red-600">Overdue</th>
                          <th className="p-4 text-center">EDD≤30d</th>
                          <th className="p-4 text-center text-emerald-600">Delivered</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                       {blockData.map(r => (
                         <tr key={r.bl} className="hover:bg-slate-50/50 font-medium text-slate-700 transition-colors">
                            <td className="p-4 font-black">{r.bl}</td>
                            <td className="p-4 text-center font-mono">{r.total}</td>
                            <td className="p-4 text-center font-mono font-bold text-slate-900">{r.active}</td>
                            <td className="p-4 text-center font-mono text-red-600 font-bold">{r.crit}</td>
                            <td className="p-4 text-center font-mono text-orange-600">{r.high}</td>
                            <td className="p-4 text-center font-mono text-red-500">{r.od}</td>
                            <td className="p-4 text-center font-mono">{r.edd30}</td>
                            <td className="p-4 text-center font-mono text-emerald-600 font-bold">{r.del}</td>
                         </tr>
                       ))}
                       <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[11px]">
                          <td className="p-4">District Total</td>
                          <td className="p-4 text-center font-mono">{totals.total}</td>
                          <td className="p-4 text-center font-mono">{totals.active}</td>
                          <td className="p-4 text-center font-mono text-red-400">{totals.crit}</td>
                          <td className="p-4 text-center font-mono text-orange-400">{totals.high}</td>
                          <td className="p-4 text-center font-mono text-red-400">{totals.od}</td>
                          <td className="p-4 text-center font-mono">{totals.edd30}</td>
                          <td className="p-4 text-center font-mono text-emerald-400">{totals.del}</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
           </div>

           {/* Footer */}
           <div className="pt-10 border-t border-slate-200 grid grid-cols-2 gap-8 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
              <div>
                 DPH Standards Ver 2.4.1<br/>
                 Health & Family Welfare Dept<br/>
                 Govt. of Tamil Nadu
              </div>
              <div className="text-right flex flex-col items-end">
                 <div className="w-16 h-1 bg-slate-200 mb-2" />
                 Report Validated by<br/>
                 District Collectorate Office
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
