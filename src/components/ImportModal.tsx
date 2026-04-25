import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Upload, 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  ChevronRight,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ImportModalProps {
  onClose: () => void;
  onImport: (rawData: any[]) => Promise<void>;
  isSyncing: boolean;
  syncProgress: { current: number, total: number };
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, isSyncing, syncProgress }) => {
  const [dragActive, setDragActive] = useState(false);
  const [csvText, setCsvText] = useState('');

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];
    
    // Simple CSV parser that handles quotes
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
      const row: any = {};
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      headers.forEach((h, i) => {
        row[h] = values[i];
      });
      return row;
    });
    return data;
  };

  const handleTextImport = async () => {
    if (!csvText.trim()) return;
    const data = parseCSV(csvText);
    if (data.length) {
      await onImport(data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                 <Upload size={20} />
              </div>
              <div>
                 <h2 className="text-lg font-bold">Import Patient Data</h2>
                 <p className="text-xs text-slate-500 font-medium">Upload CSV or paste spreadsheet data</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-50 text-slate-400 Transition-colors"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-8">
           {isSyncing ? (
             <div className="py-12 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                   <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                   <Database size={24} className="absolute inset-0 m-auto text-emerald-600 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                   <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Writing to Cloud</p>
                   <p className="text-xs text-slate-400 font-medium">Syncing {syncProgress.current} of {syncProgress.total} records...</p>
                </div>
                <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
                   <motion.div 
                     className="h-full bg-emerald-600"
                     initial={{ width: 0 }}
                     animate={{ width: `${(syncProgress.current/syncProgress.total)*100}%` }}
                   />
                </div>
             </div>
           ) : (
             <>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 group cursor-pointer",
                    dragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                  )}
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={e => { e.preventDefault(); setDragActive(false); }}
                >
                   <div className="w-16 h-16 rounded-2xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center mx-auto mb-6 transition-colors">
                      <FileSpreadsheet size={32} className="text-slate-400 group-hover:text-emerald-600" />
                   </div>
                   <h3 className="text-sm font-bold text-slate-700">Click to Upload</h3>
                   <p className="text-xs text-slate-400 mt-2">Support for .CSV files from Picme Portal</p>
                   <input type="file" className="hidden" />
                </div>

                <div className="space-y-3">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Paste Area</label>
                      <button onClick={() => setCsvText('')} className="text-[10px] font-bold text-indigo-600 hover:underline">Clear</button>
                   </div>
                   <textarea 
                     value={csvText}
                     onChange={e => setCsvText(e.target.value)}
                     className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none"
                     placeholder="BLOCK,PHC,HSC,PICME_NO,MOTHER NAME,EDD..."
                   />
                   <button 
                     onClick={handleTextImport}
                     className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all"
                   >
                     Process & Import to District Register
                   </button>
                </div>
             </>
           )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <Info size={14} className="text-indigo-500" />
           Headers must include Mother Name and PICME No to update existing records correctly.
        </div>
      </motion.div>
    </div>
  );
};
