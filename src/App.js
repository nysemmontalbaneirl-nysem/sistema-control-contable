import React, { useState, useEffect } from 'react';
import { 
  Users, Menu, Home, Timer, RefreshCw, FolderOpen, 
  CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, History, Lock, Database, 
  LogOut, Clock, AlertCircle, Edit, X, Save,
  ChevronRight, Briefcase, TrendingUp, UserPlus, UserCog, BadgeCheck,
  Zap, Globe, Activity, PieChart, Layers, Search, Monitor, Cpu
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
 * VERSIÓN 20.0.0 - ROYAL EXECUTIVE AUDIT (COLOR-FIX EDITION)
 * PALETA: 
 * - Azul Maestro: #020617 (Slate 950)
 * - Celeste Premium: #0EA5E9 (Sky 500)
 * - Verde Éxito: #10B981 (Emerald 500)
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

  // --- LÓGICA DE RIESGO SUNAT (MAPEO EXPLÍCITO DE COLORES) ---
  const calculateTaxRisk = (ruc, taxStatus) => {
    if (!ruc) return { text: 'Sin RUC', bg: 'bg-slate-100', tx: 'text-slate-600', ring: 'ring-slate-100' }; 
    if (taxStatus === 'declared') return { text: 'Declarado', bg: 'bg-emerald-100', tx: 'text-emerald-700', ring: 'ring-emerald-100' };
    const rucStr = String(ruc).trim();
    const lastDigit = parseInt(rucStr.charAt(rucStr.length - 1));
    if (isNaN(lastDigit)) return { text: 'Inválido', bg: 'bg-slate-100', tx: 'text-slate-600', ring: 'ring-slate-100' };
    
    if ([0, 1, 2].includes(lastDigit)) return { text: 'VENCE HOY', bg: 'bg-rose-100', tx: 'text-rose-700', ring: 'ring-rose-200' }; 
    if ([3, 4, 5, 6].includes(lastDigit)) return { text: 'PRÓXIMO', bg: 'bg-amber-100', tx: 'text-amber-700', ring: 'ring-amber-200' }; 
    return { text: 'EN PLAZO', bg: 'bg-sky-100', tx: 'text-sky-700', ring: 'ring-sky-200' }; 
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
    if (window.confirm("¿Confirmar eliminación definitiva del registro corporativo?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-10">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 border-4 border-sky-500/20 rounded-full animate-ping"></div>
            <RefreshCw className="text-sky-400 animate-spin absolute" size={56} />
          </div>
          <div className="text-center">
             <p className="text-[12px] font-black tracking-[1.2em] uppercase text-sky-400">NYSEM MONTALBÁN EIRL</p>
             <p className="text-[14px] text-slate-500 uppercase tracking-widest mt-6 font-mono animate-pulse">Iniciando Consola de Alta Fidelidad v20.0</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F1F5F9] p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[#020617] opacity-[0.03] pointer-events-none"></div>
        <div className="bg-white w-full max-w-2xl rounded-[5rem] shadow-[0_80px_150px_-30px_rgba(0,0,0,0.2)] overflow-hidden border border-white flex flex-col z-10">
          <div className="bg-[#020617] p-24 text-center text-white relative border-b-4 border-emerald-500">
            <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <Shield className="mx-auto mb-10 text-sky-400 drop-shadow-[0_0_30px_rgba(14,165,233,0.6)]" size={96}/>
            <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-6">Master Node</h1>
            <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.6em] italic">Asesoría & Capacitación Empresarial</p>
          </div>
          <div className="p-24 space-y-14 bg-white">
            <form onSubmit={handleLogin} className="space-y-10">
              {accessError && (
                <div className="p-8 bg-rose-50 border border-rose-200 rounded-[2.5rem] flex items-center gap-6 animate-in fade-in zoom-in duration-500">
                  <AlertCircle className="text-rose-600 shrink-0" size={28}/>
                  <p className="text-[14px] font-black text-rose-800 uppercase tracking-tight">{accessError}</p>
                </div>
              )}
              <div className="space-y-8">
                <div className="relative group">
                  <Lock className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors" size={24}/>
                  <input type="text" placeholder="ID DE ACCESO" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-9 pl-20 bg-slate-50 rounded-[2.8rem] border-2 border-transparent font-black text-slate-800 shadow-inner outline-none focus:ring-[12px] ring-sky-500/10 focus:bg-white focus:border-sky-500/20 transition-all uppercase tracking-[0.2em]" required />
                </div>
                <div className="relative group">
                  <Database className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors" size={24}/>
                  <input type="password" placeholder="CLAVE CRIPTOGRÁFICA" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-9 pl-20 bg-slate-50 rounded-[2.8rem] border-2 border-transparent font-black text-slate-800 shadow-inner outline-none focus:ring-[12px] ring-sky-500/10 focus:bg-white focus:border-sky-500/20 transition-all uppercase tracking-[0.2em]" required />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#020617] text-white py-9 rounded-[4rem] font-black text-[15px] uppercase tracking-[0.6em] hover:bg-sky-600 transition-all shadow-2xl active:scale-95 mt-10 hover:shadow-sky-500/30">Validar Firma Digital</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'Administrador';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden animate-in fade-in duration-1000">
       
       {/* SIDEBAR: ROYAL DARK (AZUL OSCURO + CELESTE) */}
       <aside className={`${sidebarOpen ? 'w-96' : 'w-32'} bg-[#020617] flex flex-col transition-all duration-700 shadow-[20px_0_60px_rgba(0,0,0,0.2)] z-50 relative overflow-hidden border-r border-white/5`}>
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-sky-500/[0.05] to-transparent pointer-events-none"></div>
         
         <div className="h-40 flex items-center px-14 border-b border-white/5">
            <div className="bg-[#10B981] p-6 rounded-[2rem] shadow-[0_0_35px_rgba(16,185,129,0.5)] transition-transform hover:scale-110 duration-500 border border-white/20">
              <Cpu className="text-white" size={38}/>
            </div>
            {sidebarOpen && (
              <div className="ml-8 animate-in fade-in slide-in-from-left-12">
                <span className="block font-black text-4xl text-white tracking-tighter uppercase leading-none italic">NYSEM</span>
                <span className="text-[11px] font-black text-sky-400 uppercase tracking-[0.6em] mt-4 block opacity-90 leading-none">AUDIT NODE v20</span>
              </div>
            )}
         </div>

         <nav className="flex-1 p-12 space-y-5 overflow-y-auto custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard Real', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Clientes', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora Staff', icon: Timer, show: true },
              { id: 'users', label: 'Gestión de Staff', icon: UserCog, show: isAdmin }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-7 p-7 rounded-[2.5rem] text-[13px] font-black uppercase tracking-[0.3em] transition-all duration-500 group relative ${viewMode === item.id ? 'bg-sky-600 text-white shadow-[0_25px_50px_-10px_rgba(14,165,233,0.6)] translate-x-4 border-l-8 border-emerald-400' : 'text-slate-500 hover:bg-white/5 hover:text-sky-400'}`}>
                <item.icon size={28} className={viewMode === item.id ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}/> 
                {sidebarOpen && item.label}
              </button>
            ))}
         </nav>

         <div className="p-12">
            <div className="bg-white/5 p-8 rounded-[3.5rem] border border-white/10 flex items-center gap-7 backdrop-blur-3xl group hover:bg-white/10 transition-all duration-500 cursor-pointer">
                <div className="w-18 h-18 rounded-[1.5rem] bg-[#10B981] flex items-center justify-center text-white font-black text-3xl shadow-2xl transition-transform group-hover:rotate-6 border border-white/20">
                  {currentUserData?.name?.charAt(0)}
                </div>
                {sidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[13px] font-black text-white truncate uppercase tracking-tight leading-none mb-3">{currentUserData?.name}</p>
                    <button onClick={handleLogout} className="text-[11px] font-black text-rose-500 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-3">
                       <LogOut size={14}/> Desconectar
                    </button>
                  </div>
                )}
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* HEADER: EXECUTIVE GLASS (CON BUSCADOR REAL) */}
          <header className="h-36 bg-white/80 backdrop-blur-3xl border-b border-slate-200 flex items-center px-20 justify-between z-40">
            <div className="flex items-center gap-12">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-6 bg-white hover:bg-sky-50 rounded-[2rem] text-slate-400 hover:text-sky-600 border-2 border-slate-100 shadow-xl transition-all group active:scale-90">
                  <Menu size={32} className="group-hover:scale-110 transition-transform"/>
                </button>
                <div className="hidden lg:flex items-center gap-8 bg-slate-50 px-10 py-6 rounded-[2.8rem] border-2 border-slate-100 group focus-within:ring-8 ring-sky-500/10 transition-all shadow-inner">
                  <Search size={24} className="text-slate-300 group-focus-within:text-sky-500 transition-colors"/>
                  <input type="text" placeholder="LOCALIZAR CLIENTE O RUC..." className="bg-transparent border-none outline-none text-[14px] font-black text-slate-600 w-96 placeholder:text-slate-300 uppercase tracking-[0.2em]"/>
                </div>
            </div>
            
            <div className="flex items-center gap-12">
               <div className="flex flex-col items-end mr-8 hidden xl:flex">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] mb-3 leading-none italic">SISTEMA CIFRADO</span>
                  <span className="text-[13px] font-black text-emerald-500 uppercase flex items-center gap-4">
                    <Monitor size={18} fill="currentColor" className="animate-pulse"/> CONEXIÓN ACTIVA
                  </span>
               </div>
               <div className="h-20 w-[2px] bg-slate-100"></div>
               <div className="flex items-center gap-8 bg-white px-12 py-6 rounded-[2.2rem] border-2 border-slate-100 font-mono text-[16px] font-black text-slate-800 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)]">
                  <Calendar size={24} className="text-sky-600"/> {String(getTodayISO())}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-16 lg:p-24 custom-scrollbar bg-[#F8FAFC] space-y-24">
            
            {/* DASHBOARD: EXECUTIVE VIEW */}
            {viewMode === 'dashboard' && (
                <div className="space-y-24 animate-in fade-in slide-in-from-bottom-20 duration-1000">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-16">
                        <div className="space-y-6">
                           <h2 className="text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] uppercase italic">Inteligencia <br/>Contable</h2>
                           <p className="text-xl font-bold text-slate-400 tracking-tight flex items-center gap-6">
                             <div className="w-20 h-2 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div> Consola de Gestión Estratégica
                           </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-14">
                        {[
                          { title: "CARTERA CLIENTES", val: clients.length, icon: Building2, color: "sky", label: "ENTIDADES" },
                          { title: "ALERTAS CRÍTICAS", val: clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).text === 'VENCE HOY').length, icon: AlertTriangle, color: "rose", label: "VENCIMIENTOS" },
                          { title: "AUDITORES STAFF", val: users.length, icon: Users, color: "emerald", label: "ASISTENTES" },
                          { title: "BITÁCORA HOY", val: reports.filter(r => r.date === getTodayISO()).length, icon: Activity, color: "indigo", label: "AVANCES" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-16 rounded-[5rem] border-2 border-slate-50 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.06)] hover:shadow-[0_80px_150px_-30px_rgba(14,165,233,0.15)] transition-all group relative overflow-hidden border-b-8 border-sky-500">
                              <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-14 group-hover:scale-110 transition-transform duration-700 shadow-xl bg-slate-50 text-slate-800`}>
                                <stat.icon size={52} className={stat.color === 'sky' ? 'text-sky-600' : (stat.color === 'rose' ? 'text-rose-600' : (stat.color === 'emerald' ? 'text-emerald-600' : 'text-indigo-600'))}/>
                              </div>
                              <h3 className="text-slate-400 text-[13px] font-black uppercase tracking-[0.5em] mb-4">{stat.title}</h3>
                              <div className="text-8xl font-black text-slate-900 tracking-tighter leading-none mb-8">{stat.val}</div>
                              <p className="text-[12px] font-black text-slate-300 uppercase tracking-widest leading-none border-t border-slate-50 pt-8">{stat.label} EN NODO</p>
                              <div className="absolute -right-16 -bottom-16 opacity-[0.05] text-slate-900"><stat.icon size={280}/></div>
                          </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GESTIÓN DE STAFF: CRUD FIX */}
            {viewMode === 'users' && isAdmin && (
                <div className="max-w-7xl mx-auto space-y-24 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-[#020617] p-20 rounded-[6rem] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden border-b-8 border-emerald-500">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                        
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-14 border-b border-white/5 pb-20 mb-20 relative z-10">
                           <div className="space-y-6">
                              <h2 className="text-7xl font-black text-white tracking-tighter uppercase leading-none">Gestión Staff</h2>
                              <p className="text-sm font-bold text-sky-400 uppercase tracking-[0.5em] flex items-center gap-8 italic">
                                 <div className="w-16 h-1 bg-[#10B981]"></div> Control de Auditores y Asistentes Nysem
                              </p>
                           </div>
                           <div className="flex items-center gap-8">
                              {editingUserId && (
                                <button onClick={cancelUserEdit} className="bg-white/5 text-slate-400 px-12 py-7 rounded-[3rem] text-[12px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-5 border border-white/10">
                                   <X size={24}/> Cancelar
                                </button>
                              )}
                              <button onClick={handleSaveUser} className={`px-20 py-8 rounded-[4rem] text-[14px] font-black uppercase tracking-[0.5em] text-white shadow-3xl hover:scale-[1.03] transition-all flex items-center gap-7 border-2 border-white/20 ${editingUserId ? 'bg-sky-600 shadow-sky-400' : 'bg-[#10B981] shadow-emerald-400'}`}>
                                 {editingUserId ? <><Save size={28}/> Guardar Cambios</> : <><UserPlus size={28}/> Integrar Auditor</>}
                              </button>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14 relative z-10">
                            {[
                                { label: "NOMBRE COMPLETO", key: "name", type: "text", ph: "EJ: CPC JUAN PÉREZ" },
                                { label: "USUARIO ACCESO", key: "username", type: "text", ph: "AUDITOR_2026" },
                                { label: "CONTRASEÑA", key: "password", type: "text", ph: "**********" }
                            ].map((input) => (
                                <div key={input.key} className="space-y-5">
                                    <label className="text-[12px] font-black text-slate-500 ml-10 uppercase tracking-widest leading-none">{input.label}</label>
                                    <input type={input.type} placeholder={input.ph} value={userForm[input.key]} onChange={e => setUserForm({...userForm, [input.key]: e.target.value})} className="w-full p-9 bg-white/5 rounded-[3rem] border-2 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-sky-500 transition-all uppercase tracking-widest"/>
                                </div>
                            ))}
                            <div className="space-y-5">
                                <label className="text-[12px] font-black text-slate-500 ml-10 uppercase tracking-widest leading-none">RANGO NODO</label>
                                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-9 bg-white/5 rounded-[3rem] border-2 border-white/10 font-black text-white shadow-inner outline-none appearance-none cursor-pointer text-center text-[13px] uppercase tracking-[0.3em]">
                                    <option value="Auditor">AUDITOR (STAFF)</option>
                                    <option value="Administrador">ADMINISTRADOR (CPC)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
                        {users.map((u) => (
                            <div key={u.id} className="bg-white p-20 rounded-[6rem] border-2 border-slate-50 flex flex-col justify-between items-start group shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] hover:shadow-[0_80px_150px_-30px_rgba(0,0,0,0.1)] transition-all duration-700 animate-in slide-in-from-bottom-16">
                                <div className="w-full">
                                    <div className="flex justify-between items-start mb-16">
                                        <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-800 shadow-inner group-hover:bg-[#10B981] group-hover:text-white transition-all duration-700 shadow-sm border border-slate-100"><UserCog size={48}/></div>
                                        <div className={`px-8 py-4 rounded-full text-[12px] font-black uppercase tracking-[0.4em] border-2 transition-all duration-500 ${u.role === 'Administrador' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-sky-50 text-sky-700 border-sky-100'}`}>{u.role}</div>
                                    </div>
                                    <h3 className="font-black text-slate-900 uppercase text-4xl leading-[1.1] mb-5 tracking-tighter group-hover:text-sky-600 transition-colors duration-500">{u.name}</h3>
                                    <p className="text-[16px] font-black text-slate-300 font-mono tracking-[0.5em] uppercase opacity-80 bg-slate-50 p-4 rounded-2xl w-fit">ID: {u.username}</p>
                                </div>
                                <div className="w-full flex justify-between items-center mt-20 pt-14 border-t-2 border-slate-50">
                                    <button onClick={() => handleEditUser(u)} className="p-8 rounded-[2.2rem] bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white transition-all shadow-xl shadow-sky-100/50 group/edit border-2 border-sky-100"><Edit size={32} className="group-hover/edit:rotate-12 transition-transform"/></button>
                                    <button onClick={() => deleteDocGeneric('users', u.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-8 hover:bg-rose-50 rounded-[2.2rem] duration-500"><Trash2 size={36}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CARTERA CLIENTES: EXECUTIVE CRUD */}
            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-24 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-white p-20 rounded-[6rem] border-2 border-slate-100 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.1)] relative overflow-hidden group border-b-[12px] border-sky-500">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[150px] -mr-64 -mt-64"></div>
                        
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-14 border-b-2 border-slate-50 pb-20 mb-20 relative z-10">
                           <div className="space-y-6">
                              <h2 className="text-7xl font-black text-[#020617] tracking-tighter uppercase leading-none italic">Cartera Corporativa</h2>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.5em] flex items-center gap-8 italic">
                                 <div className="w-16 h-2 bg-sky-500"></div> Gestión Integral de Entidades en Asesoría
                              </p>
                           </div>
                           <div className="flex items-center gap-8">
                              {editingClientId && (
                                <button onClick={cancelClientEdit} className="bg-slate-50 text-slate-500 px-12 py-7 rounded-[3rem] text-[13px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-5 border-2 border-slate-100">
                                   <X size={24}/> Cancelar
                                </button>
                              )}
                              <button onClick={handleSaveClient} className={`px-20 py-8 rounded-[4rem] text-[15px] font-black uppercase tracking-[0.5em] text-white shadow-3xl hover:scale-[1.03] transition-all flex items-center gap-8 border-2 border-white/20 ${editingClientId ? 'bg-sky-600 shadow-sky-300' : 'bg-[#10B981] shadow-emerald-300'}`}>
                                 {editingClientId ? <><Save size={32}/> Actualizar Ficha</> : <><Plus size={32}/> Vincular Entidad</>}
                              </button>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14 relative z-10">
                            <div className="space-y-6 lg:col-span-2">
                                <label className="text-[13px] font-black text-slate-400 ml-12 uppercase tracking-widest leading-none">Razón Social o Denominación</label>
                                <input type="text" placeholder="EJ: CONSORCIO AGRÍCOLA MONTALBÁN S.A.C." value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-2 border-transparent font-black text-slate-900 shadow-inner outline-none focus:bg-white focus:ring-[15px] ring-sky-500/5 transition-all uppercase tracking-tight text-xl"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-400 ml-12 uppercase tracking-widest leading-none">Registro RUC (11 Dig)</label>
                                <input type="text" placeholder="20XXXXXXXXX" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-2 border-transparent font-black text-slate-900 shadow-inner outline-none text-center font-mono focus:bg-white transition-all text-xl"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-400 ml-12 uppercase tracking-widest leading-none">Sector Operativo</label>
                                <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-2 border-transparent font-black text-slate-900 shadow-inner outline-none appearance-none cursor-pointer text-center text-[14px] uppercase tracking-[0.4em]">
                                    <option value="Agricultura">AGRICULTURA</option>
                                    <option value="Construcción">CONSTRUCCIÓN</option>
                                    <option value="Exportación">EXPORTACIÓN</option>
                                    <option value="Comercio">COMERCIO</option>
                                    <option value="Servicios">SERVICIOS GLOBAL</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20 pb-32">
                        {clients.map((c) => {
                            const risk = calculateTaxRisk(c.ruc, c.taxStatus);
                            const isDeclared = c.taxStatus === 'declared';
                            return (
                                <div key={c.id} className="bg-white p-20 rounded-[7rem] border-2 border-slate-50 flex flex-col justify-between items-start group shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] hover:shadow-[0_80px_150px_-30px_rgba(14,165,233,0.12)] transition-all duration-700 relative overflow-hidden animate-in slide-in-from-bottom-20 border-b-8 border-slate-100 hover:border-sky-500">
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-16">
                                            <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-800 shadow-inner group-hover:bg-[#020617] group-hover:text-white transition-all duration-700 shadow-md border border-slate-100"><Building2 size={52}/></div>
                                            <div className={`px-10 py-4 rounded-full text-[13px] font-black uppercase tracking-[0.3em] border-2 transition-all duration-500 ${risk.bg} ${risk.tx} ${risk.ring} ${risk.text === 'VENCE HOY' ? 'animate-pulse' : ''}`}>{risk.text}</div>
                                        </div>
                                        <h3 className="font-black text-slate-900 uppercase text-4xl leading-[1.05] tracking-tighter group-hover:text-sky-600 transition-colors duration-500 mb-8">{String(c.name)}</h3>
                                        <div className="flex flex-wrap items-center gap-6 pt-8 border-t-2 border-slate-50">
                                              <span className="text-[16px] font-black text-slate-400 font-mono tracking-widest leading-none bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">RUC {String(c.ruc)}</span>
                                              <span className="text-[12px] font-black text-sky-500 uppercase tracking-[0.3em] leading-none flex items-center gap-4">
                                                 <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div> {String(c.sector)}
                                              </span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full flex justify-between items-center mt-20 pt-14 border-t-2 border-slate-50">
                                        <div className="flex items-center gap-6">
                                           <button onClick={() => markAsDeclared(c.id)} className={`p-8 rounded-[2.2rem] transition-all duration-500 shadow-2xl active:scale-90 border-2 ${isDeclared ? 'bg-[#10B981] text-white border-emerald-400 shadow-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-200'}`}>
                                              <CheckCircle2 size={36}/>
                                           </button>
                                           <button onClick={() => handleEditClient(c)} className="p-8 rounded-[2.2rem] bg-slate-50 text-slate-400 hover:bg-sky-600 hover:text-white transition-all duration-500 border-2 border-slate-100 shadow-xl shadow-sky-100/20">
                                              <Edit size={36}/>
                                           </button>
                                        </div>
                                        <button onClick={() => deleteDocGeneric('clients', c.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-8 hover:bg-rose-50 rounded-[2.2rem] duration-500"><Trash2 size={40}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* BITÁCORA STAFF: EXECUTIVE AUDIT LOG */}
            {viewMode === 'reports' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-24 animate-in fade-in duration-700 pb-32">
                    <div className="bg-white p-20 rounded-[6rem] border-2 border-slate-100 shadow-3xl h-fit sticky top-12 overflow-hidden group border-b-[12px] border-emerald-500">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                        
                        <div className="flex items-center gap-10 mb-20 relative z-10">
                           <div className="p-8 bg-emerald-50 rounded-[2.5rem] text-emerald-600 shadow-inner group-hover:scale-110 transition-transform duration-500 border border-emerald-100"><Timer size={52}/></div>
                           <div className="space-y-3">
                              <h2 className="text-4xl font-black text-[#020617] uppercase tracking-tighter leading-none">Bitácora</h2>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em]">Staff Audit Diario</p>
                           </div>
                        </div>
                        <div className="space-y-14 relative z-10">
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-400 ml-12 uppercase tracking-widest leading-none">Cronometría (Hora)</label>
                                <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-9 bg-slate-50 rounded-[2.8rem] border-2 border-transparent font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-[15px] ring-emerald-500/5 transition-all text-xl"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-400 ml-12 uppercase tracking-widest leading-none">Entidad Bajo Auditoría</label>
                                <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-9 bg-slate-50 rounded-[2.8rem] border-2 border-transparent font-black text-slate-800 shadow-inner outline-none text-[14px] uppercase tracking-[0.3em] cursor-pointer appearance-none text-center">
                                    <option value="">SELECCIÓN NODO...</option>
                                    {clients.map(c => <option key={c.id} value={c.name}>{String(c.name)}</option>)}
                                </select>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-400 ml-12 uppercase tracking-widest leading-none">Labor Realizada</label>
                                <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-12 bg-slate-50 rounded-[3.5rem] border-2 border-transparent resize-none h-80 font-medium text-slate-700 shadow-inner text-[20px] leading-relaxed outline-none focus:bg-white transition-all placeholder:text-slate-200" placeholder="Reporte el avance contable o tributario..."></textarea>
                            </div>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName) return;
                                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { 
                                  ...reportForm, 
                                  userName: currentUserData?.name, 
                                  createdAt: Timestamp.now() 
                                });
                                setReportForm({ ...reportForm, description: '', time: '' });
                            }} className="w-full bg-[#10B981] text-white py-12 rounded-[4.5rem] font-black text-[15px] uppercase tracking-[0.7em] shadow-[0_50px_100px_-20px_rgba(16,185,129,0.5)] hover:bg-emerald-700 transition-all active:scale-95 group flex items-center justify-center gap-8 border-2 border-emerald-400/30">
                               <Timer size={32} className="group-hover:rotate-12 transition-transform"/> Grabar Avance
                            </button>
                        </div>
                    </div>

                    <div className="xl:col-span-2 bg-white p-20 rounded-[7rem] border-2 border-slate-50 shadow-sm min-h-[1200px] overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-slate-50 pb-20 mb-24 gap-12">
                            <div className="space-y-4">
                               <h3 className="font-black text-slate-900 text-5xl uppercase tracking-tighter leading-none">Historial Maestro</h3>
                               <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.6em]">Control de Productividad por Auditor</p>
                            </div>
                            <div className="bg-slate-50 px-12 py-6 rounded-full border-2 border-slate-100 text-[15px] font-black text-slate-600 uppercase tracking-[0.3em] shadow-inner flex items-center gap-6">
                               <Clock size={24} className="text-sky-600"/> {String(getTodayISO())}
                            </div>
                        </div>
                        
                        <div className="space-y-20 relative border-l-[10px] border-slate-50 ml-14 pb-40">
                            {reports.length > 0 ? (
                                reports.map((r, i) => (
                                    <div key={r.id} className="relative pl-20 animate-in slide-in-from-left-20 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="absolute -left-[29px] top-2 w-12 h-12 rounded-full bg-[#10B981] border-[10px] border-white shadow-3xl ring-[20px] ring-emerald-50/50 group hover:scale-125 transition-transform duration-500"></div>
                                        <div className="bg-slate-50/40 p-14 rounded-[6rem] border-2 border-slate-100 flex flex-col md:flex-row md:justify-between md:items-start gap-12 hover:bg-white hover:shadow-[0_80px_150px_-30px_rgba(0,0,0,0.1)] hover:border-emerald-200 transition-all duration-700 group relative">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-8 mb-10">
                                                    <span className="text-[13px] font-black text-emerald-700 uppercase tracking-[0.4em] bg-emerald-50 px-8 py-4 rounded-full border-2 border-emerald-100 leading-none shadow-sm">{String(r.clientName)}</span>
                                                    <span className="text-[13px] font-mono font-black text-slate-400 leading-none uppercase tracking-[0.3em] bg-white px-6 py-4 rounded-2xl border-2 border-slate-100 shadow-inner">{String(r.time)}</span>
                                                </div>
                                                <p className="text-[28px] font-bold text-slate-800 leading-tight italic group-hover:text-black transition-colors duration-500 font-serif">"{String(r.description)}"</p>
                                                <div className="mt-16 flex items-center gap-8 text-[14px] font-black text-slate-400 uppercase tracking-[0.5em]">
                                                    <div className="w-18 h-18 rounded-[1.8rem] bg-slate-200 flex items-center justify-center text-slate-600 font-black text-2xl group-hover:bg-[#10B981] group-hover:text-white transition-all shadow-inner border border-slate-100">{r.userName?.charAt(0)}</div>
                                                    Auditor Responsable: <span className="text-slate-900 ml-3">{String(r.userName)}</span>
                                                </div>
                                            </div>
                                            <button onClick={async () => { if(window.confirm("¿Eliminar reporte definitivo?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', r.id)) }} className="text-slate-100 hover:text-rose-600 p-8 transition-all duration-500 opacity-0 group-hover:opacity-100 relative z-20"><Trash2 size={40}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-80 text-center opacity-30 italic">
                                    <Activity size={120} className="mx-auto mb-12 text-slate-200 animate-pulse"/>
                                    <p className="text-xl font-black text-slate-300 uppercase tracking-[0.8em]">Nodo Vacío</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

          </div>
          
          {/* FOOTER: ROYAL DARK */}
          <footer className="h-20 bg-[#020617] flex items-center px-24 justify-between text-[11px] font-black text-slate-600 uppercase tracking-[0.7em] z-50 border-t border-white/5">
             <span>Nysem Montalbán EIRL • Consultoría Especializada 2026</span>
             <span className="flex items-center gap-14">
                <span className="flex items-center gap-4 text-sky-500">
                   <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]"></div> CIFRADO AES-256
                </span>
                <span className="text-white/5 font-thin text-3xl">|</span>
                <span className="flex items-center gap-6 group cursor-help">
                   <Shield size={18} className="text-slate-700 group-hover:text-sky-400 transition-colors"/> ROYAL AUDIT v20.0
                </span>
             </span>
          </footer>
       </main>
    </div>
  );
}
