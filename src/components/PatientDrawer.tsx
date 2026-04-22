import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PatientRecord } from '@/src/types';
import { cn, fmtDate, daysUntil } from '@/src/lib/utils';
import { calcScore, getRiskCat, getVisitStatus } from '@/src/lib/hrp-logic';
import { RISK_WEIGHTS } from '@/src/constants';
import { Badge } from './ui/Cards';
import { X, Phone, MapPin, Calendar, Activity, Info, Edit3, User } from 'lucide-react';

interface DrawerProps {
  patient: PatientRecord | null;
  onClose: () => void;
  onEdit?: (p: PatientRecord) => void;
  canEdit?: boolean;
}

export const PatientDrawer: React.FC<DrawerProps> = ({ patient, onClose, onEdit, canEdit }) => {
  if (!patient) return null;

  const score = calcScore(patient.r);
  const cat = getRiskCat(score);
  const vs = getVisitStatus(patient);
  const dToEdd = daysUntil(patient.e);
  
  const DetailItem = ({ label, value, icon: Icon }: any) => (
    <div className="bg-gray-50 rounded-xl p-3.5 flex flex-col gap-1 border border-gray-100/50">
      <div className="flex items-center gap-1.5 opacity-60">
        {Icon && <Icon size={12} />}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-900 leading-tight">{value || '—'}</div>
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex justify-end">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-[500px] h-full bg-white shadow-2xl overflow-y-auto flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-border p-5 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-800">{patient.n}</h2>
                <Badge style={{ background: cat.bg, color: cat.color, border: '1px solid currentColor', opacity: 0.9 }}>
                  <span className="font-extrabold">{score}</span> {cat.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold font-mono uppercase tracking-tighter">
                {patient.id || 'NO PICME'} · {patient.p} · {patient.h || '—'} HSC
              </div>
            </div>
            <button onClick={onClose} className="p-2 ml-4 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-8 flex-1">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Age" value={`${patient.a || '—'} yrs`} icon={User} />
              <DetailItem label="EDD" value={fmtDate(patient.e)} icon={Calendar} />
              <DetailItem label="Gravida/Para" value={`G${patient.g || '—'} P${patient.pa || '—'}`} icon={Activity} />
              <DetailItem label="Contact" value={patient.ph} icon={Phone} />
              <DetailItem label="Location" value={`${patient.b} · ${patient.p}`} icon={MapPin} />
              <DetailItem label="Next Visit" value={vs?.label} icon={Calendar} />
            </div>

            {/* Risk Analysis Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Risk Breakdown</h3>
                <span className="text-[10px] text-slate-500 font-medium">{(patient.r || []).length} flag(s) active</span>
              </div>
              
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 transition-all duration-1000"
                  style={{ width: `${Math.min(100, (score/15)*100)}%`, background: cat.color }}
                />
              </div>

              <div className="bg-slate-50/50 rounded-2xl p-4 space-y-1.5 border border-border">
                {(patient.r || []).length > 0 ? (
                  patient.r.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-1 text-xs border-b border-slate-200/50 last:border-0 border-dashed">
                      <span className="text-slate-700 leading-tight font-medium">{f}</span>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold text-[9px]">+{RISK_WEIGHTS[f] || 0}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400 italic">No risk flags recorded</div>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            {(patient.pp || patient.ds) && (
              <div className="space-y-3">
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-border pb-2">Delivery Planning</h3>
                 <div className="grid grid-cols-1 gap-2.5">
                    {patient.pp && (
                      <div className="flex items-center gap-3 p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                        <Hospital className="text-indigo-500" size={16} />
                        <div>
                          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Planned Place</p>
                          <p className="text-sm font-semibold text-slate-900">{patient.pp} {patient.pt && <span className="opacity-40 font-normal">({patient.pt})</span>}</p>
                        </div>
                      </div>
                    )}
                    {patient.rm && (
                      <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-1 opacity-60">
                           <Info size={12} className="text-amber-700" />
                           <span className="text-[10px] font-bold text-amber-800 uppercase">Remarks</span>
                        </div>
                        <p className="text-[13px] text-slate-700 leading-relaxed italic">{patient.rm}</p>
                      </div>
                    )}
                 </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 p-5 bg-white border-t border-border flex gap-3">
            {canEdit && (
              <button 
                onClick={() => onEdit?.(patient)}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
              >
                <Edit3 size={18} />
                Edit Record
              </button>
            )}
            <a 
              href={`tel:${patient.ph}`}
              className="w-14 flex items-center justify-center bg-slate-50 text-slate-600 rounded-xl border border-border hover:bg-slate-100 transition-colors"
            >
              <Phone size={20} />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Hospital = ({size, className}: {size: number, className: string}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/></svg>
);
