import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlarmClock, 
  X, 
  Plus, 
  Trash2, 
  BellRing, 
  Info, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  CloudOff,
  Search,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { PatientRecord, AlertSchedule } from '../types';
import { calcScore, getRiskCat } from '../lib/hrp-logic';
import { cn, fmtDate, daysUntil } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { MSG_ALERTS } from '../constants';

interface AlertSchedulerProps {
  patients: PatientRecord[];
  onClose: () => void;
  openGoogleMsgQueue: (selected: {r: PatientRecord, alert: any}[]) => void;
}

export const AlertScheduler: React.FC<AlertSchedulerProps> = ({ patients, onClose, openGoogleMsgQueue }) => {
  const [schedules, setSchedules] = useState<AlertSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'online' | 'error' | 'connecting'>('connecting');
  
  // Form State
  const [newSched, setNewSched] = useState({
    alertIdx: 0,
    date: new Date().toISOString().split('T')[0],
    block: '',
    risk: ''
  });

  const blocks = [...new Set(patients.map(p => p.b))].sort();

  useEffect(() => {
    const qS = query(collection(db, 'alert_schedules'));
    const unsubscribe = onSnapshot(qS, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertSchedule));
      setSchedules(data);
      setLoading(false);
      setDbStatus('online');
    }, (err) => {
      console.error("Firestore Listen Error", err);
      setDbStatus('error');
      // Fallback to local
      const local = localStorage.getItem('hrp_schedules');
      if (local) setSchedules(JSON.parse(local));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddSchedule = async () => {
    if (!newSched.date) return;
    
    const alert = MSG_ALERTS[newSched.alertIdx];
    const sched: AlertSchedule = {
      id: Date.now().toString(),
      alertIdx: newSched.alertIdx,
      type: alert.label,
      date: newSched.date,
      block: newSched.block || undefined,
      risk: newSched.risk || undefined,
      fired: false,
      firedAt: null
    };

    try {
      await setDoc(doc(db, 'alert_schedules', sched.id), sched);
      // Local sync helper
      const local = JSON.parse(localStorage.getItem('hrp_schedules') || '[]');
      localStorage.setItem('hrp_schedules', JSON.stringify([...local, sched]));
    } catch (e) {
      console.error("Add failed", e);
      alert("Failed to save to Firebase - saving locally");
      const local = JSON.parse(localStorage.getItem('hrp_schedules') || '[]');
      localStorage.setItem('hrp_schedules', JSON.stringify([...local, sched]));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'alert_schedules', id));
      const local = JSON.parse(localStorage.getItem('hrp_schedules') || '[]');
      localStorage.setItem('hrp_schedules', JSON.stringify(local.filter((s: any) => s.id !== id)));
    } catch (e) { console.error("Delete failed", e); }
  };

  const fireScheduledAlert = async (sched: AlertSchedule) => {
    const alert = MSG_ALERTS[sched.alertIdx];
    
    // Calculate targeting
    const active = patients.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion' && r.ph && r.e);
    let targetPats = active.map(r => ({ r, d: daysUntil(r.e) }))
      .filter(({ d }) => d !== null && alert.window !== null && d >= alert.days - alert.window && d <= alert.days + alert.window)
      .map(({ r }) => ({ r, alert }));

    if (sched.block) targetPats = targetPats.filter(p => p.r.b === sched.block);
    if (sched.risk) {
      const cats = sched.risk.split(',');
      targetPats = targetPats.filter(p => cats.includes(getRiskCat(calcScore(p.r.r)).label));
    }

    if (targetPats.length === 0) {
      alert("No patients found for this schedule's criteria today.");
      return;
    }

    if (confirm(`Fire scheduled alert "${sched.type}" for ${targetPats.length} patients?`)) {
       // Mark as fired
       try {
         await updateDoc(doc(db, 'alert_schedules', sched.id), {
           fired: true,
           firedAt: new Date().toISOString()
         });
       } catch(e) {}
       
       onClose();
       openGoogleMsgQueue(targetPats);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                 <AlarmClock size={20} />
              </div>
              <div>
                 <h2 className="text-lg font-bold">Alert Scheduler</h2>
                 <p className="text-xs text-slate-500 font-medium">Auto-send Google Messages on scheduled dates</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5",
                dbStatus === 'online' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
              )}>
                 {dbStatus === 'online' ? <RefreshCw size={12} /> : <CloudOff size={12} />}
                 {dbStatus === 'online' ? "Cloud Synced" : "Connecting..."}
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
           </div>
        </div>

        {/* New Schedule Form */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 shrink-0">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
              <Plus size={14} className="text-orange-500" /> New Scheduled Alert
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Alert Category</label>
                 <select 
                   value={newSched.alertIdx}
                   onChange={e => setNewSched(prev => ({...prev, alertIdx: parseInt(e.target.value)}))}
                   className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
                 >
                    {MSG_ALERTS.map((a, i) => <option key={i} value={i}>{a.label}</option>)}
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Trigger Date</label>
                 <input 
                   type="date"
                   value={newSched.date}
                   onChange={e => setNewSched(prev => ({...prev, date: e.target.value}))}
                   className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Block Filter</label>
                 <select 
                   value={newSched.block}
                   onChange={e => setNewSched(prev => ({...prev, block: e.target.value}))}
                   className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
                 >
                    <option value="">All Blocks</option>
                    {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
              </div>
              <button 
                onClick={handleAddSchedule}
                className="h-10 w-full bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                 <Plus size={16} /> Create Schedule
              </button>
           </div>
        </div>

        {/* Schedule List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-orange-100 border-t-orange-600 rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading schedules...</p>
             </div>
           ) : schedules.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                   <AlarmClock size={32} />
                </div>
                <div className="text-center">
                   <p className="text-sm font-bold text-slate-600">No scheduled alerts</p>
                   <p className="text-xs">Scheduled tasks will appear here and in the global district view.</p>
                </div>
             </div>
           ) : (
             <div className="grid gap-3">
                {[...schedules].sort((a,b) => (a.date < b.date ? -1 : 1)).map(s => {
                  const isFired = s.fired;
                  const isDue = !isFired && s.date <= today;
                  const alertObj = MSG_ALERTS[s.alertIdx] || MSG_ALERTS[0];

                  return (
                    <div 
                      key={s.id}
                      className={cn(
                        "p-5 rounded-2xl border transition-all duration-200 flex items-center gap-6",
                        isDue ? "bg-red-50 border-red-200" : isFired ? "bg-slate-50 border-slate-100 opacity-70" : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: alertObj.bg, color: alertObj.color }}>
                         <AlarmClock size={24} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{s.type}</span>
                            {isDue && (
                              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest animate-pulse">DUE TODAY</span>
                            )}
                            {isFired && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider">FIRED</span>
                            )}
                         </div>
                         <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium tracking-tight">
                            <span className="flex items-center gap-1"><Clock size={12} /> {fmtDate(s.date)}</span>
                            <span className="flex items-center gap-1 uppercase tracking-widest text-[10px] text-slate-400 whitespace-nowrap">
                               Block: <b>{s.block || 'ALL'}</b>
                            </span>
                            <span className="flex items-center gap-1 uppercase tracking-widest text-[10px] text-slate-400 whitespace-nowrap">
                               Risk: <b>{s.risk || 'ANY'}</b>
                            </span>
                         </div>
                         {isFired && s.firedAt && (
                           <p className="text-[10px] text-slate-400 italic">Fired on {fmtDate(s.firedAt.split('T')[0])} at {s.firedAt.split('T')[1].substring(0,5)}</p>
                         )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                         {!isFired && (
                           <button 
                             onClick={() => fireScheduledAlert(s)}
                             className={cn(
                               "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                               isDue ? "bg-red-600 text-white hover:bg-red-700 whitespace-nowrap" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                             )}
                           >
                              <MessageSquare size={14} /> 
                              {isDue ? "Execute Now" : "Pre-Fire"}
                           </button>
                         )}
                         <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={18} />
                         </button>
                      </div>
                    </div>
                  );
                })}
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-semibold">
           <div className="flex items-center gap-2">
              <Info size={14} className="text-orange-400" />
              <span>Checking due tasks... System checks schedules every minute.</span>
           </div>
           <button onClick={onClose} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Close</button>
        </div>
      </motion.div>
    </div>
  );
};
