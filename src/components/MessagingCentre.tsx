import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  X, 
  AlertTriangle, 
  Hospital, 
  Calendar, 
  CalendarDays, 
  Settings2, 
  Info, 
  Download, 
  MessageSquare,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  FileDown
} from 'lucide-react';
import { PatientRecord } from '../types';
import { calcScore, getRiskCat } from '../lib/hrp-logic';
import { cn, fmtDate, daysUntil } from '../lib/utils';
import { MSG_ALERTS } from '../constants';

interface MessagingCentreProps {
  patients: PatientRecord[];
  onClose: () => void;
  openGoogleMsgQueue: (selected: {r: PatientRecord, alert: any}[]) => void;
}

export const MessagingCentre: React.FC<MessagingCentreProps> = ({ patients, onClose, openGoogleMsgQueue }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [msgLang, setMsgLang] = useState<'en' | 'ta'>('en');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  // Custom filter state
  const [customFilter, setCustomFilter] = useState({
    from: '',
    to: '',
    block: '',
    risk: '',
    search: ''
  });

  const SENT_KEY = 'hrp_msg_sent';
  const getSentStatus = (r: PatientRecord, days: number) => {
    try {
      const s = JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
      return !!s[`${r.id || r.n}_${days}`];
    } catch (e) { return false; }
  };

  const markSent = (r: PatientRecord, days: number) => {
    try {
      const s = JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
      s[`${r.id || r.n}_${days}`] = new Date().toISOString();
      localStorage.setItem(SENT_KEY, JSON.stringify(s));
    } catch (e) {}
  };

  const alert = MSG_ALERTS[activeTab];
  
  const getActiveList = () => {
    const active = patients.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion' && r.ph && r.e);
    
    if (alert.type === 'custom') {
      let filtered = active;
      if (customFilter.from) filtered = filtered.filter(r => r.e >= customFilter.from);
      if (customFilter.to) filtered = filtered.filter(r => r.e <= customFilter.to);
      if (customFilter.block) filtered = filtered.filter(r => r.b === customFilter.block);
      if (customFilter.risk) filtered = filtered.filter(r => getRiskCat(calcScore(r.r)).label === customFilter.risk);
      if (customFilter.search) {
        const q = customFilter.search.toLowerCase();
        filtered = filtered.filter(r => (r.n + r.id + r.p + r.h).toLowerCase().includes(q));
      }
      return filtered.sort((a, b) => (a.e || '') < (b.e || '') ? -1 : 1).map(r => ({ r, alert: MSG_ALERTS[2] })); // Default to 30d template
    }

    return active
      .map(r => ({ r, d: daysUntil(r.e) }))
      .filter(({ d }) => d !== null && alert.window !== null && d >= alert.days - alert.window && d <= alert.days + alert.window)
      .sort((a, b) => (a.d || 0) - (b.d || 0))
      .map(({ r }) => ({ r, alert }));
  };

  const activeList = getActiveList();
  const selectedCount = selectedIndices.size;

  const buildMsg = (r: PatientRecord, al: any) => {
    const edd = fmtDate(r.e);
    const place = r.pp || r.p || (msgLang === 'ta' ? 'உங்கள் PHC' : 'your PHC');
    const d = daysUntil(r.e);
    
    if (msgLang === 'ta') {
      if (al.type === 'urgent') 
        return `அவசரம்: அன்பான ${r.n}, உங்கள் பிரசவம் ${d} நாட்களில் (${edd}) உள்ளது. பாதுகாப்பான பிரசவத்திற்கு ${place}-ல் உடனே அனுமதிக்கப்படுங்கள். ANC கார்டை கொண்டு வாருங்கள். -மயிலாடுதுறை மாவட்ட HRP`;
      if (al.type === 'admission')
        return `அன்பான ${r.n}, உங்கள் பிரசவம் ${d} நாட்களில் (${edd}) எதிர்பார்க்கப்படுகிறது. ${place}-ல் அனுமதிக்கும் திட்டம் செய்யுங்கள். ANC கார்டை கொண்டு வாருங்கள். -மயிலாடுதுறை மாவட்ட HRP`;
      return `அன்பான ${r.n}, உங்கள் கர்ப்பகால பரிசோதனை செய்யும் நேரம் வந்துள்ளது. ${r.p || 'உங்கள் PHC'}-ஐ அணுகுங்கள். பிரசவ தேதி: ${edd} (${d} நாட்கள்). ANC கார்டை கொண்டு வாருங்கள். -மயிலாடுதுறை மாவட்ட HRP`;
    }

    if (al.type === 'urgent')
      return `URGENT: Dear ${r.n}, your delivery date is in just ${d} days (${edd}). Report IMMEDIATELY to ${place} for safe delivery. Carry your ANC card. Call your ANM now. -Mayiladuthurai District HRP`;
    if (al.type === 'admission')
      return `Dear ${r.n}, your delivery is expected in ${d} days (${edd}). Please plan admission at ${place} now for a safe delivery. Carry your ANC card. Contact your ANM for help. -Mayiladuthurai District HRP`;
    return `Dear ${r.n}, your next antenatal check-up is due. Please visit ${r.p || 'your PHC'} soon. Your expected delivery date is ${edd} (${d} days away). Carry your ANC card. -Mayiladuthurai District HRP`;
  };

  const handleToggleSelectAll = (val: boolean) => {
    if (val) {
      const all = new Set<number>();
      activeList.forEach((_, i) => all.add(i));
      setSelectedIndices(all);
    } else {
      setSelectedIndices(new Set());
    }
  };

  const handleExportCSV = () => {
    if (selectedCount === 0) return;
    const selected = activeList.filter((_, i) => selectedIndices.has(i));
    const rows = [['Name', 'PICME', 'Mobile', 'Block', 'PHC', 'HSC', 'EDD', 'Days to EDD', 'Alert Type', 'Message']];
    selected.forEach(({ r, alert: al }) => {
      rows.push([
        r.n, r.id || '', r.ph || '', r.b, r.p, r.h || '',
        r.e, String(daysUntil(r.e)), al.label, buildMsg(r, al)
      ]);
    });
    const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `HRP_Messages_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const blocks = [...new Set(patients.map(r => r.b))].sort();

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Send size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">HRP Messaging Centre</h2>
                <p className="text-xs text-slate-500 font-medium">EDD-based alerts — Admission & Follow-up reminders</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4 overflow-x-auto scrollbar-hide">
          {MSG_ALERTS.map((a, i) => {
            const isActive = activeTab === i;
            const count = a.type === 'custom' ? null : patients.filter(r => {
                const d = daysUntil(r.e);
                return r.ds !== 'Delivered' && r.ds !== 'Abortion' && r.ph && r.e && 
                       a.window !== null && d !== null && d >= a.days - a.window && d <= a.days + a.window;
            }).length;
            
            return (
              <button
                key={i}
                onClick={() => { setActiveTab(i); setSelectedIndices(new Set()); }}
                className={cn(
                  "px-4 py-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 relative -mb-px flex items-center gap-2",
                  isActive 
                    ? "text-indigo-600 border-indigo-600" 
                    : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {a.label}
                {count !== null && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px]",
                    isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1 border-l border-slate-100 pl-4 my-2">
            <button 
              onClick={() => setMsgLang('en')}
              className={cn("px-3 py-1 rounded-lg text-[10px] font-bold transition-all", msgLang === 'en' ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:bg-slate-50")}
            >
              EN
            </button>
            <button 
              onClick={() => setMsgLang('ta')}
              className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", msgLang === 'ta' ? "bg-indigo-100 text-indigo-700 font-hindi" : "text-slate-400 hover:bg-slate-50 font-hindi")}
            >
              தமிழ்
            </button>
          </div>
        </div>

        {/* Filters for Custom Tab */}
        {alert.type === 'custom' && (
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-1 duration-300">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">EDD From</label>
                <input 
                  type="date" 
                  value={customFilter.from}
                  onChange={(e) => setCustomFilter(prev => ({...prev, from: e.target.value}))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">EDD To</label>
                <input 
                  type="date" 
                  value={customFilter.to}
                  onChange={(e) => setCustomFilter(prev => ({...prev, to: e.target.value}))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Block</label>
                <select 
                   value={customFilter.block}
                   onChange={(e) => setCustomFilter(prev => ({...prev, block: e.target.value}))}
                   className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                >
                  <option value="">All Blocks</option>
                  {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Risk</label>
                <select 
                   value={customFilter.risk}
                   onChange={(e) => setCustomFilter(prev => ({...prev, risk: e.target.value}))}
                   className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                >
                  <option value="">Any Risk</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Moderate">Moderate</option>
                </select>
             </div>
             <div className="relative group flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Name or PICME..."
                  value={customFilter.search}
                  onChange={(e) => setCustomFilter(prev => ({...prev, search: e.target.value}))}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none w-full"
                />
             </div>
             <button 
               onClick={() => setCustomFilter({ from:'', to:'', block:'', risk:'', search:'' })}
               className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
             >
               Clear
             </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
               <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                  <Search size={32} />
               </div>
               <div className="text-center">
                  <p className="text-sm font-bold text-slate-600">No patients found</p>
                  <p className="text-xs">Adjust your filters or check a different tab.</p>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Template Preview */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                 <div className="flex items-center gap-2 text-slate-500">
                    <MessageSquare size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Message Sample (${msgLang === 'ta' ? 'Tamil' : 'English'})</span>
                 </div>
                 <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                    "{buildMsg(activeList[0].r, activeList[0].alert)}"
                 </p>
                 <div className="pt-2 flex items-center gap-4 border-t border-slate-200/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Dynamic Keys:</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">Mother Name</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">EDD</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">Planned Place</span>
                 </div>
              </div>

              {/* Patient List */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Recipient List</h3>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleToggleSelectAll(true)} className="text-[10px] font-bold text-indigo-600 hover:underline">Select All</button>
                       <span className="text-slate-300">|</span>
                       <button onClick={() => handleToggleSelectAll(false)} className="text-[10px] font-bold text-slate-400 hover:underline">Clear</button>
                    </div>
                 </div>
                 <div className="grid gap-2">
                    {activeList.map(({r, alert: al}, idx) => {
                      const sc = calcScore(r.r);
                      const cat = getRiskCat(sc);
                      const dRem = daysUntil(r.e);
                      const sent = getSentStatus(r, al.days);
                      const isSelected = selectedIndices.has(idx);

                      return (
                        <div 
                          key={idx}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
                            isSelected ? "bg-indigo-50/50 border-indigo-200 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {
                              const next = new Set(selectedIndices);
                              if (next.has(idx)) next.delete(idx); else next.add(idx);
                              setSelectedIndices(next);
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-colors"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-700 truncate">{r.n}</span>
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ background: cat.bg, color: cat.color }}>
                                 {sc} {cat.label}
                              </div>
                              {sent && (
                                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                   <CheckCircle2 size={10} /> SENT
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2">
                              <span>PICME: {r.id || 'N/A'}</span>
                              <span>•</span>
                              <span>{r.p} PHC</span>
                              <span>•</span>
                              <span>{r.ph}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                             <div className={cn(
                               "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-tight",
                               (dRem || 0) <= 7 ? "bg-red-50 text-red-600" : (dRem || 0) <= 15 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"
                             )}>
                               EDD in {dRem}d — {fmtDate(r.e)}
                             </div>
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <div className="flex items-center gap-4 text-slate-500">
              <div className="flex flex-col">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Selection</span>
                 <span className="text-sm font-bold text-indigo-600">{selectedCount} recipients selected</span>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div className="hidden lg:flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100">
                 <Info size={14} className="text-indigo-600" />
                 <span className="text-[10px] font-medium text-indigo-700 leading-tight">
                    Messages are queued using `sms:` protocol.<br/>
                    Open Google Messages on your device to send.
                 </span>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button 
                onClick={handleExportCSV}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                <FileDown size={16} />
                Export CSV
              </button>
              <button 
                onClick={() => {
                   const selected = activeList.filter((_, i) => selectedIndices.has(i));
                   openGoogleMsgQueue(selected);
                }}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                <MessageSquare size={16} />
                Process Message Queue
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
