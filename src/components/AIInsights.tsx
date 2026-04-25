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
  ChevronRight,
  ShieldAlert
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
  { id: 'summary',     label: 'Executive Brief', desc: 'Strategy & key metrics', icon: Activity, color: 'text-primary', bg: 'bg-primary-container/20' },
  { id: 'risk',        label: 'Risk Analysis',   desc: 'Deep-dive assessments', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'intervention', label: 'Tactical Plan',   desc: 'Actionable interventions', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'pattern',     label: 'Epidemiology',    desc: 'Block-wise trends', icon: PieChart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

export const AIInsights: React.FC<AIInsightsProps> = ({ patients, onClose }) => {
  const [activeType, setActiveType] = useState<InsightType>('summary');
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const runAnalysis = async (type: InsightType) => {
    setActiveType(type);
    if (content[type]) return;
    
    setLoading(true);
    try {
      const text = await getDistrictInsights(patients, type);
      setContent(prev => ({ ...prev, [type]: text }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run initial on mount
  React.useEffect(() => {
    runAnalysis('summary');
  }, []);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 30 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-surface w-full max-w-5xl h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-outline/30"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-outline/10 flex items-center justify-between bg-surface-variant/20">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Sparkles size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold tracking-tight text-on-surface leading-tight">Maternal Intelligence Center</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest leading-none">Gemini 2.0 Real-time Cognitive Engine</p>
                </div>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Dynamic Selection Tabs */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-outline/10">
           {INSIGHT_OPTIONS.map(opt => {
             const isActive = activeType === opt.id;
             const Icon = opt.icon;
             return (
               <button
                 key={opt.id}
                 onClick={() => runAnalysis(opt.id)}
                 className={cn(
                   "group p-4 rounded-[24px] border-2 transition-all duration-300 text-left relative overflow-hidden",
                   isActive 
                    ? "bg-surface border-primary shadow-md ring-4 ring-primary/5" 
                    : "bg-surface-variant/30 border-transparent hover:border-outline/40 hover:bg-surface"
                 )}
               >
                 <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors", isActive ? "bg-primary text-white" : "bg-surface-variant text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary")}>
                    <Icon size={20} />
                 </div>
                 <div className={cn("text-[13px] font-bold tracking-tight", isActive ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface")}>
                    {opt.label}
                 </div>
                 <div className="text-[11px] text-on-surface-variant/70 font-medium leading-tight mt-1">
                    {opt.desc}
                 </div>
                 {isActive && (
                    <div className="absolute top-0 right-0 p-2 opacity-20">
                      <TrendingUp size={40} className="text-primary" />
                    </div>
                 )}
               </button>
             );
           })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-surface relative">
           <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-12"
                >
                   <div className="relative mb-6">
                      <div className="w-20 h-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <Sparkles size={32} className="absolute inset-0 m-auto text-primary animate-pulse" />
                   </div>
                   <div className="text-center max-w-sm">
                      <p className="text-lg font-bold text-on-surface tracking-tight">Synthesizing District Data</p>
                      <p className="text-sm text-on-surface-variant font-medium mt-1">Applying medical NLP models to {patients.length} active maternal health records...</p>
                   </div>
                </motion.div>
              ) : (
                <motion.div 
                  key={activeType}
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-10 md:p-14 max-w-4xl mx-auto"
                >
                   <div className="markdown-body prose prose-slate max-w-none prose-p:text-on-surface-variant prose-headings:text-on-surface prose-strong:text-primary prose-li:text-on-surface-variant">
                      <ReactMarkdown>{content[activeType] || ''}</ReactMarkdown>
                   </div>
                   
                   {/* Strategic Advisory Note */}
                   <div className="mt-16 p-8 bg-primary-container/10 rounded-[32px] border border-primary/10 flex gap-6 items-start">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm shrink-0">
                         <Info size={24} />
                      </div>
                      <div>
                         <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-2">Health Policy Advisory</h4>
                         <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                            These insights are dynamically generated based on the current district register snapshot. While optimized for administrative intervention mapping, clinical protocols must follow established TN Health Department guidelines.
                         </p>
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Footer Bar */}
        <div className="px-8 py-4 border-t border-outline/10 flex items-center justify-between bg-surface-variant/20">
           <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
              <ShieldAlert size={14} className="text-primary" />
              Mayiladuthurai District Maternal Surveillance System
           </div>
           <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant/60 uppercase">
              <span>Model: Gemini 2.0 Flash</span>
              <div className="w-[1px] h-3 bg-outline/30" />
              <span>Auth: District Admin Approved</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
