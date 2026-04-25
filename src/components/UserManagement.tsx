import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  X, 
  UserPlus, 
  Key, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  Search,
  ChevronRight,
  Info,
  CheckCircle2,
  Lock,
  UserCheck,
  UserX
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, setDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

interface UserManagementProps {
  onClose: () => void;
  currentUser: AppUser;
}

const ROLE_OPTIONS: { value: UserRole, label: string, color: string, bg: string }[] = [
  { value: 'admin',       label: 'District Admin',     color: 'text-purple-700', bg: 'bg-purple-100' },
  { value: 'dph_officer', label: 'DPH Officer',        color: 'text-blue-700',   bg: 'bg-blue-100'   },
  { value: 'bdo',         label: 'Block Officer (BDO)', color: 'text-orange-700', bg: 'bg-orange-100' },
  { value: 'viewer',      label: 'Viewer (Read-only)', color: 'text-slate-600',   bg: 'bg-slate-100'  },
];

export const UserManagement: React.FC<UserManagementProps> = ({ onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'password'>('list');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: 'viewer' as UserRole,
    block: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordData, setPasswordData] = useState({
    old: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    const qU = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(qU, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;
    
    // In a real app we'd handle the actual Firebase Auth user creation here.
    // For this prototype, we're just syncing the user profile doc.
    try {
      await setDoc(doc(db, 'users', formData.id.toLowerCase()), {
        name: formData.name,
        role: formData.role,
        block: formData.role === 'bdo' ? formData.block.toUpperCase() : null,
        active: true,
        updatedAt: new Date()
      }, { merge: true });
      
      alert('User document created/updated in Firestore');
      setActiveTab('list');
      setFormData({ id: '', name: '', role: 'viewer', block: '', password: '', confirmPassword: '' });
      setEditingUser(null);
    } catch(err: any) { alert(err.message); }
  };

  const toggleUserActive = async (user: AppUser) => {
    try {
      await updateDoc(doc(db, 'users', user.id), { active: !user.active });
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                 <Users size={20} />
              </div>
              <div>
                 <h2 className="text-lg font-bold uppercase tracking-tight">System Accounts</h2>
                 <p className="text-xs text-slate-500 font-medium">Manage district personnel and access levels</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-white text-slate-400 Transition-colors"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4">
           {[
             { id: 'list', label: 'Users', icon: Users },
             { id: 'add', label: editingUser ? 'Edit User' : 'New User', icon: UserPlus },
             { id: 'password', label: 'Security', icon: Lock }
           ].map(t => (
             <button
               key={t.id}
               onClick={() => { setActiveTab(t.id as any); if(t.id !== 'add') setEditingUser(null); }}
               className={cn(
                 "px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 relative -mb-px flex items-center gap-2",
                 activeTab === t.id 
                   ? "text-indigo-600 border-indigo-600" 
                   : "text-slate-400 border-transparent hover:text-slate-600"
               )}
             >
               <t.icon size={14} />
               {t.label}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
           {activeTab === 'list' && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Authorized Personnel (${users.length})
                   </h3>
                   <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500" size={14} />
                      <input type="text" placeholder="Filter by name..." className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all w-48" />
                   </div>
                </div>
                
                <div className="grid gap-2">
                   {/* Bootstrap Admin Row */}
                   <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100">
                         <ShieldCheck size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 tracking-tight">System Admin</span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest">Master</span>
                         </div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Root Account · Bootstrap</p>
                      </div>
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Immutable</div>
                   </div>

                   {users.filter(u => u.id !== 'admin').map(u => {
                     const rOpt = ROLE_OPTIONS.find(r => r.value === u.role) || ROLE_OPTIONS[3];
                     return (
                        <div key={u.id} className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 transition-all flex items-center gap-4 group">
                           <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300", rOpt.bg, rOpt.color)}>
                              <Users size={20} />
                           </div>
                           <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                 <span className="font-bold text-slate-800 tracking-tight">{u.name}</span>
                                 {!u.active && (
                                   <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[8px] font-black uppercase">Deactivated</span>
                                 )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                 <span className={rOpt.color}>{rOpt.label}</span>
                                 <span>•</span>
                                 <span>{u.id}</span>
                                 {u.block && (
                                   <span className="bg-slate-50 px-1.5 rounded">Block: {u.block}</span>
                                 )}
                              </div>
                           </div>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setEditingUser(u); setFormData({ ...formData, ...u }); setActiveTab('add'); }}
                                className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                              >
                                 <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={() => toggleUserActive(u)}
                                className={cn("p-2 rounded-lg transition-all", u.active ? "hover:bg-red-50 text-slate-400 hover:text-red-500" : "hover:bg-emerald-50 text-red-400 hover:text-emerald-600")}
                              >
                                 {u.active ? <UserX size={16} /> : <UserCheck size={16} />}
                              </button>
                           </div>
                        </div>
                     );
                   })}
                </div>
             </div>
           )}

           {activeTab === 'add' && (
             <form onSubmit={handleSaveUser} className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-300 pt-4">
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unique Username</label>
                         <input 
                           placeholder="e.g. jdoe24"
                           className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                           value={formData.id}
                           onChange={e => setFormData({...formData, id: e.target.value.toLowerCase().replace(/\s/g,'')})}
                           readOnly={!!editingUser}
                         />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Display Name</label>
                         <input 
                           placeholder="Full Name"
                           className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                           value={formData.name}
                           onChange={e => setFormData({...formData, name: e.target.value})}
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assigned Role</label>
                         <select 
                           className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                           value={formData.role}
                           onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                         >
                            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                         </select>
                      </div>
                      {formData.role === 'bdo' && (
                         <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-300">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assigned Block</label>
                            <input 
                              placeholder="BLOCK NAME"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase font-bold"
                              value={formData.block}
                              onChange={e => setFormData({...formData, block: e.target.value})}
                            />
                         </div>
                      )}
                   </div>
                </div>

                {!editingUser && (
                   <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shrink-0">
                         <Info size={18} />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed pt-1">
                         Creating a user document here only sets their system permissions in the database. You must provide them with the district-wide standard activation key or create their Google Identity separately to allow login.
                      </p>
                   </div>
                )}

                <div className="pt-4 flex gap-3">
                   <button 
                     type="submit"
                     className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-200"
                   >
                      {editingUser ? 'Save Changes' : 'Initialize Account'}
                   </button>
                   <button 
                     type="button"
                     onClick={() => setActiveTab('list')}
                     className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                   >
                      Cancel
                   </button>
                </div>
             </form>
           )}

           {activeTab === 'password' && (
             <div className="max-w-md mx-auto py-12 animate-in fade-in duration-300 text-center space-y-8">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-indigo-100">
                   <Key size={32} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-black text-slate-900">Account Security</h3>
                   <p className="text-sm text-slate-500 font-medium">To keep the district data secure, we use Google Identity for authentication. No external passwords are stored in this system.</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left space-y-4">
                   <div className="flex gap-3">
                      <ShieldCheck className="text-emerald-500 shrink-0" size={18} />
                      <div className="text-xs font-medium text-slate-600 leading-relaxed">
                         Districts using 2FA through Google Workspaces are fully protected.
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <ShieldAlert className="text-orange-500 shrink-0" size={18} />
                      <div className="text-xs font-medium text-slate-600 leading-relaxed">
                         Unauthorized access attempts are logged and reported to the DPH central server.
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
           Personnel Integrity Protocol — Mayiladuthurai District
        </div>
      </motion.div>
    </div>
  );
};
