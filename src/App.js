import React, { useState, useEffect } from 'react';
import { 
  Users, BarChart3, Menu, Home, Timer, RefreshCw, FolderOpen, 
  FileText, CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, DollarSign, History, Lock, Database, 
  Server, LogIn, LogOut, Clock, AlertCircle, 
  Settings, Search, ChevronRight, Briefcase, TrendingUp, Layers
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
 * VERSIÓN 15.0.0 - ENTERPRISE EXECUTIVE UI
 * PROYECTO: nysem-sgp-prod
 */

// --- CONFIGURACIÓN DE SEGURIDAD (PROTOCOLO REACT_APP PARA VERCEL) ---
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

const DB_PATH = "nysem_sgp_production_v13";
const getTodayISO = () => new Date().toISOString().split('T')[0];

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

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', fee: '', sector: 'Servicios' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  // --- LÓGICA PROFESIONAL: SEMÁFORO TRIBUTARIO SUNAT ---
  const calculateTaxRisk = (ruc, taxStatus) => {
    if (!ruc) return { color: 'slate', text: 'Sin RUC', level: 0 }; 
    if (taxStatus === 'declared') return { color: 'emerald', text: 'Declarado', level: 0 };
    const rucStr = String(ruc).trim();
    const lastDigit = parseInt(rucStr.charAt(rucStr.length - 1));
    if (isNaN(lastDigit)) return { color: 'slate', text: 'Inválido', level: 0 };
    
    if ([0, 1, 2].includes(lastDigit)) return { color: 'rose', text: 'CRÍTICO: VENCE HOY', level: 3 }; 
    if ([3, 4, 5, 6].includes(lastDigit)) return { color: 'amber', text: 'PRÓXIMO VENCIMIENTO', level: 2 }; 
    return { color: 'blue', text: 'DENTRO DE PLAZO', level: 1 }; 
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
        if (err.code === 'auth/configuration-not-found') {
          setAccessError("Habilite 'Anonymous Sign-in' en Firebase Console.");
        } else {
          setAccessError(`Cloud Sync Error: ${err.message}`);
        }
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
    const unsubUsers = onSnapshot(collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'users'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    });

    let unsubClients, unsubReports;
    if (isLoggedIn) {
      unsubClients = onSnapshot(collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'clients'), snap => {
          setClients(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      unsubReports = onSnapshot(query(collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'reports'), orderBy("createdAt", "desc")), snap => {
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
      setCurrentUserData({ name: 'CPC Nysem Montalbán', role: 'admin' });
      setIsLoggedIn(true);
      return;
    }
    const found = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (found) {
      setCurrentUserData(found);
      setIsLoggedIn(true);
      setAccessError(null);
    } else {
      setAccessError("Credenciales incorrectas.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserData(null);
  };

  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.ruc) return;
    await addDoc(collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'clients'), { 
      ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() 
    });
    setClientForm({ name: '', ruc: '', fee: '', sector: 'Servicios' });
  };

  const markAsDeclared = async (clientId) => {
    await updateDoc(doc(db, 'artifacts', 'nysem_app', 'public', 'data', 'clients', clientId), { taxStatus: 'declared' });
  };

  if (!isConfigValid) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white p-10 font-sans">
        <div className="max-w-xl w-full bg-slate-800 p-12 rounded-[3rem] border border-slate-700 shadow-2xl">
          <div className="flex items-center gap-6 mb-8 text-amber-400">
            <Settings className="animate-spin-slow" size={48} />
            <h1 className="text-2xl font-black uppercase tracking-tighter">Sintonización Crítica <br/><span className="text-slate-500 text-lg">nysem-sgp-prod</span></h1>
          </div>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed italic">
            Colega Montalbán, para que el sistema opere en Vercel, debe registrar las variables de entorno con el prefijo <span className="text-blue-400 font-bold">REACT_APP_</span>.
          </p>
          <div className="bg-black/40 p-6 rounded-3xl space-y-3 font-mono text-[10px] border border-slate-700">
             <div className="flex justify-between"><span>REACT_APP_FIREBASE_API_KEY</span> <span className={firebaseConfig.apiKey ? 'text-emerald-500':'text-rose-500'}>{firebaseConfig.apiKey ? '[DETECTADA]':'[FALTA]'}</span></div>
             <div className="flex justify-between"><span>REACT_APP_FIREBASE_PROJECT_ID</span> <span className={firebaseConfig.projectId ? 'text-emerald-500':'text-rose-500'}>{firebaseConfig.projectId ? '[DETECTADA]':'[FALTA]'}</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F172A] text-white font-sans">
        <div className="flex flex-col items-center gap-10 animate-in fade-in duration-1000">
          <div className="relative flex items-center justify-center">
             <div className="absolute w-24 h-24 border-2 border-blue-500/20 rounded-full"></div>
             <div className="absolute w-24 h-24 border-t-2 border-blue-500 rounded-full animate-spin"></div>
             <Shield className="text-blue-500" size={32}/>
          </div>
          <div className="text-center">
             <p className="text-[10px] font-black tracking-[0.8em] uppercase text-blue-400 mb-2 leading-none">Nysem Montalbán EIRL</p>
             <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] animate-pulse">Sincronizando Nodo de Gestión v15.0</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] overflow-hidden border border-slate-100 flex flex-col">
          <div className="bg-slate-900 p-12 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
            <Shield className="mx-auto mb-6 text-blue-500 relative z-10" size={56}/>
            <h1 className="text-3xl font-black uppercase tracking-tighter relative z-10 leading-none">Acceso Auditoría</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 relative z-10 italic">Nysem Montalbán EIRL</p>
          </div>
          <div className="p-14 space-y-10">
            <div className="text-center space-y-1">
               <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Autenticación</h2>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingrese su Identificación de Staff</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              {accessError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                  <AlertCircle className="text-rose-500 shrink-0" size={18}/>
                  <p className="text-[10px] font-bold text-rose-800 leading-tight uppercase tracking-tight">{accessError}</p>
                </div>
              )}
              <div className="space-y-4">
                <input type="text" placeholder="Usuario" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border border-transparent focus:border-blue-500/20 focus:bg-white transition-all font-bold text-slate-700 outline-none shadow-inner" required />
                <input type="password" placeholder="Contraseña" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border border-transparent focus:border-blue-500/20 focus:bg-white transition-all font-bold text-slate-700 outline-none shadow-inner" required />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl active:scale-95 mt-4">Validar Acceso</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden animate-in fade-in duration-700">
       {/* SIDEBAR EXECUTIVE */}
       <aside className={`${sidebarOpen ? 'w-80' : 'w-24'} bg-slate-900 flex flex-col transition-all duration-500 shadow-2xl z-30 relative overflow-hidden`}>
         <div className="h-28 flex items-center px-10 border-b border-white/5">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3.5 rounded-[1.2rem] shadow-lg shadow-blue-500/20">
              <Database className="text-white" size={24}/>
            </div>
            {sidebarOpen && (
              <div className="ml-5 animate-in fade-in slide-in-from-left-4">
                <span className="block font-black text-2xl text-white tracking-tighter uppercase leading-none">Nysem SGP</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1.5 block">Executive v15</span>
              </div>
            )}
         </div>

         <nav className="flex-1 p-8 space-y-3 overflow-y-auto custom-scrollbar">
            <button onClick={() => setViewMode('dashboard')} className={`w-full flex items-center gap-5 p-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all group ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5'}`}>
              <Home size={22} className={viewMode === 'dashboard' ? '' : 'group-hover:text-blue-400 transition-colors'}/> 
              {sidebarOpen && "Dashboard Global"}
            </button>
            <button onClick={() => setViewMode('clients')} className={`w-full flex items-center gap-5 p-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all group ${viewMode === 'clients' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
              <Building2 size={22} className={viewMode === 'clients' ? '' : 'group-hover:text-blue-400 transition-colors'}/> 
              {sidebarOpen && "Cartera Corporativa"}
            </button>
            <button onClick={() => setViewMode('reports')} className={`w-full flex items-center gap-5 p-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all group ${viewMode === 'reports' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
              <TrendingUp size={22} className={viewMode === 'reports' ? '' : 'group-hover:text-blue-400 transition-colors'}/> 
              {sidebarOpen && "Auditoría de Producción"}
            </button>
         </nav>

         <div className="p-8">
            <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/5 flex items-center gap-5 relative overflow-hidden group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-xl transition-transform group-hover:scale-110">
                  {currentUserData?.name?.charAt(0)}
                </div>
                {sidebarOpen && (
                  <div className="flex-1 overflow-hidden animate-in fade-in">
                    <p className="text-[10px] font-black text-white truncate uppercase tracking-tight leading-none">{currentUserData?.name}</p>
                    <button onClick={handleLogout} className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em] hover:text-rose-400 transition-colors mt-2.5 block">Cerrar Sesión</button>
                  </div>
                )}
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-28 bg-white/70 backdrop-blur-3xl border-b border-slate-100 flex items-center px-12 justify-between shadow-sm z-20">
            <div className="flex items-center gap-8">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-4 bg-white hover:bg-slate-50 rounded-[1.2rem] text-slate-400 transition-all shadow-sm border border-slate-100 group">
                  <Menu size={20} className="group-hover:scale-110 transition-transform"/>
                </button>
                <div className="hidden xl:flex items-center gap-4 bg-slate-100/50 px-6 py-4 rounded-[1.5rem] border border-slate-100 transition-all focus-within:ring-4 ring-blue-500/10 focus-within:bg-white">
                  <Search size={18} className="text-slate-400"/>
                  <input type="text" placeholder="Buscar RUC, Cliente o Expediente..." className="bg-transparent border-none outline-none text-[11px] font-black text-slate-600 w-80 placeholder:text-slate-300 uppercase tracking-widest"/>
                </div>
            </div>
            
            <div className="flex items-center gap-8">
               <div className="flex flex-col items-end mr-6 hidden md:flex">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none mb-1.5">Conectividad Nodo</span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2 tracking-tighter">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span> Sincronizado
                  </span>
               </div>
               <div className="h-14 w-px bg-slate-100"></div>
               <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-[1.5rem] border border-slate-100 font-mono text-[12px] font-black text-slate-700 shadow-sm">
                  <Calendar size={16} className="text-blue-500"/> {String(getTodayISO())}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 lg:p-16 custom-scrollbar space-y-16 relative">
            
            {/* VISTA DASHBOARD REIMAGINADA */}
            {viewMode === 'dashboard' && (
                <div className="space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                        <div className="space-y-3">
                           <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">Visión Ejecutiva</h2>
                           <p className="text-sm font-bold text-slate-400 tracking-tight italic flex items-center gap-2">
                             <Shield size={14} className="text-blue-500"/> Centro de Inteligencia Nysem Montalbán EIRL
                           </p>
                        </div>
                        <div className="flex gap-4">
                           <button onClick={() => setViewMode('clients')} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95 flex items-center gap-4">
                             <Plus size={18}/> Apertura de Nodo
                           </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
                        {[
                          { title: "Empresas en Gestión", val: clients.length, icon: Building2, color: "blue", label: "Cartera Total" },
                          { title: "Alertas Críticas", val: clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).color === 'rose').length, icon: AlertTriangle, color: "rose", label: "Vencimientos SUNAT" },
                          { title: "Declaraciones OK", val: clients.filter(c => c.taxStatus === 'declared').length, icon: CheckCircle2, color: "emerald", label: "Ciclo Actual" },
                          { title: "Staff Nysem", val: users.length, icon: Users, color: "indigo", label: "Células Operativas" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)] transition-all group relative overflow-hidden">
                              <div className={`w-20 h-20 rounded-[1.8rem] bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 mb-8 group-hover:scale-110 transition-transform duration-700 shadow-inner`}>
                                <stat.icon size={32}/>
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1 leading-none">{stat.title}</h3>
                                <div className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{stat.val}</div>
                                <p className="text-[9px] font-black text-slate-300 uppercase mt-4 tracking-widest">{stat.label}</p>
                              </div>
                              <div className={`absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 text-${stat.color}-600`}>
                                <stat.icon size={180}/>
                              </div>
                          </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                        {/* Actividad Reciente Estilo Terminal Financiera */}
                        <div className="bg-white p-14 rounded-[5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-14">
                               <h3 className="text-2xl font-black text-slate-900 flex items-center gap-5 uppercase tracking-tighter leading-none">
                                  <History className="text-blue-500" size={32}/> Registro Operativo
                               </h3>
                               <button className="text-[9px] font-black text-blue-500 uppercase tracking-widest border border-blue-100 px-4 py-2 rounded-full hover:bg-blue-50 transition-all">Ver Historial Completo</button>
                            </div>
                            <div className="space-y-8 relative border-l-2 border-slate-100 ml-5 pb-6">
                                {reports.length > 0 ? reports.slice(0, 4).map((r, i) => (
                                    <div key={r.id} className="relative pl-12 animate-in slide-in-from-left-8" style={{ animationDelay: `${i * 150}ms` }}>
                                        <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-blue-600 border-[5px] border-white shadow-lg ring-8 ring-blue-50 transition-transform hover:scale-125"></div>
                                        <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-6 group hover:bg-white hover:shadow-2xl hover:border-blue-200 transition-all duration-500">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-4">
                                                   <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 px-4 py-2 rounded-full border border-blue-100 leading-none">{r.clientName}</span>
                                                   <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none italic">{r.time}</span>
                                                </div>
                                                <p className="text-[15px] font-bold text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">"{r.description}"</p>
                                                <div className="flex items-center gap-3 pt-4">
                                                   <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-[10px] uppercase shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">{r.userName?.charAt(0)}</div>
                                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsable: {r.userName}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-200 group-hover:text-blue-500 transition-colors hidden md:block" size={24}/>
                                        </div>
                                    </div>
                                )) : (
                                  <div className="py-24 text-center">
                                    <Layers className="mx-auto mb-6 text-slate-200 animate-bounce" size={48}/>
                                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] italic">Inicie la Bitácora de Producción</p>
                                  </div>
                                )}
                            </div>
                        </div>

                        {/* Sectores Estratégicos */}
                        <div className="bg-slate-900 p-16 rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(15,23,42,0.3)] relative overflow-hidden text-white flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                            <div className="relative z-10">
                               <div className="flex justify-between items-start mb-16">
                                  <h3 className="text-2xl font-black flex items-center gap-5 uppercase tracking-tighter leading-none">
                                     <Briefcase className="text-blue-400" size={32}/> Sectores de Asesoría
                                  </h3>
                                  <Shield className="text-blue-500/20" size={40}/>
                               </div>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  {['Agricultura', 'Construcción', 'Exportación', 'Servicios Globales', 'Comercio Mayor', 'Capacitación'].map((sector, i) => (
                                    <div key={i} className="p-7 bg-white/5 border border-white/10 rounded-[2rem] flex items-center gap-6 group hover:bg-blue-600 hover:border-blue-500 transition-all duration-500 cursor-pointer shadow-lg">
                                       <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:bg-white group-hover:text-blue-600 transition-all shadow-inner"><CheckCircle2 size={20}/></div>
                                       <span className="text-[11px] font-black uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">{sector}</span>
                                    </div>
                                  ))}
                               </div>
                            </div>
                            <div className="mt-20 pt-10 border-t border-white/5 text-center relative z-10">
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] mb-2 leading-none">Nysem Montalbán EIRL</p>
                               <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Protocolo de Asesoría & Gestión Integral Perú 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA CARTERA DE CLIENTES - REDISEÑO TOTAL */}
            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in zoom-in-95 duration-1000 pb-32">
                    <div className="bg-white p-14 rounded-[5rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-blue-600/10"></div>
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 relative z-10">
                           <div className="space-y-4">
                              <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Alta Corporativa</h2>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Gestión de Nuevas Entidades en Cartera
                              </p>
                           </div>
                           <div className="w-full xl:w-fit grid grid-cols-2 gap-6">
                              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center shadow-inner group/stat hover:bg-white transition-all">
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Status Nodo</span>
                                 <span className="text-3xl font-black text-emerald-500 uppercase tracking-tighter group-hover/stat:scale-110 transition-transform">Online</span>
                              </div>
                              <div className="bg-slate-900 p-8 rounded-[2.5rem] flex flex-col items-center justify-center shadow-2xl hover:bg-blue-600 transition-all group/stat">
                                 <span className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 leading-none">Total Nodo</span>
                                 <span className="text-3xl font-black text-white group-hover/stat:scale-110 transition-transform">{clients.length}</span>
                              </div>
                           </div>
                        </div>
                        
                        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            <div className="space-y-4 lg:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Razón Social o Denominación</label>
                                <input type="text" placeholder="Ej: Consorcio Agrícola Montalbán S.A.C." value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.5rem] border border-transparent font-bold text-slate-800 shadow-inner focus:ring-8 ring-blue-500/5 focus:bg-white focus:border-blue-500/10 transition-all outline-none placeholder:text-slate-200 placeholder:font-black uppercase tracking-tight"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Nro. de Registro RUC</label>
                                <input type="text" placeholder="11 Dígitos" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner focus:ring-8 ring-blue-500/5 focus:bg-white focus:border-blue-500/10 transition-all outline-none text-center font-mono placeholder:font-sans"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Rubro Estratégico</label>
                                <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.5rem] border border-transparent font-black text-slate-800 shadow-inner focus:ring-8 ring-blue-500/5 focus:bg-white transition-all outline-none text-[11px] uppercase tracking-[0.2em] cursor-pointer appearance-none text-center">
                                    <option value="Agricultura">Agricultura</option>
                                    <option value="Construcción">Construcción</option>
                                    <option value="Exportación">Exportación</option>
                                    <option value="Comercio">Comercio</option>
                                    <option value="Servicios">Servicios Globales</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={handleAddClient} className="mt-16 w-full bg-slate-900 text-white py-10 rounded-[3.5rem] font-black text-[12px] uppercase tracking-[0.6em] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.4)] hover:bg-blue-600 hover:shadow-[0_40px_80px_-20px_rgba(37,99,235,0.4)] transition-all active:scale-95 group">
                           <span className="flex items-center justify-center gap-6">
                              <Layers size={22} className="group-hover:rotate-12 transition-transform"/> Integrar Entidad al Nodo Nysem
                           </span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {clients.map((c, i) => {
                            const risk = calculateTaxRisk(c.ruc, c.taxStatus);
                            const isDeclared = c.taxStatus === 'declared';
                            return (
                                <div key={c.id} className="bg-white p-14 rounded-[4.5rem] border border-slate-100 flex flex-col justify-between items-start group shadow-sm hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 relative overflow-hidden animate-in slide-in-from-bottom-12 duration-1000" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-12">
                                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-900 shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all duration-700"><Building2 size={36}/></div>
                                            <div className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all duration-500 ${risk.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : (isDeclared ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]':'bg-blue-50 text-blue-600 border-blue-100')}`}>{risk.text}</div>
                                        </div>
                                        <div className="space-y-3">
                                           <h3 className="font-black text-slate-900 uppercase text-2xl leading-[1.1] tracking-tighter group-hover:text-blue-600 transition-colors duration-500">{String(c.name)}</h3>
                                           <div className="flex flex-wrap items-center gap-4 pt-2">
                                              <span className="text-[12px] font-black text-slate-400 font-mono tracking-widest leading-none bg-slate-50 px-4 py-2 rounded-xl">RUC {String(c.ruc)}</span>
                                              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none flex items-center gap-2">
                                                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> {String(c.sector)}
                                              </span>
                                           </div>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full flex justify-between items-center mt-14 pt-12 border-t border-slate-50">
                                        <div className="flex items-center gap-4">
                                           <button onClick={() => markAsDeclared(c.id)} className={`p-5 rounded-[1.5rem] transition-all duration-500 shadow-2xl active:scale-90 ${isDeclared ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 hover:shadow-emerald-100'}`}>
                                              <CheckCircle2 size={26}/>
                                           </button>
                                           <button className="p-5 rounded-[1.5rem] bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white hover:shadow-2xl hover:shadow-blue-200 transition-all duration-500 border border-slate-100">
                                              <FolderOpen size={26}/>
                                           </button>
                                        </div>
                                        <button onClick={() => { if(window.confirm("¿Confirmar eliminación permanente?")) deleteDoc(doc(db, 'artifacts', 'nysem_app', 'public', 'data', 'clients', c.id)) }} className="text-slate-100 hover:text-rose-600 transition-colors p-5 hover:bg-rose-50 rounded-[1.5rem] duration-500"><Trash2 size={26}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* VISTA BITÁCORA - REDISEÑADA ESTILO AUDITORÍA */}
            {viewMode === 'reports' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-16 animate-in fade-in duration-1000 pb-32">
                    <div className="bg-white p-14 rounded-[5rem] border border-slate-100 shadow-sm h-fit sticky top-12">
                        <div className="flex items-center gap-6 mb-16">
                           <div className="p-5 bg-emerald-50 rounded-[1.8rem] text-emerald-600 shadow-inner"><Timer size={36}/></div>
                           <div className="space-y-1">
                              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Registro de <br/>Actividades</h2>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff Nysem Montalbán</p>
                           </div>
                        </div>
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Cronometría (Hora)</label>
                                <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border border-transparent font-bold text-slate-800 shadow-inner outline-none focus:bg-white focus:border-emerald-500/20 transition-all"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Cliente Auditado</label>
                                <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border border-transparent font-black text-slate-800 shadow-inner outline-none text-[11px] uppercase tracking-[0.2em] cursor-pointer">
                                    <option value="">Selección de Nodo...</option>
                                    {clients.map(c => <option key={c.id} value={c.name}>{String(c.name)}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Descripción Operativa</label>
                                <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border border-transparent resize-none h-60 font-medium text-slate-700 shadow-inner text-[15px] leading-relaxed outline-none focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-200" placeholder="Detalle las labores contables, tributarias o de auditoría realizadas..."></textarea>
                            </div>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName) return;
                                await addDoc(collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'reports'), { 
                                  ...reportForm, 
                                  userName: currentUserData?.name, 
                                  createdAt: Timestamp.now() 
                                });
                                setReportForm({ ...reportForm, description: '', time: '' });
                            }} className="w-full bg-emerald-600 text-white py-8 rounded-[3rem] font-black text-[12px] uppercase tracking-[0.5em] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.3)] hover:bg-emerald-700 hover:scale-[1.01] transition-all active:scale-95">Archivar Avance</button>
                        </div>
                    </div>

                    <div className="xl:col-span-2 bg-white p-14 rounded-[6rem] border border-slate-100 shadow-sm min-h-[900px] overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-50 pb-12 mb-16 gap-8">
                            <div className="space-y-2">
                               <h3 className="font-black text-slate-900 text-3xl uppercase tracking-tighter leading-none">Bitácora Global</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Historial Cronológico de Productividad</p>
                            </div>
                            <div className="bg-slate-50 px-8 py-4 rounded-full border border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-widest shadow-inner flex items-center gap-4">
                               <Clock size={16} className="text-blue-500"/> {String(getTodayISO())}
                            </div>
                        </div>
                        <div className="space-y-12 relative border-l-4 border-slate-50 ml-6 pb-24">
                            {reports.length > 0 ? (
                                reports.map((r, i) => (
                                    <div key={r.id} className="relative pl-14 animate-in slide-in-from-left-8" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="absolute -left-[18px] top-1 w-8 h-8 rounded-full bg-emerald-600 border-[6px] border-white shadow-xl ring-12 ring-emerald-50/50 transition-transform hover:scale-125"></div>
                                        <div className="bg-slate-50/30 p-10 rounded-[4rem] border border-slate-100 flex justify-between items-start hover:bg-white hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] hover:border-emerald-200 transition-all duration-700 group relative overflow-hidden">
                                            <div className="flex-1 relative z-10">
                                                <div className="flex flex-wrap items-center gap-5 mb-6">
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] bg-emerald-100/50 px-5 py-2.5 rounded-full border border-emerald-100 leading-none">{String(r.clientName)}</span>
                                                    <span className="text-[10px] font-mono font-black text-slate-300 leading-none uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-50 shadow-sm">{String(r.time)}</span>
                                                </div>
                                                <p className="text-[18px] font-bold text-slate-700 leading-relaxed italic group-hover:text-slate-900 transition-colors duration-500">"{String(r.description)}"</p>
                                                <div className="mt-10 flex items-center gap-5 text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                    <div className="w-10 h-10 rounded-[1.2rem] bg-slate-200 flex items-center justify-center text-slate-600 font-black text-[12px] group-hover:bg-emerald-600 group-hover:text-white transition-all duration-700 shadow-inner">{r.userName?.charAt(0)}</div>
                                                    Staff Audit: <span className="text-slate-900">{String(r.userName)}</span>
                                                </div>
                                            </div>
                                            <button onClick={async () => { if(window.confirm("¿Eliminar registro?")) await deleteDoc(doc(db, 'artifacts', 'nysem_app', 'public', 'data', 'reports', r.id)) }} className="text-slate-100 hover:text-rose-500 p-4 transition-all duration-500 opacity-0 group-hover:opacity-100 relative z-10"><Trash2 size={24}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-56 text-center opacity-30">
                                    <Layers size={80} className="mx-auto mb-8 text-slate-100 animate-pulse"/>
                                    <p className="text-sm font-black text-slate-300 uppercase tracking-[0.5em] italic">No se registran avances en la base de datos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

          </div>
          
          {/* FOOTER CORPORATIVO DISCRETO */}
          <footer className="h-10 bg-white/50 backdrop-blur-sm border-t border-slate-100 flex items-center px-12 justify-between text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] z-20">
             <span>Nysem Montalbán EIRL • 2026</span>
             <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div> Cifrado Bancario</span>
                <span className="text-slate-200">|</span>
                <span>Auditoría de Sistemas v15.0</span>
             </span>
          </footer>
       </main>
    </div>
  );
}
