import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, MessageSquare, CheckCircle2, ChevronRight, SkipForward, ArrowRight, Activity, Send as SendIcon } from 'lucide-react';
import { PatientRecord, ContactLog } from '../types';
import { cn, fmtDate, daysUntil } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface QueueItem {
  r: PatientRecord;
  alert: any;
}

interface GoogleMsgQueueProps {
  queue: QueueItem[];
  onClose: () => void;
  msgLang: 'en' | 'ta';
}

export const GoogleMsgQueue: React.FC<GoogleMsgQueueProps> = ({ queue, onClose, msgLang }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentIndices, setSentIndices] = useState<Set<number>>(new Set());
  const [syncing, setSyncing] = useState(false);

  const item = queue[currentIndex];
  const total = queue.length;
  const progress = total > 0 ? (sentIndices.size / total) * 100 : 0;

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

  const markSentAndNext = async () => {
    if (!item.r.id) {
       setSentIndices(prev => new Set(prev).add(currentIndex));
       setCurrentIndex(prev => prev + 1);
       return;
    }

    setSyncing(true);
    try {
      const patientRef = doc(db, 'patients', item.r.id);
      const logEntry: ContactLog = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: 'SMS',
        outcome: 'Sent to App',
        remarks: `Alert: ${item.alert.label}`,
        performedBy: 'System'
      };

      await updateDoc(patientRef, {
        cl: arrayUnion(logEntry)
      });
      
      // Trigger SMS redirect
      const num = String(item.r.ph || '').replace(/[^0-9]/g, '').slice(-10);
      const msgText = buildMsg(item.r, item.alert);
      const smsHref = `sms:+91${num}?body=${encodeURIComponent(msgText)}`;
      window.location.href = smsHref;

      setSentIndices(prev => new Set(prev).add(currentIndex));
      setCurrentIndex(prev => prev + 1);
    } catch (e) {
      console.error("Failed to log contact", e);
      // Still move to next even if log fails
      setSentIndices(prev => new Set(prev).add(currentIndex));
      setCurrentIndex(prev => prev + 1);
    } finally {
      setSyncing(false);
    }
  };

  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1);
  };

  // If we've reached the end
  if (currentIndex >= total) {
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle2 size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Queue Complete!</h2>
          <p className="text-slate-500 text-sm mb-6">
            All {total} messages processed.<br/>
            {sentIndices.size} sent · {total - sentIndices.size} skipped
          </p>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            Finish
          </button>
        </motion.div>
      </div>
    );
  }

  const msgText = buildMsg(item.r, item.alert);
  const dRem = daysUntil(item.r.e);
  const num = String(item.r.ph || '').replace(/[^0-9]/g, '').slice(-10);
  const smsHref = `sms:+91${num}?body=${encodeURIComponent(msgText)}`;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
      <motion.div 
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-600" />
              <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Message Queue</span>
           </div>
           <span className="text-xs font-bold text-slate-400">{currentIndex + 1} of {total}</span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
           <motion.div 
             className="h-full bg-emerald-500"
             initial={{ width: 0 }}
             animate={{ width: `${progress}%` }}
           />
        </div>

        <div className="p-6 space-y-6">
           {/* Recipient Info */}
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-xl font-extrabold text-slate-900">{item.r.n}</h3>
                 <span className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500">
                    EDD in {dRem}d
                 </span>
              </div>
              <div className="text-sm text-slate-500 font-medium">
                 {item.r.p} PHC · {item.r.h || '—'} HSC
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-indigo-600 font-bold tracking-tight">
                 <span className="text-xs px-2 py-0.5 bg-indigo-100 rounded-md">Mobile</span>
                 +91 {num}
              </div>
           </div>

           {/* Message Preview */}
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Message Preview</label>
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-slate-700 text-sm leading-relaxed italic">
                 "{msgText}"
              </div>
              <p className="text-[10px] text-right text-slate-400">{msgText.length} characters</p>
           </div>

            {/* Main Action */}
           <div className="pt-2 flex flex-col gap-3">
              <button 
                disabled={syncing}
                onClick={markSentAndNext}
                className="flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {syncing ? <Activity className="animate-spin" size={20} /> : (
                  <>
                    <SendIcon size={20} />
                    <span>Process & Open Messages</span>
                  </>
                )}
              </button>
              
              <div className="text-[10px] text-center text-slate-400 font-medium px-4">
                 Note: Clicking button will log this attempt and open the SMS app on your device.
              </div>
              
              <button 
                onClick={handleSkip}
                className="flex items-center justify-center gap-2 w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                <SkipForward size={18} />
                Skip this patient
              </button>
           </div>
        </div>

        {/* Next Up */}
        {currentIndex + 1 < total && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <ArrowRight size={14} className="text-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Up:</span>
                <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px]">{queue[currentIndex + 1].r.n}</span>
             </div>
             <ChevronRight size={14} className="text-slate-300" />
          </div>
        )}
      </motion.div>
    </div>
  );
};
