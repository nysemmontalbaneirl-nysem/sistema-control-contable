import React, { useState, useEffect } from 'react';
import { 
  Users, Menu, Home, Timer, RefreshCw, FolderOpen, 
  CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, History, Lock, Database, 
  LogOut, Clock, AlertCircle, Edit, X, Save,
  ChevronRight, Briefcase, TrendingUp, UserPlus, UserCog, BadgeCheck,
  Zap, Globe, Activity, PieChart, Layers, Search, Monitor, Cpu,
  Key, ShieldCheck, Settings, Layout
} from 'lucide-react';

// Firebase v11+ Implementation
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, 
  updateDoc, deleteDoc, Timestamp, query, orderBy 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from 'firebase/auth';

/**
 * NYSEM MONTALBAN EIRL - SISTEMA DE GESTIÓN DE PRODUCCIÓN (SGP)
 * VERSIÓN 23.0.0 - TOTAL RECOVERY & ROLES FIX
 */

// 1. ROBUST CONFIGURATION DETECTION
const getFirebaseConfig = () => {
  // Try Global Variable (Canvas environment)
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try { return JSON.parse(__firebase_config); } catch (e) { console.error("JSON Parse error in __firebase_config"); }
  }
  // Try Environment Variables (Vercel/Standard React)
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || ""
  };
};

const firebaseConfig = getFirebaseConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nysem-app';

let app, auth, db;
if (firebaseConfig.apiKey) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) { console.error("Firebase init failed:", e); }
}

const getTodayISO = () => new Date().toISOString().split('T')[0];

export default function App() {
  const [user, setUser] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [currentUserData, setCurrentUserData] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);

  // Form States
  const [editingId, setEditingId] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', sector: 'Servicios', honorario: '' });
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'Auditor' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 2. FIXED AUTH FLOW (Prevents infinite loading)
  useEffect(() => {
    const initAuth = async () => {
      if (!auth) {
        setIsInitializing(false);
        return;
      }
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth process error:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 3. PERSISTENT DATA SYNC
  useEffect(() => {
    if (!user || !db) return;
    
    // Path Standard: /artifacts/{appId}/public/data/{collection}
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');

    const unsubUsers = onSnapshot(usersRef, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error sync users:", err));

    const unsubClients = onSnapshot(clientsRef, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error sync clients:", err));

    const unsubReports = onSnapshot(query(reportsRef, orderBy("createdAt", "desc")), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Error sync reports:", err));

    return () => {
      unsubUsers();
      unsubClients();
      unsubReports();
    };
  }, [user]);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'admin') {
      setCurrentUserData({ name: 'CPC Nysem Montalbán', role: 'Administrador' });
      setIsLoggedIn(true);
      return;
    }
    const found = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (found) {
      setCurrentUserData(found);
      setIsLoggedIn(true);
      setAccessError(null);
    } else {
      setAccessError("Identidad no reconocida.");
    }
  };

  const handleSaveClient = async () => {
    if (!clientForm.name || !clientForm.ruc || !user) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingId), {
          ...clientForm, updatedAt: Timestamp.now()
        });
        notify("Entidad actualizada.");
      } else {
        await addDoc(colRef, { ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() });
        notify("Entidad guardada exitosamente.");
      }
      setClientForm({ name: '', ruc: '', sector: 'Servicios', honorario: '' });
      setEditingId(null);
    } catch (e) { notify("Error al guardar cliente.", "error"); }
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.username || !user) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingId), {
          ...userForm, updatedAt: Timestamp.now()
        });
        notify("Staff actualizado.");
      } else {
        await addDoc(colRef, { ...userForm, createdAt: Timestamp.now() });
        notify("Asistente registrado.");
      }
      setUserForm({ name: '', username: '', password: '', role: 'Auditor' });
      setEditingId(null);
    } catch (e) { notify("Error al guardar staff.", "error"); }
  };

  const deleteRecord = async (col, id) => {
    if (window.confirm("¿Eliminar registro de forma permanente?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
        notify("Registro eliminado.");
      } catch (e) { notify("Error al eliminar.", "error"); }
    }
  };

  const markAsDeclared = async (id) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id), { taxStatus: 'declared' });
      notify("Impuesto DECLARADO.");
    } catch (e) { console.error(e); }
  };

  const getRiskStyle = (ruc, taxStatus) => {
    if (taxStatus === 'declared') return { text: 'DECLARADO', bg: 'bg-[#10B981]/20', tx: 'text-[#10B981]', ring: 'ring-[#10B981]' };
    const lastDigit = parseInt(String(ruc).slice(-1));
    if ([0, 1, 2].includes(lastDigit)) return { text: 'VENCE HOY', bg: 'bg-rose-100', tx: 'text-rose-600', ring: 'ring-rose-400' };
    if ([3, 4, 5, 6].includes(lastDigit)) return { text: 'PRÓXIMO', bg: 'bg-amber-100', tx: 'text-amber-600', ring: 'ring-amber-400' };
    return { text: 'EN PLAZO', bg: 'bg-[#0EA5E9]/10', tx: 'text-[#0EA5E9]', ring: 'ring-[#0EA5E9]' };
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-10">
          <RefreshCw className="text-[#0EA5E9] animate-spin" size={80} />
          <div className="text-center">
             <p className="text-[14px] font-black tracking-[1.5em] uppercase text-[#0EA5E9]">NYSEM MONTALBÁN EIRL</p>
             <p className="text-[18px] text-slate-500 uppercase tracking-widest mt-6 animate-pulse italic">Validando Nodo Maestro v23.0</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-8">
        <div className="bg-white w-full max-w-2xl rounded-[5rem] shadow-2xl overflow-hidden border border-white">
          <div className="bg-[#020617] p-24 text-center text-white relative">
            <Shield className="mx-auto mb-12 text-[#0EA5E9]" size={110}/>
            <h1 className="text-7xl font-black uppercase tracking-tighter mb-6 leading-none">MASTER LOGIN</h1>
            <p className="text-[14px] font-black text-slate-500 uppercase tracking-[0.8em]">Asesoría & Capacitación</p>
          </div>
          <div className="p-24 space-y-12 bg-white">
            <form onSubmit={handleLogin} className="space-y-12">
              {accessError && (
                <div className="p-8 bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] flex items-center gap-6 animate-in fade-in zoom-in">
                  <AlertCircle className="text-rose-600" size={32}/>
                  <p className="text-[16px] font-black text-rose-800 uppercase">{accessError}</p>
                </div>
              )}
              <div className="space-y-8">
                <input type="text" placeholder="ID DE USUARIO" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-2 border-slate-100 font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:border-[#0EA5E9] transition-all text-3xl uppercase tracking-widest" required />
                <input type="password" placeholder="CLAVE DIGITAL" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-2 border-slate-100 font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:border-[#0EA5E9] transition-all text-3xl uppercase tracking-widest" required />
              </div>
              <button type="submit" className="w-full bg-[#020617] text-white py-11 rounded-[4rem] font-black text-[18px] uppercase tracking-[0.8em] hover:bg-[#0EA5E9] transition-all shadow-3xl">Iniciar Consola</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'Administrador';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
       {notification && (
         <div className={`fixed top-10 right-10 z-[100] p-8 rounded-[2.5rem] shadow-2xl border-4 flex items-center gap-6 animate-in slide-in-from-right-20 ${notification.type === 'success' ? 'bg-[#10B981] border-white text-white' : 'bg-rose-600 border-white text-white'}`}>
            <BadgeCheck size={36}/>
            <span className="text-xl font-black uppercase">{notification.msg}</span>
         </div>
       )}

       <aside className={`${sidebarOpen ? 'w-[450px]' : 'w-36'} bg-[#020617] flex flex-col transition-all duration-700 shadow-2xl relative border-r border-white/5 z-50`}>
         <div className="h-48 flex items-center px-16 border-b border-white/5">
            <Database className="text-[#10B981]" size={48}/>
            {sidebarOpen && (
              <div className="ml-10">
                <span className="block font-black text-5xl text-white tracking-tighter uppercase italic">NYSEM</span>
                <span className="text-[12px] font-black text-[#0EA5E9] uppercase tracking-[0.8em] mt-5 block">CORE v23</span>
              </div>
            )}
         </div>
         <nav className="flex-1 p-14 space-y-7">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Clientes', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora Staff', icon: Timer, show: true },
              { id: 'staff', label: 'Gestión Personal', icon: Users, show: isAdmin }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => { setViewMode(item.id); setEditingId(null); }} className={`w-full flex items-center gap-9 p-8 rounded-[3rem] text-[16px] font-black uppercase tracking-[0.4em] transition-all duration-500 group ${viewMode === item.id ? 'bg-[#0EA5E9] text-white' : 'text-slate-500 hover:text-white'}`}>
                <item.icon size={36} className={viewMode === item.id ? 'animate-pulse' : ''}/> 
                {sidebarOpen && item.label}
              </button>
            ))}
         </nav>
         <div className="p-14">
            <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-9 p-8 rounded-[3rem] text-rose-500 font-black uppercase tracking-[0.4em]">
               <LogOut size={36}/> {sidebarOpen && "SALIR"}
            </button>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-44 bg-white border-b-8 border-[#F1F5F9] flex items-center px-24 justify-between shadow-sm">
            <div className="flex items-center gap-16">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-8 bg-slate-50 rounded-[2.5rem] border-4 border-slate-100 text-slate-400">
                  <Menu size={44}/>
                </button>
                <div className="hidden lg:block">
                    <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">{viewMode}</h2>
                    <p className="text-sm font-black text-slate-400 tracking-widest uppercase italic">Nysem Montalbán EIRL</p>
                </div>
            </div>
            <div className="flex items-center gap-10 bg-slate-50 px-16 py-8 rounded-[2.8rem] border-2 border-slate-100 font-mono text-[24px] font-black text-slate-800 shadow-inner group">
                <Calendar size={36} className="text-[#0EA5E9]"/> {getTodayISO()}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-20 lg:p-28 bg-[#F8FAFC]">
            
            {viewMode === 'dashboard' && (
                <div className="space-y-28 animate-in fade-in duration-1000">
                    <h1 className="text-[10rem] font-black text-[#020617] tracking-tighter leading-[0.8] uppercase italic">Gestión <br/>Maestra</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-20">
                        {[
                          { title: "CARTERA", val: clients.length, icon: Building2, color: "#0EA5E9" },
                          { title: "ALERTAS", val: clients.filter(c => getRiskStyle(c.ruc, c.taxStatus).text === 'VENCE HOY').length, icon: AlertTriangle, color: "#F43F5E" },
                          { title: "STAFF", val: users.length, icon: Users, color: "#10B981" },
                          { title: "REPORTES", val: reports.length, icon: Activity, color: "#6366F1" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-20 rounded-[7rem] border-b-[20px] shadow-xl border-2 border-slate-50" style={{ borderBottomColor: stat.color }}>
                              <stat.icon size={72} style={{ color: stat.color }} className="mb-16"/>
                              <h3 className="text-slate-400 text-[16px] font-black uppercase tracking-[0.7em] mb-6">{stat.title}</h3>
                              <div className="text-[9rem] font-black text-[#020617] tracking-tighter leading-none">{stat.val}</div>
                          </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-28">
                    <div className="bg-[#020617] p-24 rounded-[7rem] shadow-2xl relative overflow-hidden">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-20 border-b-2 border-white/5 pb-24 mb-24 relative z-10">
                           <div className="space-y-8">
                              <h2 className="text-8xl font-black text-white tracking-tighter uppercase italic leading-none">Cartera Clientes</h2>
                              <p className="text-[18px] font-bold text-[#0EA5E9] uppercase tracking-[0.8em] italic">Registro Permanente Nysem</p>
                           </div>
                           <button onClick={handleSaveClient} className={`px-28 py-11 rounded-[4.5rem] text-[20px] font-black uppercase tracking-[0.6em] text-white shadow-3xl border-4 border-white/20 ${editingId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                              {editingId ? "ACTUALIZAR" : "VINCULAR CLIENTE"}
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 relative z-10">
                            <input type="text" placeholder="RAZÓN SOCIAL" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="lg:col-span-2 p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-4xl uppercase outline-none focus:border-[#0EA5E9] transition-all"/>
                            <input type="text" placeholder="RUC" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-4xl uppercase outline-none text-center focus:border-[#0EA5E9] transition-all"/>
                            <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-[18px] uppercase text-center focus:border-[#0EA5E9] h-28">
                                <option value="Agricultura">AGRICULTURA</option>
                                <option value="Construcción">CONSTRUCCIÓN</option>
                                <option value="Exportación">EXPORTACIÓN</option>
                                <option value="Servicios">SERVICIOS</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
                        {clients.map(c => {
                            const style = getRiskStyle(c.ruc, c.taxStatus);
                            return (
                                <div key={c.id} className="bg-white p-24 rounded-[8rem] border-4 border-slate-50 shadow-2xl transition-all border-b-[30px]" style={{ borderBottomColor: style.text === 'VENCE HOY' ? '#F43F5E' : (c.taxStatus === 'declared' ? '#10B981' : '#F8FAFC') }}>
                                    <div className="flex justify-between items-start mb-20">
                                        <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center text-[#020617] border-2 border-slate-100"><Building2 size={64}/></div>
                                        <div className={`px-12 py-5 rounded-full text-[16px] font-black uppercase tracking-[0.5em] border-4 ${style.bg} ${style.tx} ${style.ring}`}>{style.text}</div>
                                    </div>
                                    <h3 className="font-black text-[#020617] uppercase text-6xl leading-[1] tracking-tighter mb-12">{c.name}</h3>
                                    <div className="pt-12 border-t-4 border-slate-50 flex items-center justify-between">
                                        <div className="flex gap-4">
                                            <button onClick={() => markAsDeclared(c.id)} className="p-10 rounded-[2.5rem] bg-[#10B981] text-white shadow-xl"><CheckCircle2 size={48}/></button>
                                            <button onClick={() => { setEditingId(c.id); setClientForm({ name: c.name, ruc: c.ruc, sector: c.sector, honorario: c.honorario }); }} className="p-10 rounded-[2.5rem] bg-slate-50 text-slate-400 border-4 border-slate-100 shadow-xl"><Edit size={48}/></button>
                                        </div>
                                        <button onClick={() => deleteRecord('clients', c.id)} className="text-slate-200 hover:text-rose-600 p-10"><Trash2 size={52}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {viewMode === 'staff' && isAdmin && (
                <div className="max-w-7xl mx-auto space-y-28">
                    <div className="bg-[#020617] p-24 rounded-[7rem] shadow-3xl text-white relative">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-20 border-b border-white/5 pb-24 mb-24 relative z-10">
                           <div className="space-y-8">
                              <h2 className="text-7xl font-black uppercase tracking-tighter italic">Asistentes & Roles</h2>
                              <p className="text-2xl text-slate-400 font-bold tracking-tight italic leading-none">Control de Staff Nysem</p>
                           </div>
                           <button onClick={handleSaveUser} className={`px-28 py-11 rounded-[4.5rem] text-[20px] font-black uppercase tracking-[0.6em] text-white shadow-3xl border-4 border-white/20 ${editingId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                              {editingId ? "GUARDAR CAMBIOS" : "INTEGRAR AUDITOR"}
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 relative z-10">
                            <input type="text" placeholder="NOMBRE STAFF" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="p-10 bg-white/5 rounded-[3.5rem] border-4 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9]"/>
                            <input type="text" placeholder="USUARIO LOGIN" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="p-10 bg-white/5 rounded-[3.5rem] border-4 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9]"/>
                            <input type="text" placeholder="CONTRASEÑA" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="p-10 bg-white/5 rounded-[3.5rem] border-4 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9]"/>
                            <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="p-10 bg-white/5 rounded-[3.5rem] border-4 border-white/10 font-black text-white text-[16px] uppercase h-28 text-center">
                                <option value="Auditor">AUDITOR (STAFF)</option>
                                <option value="Administrador">ADMINISTRADOR (CPC)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
                        {users.map(u => (
                            <div key={u.id} className="bg-white p-24 rounded-[8rem] border-4 border-slate-50 flex flex-col justify-between items-center group shadow-2xl border-b-[20px] hover:border-[#10B981] text-center">
                                <div className="w-40 h-40 bg-slate-50 rounded-[4rem] flex items-center justify-center text-[#020617] border-4 border-slate-100 shadow-xl mb-16"><UserCog size={80}/></div>
                                <h3 className="font-black text-[#020617] uppercase text-5xl leading-[1] mb-8">{u.name}</h3>
                                <div className="flex flex-col items-center gap-6">
                                   <span className="px-12 py-4 rounded-full text-[14px] font-black uppercase tracking-[0.5em] border-4 bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/20">{u.role}</span>
                                   <span className="text-[20px] font-black text-slate-300 font-mono tracking-[0.5em] uppercase italic opacity-70 italic">ID: {u.username}</span>
                                </div>
                                <div className="w-full flex justify-between items-center mt-24 pt-20 border-t-4 border-slate-50">
                                    <button onClick={() => { setEditingId(u.id); setUserForm({ name: u.name, username: u.username, password: u.password, role: u.role }); }} className="p-10 rounded-[2.8rem] bg-slate-50 text-slate-400 border-4 border-slate-100 shadow-xl"><Edit size={48}/></button>
                                    <button onClick={() => deleteRecord('users', u.id)} className="text-slate-100 hover:text-rose-600 p-10"><Trash2 size={52}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'reports' && (
               <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-28 animate-in fade-in duration-700 pb-40">
                  <div className="bg-[#020617] p-24 rounded-[7rem] shadow-2xl h-fit border-b-[20px] border-[#10B981]">
                        <div className="flex items-center gap-12 mb-20">
                           <div className="p-10 bg-[#10B981] rounded-[3rem] text-white shadow-3xl"><Timer size={64}/></div>
                           <h2 className="text-5xl font-black text-white uppercase italic leading-none">Reportar</h2>
                        </div>
                        <div className="space-y-16">
                            <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-4xl uppercase outline-none"/>
                            <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-[18px] uppercase h-28 text-center">
                                <option value="">CLIENTE...</option>
                                {clients.map(c => <option key={c.id} value={c.name} className="text-black">{c.name}</option>)}
                            </select>
                            <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-14 bg-white/5 rounded-[4.5rem] border-4 border-white/10 resize-none h-[500px] font-medium text-white text-[26px] outline-none" placeholder="DETALLE OPERATIVO..."></textarea>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName || !user) return;
                                try {
                                  await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { 
                                    ...reportForm, userName: currentUserData?.name, createdAt: Timestamp.now() 
                                  });
                                  setReportForm({ ...reportForm, description: '', time: '' });
                                  notify("Avance reportado.");
                                } catch(e) { notify("Error al reportar.", "error"); }
                            }} className="w-full bg-[#10B981] text-white py-14 rounded-[5rem] font-black text-[22px] uppercase tracking-[1em] shadow-3xl">ARCHIVAR</button>
                        </div>
                  </div>

                  <div className="xl:col-span-2 bg-white p-28 rounded-[9rem] border-4 border-slate-50 min-h-[1600px]">
                        <h3 className="font-black text-[#020617] text-[6rem] uppercase tracking-tighter italic mb-28 border-b-8 border-slate-50 pb-10">Bitácora Global</h3>
                        <div className="space-y-28 relative border-l-[20px] border-slate-50 ml-20 pb-60">
                            {reports.map((r, i) => (
                                <div key={r.id} className="relative pl-28 animate-in slide-in-from-left-24">
                                    <div className="absolute -left-[45px] top-4 w-18 h-18 rounded-full bg-[#10B981] border-[15px] border-white shadow-3xl"></div>
                                    <div className="bg-slate-50 p-20 rounded-[8rem] border-4 border-slate-100 flex flex-col md:flex-row md:justify-between md:items-start gap-16 group">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-12 mb-10">
                                                <span className="text-[20px] font-black text-[#10B981] uppercase bg-[#10B981]/10 px-12 py-6 rounded-full">{r.clientName}</span>
                                                <span className="text-[20px] font-mono font-black text-slate-400">{r.time}</span>
                                            </div>
                                            <p className="text-[42px] font-bold text-[#020617] italic font-serif leading-snug">"{r.description}"</p>
                                            <div className="mt-24 flex items-center gap-12 text-[18px] font-black text-slate-400 uppercase tracking-[0.8em]">
                                                <div className="w-28 h-28 rounded-[3rem] bg-white border-4 border-slate-100 flex items-center justify-center text-[#10B981] font-black text-5xl">{r.userName?.charAt(0)}</div>
                                                <div>
                                                  <span className="block text-[#020617] text-3xl font-black italic">{r.userName}</span>
                                                  <span className="block opacity-60">AUDITOR NYSEM</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteRecord('reports', r.id)} className="text-slate-200 hover:text-rose-600 p-12 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={56}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                  </div>
               </div>
            )}
          </div>

          <footer className="h-28 bg-[#020617] flex items-center px-28 justify-between text-[13px] font-black text-slate-600 uppercase tracking-[1em] border-t-8 border-[#F1F5F9]/5">
             <span>Nysem Montalbán EIRL • 2026</span>
             <span className="flex items-center gap-20">
                <span className="flex items-center gap-6 text-[#0EA5E9] font-black italic"><div className="w-5 h-5 rounded-full bg-[#10B981]"></div> MASTER CONNECTED</span>
                <span className="flex items-center gap-8"><ShieldCheck size={24}/> CORE v23.0.0</span>
             </span>
          </footer>
       </main>
    </div>
  );
}
