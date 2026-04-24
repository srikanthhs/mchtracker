import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { collection, onSnapshot, query, setDoc, doc, getDocs, orderBy, where, writeBatch } from 'firebase/firestore';
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
  Megaphone,
  AlertCircle,
  CheckCircle2,
  Cloud,
  RefreshCw,
  Database
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
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [syncReport, setSyncReport] = useState<{ 
    imported: number, 
    skipped: number, 
    error?: string, 
    details?: string,
    failingUrl?: string,
    rawSnippet?: any, 
    validationFailures?: string[],
    isPermissionError?: boolean
  } | null>(null);
  const [sheetScriptUrl, setSheetScriptUrl] = useState<string>(localStorage.getItem('hrp_sheet_url') || '');
  const [authReady, setAuthReady] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'error' | 'syncing'>('online');
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
      setDbStatus('syncing');
      const data: PatientRecord[] = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as PatientRecord));
      
      if (data.length === 0) {
        setPatients([]);
      } else {
        setPatients(data);
      }
      setLoading(false);
      setDbStatus('online');
    }, (err) => {
      console.error("Firestore Listen Errror", err);
      setDbStatus('error');
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
        
        // 2. ONLY set user state AFTER successful profile sync
        setCurrentUser(user);
        sessionStorage.setItem('hrp_session', JSON.stringify(user));
      } catch (e: any) { 
        console.error("Profile auto-sync failed", e);
        const details = e.message?.includes('permission') 
          ? 'DATABASE REJECTION: Your auth token is valid but rules denied the write to /users. Check firestore.rules.'
          : e.message;
        alert(`FATAL: Database Permission Denied.\n${details}`);
      }
    }
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
    setSyncProgress({ current: 0, total: 0 });
    setSyncReport(null);
    
    try {
      console.log('Fetching raw sheet data...');
      const rawData = await fetchSheetData(sheetScriptUrl || undefined);
      
      if (!rawData || rawData.length === 0) {
        throw new Error("Google Sheets returned 0 rows. Check script deployment.");
      }

      const totalRows = rawData.length;
      setSyncProgress({ current: 0, total: totalRows });

      let importedCount = 0;
      let skippedCount = 0;
      const validationFailures: string[] = [];
      const rawSnippet = rawData.slice(0, 3);

      // Process in batches of 500 (Firestore limit)
      const BATCH_SIZE = 500;
      for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = rawData.slice(i, i + BATCH_SIZE);
        
        for (const [chunkIndex, raw] of chunk.entries()) {
          const globalIndex = i + chunkIndex;
          const patient = mapSheetToPatient(raw);
          
          if (patient.isValid) {
            // Priority for ID: 
            // 1. PICME ID from sheet
            // 2. Stable composite ID (Name + Husband + Block)
            // 3. Last fallback: Index based
            const stableId = `${patient.n}-${patient.hu || 'nohu'}-${patient.b || 'noblock'}`.replace(/\s+/g, '-').toLowerCase();
            const id = patient.id || stableId || `row-${globalIndex}`;
            
            const { isValid, validationErrors, ...recordData } = patient;
            
            const docRef = doc(db, 'patients', id);
            batch.set(docRef, {
              ...recordData,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            
            importedCount++;
          } else {
            skippedCount++;
            if (validationFailures.length < 10) {
              validationFailures.push(`Row ${globalIndex + 1}: ${patient.validationErrors?.join(', ')}`);
            }
          }
        }
        
        await batch.commit();
        setSyncProgress({ current: Math.min(i + BATCH_SIZE, totalRows), total: totalRows });
      }
      
      const now = new Date().toLocaleTimeString();
      setLastSynced(now);
      localStorage.setItem('hrp_last_sync', now);
      setSyncReport({ imported: importedCount, skipped: skippedCount, rawSnippet, validationFailures });
    } catch (err: any) {
      console.error('Sheet Sync Error:', err);
      const isPermission = err.message?.toLowerCase().includes('permission') || err.message?.includes('insufficient');
      setSyncReport({ 
        imported: 0, 
        skipped: 0, 
        error: `${err.message || 'Unknown Error'}`,
        details: err.details || (isPermission ? 'PERMISSIONS DENIED: Your account role is not authorized to write to the database, or your account document is missing. Contact Admin.' : 'Check logs'),
        failingUrl: err.url,
        isPermissionError: isPermission
      });
    } finally {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
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
        dbStatus={dbStatus}
        syncing={syncing}
        lastSynced={lastSynced}
        onSync={() => handleSheetSync()}
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
           
           <div className="mb-4 space-y-3">
             <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-2">
                 <div className={cn("w-2 h-2 rounded-full", syncing ? "bg-indigo-500 animate-pulse" : "bg-emerald-500")} />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   {syncing ? `Syncing: ${syncProgress.current} / ${syncProgress.total}` : `Cloud Balanced (Last: ${lastSynced || 'N/A'})`}
                 </span>
               </div>
               <div className="text-[10px] text-slate-300 font-medium">
                 {syncing ? `${Math.round((syncProgress.current/syncProgress.total)*100 || 0)}%` : 'Auto-sync every 10 min'}
               </div>
             </div>

             {syncing && (
               <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-indigo-500"
                   initial={{ width: 0 }}
                   animate={{ width: `${(syncProgress.current/syncProgress.total)*100}%` }}
                 />
               </div>
             )}

             {syncReport && (
               <div className={cn(
                 "p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300",
                 syncReport.error ? "bg-red-50 border-red-100" : "bg-indigo-50 border-indigo-100"
               )}>
                 <div className="flex items-start justify-between">
                   <div className="flex gap-3">
                     <div className={cn("p-2 rounded-lg shrink-0", syncReport.error ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600")}>
                        {syncReport.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                     </div>
                     <div className="space-y-1">
                       <h4 className={cn("text-sm font-bold", syncReport.error ? "text-red-700" : "text-indigo-900")}>
                         {syncReport.error ? "Sync Issue Detected" : "Sheet Sync Complete"}
                       </h4>
                       <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                         {syncReport.error 
                           ? syncReport.error 
                           : `Successfully synchronized ${syncReport.imported} patients from your Google Sheet. ${syncReport.skipped > 0 ? `${syncReport.skipped} rows skipped due to missing names or invalid data.` : ''}`
                         }
                       </p>

                       {syncReport.validationFailures && syncReport.validationFailures.length > 0 && (
                         <div className="mt-2 space-y-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Validation Failures (First 10):</p>
                            {syncReport.validationFailures.map((err, i) => (
                              <p key={i} className="text-[10px] text-red-500 flex items-center gap-1">
                                <AlertCircle size={10} /> {err}
                              </p>
                            ))}
                         </div>
                       )}
                       
                       {(syncReport.error || (syncReport.validationFailures && syncReport.validationFailures.length > 0)) && (
                         <div className="mt-3 p-3 bg-white rounded-lg border border-red-200 space-y-2">
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight">Sync Diagnostic Help:</p>
                            <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-1">
                               {syncReport.error?.includes('Proxy') && (
                                 <li className="text-red-700 font-bold border-l-2 border-red-500 pl-2">
                                   <strong>CONNECTION ERROR:</strong> The server failed to reach Google Apps Script. 
                                   <div className="mt-1 font-normal opacity-80 text-[10px]">
                                     • Ensure your Spreadsheet ID is valid.<br/>
                                     • Check if Google is temporarily down or blocking the proxy.<br/>
                                     • Refresh and try again in 1 minute.
                                   </div>
                                 </li>
                               )}
                               {syncReport.error?.includes('ID_OR_URL_HERE') && (
                                 <li className="text-red-700 font-bold border-l-2 border-red-500 pl-2">
                                   CRITICAL: You MUST replace <code>ID_OR_URL_HERE</code> in the script code with your actual Spreadsheet ID.
                                 </li>
                               )}
                               {syncReport.validationFailures && syncReport.validationFailures.length > 0 && (
                                <li className="text-red-700">
                                  <strong>Column Discovery:</strong> {syncReport.rawSnippet && syncReport.rawSnippet[0] ? Object.keys(syncReport.rawSnippet[0]).join(', ') : 'None detected'}
                                  <p className="mt-1 text-[10px] opacity-70">
                                    Ensure your sheet has a column exactly named "Mother Name" as the primary header.
                                  </p>
                                </li>
                              )}
                              {syncReport.rawSnippet && syncReport.rawSnippet[0] && (
                                <li className="text-[10px] bg-slate-50 p-2 rounded border border-slate-100 font-mono overflow-auto max-h-24 break-all">
                                  <strong>Row 1 Raw Keys/Values:</strong> {JSON.stringify(syncReport.rawSnippet[0])}
                                </li>
                              )}
                              {syncReport.error?.includes('Unexpected Web Page Received') && (
                                 <li className="text-red-700 font-bold">
                                   <strong>ACTION REQUIRED: Permission Issue</strong>
                                   <div className="mt-1 font-normal opacity-80 pl-2">
                                     • You likely pasted the <strong>Editor URL</strong> (ends in /edit) instead of the Deployment URL.<br/>
                                     • <strong>Fix:</strong> In Apps Script, click <strong>Deploy &gt; New Deployment</strong>.<br/>
                                     • Set "Who has access" to <strong>Anyone</strong>.<br/>
                                     • Copy the <strong>Web App URL</strong> (ends in <code>/exec</code>).
                                   </div>
                                 </li>
                               )}
                              {syncReport.error?.includes('404') && (
                                <li className="text-red-600 font-bold">
                                  <strong>404 - SCRIPT NOT FOUND:</strong> Google cannot find this deployment.
                                  <div className="mt-1 font-normal opacity-80 pl-2">
                                    • <strong>Fix:</strong> Click <strong>Deploy &gt; New Deployment</strong> in Apps Script.<br/>
                                    • Set "Who has access" to <strong>Anyone</strong>.<br/>
                                    • Copy the <strong>Web App URL</strong> (ends in <code>/exec</code>).
                                  </div>
                                </li>
                              )}
                              {syncReport.isPermissionError && (
                                <li className="text-red-700 font-bold bg-red-50 p-2 rounded border border-red-200">
                                  <strong>FATAL: DATABASE PERMISSION ERROR</strong>
                                  <div className="mt-1 font-normal opacity-80 text-[10px]">
                                    • Your user document may not exist in Firestore.<br/>
                                    • <strong>Fix:</strong> Logout and login again using "admin" / "Admin@2026" to ensure your admin profile is bootstrapped.
                                  </div>
                                </li>
                              )}
                              {syncReport.error?.includes('Illegal spreadsheet id') && (
                                <li className="text-red-700 font-bold border-l-2 border-red-500 pl-2">
                                  CRITICAL: Paste ONLY the ID (or use the Foolproof template below).
                                </li>
                              )}
                              {syncReport.error?.includes('TypeError') && (
                                <li><strong>Script Failing:</strong> Your script code is crashing. Use the template below.</li>
                              )}
                            </ul>
                            <button 
                              onClick={() => {
                                const code = `/**
 * FOOLPROOF GOOGLE APPS SCRIPT
 * 1. Extensions > Apps Script.
 * 2. Paste this code and REPLACE 'ID_OR_URL_HERE'.
 * 3. Deploy > New Deployment > Web App > Access: Anyone.
 */

function doGet() {
  try {
    var raw = 'ID_OR_URL_HERE';
    if (raw === 'ID_OR_URL' + '_HERE') {
      return ContentService.createTextOutput(JSON.stringify({ 
        error: 'ID_OR_URL_HERE found', 
        details: 'You forgot to replace "ID_OR_URL_HERE" with your actual Spreadsheet ID in the Apps Script code.' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sid = raw;
    if (raw.indexOf('docs.google.com') !== -1) {
      var match = raw.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) sid = match[1];
    }
    
    var ss = SpreadsheetApp.openById(sid);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    
    // SMART HEADER DISCOVERY
    var headerRow = 0;
    for (var r = 0; r < Math.min(data.length, 20); r++) {
      var rowText = data[r].join(" ").toLowerCase();
      if (rowText.indexOf("mother") !== -1 || rowText.indexOf("picme") !== -1 || rowText.indexOf("name") !== -1 || rowText.indexOf("id") !== -1) {
        headerRow = r;
        break;
      }
    }
    
    var rawHeaders = data[headerRow];
    var headers = rawHeaders.map(function(h) { 
      return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); 
    });
    
    var results = [];
    for (var i = headerRow + 1; i < data.length; i++) {
      var obj = {};
      var hasVal = false;
      for (var j = 0; j < headers.length; j++) {
        var cell = data[i][j];
        if (headers[j]) {
          obj[headers[j]] = cell;
          if (cell !== "" && cell !== null && cell !== undefined) hasVal = true;
        }
      }
      if (hasVal) {
        obj._row = i + 1;
        results.push(obj);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
                                navigator.clipboard.writeText(code);
                                alert('Foolproof Template Copied!\n\nJust paste it and replace the ID/URL.');
                              }}
                              className="text-[10px] bg-red-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-red-700 transition-colors mt-1"
                            >
                              Copy Foolproof Script Template
                            </button>
                         </div>
                       )}

                       <div className="mt-4 pt-4 border-t border-slate-200/60">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Custom Script URL (Optional)</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={sheetScriptUrl}
                              placeholder="PASTE THE DEPLOYMENT URL HERE (ends in /exec)"
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                if (val && !val.includes('/exec')) {
                                  console.warn("Input URL does not look like a deployment URL (missing /exec)");
                                }
                                setSheetScriptUrl(val);
                                localStorage.setItem('hrp_sheet_url', val);
                              }}
                              className="flex-1 text-[11px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <button 
                              onClick={() => handleSheetSync()}
                              className="bg-indigo-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-lg active:scale-95 transition-all"
                            >
                              Retry
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 italic">Leave empty to use the system default deployment.</p>
                       </div>
                     </div>
                   </div>
                   <button onClick={() => setSyncReport(null)} className="text-slate-400 hover:text-slate-600">
                     <X size={16} />
                   </button>
                 </div>
               </div>
             )}
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
