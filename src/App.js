import React, { useState, useEffect } from 'react';
import { 
  Users, BarChart3, Menu, Home, Timer, RefreshCw, 
  CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, Database, UserCog, 
  LogOut, Clock, AlertCircle, Settings, ShieldCheck, 
  Wifi, Zap, Activity
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
 * VERSIÓN 15.0.0 - EJECUCIÓN DIRECTA & SYNC INTEGRITY
 * Diseñado para: CPC Nysem Montalbán
 */

const getFirebaseConfig = () => {
  // Prioridad 1: Entorno de Simulación (Canvas)
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try { return JSON.parse(__firebase_config); } catch (e) { return null; }
  }
  // Prioridad 2: Variables de Entorno (Vercel)
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
const appId = "nysem_sgp_production_v15"; 

let app, auth, db;
const isConfigValid = !!(firebaseConfig && firebaseConfig.apiKey);

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

export default function App() {
  const [fbUser, setFbUser] = useState(null); 
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

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', sector: 'Servicios' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- LÓGICA DE AUTENTICACIÓN (HOTFIX V15) ---
  useEffect(() => {
    if (!isConfigValid) {
      setIsInitializing(false);
      return;
    }
    const performAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        if (err.code === 'auth/configuration-not-found') {
          setAccessError("CONFIGURACIÓN REQUERIDA: Habilite 'Acceso Anónimo' en Firebase Console.");
        } else {
          setAccessError(`Error de Sincronización: ${err.message}`);
        }
      } finally {
        setIsInitializing(false);
      }
    };
    performAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  // --- SINCRONIZACIÓN DE DATOS EN TIEMPO REAL ---
  useEffect(() => {
    if (!fbUser || !db) return;

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
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
      setAccessError("Acceso denegado. Verifique credenciales.");
    }
  };

  const calculateTaxRisk = (ruc, taxStatus) => {
    if (taxStatus === 'declared') return { color: 'emerald', text: 'DECLARADO', bg: 'bg-emerald-50' };
    const lastDigit = parseInt(String(ruc).slice(-1));
    if ([0, 1, 2].includes(lastDigit)) return { color: 'rose', text: 'VENCE HOY', bg: 'bg-rose-50' };
    return { color: 'blue', text: 'EN PLAZO', bg: 'bg-blue-50' };
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617]">
        <RefreshCw className="text-[#0EA5E9] animate-spin" size={60} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] p-6 font-sans">
        <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-white">
          <div className="bg-[#020617] p-12 text-center text-white border-b-8 border-[#10B981]">
            <Shield className="mx-auto mb-6 text-[#0EA5E9]" size={80}/>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">MASTER LOGIN</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.8em] mt-2 leading-none">Asesoría & Capacitación Empresarial</p>
          </div>
          <div className="p-12 space-y-8 bg-white">
            <form onSubmit={handleLogin} className="space-y-6">
              {accessError && <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-rose-600 font-bold text-center text-xs uppercase">{accessError}</div>}
              <input type="text" placeholder="ID USUARIO" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 font-black text-slate-900 focus:border-[#0EA5E9] outline-none transition-all uppercase text-xl shadow-inner" required />
              <input type="password" placeholder="CLAVE" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 font-black text-slate-900 focus:border-[#0EA5E9] outline-none transition-all uppercase text-xl shadow-inner" required />
              <button type="submit" className="w-full bg-[#020617] text-white py-6 rounded-3xl font-black text-lg uppercase tracking-widest hover:bg-[#0EA5E9] transition-all shadow-xl active:scale-95">INGRESAR</button>
            </form>
          </div>
        </div>
        {!isConfigValid && (
          <div className="mt-8 flex items-center gap-3 text-amber-600 font-bold text-xs uppercase tracking-widest bg-amber-50 p-4 rounded-full border border-amber-200 animate-pulse">
            <AlertTriangle size={20}/> Nube Desconectada: Configure Vercel Env
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
       {notification && (
         <div className="fixed top-6 right-6 z-[100] bg-[#10B981] text-white p-6 rounded-3xl shadow-2xl border-4 border-white flex items-center gap-4 animate-in slide-in-from-right-10">
            <BadgeCheck size={28}/><span className="text-sm font-black uppercase tracking-widest">{notification.msg}</span>
         </div>
       )}

       <aside className={`${sidebarOpen ? 'w-[320px]' : 'w-24'} bg-[#020617] flex flex-col transition-all duration-500 z-50 border-r border-white/5 shadow-2xl shrink-0`}>
         <div className="h-32 flex items-center px-8 border-b border-white/5 overflow-hidden">
            <Database className="text-[#10B981] shrink-0" size={36}/>
            {sidebarOpen && (
              <div className="ml-4 animate-in fade-in">
                <span className="block font-black text-3xl text-white tracking-tighter uppercase italic leading-none">NYSEM</span>
                <span className="text-[9px] font-black text-[#0EA5E9] uppercase tracking-[0.5em] mt-2 block">SGP v15.0</span>
              </div>
            )}
         </div>
         <nav className="flex-1 p-6 space-y-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Nysem', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora Staff', icon: Timer, show: true },
              { id: 'staff', label: 'Gestión Personal', icon: UserCog, show: currentUserData?.role === 'admin' }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-4 p-5 rounded-3xl text-[13px] font-black uppercase tracking-widest transition-all ${viewMode === item.id ? 'bg-[#0EA5E9] text-white shadow-lg shadow-[#0EA5E9]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={26} className="shrink-0"/> {sidebarOpen && item.label}
              </button>
            ))}
         </nav>
         <div className="p-6">
            <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center justify-center gap-4 p-5 rounded-3xl bg-rose-600/10 text-rose-500 font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
               <LogOut size={26}/> {sidebarOpen && "SALIR"}
            </button>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-28 bg-white border-b-4 border-slate-100 flex items-center px-12 justify-between z-40 shadow-sm shrink-0">
            <div className="flex items-center gap-8">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-4 bg-slate-50 hover:bg-[#0EA5E9]/10 rounded-2xl text-slate-400 hover:text-[#0EA5E9] border-2 border-slate-100 transition-all active:scale-90 shadow-sm">
                  <Menu size={32}/>
                </button>
                <div className="hidden md:block">
                    <h2 className="text-3xl font-black text-[#020617] tracking-tighter uppercase italic leading-none">{viewMode}</h2>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase mt-2 italic">Nysem Montalbán EIRL</p>
                </div>
            </div>
            <div className="flex items-center gap-8">
               <div className="hidden lg:flex flex-col items-end">
                  <span className={`text-[15px] font-black uppercase flex items-center gap-3 ${isConfigValid ? 'text-[#10B981]' : 'text-amber-500'}`}>
                    <Zap size={22} fill="currentColor" className="animate-pulse"/> {isConfigValid ? "Sincronización Activa" : "Modo Offline"}
                  </span>
               </div>
               <div className="h-16 bg-[#020617] px-8 py-3 rounded-2xl font-mono text-xl font-black text-[#0EA5E9] shadow-inner flex items-center gap-4">
                  <Calendar size={28}/> {getTodayISO()}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar p-12">
            <div className="max-w-[1600px] mx-auto space-y-12 pb-24">
            
              {viewMode === 'dashboard' && (
                  <div className="space-y-12 animate-in fade-in duration-700">
                      <div className="space-y-4 border-l-[16px] border-[#0EA5E9] pl-10">
                         <h1 className="text-7xl font-black text-[#020617] tracking-tighter leading-none uppercase italic">Control <br/>Maestro</h1>
                         <p className="text-2xl font-bold text-slate-400 tracking-tight flex items-center gap-6 italic">
                           <div className="w-20 h-2 bg-[#10B981] rounded-full shadow-[0_0_15px_#10B981]"></div> Gestión de Producción Contable
                         </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                          {[
                            { title: "CARTERA CLIENTES", val: clients.length, icon: Building2, color: "#0EA5E9" },
                            { title: "VENCIMIENTOS HOY", val: clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).text === 'VENCE HOY').length, icon: AlertTriangle, color: "#F43F5E" },
                            { title: "STAFF AUDITOR", val: users.length, icon: Users, color: "#10B981" },
                            { title: "REPORTES HOY", val: reports.filter(r => r.date === getTodayISO()).length, icon: Activity, color: "#6366F1" }
                          ].map((stat, i) => (
                            <div key={i} className="bg-white p-8 rounded-[3.5rem] shadow-xl border-2 border-slate-50 flex items-center gap-8 hover:shadow-2xl transition-all relative overflow-hidden group">
                                <div className="w-24 h-24 shrink-0 rounded-[2rem] bg-slate-50 flex items-center justify-center border-2 border-slate-100 shadow-inner group-hover:bg-[#020617] transition-all duration-500">
                                  <stat.icon size={48} style={{ color: stat.color }} className="group-hover:text-white transition-colors"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-slate-400 text-[12px] font-black uppercase tracking-[0.4em] mb-2 truncate">{stat.title}</h3>
                                    <div className="text-6xl font-black text-[#020617] tracking-tighter leading-none">{stat.val}</div>
                                </div>
                                <div className="absolute -right-6 -bottom-6 opacity-[0.05] text-slate-900 group-hover:rotate-12 transition-transform">
                                  <stat.icon size={160}/>
                                </div>
                            </div>
                          ))}
                      </div>
                  </div>
              )}

              {viewMode === 'clients' && (
                <div className="space-y-12 animate-in fade-in">
                    <div className="bg-[#020617] p-12 rounded-[4rem] shadow-2xl relative overflow-hidden border-b-[15px] border-[#10B981]">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 border-b-2 border-white/5 pb-10 mb-10 relative z-10">
                           <h2 className="text-8xl font-black text-white tracking-tighter uppercase italic leading-none flex items-center gap-6">
                              <Building2 size={60} className="text-[#0EA5E9]"/> Cartera
                           </h2>
                           <button onClick={async () => {
                              if(!clientForm.name || !clientForm.ruc) return;
                              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { 
                                ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() 
                              });
                              setClientForm({ name: '', ruc: '', sector: 'Servicios' });
                              notify("Cliente Integrado");
                           }} className="px-14 py-6 rounded-[3rem] text-[22px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all border-4 border-white/10 bg-[#10B981]">
                              VINCULAR ENTIDAD
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                            <input type="text" placeholder="RAZÓN SOCIAL" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="lg:col-span-2 p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9] transition-all"/>
                            <input type="text" placeholder="RUC" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-3xl uppercase outline-none text-center font-mono focus:border-[#0EA5E9] transition-all"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {clients.map(c => {
                            const style = calculateTaxRisk(c.ruc, c.taxStatus);
                            return (
                                <div key={c.id} className="bg-white p-10 rounded-[5rem] border-2 border-slate-50 shadow-xl flex flex-col justify-between items-start group hover:shadow-2xl transition-all border-b-[30px]" style={{ borderBottomColor: style.color === 'rose' ? '#E11D48' : (style.color === 'emerald' ? '#10B981' : '#2563EB') }}>
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-10">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-800 border-2 border-slate-100 shadow-inner group-hover:bg-[#020617] group-hover:text-white transition-all shadow-xl"><Building2 size={44}/></div>
                                            <div className={`px-8 py-3 rounded-full text-[14px] font-black uppercase tracking-widest border-2 ${style.bg} ${style.color === 'rose' ? 'text-rose-600 border-rose-100 animate-pulse' : (style.color === 'emerald' ? 'text-emerald-600 border-emerald-100' : 'text-blue-600 border-blue-100')}`}>{style.text}</div>
                                        </div>
                                        <h3 className="font-black text-[#020617] uppercase text-[3rem] leading-[1] tracking-tighter mb-10 italic">{String(c.name)}</h3>
                                        <div className="flex flex-wrap items-center gap-8 pt-8 border-t-2 border-slate-50">
                                              <span className="text-[22px] font-black text-slate-400 font-mono tracking-widest bg-slate-50 px-8 py-3 rounded-2xl border border-slate-100 shadow-inner">RUC {String(c.ruc)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full flex justify-between items-center mt-12 pt-10 border-t-2 border-slate-50">
                                        <button onClick={async () => {
                                          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', c.id), { taxStatus: 'declared' });
                                          notify("Declaración Exitosa");
                                        }} className={`p-8 rounded-[2.5rem] shadow-xl active:scale-90 border-4 transition-all ${c.taxStatus === 'declared' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-slate-50 text-slate-400 hover:bg-[#10B981] hover:text-white border-slate-100'}`}><CheckCircle2 size={44}/></button>
                                        <button onClick={async () => {
                                          if(window.confirm("¿Eliminar cliente?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', c.id));
                                        }} className="text-slate-100 hover:text-rose-600 transition-colors p-8 duration-500"><Trash2 size={48}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
              )}
              
            </div>
          </div>
          
          <footer className="h-20 bg-[#020617] flex items-center px-16 justify-between text-[11px] font-black text-slate-600 uppercase tracking-[1em] z-50 border-t-4 border-white/5 shrink-0">
             <span>Nysem Montalbán EIRL • 2026</span>
             <span className="flex items-center gap-12">
                <span className={`flex items-center gap-4 font-black italic tracking-widest ${isConfigValid ? 'text-[#10B981]' : 'text-amber-500'}`}>
                  <div className={`w-4 h-4 rounded-full animate-pulse ${isConfigValid ? 'bg-[#10B981] shadow-[0_0_15px_#10B981]' : 'bg-amber-500 shadow-[0_0_15px_#f59e0b]'}`}></div> 
                  {isConfigValid ? "SGP NODO ONLINE" : "SGP NODO LOCAL"}
                </span>
                <span className="hidden sm:flex items-center gap-4 opacity-40"><ShieldCheck size={24}/> v15.0 SYNC</span>
             </span>
          </footer>
       </main>
    </div>
  );
}
