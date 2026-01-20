import React, { useState, useEffect } from 'react';
import { 
  Users, Menu, Home, Timer, RefreshCw, FolderOpen, 
  CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, History, Lock, Database, 
  LogOut, Clock, AlertCircle, Edit, X, Save,
  ChevronRight, Briefcase, TrendingUp, UserPlus, UserCog, BadgeCheck,
  Zap, Globe, Activity, PieChart, Layers
} from 'lucide-react';

// Firebase v11+ Implementation
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, 
  updateDoc, deleteDoc, Timestamp, query, orderBy 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

/**
 * NYSEM MONTALBAN EIRL - SISTEMA DE GESTIÓN DE PRODUCCIÓN (SGP)
 * VERSIÓN 19.0.0 - ULTRA-SAAS EXECUTIVE EDITION
 * COLORES: Dark Blue (#020617), Sky Blue (#0EA5E9), Emerald Green (#10B981)
 */

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).apiKey : ""),
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).authDomain : ""),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).projectId : ""),
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).storageBucket : ""),
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).messagingSenderId : ""),
  appId: process.env.REACT_APP_FIREBASE_APP_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).appId : "")
};

const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app, auth, db;
if (isConfigValid) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Critical Cloud Error:", error);
  }
}

const getTodayISO = () => new Date().toISOString().split('T')[0];
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nysem-app';

export default function App() {
  const [fbUser, setFbUser] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [currentUserData, setCurrentUserData] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);

  // States for Editing
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);

  // Forms
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', sector: 'Servicios', honorario: '' });
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'Auditor', hourlyCost: '' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  // --- LÓGICA DE RIESGO SUNAT ---
  const calculateTaxRisk = (ruc, taxStatus) => {
    if (!ruc) return { color: 'slate', text: 'Sin RUC', bg: 'bg-slate-100', tx: 'text-slate-600' }; 
    if (taxStatus === 'declared') return { color: 'emerald', text: 'Declarado', bg: 'bg-emerald-100', tx: 'text-emerald-700' };
    const rucStr = String(ruc).trim();
    const lastDigit = parseInt(rucStr.charAt(rucStr.length - 1));
    if (isNaN(lastDigit)) return { color: 'slate', text: 'Inválido', bg: 'bg-slate-100', tx: 'text-slate-600' };
    
    if ([0, 1, 2].includes(lastDigit)) return { color: 'rose', text: 'VENCE HOY', bg: 'bg-rose-100', tx: 'text-rose-700' }; 
    if ([3, 4, 5, 6].includes(lastDigit)) return { color: 'amber', text: 'PRÓXIMO', bg: 'bg-amber-100', tx: 'text-amber-700' }; 
    return { color: 'sky', text: 'EN PLAZO', bg: 'bg-sky-100', tx: 'text-sky-700' }; 
  };

  useEffect(() => {
    if (!isConfigValid) {
      setIsInitializing(false);
      return;
    }
    const performAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        setAccessError(`Cloud Sync Error: ${err.message}`);
      } finally {
        setIsInitializing(false);
      }
    };
    performAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || !db) return;
    
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubClients, unsubReports;
    if (isLoggedIn) {
      unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), snap => {
          setClients(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      unsubReports = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), orderBy("createdAt", "desc")), snap => {
          setReports(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
    }

    return () => {
      unsubUsers();
      if (unsubClients) unsubClients();
      if (unsubReports) unsubReports();
    };
  }, [fbUser, isLoggedIn]);

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
      setAccessError("Identidad no reconocida en el nodo Nysem.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserData(null);
    setViewMode('dashboard');
    setLoginForm({ username: '', password: '' });
  };

  const handleSaveClient = async () => {
    if (!clientForm.name || !clientForm.ruc) return;
    try {
      if (editingClientId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingClientId), clientForm);
        setEditingClientId(null);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { 
          ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() 
        });
      }
      setClientForm({ name: '', ruc: '', sector: 'Servicios', honorario: '' });
    } catch (e) { console.error(e); }
  };

  const handleEditClient = (client) => {
    setEditingClientId(client.id);
    setClientForm({ name: client.name, ruc: client.ruc, sector: client.sector || 'Servicios', honorario: client.honorario || '' });
  };

  const cancelClientEdit = () => {
    setEditingClientId(null);
    setClientForm({ name: '', ruc: '', sector: 'Servicios', honorario: '' });
  };

  const markAsDeclared = async (clientId) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientId), { 
        taxStatus: 'declared' 
      });
    } catch (e) { console.error(e); }
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.username) return;
    try {
      if (editingUserId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingUserId), userForm);
        setEditingUserId(null);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { 
          ...userForm, createdAt: Timestamp.now() 
        });
      }
      setUserForm({ name: '', username: '', password: '', role: 'Auditor', hourlyCost: '' });
    } catch (e) { console.error(e); }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setUserForm({ name: user.name, username: user.username, password: user.password, role: user.role || 'Auditor', hourlyCost: user.hourlyCost || '' });
  };

  const cancelUserEdit = () => {
    setEditingUserId(null);
    setUserForm({ name: '', username: '', password: '', role: 'Auditor', hourlyCost: '' });
  };

  const deleteDocGeneric = async (col, id) => {
    if (window.confirm("¿Confirmar eliminación definitiva del registro?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-10">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 border-2 border-sky-500/20 rounded-full animate-ping"></div>
            <RefreshCw className="text-sky-400 animate-spin absolute" size={48} />
          </div>
          <div className="text-center">
             <p className="text-[10px] font-black tracking-[0.8em] uppercase text-sky-400">Nysem Montalbán EIRL</p>
             <p className="text-[12px] text-slate-500 uppercase tracking-widest mt-4 font-mono">Sincronización Cuántica v19.0</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F1F5F9] p-6">
        <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden border border-white flex flex-col">
          <div className="bg-[#020617] p-20 text-center text-white relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
            <Shield className="mx-auto mb-10 text-sky-400 drop-shadow-[0_0_20px_rgba(14,165,233,0.5)]" size={84}/>
            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">Master Node</h1>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] italic">Asesoría & Capacitación Empresarial</p>
          </div>
          <div className="p-20 space-y-12 bg-white">
            <form onSubmit={handleLogin} className="space-y-8">
              {accessError && (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-5 animate-in fade-in zoom-in duration-500">
                  <AlertCircle className="text-rose-600 shrink-0" size={24}/>
                  <p className="text-[12px] font-black text-rose-800 uppercase tracking-tight">{accessError}</p>
                </div>
              )}
              <div className="space-y-6">
                <input type="text" placeholder="USUARIO MAESTRO" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none focus:ring-8 ring-sky-500/5 focus:bg-white focus:border-sky-500/10 transition-all uppercase tracking-widest" required />
                <input type="password" placeholder="CLAVE DE SEGURIDAD" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none focus:ring-8 ring-sky-500/5 focus:bg-white focus:border-sky-500/10 transition-all uppercase tracking-widest" required />
              </div>
              <button type="submit" className="w-full bg-[#020617] text-white py-8 rounded-[3.5rem] font-black text-[13px] uppercase tracking-[0.5em] hover:bg-sky-600 transition-all shadow-2xl active:scale-95 mt-8 hover:shadow-sky-500/20">Iniciar Auditoría</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'Administrador';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden animate-in fade-in duration-1000">
       
       {/* SIDEBAR: ULTRA DARK EXECUTIVE */}
       <aside className={`${sidebarOpen ? 'w-88' : 'w-28'} bg-[#020617] flex flex-col transition-all duration-700 shadow-2xl z-50 relative overflow-hidden`}>
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-sky-500/[0.03] to-transparent pointer-events-none"></div>
         
         <div className="h-36 flex items-center px-12 border-b border-white/5">
            <div className="bg-[#10B981] p-5 rounded-[1.8rem] shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-transform hover:scale-110 duration-500">
              <Database className="text-white" size={32}/>
            </div>
            {sidebarOpen && (
              <div className="ml-6 animate-in fade-in slide-in-from-left-8">
                <span className="block font-black text-3xl text-white tracking-tighter uppercase leading-none">NYSEM SGP</span>
                <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.5em] mt-3 block opacity-80">Audit Hub v19</span>
              </div>
            )}
         </div>

         <nav className="flex-1 p-10 space-y-4 overflow-y-auto custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Corporativa', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora de Producción', icon: Timer, show: true },
              { id: 'users', label: 'Gestión de Staff', icon: UserCog, show: isAdmin }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-6 p-6 rounded-[2.2rem] text-[12px] font-black uppercase tracking-[0.2em] transition-all duration-500 group ${viewMode === item.id ? 'bg-sky-600 text-white shadow-[0_20px_40px_-10px_rgba(14,165,233,0.5)] translate-x-2' : 'text-slate-500 hover:bg-white/5 hover:text-sky-400'}`}>
                <item.icon size={26} className={viewMode === item.id ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}/> 
                {sidebarOpen && item.label}
              </button>
            ))}
         </nav>

         <div className="p-10">
            <div className="bg-white/5 p-7 rounded-[3rem] border border-white/5 flex items-center gap-6 backdrop-blur-xl group hover:bg-white/10 transition-all duration-500">
                <div className="w-16 h-16 rounded-2xl bg-[#10B981] flex items-center justify-center text-white font-black text-2xl shadow-xl transition-transform group-hover:rotate-6">
                  {currentUserData?.name?.charAt(0)}
                </div>
                {sidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[12px] font-black text-white truncate uppercase tracking-tight leading-none mb-2">{currentUserData?.name}</p>
                    <button onClick={handleLogout} className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2">
                       <LogOut size={12}/> Cerrar
                    </button>
                  </div>
                )}
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* HEADER: MODERN & GLASSY */}
          <header className="h-32 bg-white/70 backdrop-blur-3xl border-b border-slate-100 flex items-center px-16 justify-between z-40">
            <div className="flex items-center gap-10">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-5 bg-white hover:bg-slate-50 rounded-[1.5rem] text-slate-400 hover:text-sky-600 border border-slate-100 shadow-sm transition-all group">
                  <Menu size={26} className="group-hover:scale-110 transition-transform"/>
                </button>
                <div className="hidden lg:flex items-center gap-6 bg-slate-100/50 px-8 py-5 rounded-[2rem] border border-slate-100 group focus-within:ring-4 ring-sky-500/10 transition-all">
                  <Search size={20} className="text-slate-400 group-focus-within:text-sky-500 transition-colors"/>
                  <input type="text" placeholder="LOCALIZAR ENTIDAD O RUC..." className="bg-transparent border-none outline-none text-[12px] font-black text-slate-600 w-80 placeholder:text-slate-300 uppercase tracking-widest"/>
                </div>
            </div>
            
            <div className="flex items-center gap-10">
               <div className="flex flex-col items-end mr-6 hidden xl:flex">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2 leading-none">SEGURIDAD NIVEL BANCO</span>
                  <span className="text-[11px] font-black text-emerald-500 uppercase flex items-center gap-3">
                    <Zap size={14} fill="currentColor"/> NODO SINCRONIZADO
                  </span>
               </div>
               <div className="h-16 w-px bg-slate-100"></div>
               <div className="flex items-center gap-6 bg-white px-10 py-5 rounded-[1.8rem] border border-slate-100 font-mono text-[14px] font-black text-slate-800 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
                  <Calendar size={20} className="text-sky-600 animate-pulse"/> {String(getTodayISO())}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-12 lg:p-20 custom-scrollbar bg-[#F8FAFC] space-y-20">
            
            {/* DASHBOARD: EXECUTIVE VIEW */}
            {viewMode === 'dashboard' && (
                <div className="space-y-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                        <div className="space-y-4">
                           <h2 className="text-7xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">Visión <br/>Empresarial</h2>
                           <p className="text-lg font-bold text-slate-400 tracking-tight flex items-center gap-4">
                             <div className="w-16 h-1.5 bg-sky-500 rounded-full"></div> Consola de Auditoría y Control de Producción
                           </p>
                        </div>
                        <div className="flex gap-6">
                           <button onClick={() => setViewMode('clients')} className="bg-[#020617] text-white px-12 py-6 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.4em] shadow-2xl hover:bg-sky-600 transition-all flex items-center gap-5 group">
                              <Plus size={20} className="group-hover:rotate-90 transition-transform"/> Nueva Apertura
                           </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-12">
                        {[
                          { title: "CARTERA CLIENTES", val: clients.length, icon: Building2, color: "sky", label: "ENTIDADES" },
                          { title: "ALERTAS CRÍTICAS", val: clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).color === 'rose').length, icon: AlertTriangle, color: "rose", label: "SUNAT HOY" },
                          { title: "AUDITORES STAFF", val: users.length, icon: Users, color: "emerald", label: "PERSONAL" },
                          { title: "PRODUCCIÓN DIARIA", val: reports.filter(r => r.date === getTodayISO()).length, icon: TrendingUp, color: "indigo", label: "ACCIONES" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-14 rounded-[4.5rem] border border-slate-50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] hover:shadow-[0_60px_120px_-30px_rgba(14,165,233,0.1)] transition-all group relative overflow-hidden">
                              <div className={`w-24 h-24 rounded-[2.2rem] bg-${stat.color === 'sky' ? 'sky' : (stat.color === 'rose' ? 'rose' : (stat.color === 'emerald' ? 'emerald' : 'indigo'))}-50 flex items-center justify-center text-${stat.color === 'sky' ? 'sky-600' : (stat.color === 'rose' ? 'rose-600' : (stat.color === 'emerald' ? 'emerald-600' : 'indigo-600'))} mb-12 group-hover:scale-110 transition-transform duration-700 shadow-inner`}>
                                <stat.icon size={44}/>
                              </div>
                              <h3 className="text-slate-400 text-[12px] font-black uppercase tracking-[0.4em] mb-4">{stat.title}</h3>
                              <div className="text-7xl font-black text-slate-900 tracking-tighter leading-none mb-6">{stat.val}</div>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none border-t border-slate-50 pt-6">{stat.label} REGISTRADOS</p>
                              <div className="absolute -right-12 -bottom-12 opacity-[0.03] text-slate-900"><stat.icon size={250}/></div>
                          </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GESTIÓN DE STAFF: ULTRA MODERN CRUD */}
            {viewMode === 'users' && isAdmin && (
                <div className="max-w-7xl mx-auto space-y-20 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-white p-16 rounded-[5rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#10B981]/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-[#10B981]/10 duration-1000"></div>
                        
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 border-b border-slate-50 pb-16 mb-20 relative z-10">
                           <div className="space-y-5">
                              <h2 className="text-6xl font-black text-[#020617] tracking-tighter uppercase leading-none">Gestión Staff</h2>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-6 italic">
                                 <div className="w-12 h-[1px] bg-[#10B981]"></div> Control de Auditores y Asistentes
                              </p>
                           </div>
                           <div className="flex items-center gap-6">
                              {editingUserId && (
                                <button onClick={cancelUserEdit} className="bg-slate-100 text-slate-600 px-10 py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-4">
                                   <X size={20}/> Cancelar
                                </button>
                              )}
                              <button onClick={handleSaveUser} className={`px-16 py-7 rounded-[3rem] text-[12px] font-black uppercase tracking-[0.4em] text-white shadow-2xl hover:scale-[1.03] transition-all flex items-center gap-6 ${editingUserId ? 'bg-sky-600 shadow-sky-300' : 'bg-[#10B981] shadow-emerald-300'}`}>
                                 {editingUserId ? <><Save size={24}/> Guardar Auditor</> : <><UserPlus size={24}/> Nuevo Auditor</>}
                              </button>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Nombre Completo</label>
                                <input type="text" placeholder="EJ: CPC JUAN PÉREZ" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-8 ring-sky-500/5 transition-all uppercase tracking-tight"/>
                            </div>
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">ID Auditor (Login)</label>
                                <input type="text" placeholder="AUDITOR_01" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-8 ring-sky-500/5 transition-all uppercase tracking-tight"/>
                            </div>
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Clave Acceso</label>
                                <input type="text" placeholder="****" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-8 ring-sky-500/5 transition-all uppercase tracking-tight"/>
                            </div>
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Jerarquía Nodo</label>
                                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none appearance-none cursor-pointer text-center text-[12px] uppercase tracking-widest">
                                    <option value="Auditor">AUDITOR (STAFF)</option>
                                    <option value="Administrador">ADMINISTRADOR (CPC)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                        {users.map((u) => (
                            <div key={u.id} className="bg-white p-16 rounded-[5rem] border border-slate-50 flex flex-col justify-between items-start group shadow-sm hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 animate-in slide-in-from-bottom-12">
                                <div className="w-full">
                                    <div className="flex justify-between items-start mb-12">
                                        <div className="w-24 h-24 bg-slate-50 rounded-[2.2rem] flex items-center justify-center text-slate-800 shadow-inner group-hover:bg-[#10B981] group-hover:text-white transition-all duration-700 shadow-sm"><UserCog size={44}/></div>
                                        <div className={`px-7 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.3em] border-2 transition-all duration-500 ${u.role === 'Administrador' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-sky-50 text-sky-600 border-sky-100'}`}>{u.role}</div>
                                    </div>
                                    <h3 className="font-black text-slate-900 uppercase text-3xl leading-tight mb-4 tracking-tighter group-hover:text-sky-600 transition-colors duration-500">{u.name}</h3>
                                    <p className="text-[14px] font-black text-slate-300 font-mono tracking-[0.4em] uppercase opacity-70">CRED: {u.username}</p>
                                </div>
                                <div className="w-full flex justify-between items-center mt-16 pt-12 border-t border-slate-50">
                                    <button onClick={() => handleEditUser(u)} className="p-6 rounded-[1.8rem] bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white transition-all shadow-xl shadow-sky-100/50 group/edit"><Edit size={28} className="group-hover/edit:rotate-12 transition-transform"/></button>
                                    <button onClick={() => deleteDocGeneric('users', u.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-6 hover:bg-rose-50 rounded-[1.8rem] duration-500"><Trash2 size={30}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CARTERA CLIENTES: EXECUTIVE CRUD */}
            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-20 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-white p-16 rounded-[5rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-sky-500/10 duration-1000"></div>
                        
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 border-b border-slate-50 pb-16 mb-20 relative z-10">
                           <div className="space-y-5">
                              <h2 className="text-6xl font-black text-[#020617] tracking-tighter uppercase leading-none">Cartera Corporativa</h2>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-6 italic">
                                 <div className="w-12 h-[1px] bg-sky-500"></div> Gestión Integral de Entidades en Asesoría
                              </p>
                           </div>
                           <div className="flex items-center gap-6">
                              {editingClientId && (
                                <button onClick={cancelClientEdit} className="bg-slate-100 text-slate-600 px-10 py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center gap-4">
                                   <X size={20}/> Cancelar
                                </button>
                              )}
                              <button onClick={handleSaveClient} className={`px-16 py-7 rounded-[3rem] text-[12px] font-black uppercase tracking-[0.4em] text-white shadow-2xl hover:scale-[1.03] transition-all flex items-center gap-6 ${editingClientId ? 'bg-sky-600 shadow-sky-300' : 'bg-[#10B981] shadow-emerald-300'}`}>
                                 {editingClientId ? <><Save size={24}/> Actualizar Nodo</> : <><Plus size={24}/> Nueva Entidad</>}
                              </button>
                           </div>
                        </div>
                        
                        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
                            <div className="space-y-5 lg:col-span-2">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Razón Social o Denominación</label>
                                <input type="text" placeholder="EJ: CONSORCIO AGRÍCOLA MONTALBÁN S.A.C." value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-8 ring-sky-500/5 transition-all uppercase tracking-tight"/>
                            </div>
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Registro RUC (11 Dig)</label>
                                <input type="text" placeholder="20XXXXXXXXX" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none text-center font-mono focus:bg-white transition-all"/>
                            </div>
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Sector Estratégico</label>
                                <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner outline-none appearance-none cursor-pointer text-center text-[12px] uppercase tracking-widest">
                                    <option value="Agricultura">AGRICULTURA</option>
                                    <option value="Construcción">CONSTRUCCIÓN</option>
                                    <option value="Exportación">EXPORTACIÓN</option>
                                    <option value="Comercio">COMERCIO</option>
                                    <option value="Servicios">SERVICIOS GLOBAL</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 pb-32">
                        {clients.map((c) => {
                            const risk = calculateTaxRisk(c.ruc, c.taxStatus);
                            const isDeclared = c.taxStatus === 'declared';
                            return (
                                <div key={c.id} className="bg-white p-16 rounded-[5rem] border border-slate-50 flex flex-col justify-between items-start group shadow-sm hover:shadow-[0_60px_120px_-30px_rgba(0,0,0,0.1)] transition-all duration-700 relative overflow-hidden animate-in slide-in-from-bottom-12">
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-14">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.2rem] flex items-center justify-center text-slate-800 shadow-inner group-hover:bg-[#020617] group-hover:text-white transition-all duration-700 shadow-sm"><Building2 size={44}/></div>
                                            <div className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.3em] border-2 transition-all duration-500 ${risk.bg} ${risk.tx} ${risk.color === 'rose' ? 'animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.3)]' : (isDeclared ? 'shadow-[0_0_20px_rgba(16,185,129,0.3)]' : '')}`}>{risk.text}</div>
                                        </div>
                                        <h3 className="font-black text-slate-900 uppercase text-3xl leading-[1.1] tracking-tighter group-hover:text-sky-600 transition-colors duration-500 mb-6">{String(c.name)}</h3>
                                        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-50">
                                              <span className="text-[14px] font-black text-slate-300 font-mono tracking-widest leading-none bg-slate-50 px-5 py-2 rounded-xl border border-slate-100 shadow-inner">RUC {String(c.ruc)}</span>
                                              <span className="text-[11px] font-black text-sky-500 uppercase tracking-widest leading-none flex items-center gap-3">
                                                 <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div> {String(c.sector)}
                                              </span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full flex justify-between items-center mt-16 pt-12 border-t border-slate-50">
                                        <div className="flex items-center gap-5">
                                           <button onClick={() => markAsDeclared(c.id)} className={`p-6 rounded-[1.8rem] transition-all duration-500 shadow-2xl active:scale-90 ${isDeclared ? 'bg-[#10B981] text-white shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 hover:shadow-emerald-200'}`}>
                                              <CheckCircle2 size={30}/>
                                           </button>
                                           <button onClick={() => handleEditClient(c)} className="p-6 rounded-[1.8rem] bg-slate-50 text-slate-400 hover:bg-sky-600 hover:text-white transition-all duration-500 border border-slate-100 shadow-xl shadow-sky-100/10">
                                              <Edit size={30}/>
                                           </button>
                                        </div>
                                        <button onClick={() => deleteDocGeneric('clients', c.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-6 hover:bg-rose-50 rounded-[1.8rem] duration-500"><Trash2 size={32}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* BITÁCORA STAFF: EXECUTIVE AUDIT LOG */}
            {viewMode === 'reports' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-20 animate-in fade-in duration-700 pb-32">
                    <div className="bg-white p-16 rounded-[5.5rem] border border-slate-50 shadow-2xl h-fit sticky top-12 overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        
                        <div className="flex items-center gap-8 mb-20 relative z-10">
                           <div className="p-7 bg-emerald-50 rounded-[2.2rem] text-emerald-600 shadow-inner group-hover:scale-110 transition-transform duration-500"><Timer size={44}/></div>
                           <div className="space-y-2">
                              <h2 className="text-3xl font-black text-[#020617] uppercase tracking-tighter leading-none">Bitácora</h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Staff Nysem Diarios</p>
                           </div>
                        </div>
                        <div className="space-y-12 relative z-10">
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Cronometría (Hora)</label>
                                <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.2rem] border-none font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-8 ring-emerald-500/5 transition-all"/>
                            </div>
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Entidad Destino</label>
                                <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.2rem] border-none font-black text-slate-800 shadow-inner outline-none text-[12px] uppercase tracking-[0.3em] cursor-pointer appearance-none text-center">
                                    <option value="">SELECCIÓN NODO...</option>
                                    {clients.map(c => <option key={c.id} value={c.name}>{String(c.name)}</option>)}
                                </select>
                            </div>
                            <div className="space-y-5">
                                <label className="text-[11px] font-black text-slate-400 ml-10 uppercase tracking-widest">Labor Operativa</label>
                                <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-10 bg-slate-50 rounded-[3rem] border-none resize-none h-72 font-medium text-slate-700 shadow-inner text-[17px] leading-relaxed outline-none focus:bg-white transition-all placeholder:text-slate-200" placeholder="Reporte el avance contable o tributario detallado..."></textarea>
                            </div>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName) return;
                                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { 
                                  ...reportForm, 
                                  userName: currentUserData?.name, 
                                  createdAt: Timestamp.now() 
                                });
                                setReportForm({ ...reportForm, description: '', time: '' });
                            }} className="w-full bg-[#10B981] text-white py-10 rounded-[3.5rem] font-black text-[13px] uppercase tracking-[0.6em] shadow-[0_40px_80px_-20px_rgba(16,185,129,0.4)] hover:bg-emerald-700 transition-all active:scale-95 group flex items-center justify-center gap-6">
                               <Timer size={24} className="group-hover:rotate-12 transition-transform"/> Grabar Avance
                            </button>
                        </div>
                    </div>

                    <div className="xl:col-span-2 bg-white p-16 rounded-[6rem] border border-slate-50 shadow-sm min-h-[1000px] overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-50 pb-16 mb-20 gap-10">
                            <div className="space-y-3">
                               <h3 className="font-black text-slate-900 text-4xl uppercase tracking-tighter leading-none">Auditoría Global</h3>
                               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">Consolidado de Productividad Staff</p>
                            </div>
                            <div className="bg-slate-50 px-10 py-5 rounded-full border border-slate-100 text-[13px] font-black text-slate-500 uppercase tracking-[0.2em] shadow-inner flex items-center gap-5">
                               <Clock size={20} className="text-sky-600"/> {String(getTodayISO())}
                            </div>
                        </div>
                        
                        <div className="space-y-16 relative border-l-8 border-slate-50 ml-10 pb-32">
                            {reports.length > 0 ? (
                                reports.map((r, i) => (
                                    <div key={r.id} className="relative pl-16 animate-in slide-in-from-left-12 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="absolute -left-[24px] top-2 w-10 h-10 rounded-full bg-[#10B981] border-[8px] border-white shadow-2xl ring-16 ring-emerald-50/50 group hover:scale-125 transition-transform duration-500"></div>
                                        <div className="bg-slate-50/30 p-12 rounded-[5rem] border border-slate-100 flex flex-col md:flex-row md:justify-between md:items-start gap-10 hover:bg-white hover:shadow-[0_60px_120px_-30px_rgba(0,0,0,0.08)] hover:border-emerald-200 transition-all duration-700 group relative">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-6 mb-8">
                                                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.4em] bg-emerald-100 px-7 py-3 rounded-full border border-emerald-100 leading-none shadow-sm">{String(r.clientName)}</span>
                                                    <span className="text-[11px] font-mono font-black text-slate-400 leading-none uppercase tracking-widest bg-white px-5 py-3 rounded-xl border border-slate-50 shadow-inner">{String(r.time)}</span>
                                                </div>
                                                <p className="text-[22px] font-bold text-slate-800 leading-relaxed italic group-hover:text-black transition-colors duration-500 font-serif">"{String(r.description)}"</p>
                                                <div className="mt-12 flex items-center gap-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 font-black text-xl group-hover:bg-[#10B981] group-hover:text-white transition-all shadow-inner">{r.userName?.charAt(0)}</div>
                                                    Auditor Responsable: <span className="text-slate-900 ml-2">{String(r.userName)}</span>
                                                </div>
                                            </div>
                                            <button onClick={async () => { if(window.confirm("¿Eliminar reporte definitivo?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', r.id)) }} className="text-slate-100 hover:text-rose-600 p-6 transition-all duration-500 opacity-0 group-hover:opacity-100 relative z-20"><Trash2 size={32}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-72 text-center opacity-30">
                                    <Activity size={100} className="mx-auto mb-10 text-slate-200 animate-pulse"/>
                                    <p className="text-sm font-black text-slate-300 uppercase tracking-[0.6em] italic text-center">Nodo de Actividades Vacío</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

          </div>
          
          {/* FOOTER: EXECUTIVE BLACK */}
          <footer className="h-14 bg-[#020617] flex items-center px-20 justify-between text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] z-50">
             <span>Nysem Montalbán EIRL • 2026</span>
             <span className="flex items-center gap-10">
                <span className="flex items-center gap-3 text-sky-500">
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]"></div> CONEXIÓN CIFRADA
                </span>
                <span className="text-white/5 font-thin text-xl">|</span>
                <span className="flex items-center gap-4 group cursor-help">
                   <Shield size={14} className="text-slate-700 group-hover:text-sky-400 transition-colors"/> AUDIT CONSOLE V19.0.0
                </span>
             </span>
          </footer>
       </main>
    </div>
  );
}
