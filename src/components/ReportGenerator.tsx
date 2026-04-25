import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart4, 
  X, 
  Search, 
  Download, 
  Printer, 
  Filter, 
  ChevronRight, 
  Hospital, 
  CalendarDays,
  TriangleAlert,
  ArrowRight,
  TrendingDown,
  Users
} from 'lucide-react';
import { PatientRecord } from '../types';
import { cn, fmtDate } from '../lib/utils';
import { calcScore, getRiskCat, isOverdue, getNextVisitDate } from '../lib/hrp-logic';
import { RISK_CATS } from '../constants';

interface ReportGeneratorProps {
  patients: PatientRecord[];
  onClose: () => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ patients, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({
    dateField: 'e' as 'e' | 'lv' | 'dd',
    from: '',
    to: '',
    block: '',
    risk: '',
    status: ''
  });

  const blocks = useMemo(() => [...new Set(patients.map(r => r.b))].sort(), [patients]);

  const reportData = useMemo(() => {
    let data = patients;
    if (filters.from || filters.to) {
      data = data.filter(r => {
        const val = r[filters.dateField];
        if (!val) return false;
        if (filters.from && val < filters.from) return false;
        if (filters.to && val > filters.to) return false;
        return true;
      });
    }
    if (filters.block) data = data.filter(r => r.b === filters.block);
    if (filters.risk) data = data.filter(r => getRiskCat(calcScore(r.r)).label === filters.risk);
    if (filters.status === 'active') data = data.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion');
    else if (filters.status === 'Delivered') data = data.filter(r => r.ds === 'Delivered');
    
    return data;
  }, [patients, filters]);

  const stats = useMemo(() => {
    const active = reportData.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion');
    const critical = reportData.filter(r => calcScore(r.r) >= 5);
    const del = reportData.filter(r => r.ds === 'Delivered');
    const od = reportData.filter(r => isOverdue(r));
    return {
      total: reportData.length,
      active: active.length,
      critical: critical.length,
      delivered: del.length,
      overdue: od.length
    };
  }, [reportData]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!reportData.length) return;
    const headers = ['PICME', 'Name', 'Block', 'PHC', 'EDD', 'Risk Score', 'Status'];
    const rows = reportData.map(r => [
      r.id || 'N/A', r.n, r.b, r.p, r.e, String(calcScore(r.r)), r.ds || 'Active'
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
    a.download = `District_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 print:p-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 print:shadow-none print:rounded-none print:h-auto print:static">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 print:hidden">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                 <BarChart4 size={20} />
              </div>
              <div>
                 <h2 className="text-lg font-extrabold tracking-tight">Report Generator</h2>
                 <p className="text-xs text-slate-500 font-medium tracking-tight uppercase">Mayiladuthurai District Analytics</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
              >
                 <Download size={16} /> Export
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg"
              >
                 <Printer size={16} /> Print
              </button>
              <button onClick={onClose} className="ml-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 Transition-colors"><X size={20} /></button>
           </div>
        </div>

        {/* Filters Panel */}
        <div className="p-6 bg-slate-50 border-b border-slate-200/60 shrink-0 print:hidden overflow-x-auto scrollbar-hide">
           <div className="flex flex-wrap items-end gap-3 min-w-max">
              <div className="space-y-1.5 min-w-[120px]">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><Filter size={10} /> Basis</label>
                 <select 
                   value={filters.dateField}
                   onChange={e => setFilters(prev => ({...prev, dateField: e.target.value as any}))}
                   className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                 >
                    <option value="e">By EDD</option>
                    <option value="lv">By Last Visit</option>
                    <option value="dd">By Delivery Date</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">From</label>
                 <input 
                   type="date"
                   value={filters.from}
                   onChange={e => setFilters(prev => ({...prev, from: e.target.value}))}
                   className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To</label>
                 <input 
                   type="date"
                   value={filters.to}
                   onChange={e => setFilters(prev => ({...prev, to: e.target.value}))}
                   className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                 />
              </div>
              <div className="space-y-1.5 min-w-[140px]">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Block</label>
                 <select 
                   value={filters.block}
                   onChange={e => setFilters(prev => ({...prev, block: e.target.value}))}
                   className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                 >
                    <option value="">All Blocks</option>
                    {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
              </div>
              <div className="space-y-1.5 min-w-[120px]">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Risk Level</label>
                 <select 
                   value={filters.risk}
                   onChange={e => setFilters(prev => ({...prev, risk: e.target.value}))}
                   className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                 >
                    <option value="">Any Risk</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Moderate">Moderate</option>
                 </select>
              </div>
              <button 
                onClick={() => setFilters({ dateField: 'e', from:'', to:'', block:'', risk:'', status:'' })}
                className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-200 transition-colors border border-transparent"
              >
                 Reset
              </button>
           </div>
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-slate-100 px-4 print:hidden overflow-x-auto scrollbar-hide">
          {['Summary', 'Block-wise', 'Risk Distribution', 'Patient List'].map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 relative -mb-px",
                activeTab === i 
                  ? "text-indigo-600 border-indigo-600" 
                  : "text-slate-400 border-transparent hover:text-slate-600"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Report Canvas */}
        <div className="flex-1 overflow-y-auto p-8 bg-white print:p-0 print:overflow-visible">
           <div id="printArea" className="max-w-4xl mx-auto space-y-12">
              
              {/* Report Title (Visible on print) */}
              <div className="hidden print:block text-center space-y-2 border-b border-slate-200 pb-8 mb-8">
                 <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">HRP District Analytics Report</h1>
                 <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">Mayiladuthurai District · Health Department</p>
                 <div className="flex justify-center gap-6 pt-4 text-xs font-medium text-slate-400">
                    <span>Generated: {new Date().toLocaleString('en-IN')}</span>
                    <span>Range: {filters.from || 'START'} — {filters.to || 'PRESENT'}</span>
                 </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100/50">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Processed</div>
                    <div className="text-3xl font-black text-indigo-700 tracking-tighter">{stats.total}</div>
                    <div className="text-[10px] font-bold text-indigo-400/60 uppercase">Records</div>
                 </div>
                 <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100/50">
                    <div className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1.5 font-bold">Active Cases</div>
                    <div className="text-3xl font-black text-emerald-700 tracking-tighter">{stats.active}</div>
                    <div className="text-[10px] font-bold text-emerald-600/40 uppercase">Pregnant</div>
                 </div>
                 <div className="bg-red-50 p-6 rounded-3xl border border-red-100/50">
                    <div className="text-[10px] font-black text-red-600/70 uppercase tracking-widest mb-1.5 font-bold">Critical</div>
                    <div className="text-3xl font-black text-red-700 tracking-tighter">{stats.critical}</div>
                    <div className="text-[10px] font-bold text-red-600/40 uppercase">Score 10+</div>
                 </div>
                 <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100/50">
                    <div className="text-[10px] font-black text-orange-600/70 uppercase tracking-widest mb-1.5 font-bold">Overdue</div>
                    <div className="text-3xl font-black text-orange-700 tracking-tighter">{stats.overdue}</div>
                    <div className="text-[10px] font-bold text-orange-600/40 uppercase">Visit Latency</div>
                 </div>
              </div>

              {/* Dynamic Content based on tab */}
              {activeTab === 0 && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="space-y-4">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest px-1 flex items-center gap-2">
                         <TriangleAlert size={14} className="text-red-500" />
                         Epidemiological Distribution (Risk Flags)
                      </h3>
                      <div className="grid gap-3 p-2">
                        {Object.entries(
                          reportData.flatMap(r => r.r || []).reduce((acc,f) => {acc[f]=(acc[f]||0)+1; return acc;}, {} as any)
                        ).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 10).map(([flag, count]) => (
                          <div key={flag} className="flex items-center gap-4">
                             <span className="text-[11px] font-bold text-slate-600 w-48 shrink-0 truncate truncate">{flag}</span>
                             <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, ((count as number) / stats.total) * 100)}%` }} />
                             </div>
                             <span className="text-xs font-black text-slate-400 w-12 text-right">{count as number}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <table className="w-full text-left border-collapse border border-slate-200 rounded-2xl overflow-hidden">
                      <thead className="bg-slate-50 border-b border-slate-200">
                         <tr>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Block Name</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Total</th>
                            <th className="p-4 text-xs font-black text-red-500 uppercase tracking-widest text-center">Critical</th>
                            <th className="p-4 text-xs font-black text-orange-500 uppercase tracking-widest text-center">High</th>
                            <th className="p-4 text-xs font-black text-emerald-500 uppercase tracking-widest text-center">Delivered</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {blocks.map(bl => {
                           const bd = reportData.filter(r => r.b === bl);
                           return (
                             <tr key={bl} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-sm font-bold text-slate-800">{bl}</td>
                                <td className="p-4 text-center font-mono text-xs">{bd.length}</td>
                                <td className="p-4 text-center font-mono text-xs text-red-600 font-bold">{bd.filter(r => calcScore(r.r) >= 10).length}</td>
                                <td className="p-4 text-center font-mono text-xs text-orange-600">{bd.filter(r => calcScore(r.r) >= 5 && calcScore(r.r) < 10).length}</td>
                                <td className="p-4 text-center font-mono text-xs text-emerald-600">{bd.filter(r => r.ds === 'Delivered').length}</td>
                             </tr>
                           )
                         })}
                      </tbody>
                   </table>
                </div>
              )}

              {activeTab === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                    <div className="space-y-4">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Risk Breakdown (Active Cases)</h3>
                       <div className="grid gap-3">
                          {RISK_CATS.map(cat => {
                            const count = reportData.filter(r => getRiskCat(calcScore(r.r)).label === cat.label).length;
                            return (
                              <div key={cat.label} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                    <span className="text-sm font-bold text-slate-700">{cat.label} Risk</span>
                                 </div>
                                 <span className="text-xl font-black text-slate-900">{count}</span>
                              </div>
                            )
                          }).reverse()}
                       </div>
                    </div>
                </div>
              )}

              {activeTab === 3 && (
                <div className="animate-in fade-in duration-500">
                   <table className="w-full text-left text-xs border-collapse divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                         <tr>
                            <th className="p-3 font-bold text-slate-400 uppercase tracking-widest">Name / PICME</th>
                            <th className="p-3 font-bold text-slate-400 uppercase tracking-widest">PHC / Block</th>
                            <th className="p-3 font-bold text-slate-400 uppercase tracking-widest">EDD</th>
                            <th className="p-3 font-bold text-slate-400 uppercase tracking-widest text-center">Score</th>
                            <th className="p-3 font-bold text-slate-400 uppercase tracking-widest">Status</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {reportData.slice(0, 100).map((r, i) => (
                           <tr key={i}>
                              <td className="p-3 font-bold text-slate-700">
                                 {r.n}<br/><span className="text-[10px] font-mono text-slate-300">{r.id || 'N/A'}</span>
                              </td>
                              <td className="p-3 text-slate-500 font-medium">
                                 {r.p}<br/><span className="text-[10px] text-slate-300 font-black">{r.b}</span>
                              </td>
                              <td className="p-3 font-black text-slate-600">{fmtDate(r.e)}</td>
                              <td className="p-3 text-center">
                                 <span className="px-2 py-0.5 rounded-full font-black text-[10px] border border-current" style={{ color: getRiskCat(calcScore(r.r)).color }}>
                                    {calcScore(r.r)}
                                 </span>
                              </td>
                              <td className="p-3">
                                 <span className={cn(
                                   "px-2 py-0.5 rounded-md text-[9px] font-black uppercase",
                                   r.ds === 'Delivered' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                 )}>{r.ds || 'Active'}</span>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                   {reportData.length > 100 && (
                     <p className="mt-4 text-center text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">... Restricted to first 100 records in preview ...</p>
                   )}
                </div>
              )}

           </div>
        </div>

        {/* Print Disclaimer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-widest uppercase">
           <span>District Maternal Health Surveillance</span>
           <span>Confidential Document · Unauthorized Sharing Prohibited</span>
        </div>
      </motion.div>
    </div>
  );
};
