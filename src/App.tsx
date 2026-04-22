import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { collection, onSnapshot, query, setDoc, doc, getDocs, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  Sparkles, 
  Baby, 
  Settings, 
  Plus, 
  LogOut,
  ChevronRight,
  TrendingUp,
  Search,
  Bell,
  Megaphone
} from 'lucide-react';
import { LoginOverlay } from './components/LoginOverlay';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PatientTable } from './components/PatientTable';
import { PatientDrawer } from './components/PatientDrawer';
import { PatientRecord, AppUser, Announcement } from './types';
import { cn } from './lib/utils';
import { getDistrictInsights } from './lib/gemini';
import { fetchSheetData, mapSheetToPatient } from './services/sheetService';
import ReactMarkdown from 'react-markdown';

// Initial data to bootstrap if empty
const DEMO_DATA: PatientRecord[] = [
  {"b":"KOLLIDAM","p":"EDAMANAL","h":"EADAMANAL","id":"133009374294","n":"Kathar Bee Saleem Banu","hu":"Jakir Hussian Shajahan","e":"2026-05-15","a":24,"ph":"6385785518","g":"2.0","pa":"1.0","r":[],"pp":"Sirkazhi","pt":"GH","lv":"2026-04-10","rm":"","as":"Discharged","ds":""},
  {"b":"KOLLIDAM","p":"EDAMANAL","h":"UMAYALPATHY","id":"133011541500","n":"Sowntharya D","hu":"Ramachandran","e":"2026-06-02","a":26,"ph":"9092667552","g":"1.0","pa":"0","r":["Heart Diseases Complicating Pregnancy"],"pp":"Govt Medical College","pt":"T-Hosp","lv":"2026-04-12","rm":"","as":"Discharged","ds":""},
  {"b":"KALI","p":"ELANTHOPPU","h":"THALANAYAR","id":"133011556531","n":"Priya Baskar","hu":"Pushparaj Sekar","e":"2026-04-30","a":21,"ph":"9080122707","g":"1.0","pa":"0","r":["Weight Below 40 kg"],"pp":"Mayiladuthurai","pt":"GH","lv":"2026-04-20","rm":"","as":"","ds":""}
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(localStorage.getItem('hrp_last_sync'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeBlock, setActiveBlock] = useState('');
  const [activePHC, setActivePHC] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  
  // Insights
  const [showAI, setShowAI] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // 1. Check local session
  // Load initial session and sync auth
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthReady(true);
      } else {
        const session = sessionStorage.getItem('hrp_session');
        if (session) {
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.error("Auth restoration failed", e);
            sessionStorage.removeItem('hrp_session');
            setCurrentUser(null);
          }
        } else {
          setAuthReady(false);
          setLoading(false);
        }
      }
    });

    const s = sessionStorage.getItem('hrp_session');
    if (s) {
      try {
        setCurrentUser(JSON.parse(s));
      } catch (e) {
        sessionStorage.removeItem('hrp_session');
      }
    }

    return () => unsubscribeAuth();
  }, []);

  // 2. Fetch Patients from Firestore
  useEffect(() => {
    if (!currentUser || !authReady) return;

    setLoading(true);
    
    // Listen to Patients - role aware
    let qP;
    if (currentUser.role === 'bdo' && currentUser.block) {
      qP = query(collection(db, 'patients'), where('b', '==', currentUser.block));
    } else {
      qP = query(collection(db, 'patients'));
    }

    const unsubscribePatients = onSnapshot(qP, (snap) => {
      const data: PatientRecord[] = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as PatientRecord));
      
      if (data.length === 0) {
        setPatients(DEMO_DATA);
      } else {
        setPatients(data);
      }
      setLoading(false);
    });

    // Listen to Announcements
    const qA = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribeAnnouncements = onSnapshot(qA, (snap) => {
      setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    });

    return () => {
      unsubscribePatients();
      unsubscribeAnnouncements();
    };
  }, [currentUser]);

  // Handle Login
  const handleLogin = async (user: any) => {
    // 1. Sync Profile FIRST
    if (user.id) {
      try {
        await setDoc(doc(db, 'users', user.id), {
          name: user.name,
          role: user.role,
          block: user.block || null,
          active: true,
          lastLogin: new Date()
        }, { merge: true });
      } catch (e) {
        console.warn("Profile auto-sync failed", e);
      }
    }

    // 2. Then set user state to trigger listeners
    setCurrentUser(user);
    sessionStorage.setItem('hrp_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    if (confirm('Sign out?')) {
      setCurrentUser(null);
      sessionStorage.removeItem('hrp_session');
    }
  };

  // Handle Sheet Sync
  const handleSheetSync = async (silent = false) => {
    if (!currentUser || syncing) return;
    setSyncing(true);
    try {
      const rawData = await fetchSheetData();
      let importedCount = 0;

      for (const raw of rawData) {
        const patient = mapSheetToPatient(raw);
        if (patient.n && patient.b) {
          const id = patient.id || `${patient.n}-${patient.b}`.replace(/\s+/g, '-').toLowerCase();
          await setDoc(doc(db, 'patients', id), {
            ...patient,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          importedCount++;
        }
      }
      
      const now = new Date().toLocaleTimeString();
      setLastSynced(now);
      localStorage.setItem('hrp_last_sync', now);
      
      if (!silent) {
        alert(`Sync Complete: Successfully processed ${importedCount} records from Google Sheets.`);
      }
    } catch (err: any) {
      if (!silent) {
        alert('Sync failed: Check console for Details (likely CORS or Permissions).');
      }
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  // 3. Auto-sync Effect
  useEffect(() => {
    if (!currentUser || !authReady) return;
    
    // Auto sync on mount
    handleSheetSync(true);
    
    // Set interval for every 10 minutes
    const interval = setInterval(() => {
      handleSheetSync(true);
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [currentUser, authReady]);

  // Generate Insights
  const handleShowAI = async () => {
    setShowAI(true);
    if (!aiContent) {
      setAiLoading(true);
      const text = await getDistrictInsights(patients);
      setAiContent(text);
      setAiLoading(false);
    }
  };

  // Filtered List
  const filteredPatients = useMemo(() => {
    return patients.filter(r => {
      const matchSearch = (r.n + r.id + r.p + r.h).toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      
      if (activePHC) return r.p === activePHC;
      if (activeBlock) return r.b === activeBlock;

      if (activeFilter === 'active') return r.ds !== 'Delivered' && r.ds !== 'Abortion';
      if (activeFilter === 'delivered') return r.ds === 'Delivered';
      
      return true;
    });
  }, [patients, searchQuery, activeFilter, activeBlock, activePHC]);

  if (!currentUser) {
    return <LoginOverlay onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden text-slate-900 font-sans">
      <Sidebar 
        data={patients}
        activeFilter={activeFilter}
        activeBlock={activeBlock}
        activePHC={activePHC}
        collapsed={sidebarCollapsed}
        onFilterChange={(f) => { setActiveFilter(f); setActiveBlock(''); setActivePHC(''); }}
        onBlockChange={(b) => { setActiveBlock(b); setActivePHC(''); }}
        onPHCChange={(b, p) => { setActiveBlock(b); setActivePHC(p); }}
        onShowAI={handleShowAI}
        onShowSched={() => {}}
        onClose={() => setSidebarCollapsed(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 shrink-0 flex items-center justify-between px-4 md:px-6 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 md:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-primary flex items-center gap-2">
                HRP Tracker
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md uppercase tracking-widest font-bold hidden sm:inline">District</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide hidden sm:block">Mayiladuthurai District · DPH Tamil Nadu</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
             <div 
               className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 cursor-pointer hover:bg-indigo-50 transition-colors"
               onClick={async () => {
                 const newName = prompt('Enter your display name:', currentUser.name);
                 if (newName && newName !== currentUser.name) {
                   const updated = { ...currentUser, name: newName };
                   setCurrentUser(updated);
                   sessionStorage.setItem('hrp_session', JSON.stringify(updated));
                   try {
                     await setDoc(doc(db, 'users', currentUser.id), { name: newName }, { merge: true });
                   } catch (e) { console.error("Profile sync failed", e); }
                 }
               }}
             >
               <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
               <span className="text-xs font-semibold text-slate-700">{currentUser.name}</span>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">({currentUser.role})</span>
             </div>
             
             <button className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
               <Bell size={20} />
             </button>
             
             <button 
               onClick={handleLogout}
               className="p-2 rounded-full hover:bg-red-50 text-red-400 transition-colors"
             >
               <LogOut size={20} />
             </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth h-full">
           <Dashboard 
             data={patients} 
             announcements={announcements}
             filterMode={activeFilter}
             onFilterClick={setActiveFilter}
           />

           {currentUser?.role === 'admin' && (
             <div className="bg-white p-6 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="flex items-center gap-2 mb-4">
                 <Megaphone size={16} className="text-primary" />
                 <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Post District Update</h3>
               </div>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 const form = e.target as any;
                 const title = form.atitle.value;
                 const content = form.acontent.value;
                 if (!title || !content) return;
                 
                 try {
                   await setDoc(doc(collection(db, 'announcements')), {
                     title,
                     content,
                     authorId: currentUser.id || 'admin-bootstrap',
                     authorName: currentUser.name || 'District Admin',
                     createdAt: new Date()
                   });
                   form.reset();
                 } catch (err: any) {
                   alert('Write failed: ' + err.message);
                 }
               }} className="space-y-4">
                 <input name="atitle" placeholder="Announcement Title (e.g. New Vaccination Drive)" className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
                 <textarea name="acontent" placeholder="Write the update details here. This will sync instantly across all devices." className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 h-24 transition-all" />
                 <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all">Broadcast Update</button>
               </form>
             </div>
           )}
           
           <div className="mb-4 flex items-center justify-between px-1">
             <div className="flex items-center gap-2">
               <div className={cn("w-2 h-2 rounded-full", syncing ? "bg-indigo-500 animate-pulse" : "bg-emerald-500")} />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 {syncing ? 'Syncing with Google Sheets...' : `Cloud Balanced (Last: ${lastSynced || 'N/A'})`}
               </span>
             </div>
             <div className="text-[10px] text-slate-300 font-medium">
               Auto-sync every 10 min
             </div>
           </div>
           
           <PatientTable 
             data={filteredPatients}
             onSearch={setSearchQuery}
             onRowClick={setSelectedPatient}
             onSync={handleSheetSync}
             isSyncing={syncing}
           />
        </main>
      </div>

      {/* AI Insights Modal */}
      {showAI && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="absolute inset-0 bg-black/40 backdrop-blur-sm"
             onClick={() => setShowAI(false)}
           />
           <motion.div 
             initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
             className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
           >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
                 <div className="flex items-center gap-2 text-purple-600 font-bold tracking-tight">
                    <Sparkles size={20} />
                    AI District Insights
                 </div>
                 <button onClick={() => setShowAI(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto prose prose-sm prose-purple">
                 {aiLoading ? (
                   <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
                      <p className="text-sm font-medium text-gray-500 animate-pulse">Running Gemini analysis...</p>
                   </div>
                 ) : (
                   <div className="markdown-body text-gray-700 leading-relaxed">
                     <ReactMarkdown>{aiContent}</ReactMarkdown>
                   </div>
                 )}
              </div>
              <div className="p-4 bg-gray-50 text-[10px] text-gray-400 text-center flex items-center justify-center gap-2">
                <TrendingUp size={12} />
                Powered by Gemini 2.0 Flash SDK · Realtime District Analytics
              </div>
           </motion.div>
        </div>
      )}

      {/* Detail Drawer */}
      <PatientDrawer 
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        canEdit={currentUser.role !== 'viewer'}
      />
    </div>
  );
}
