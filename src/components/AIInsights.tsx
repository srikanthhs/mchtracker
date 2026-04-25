import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  TrendingUp, 
  Target, 
  Zap, 
  PieChart, 
  Activity, 
  Info,
  ChevronRight
} from 'lucide-react';
import { PatientRecord } from '../types';
import { cn } from '../lib/utils';
import { getDistrictInsights, InsightType } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';

interface AIInsightsProps {
  patients: PatientRecord[];
  onClose: () => void;
}

const INSIGHT_OPTIONS: { id: InsightType, label: string, desc: string, icon: any, color: string, bg: string }[] = [
  { id: 'summary', label: 'Briefing', desc: 'Collector-level summary', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'risk',    label: 'Risk Hub', desc: 'Condition & block distribution', icon: Target, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'action',  label: 'Actions',  desc: 'Recommended interventions', icon: Zap,    color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'pattern', label: 'Patterns', desc: 'Epidemiological trends', icon: PieChart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

export const AIInsights: React.FC<AIInsightsProps> = ({ patients, onClose }) => {
  const [activeType, setActiveType] = useState<InsightType>('summary');
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const runAnalysis = async (type: InsightType) => {
    setActiveType(type);
    if (content[type]) return;
    
    setLoading(true);
    const text = await getDistrictInsights(patients, type);
    setContent(prev => ({ ...prev, [type]: text }));
    setLoading(false);
  };

  // Run initial on mount if needed
  React.useEffect(() => {
    runAnalysis('summary');
  }, []);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-purple-50/30">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                <Sparkles size={20} />
             </div>
             <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">AI District Insights</h2>
                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest leading-none mt-1">Real-time Gemini Analysis</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white text-slate-400 Transition-colors"><X size={20} /></button>
        </div>

        {/* Tab Selection Cards */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-slate-100 bg-slate-50/50">
           {INSIGHT_OPTIONS.map(opt => {
             const isActive = activeType === opt.id;
             const Icon = opt.icon;
             return (
               <button
                 key={opt.id}
                 onClick={() => runAnalysis(opt.id)}
                 className={cn(
                   "group p-3 rounded-2xl border transition-all duration-300 text-left",
                   isActive 
                    ? "bg-white border-purple-200 shadow-sm ring-2 ring-purple-500/10" 
                    : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
                 )}
               >
                 <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors", isActive ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-purple-50")}>
                    <Icon size={16} />
                 </div>
                 <div className={cn("text-[11px] font-black uppercase tracking-widest", isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")}>
                    {opt.label}
                 </div>
                 <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 opacity-70 group-hover:opacity-100">
                    {opt.desc}
                 </div>
               </button>
             );
           })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-white relative">
           <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-12 space-y-4"
                >
                   <div className="relative">
                      <div className="w-16 h-16 border-4 border-purple-50 border-t-purple-600 rounded-full animate-spin" />
                      <Sparkles size={24} className="absolute inset-0 m-auto text-purple-600 animate-pulse" />
                   </div>
                   <div className="text-center">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Analysing District Register</p>
                      <p className="text-xs text-slate-400 font-medium">Gemini 2.0 Flash is processing {patients.length} patient records...</p>
                   </div>
                </motion.div>
              ) : (
                <motion.div 
                  key={activeType}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-8 md:p-10 max-w-3xl mx-auto"
                >
                   <div className="markdown-body prose prose-slate prose-purple max-w-none">
                      <ReactMarkdown>{content[activeType] || ''}</ReactMarkdown>
                   </div>
                   
                   {/* Recommendation Footer */}
                   <div className="mt-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-purple-600 shadow-sm shrink-0">
                         <Info size={18} />
                      </div>
                      <div>
                         <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Methodology Note</h4>
                         <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            This analysis uses the latest DPH risk weightage criteria. Insights are derived from current snapshot data and are intended for administrative decision support only. Clinical decisions should be verified with individual ANC records.
                         </p>
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-6 bg-slate-50/50">
           <div className="flex items-center gap-2">
              <TrendingUp size={12} />
              District Administrative Dashboard Analytics
           </div>
           <span>AI generated · Dynamic Update</span>
        </div>
      </motion.div>
    </div>
  );
};
