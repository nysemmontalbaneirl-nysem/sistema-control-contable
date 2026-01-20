import React, { useState, useEffect } from 'react';
import { 
  Users, Menu, Home, Timer, RefreshCw, CheckCircle2, 
  Building2, AlertTriangle, Shield, Plus, Trash2, 
  Calendar, Database, LogOut, Clock, Edit, Save, 
  BadgeCheck, Zap, Activity, ShieldCheck, Wifi, 
  WifiOff, BarChart3, UserCog, Settings, Briefcase
} from 'lucide-react';

// Implementación de Firebase v11+
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
 * VERSIÓN 31.0.0 - EXECUTIVE HORIZONTAL FLOW
 * OBJETIVO: Optimización del Dashboard para alineación horizontal y visualización profesional en Vercel.
 */

const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try { return JSON.parse(__firebase_config); } catch (e) { return null; }
  }
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || ""
  };
};

const firebaseConfig = getFirebaseConfig();
const appId = "nysem_sgp_production_node_v30"; 

let app, auth, db;
const isConfigured = !!(firebaseConfig && firebaseConfig.apiKey);

if (isConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) { console.error("Fallo de conexión Cloud:", e); }
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

  // Form States
  const [editingId, setEditingId] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', sector: 'Servicios' });
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'Auditor' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const initAuth = async () => {
      if (!auth) { setIsInitializing(false); return; }
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Error Auth:", err); }
      finally { setIsInitializing(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || !db) return;
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');

    const unsubUsers = onSnapshot(usersRef, (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubClients = onSnapshot(clientsRef, (snap) => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubReports = onSnapshot(query(reportsRef, orderBy("createdAt", "desc")), (snap) => setReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubUsers(); unsubClients(); unsubReports(); };
  }, [fbUser]);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const inputUser = loginForm.username.trim().toLowerCase();
    const inputPass = loginForm.password.trim();

    if (inputUser === 'admin' && inputPass === 'admin') {
      setCurrentUserData({ name: 'CPC Nysem Montalbán', role: 'Administrador' });
      setIsLoggedIn(true);
      return;
    }

    const found = users.find(u => String(u.username || "").toLowerCase() === inputUser && String(u.password || "") === inputPass);
    if (found) { setCurrentUserData(found); setIsLoggedIn(true); setAccessError(null); }
    else { setAccessError("Acceso denegado. Verifique su conexión al nodo."); }
  };

  const getRiskStyle = (ruc, taxStatus) => {
    if (taxStatus === 'declared') return { text: 'DECLARADO', bg: 'bg-emerald-50', tx: 'text-emerald-600', color: '#10B981' };
    const lastDigit = parseInt(String(ruc || "").slice(-1));
    if ([0, 1, 2].includes(lastDigit)) return { text: 'VENCE HOY', bg: 'bg-rose-50', tx: 'text-rose-600', color: '#E11D48' };
    return { text: 'EN PLAZO', bg: 'bg-blue-50', tx: 'text-blue-600', color: '#2563EB' };
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
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.8em] mt-2">Nysem Montalbán EIRL</p>
          </div>
          <div className="p-12 space-y-8 bg-white">
            <form onSubmit={handleLogin} className="space-y-6">
              {accessError && <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-rose-600 font-bold text-center text-xs uppercase">{accessError}</div>}
              <input type="text" placeholder="USUARIO" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 font-black text-slate-900 focus:border-[#0EA5E9] outline-none transition-all uppercase text-2xl tracking-widest" />
              <input type="password" placeholder="CONTRASEÑA" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 font-black text-slate-900 focus:border-[#0EA5E9] outline-none transition-all uppercase text-2xl tracking-widest" />
              <button type="submit" className="w-full bg-[#020617] text-white py-6 rounded-3xl font-black text-xl uppercase tracking-[0.4em] hover:bg-[#0EA5E9] transition-all shadow-xl active:scale-95">ACCEDER</button>
            </form>
          </div>
        </div>
        {!isConfigured && (
          <div className="mt-8 flex items-center gap-3 text-amber-600 font-bold text-xs uppercase tracking-widest bg-amber-50 p-4 rounded-full border border-amber-200 animate-pulse">
            <AlertTriangle size={20}/> ADVERTENCIA: NUBE NO CONFIGURADA EN VERCEL
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

       {/* SIDEBAR CORPORATIVO */}
       <aside className={`${sidebarOpen ? 'w-[320px]' : 'w-24'} bg-[#020617] flex flex-col transition-all duration-500 z-50 border-r border-white/5 shadow-2xl shrink-0`}>
         <div className="h-32 flex items-center px-8 border-b border-white/5 overflow-hidden">
            <Database className="text-[#10B981] shrink-0" size={36}/>
            {sidebarOpen && (
              <div className="ml-4 animate-in fade-in">
                <span className="block font-black text-3xl text-white tracking-tighter uppercase italic leading-none">NYSEM</span>
                <span className="text-[9px] font-black text-[#0EA5E9] uppercase tracking-[0.5em] mt-2 block">CLOUD v31.0</span>
              </div>
            )}
         </div>
         <nav className="flex-1 p-6 space-y-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home, show: true },
              { id: 'clients', label: 'Clientes', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora', icon: Timer, show: true },
              { id: 'staff', label: 'Personal', icon: UserCog, show: currentUserData?.role === 'Administrador' }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-4 p-5 rounded-3xl text-[13px] font-black uppercase tracking-widest transition-all ${viewMode === item.id ? 'bg-[#0EA5E9] text-white shadow-lg shadow-[#0EA5E9]/20 translate-x-2' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={26} className="shrink-0"/> {sidebarOpen && item.label}
              </button>
            ))}
         </nav>
         <div className="p-6">
            <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center justify-center gap-4 p-5 rounded-3xl bg-rose-600/10 text-rose-500 font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95">
               <LogOut size={26}/> {sidebarOpen && "CERRAR NODO"}
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
                  <span className={`text-[15px] font-black uppercase flex items-center gap-3 ${isConfigured ? 'text-[#10B981]' : 'text-amber-500'}`}>
                    <Zap size={22} fill="currentColor" className="animate-pulse"/> {isConfigured ? "Sincronización Activa" : "Modo Local"}
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-none mt-1">SGP Ejecutivo Activo</span>
               </div>
               <div className="h-16 bg-[#020617] px-8 py-3 rounded-2xl font-mono text-xl font-black text-[#0EA5E9] shadow-inner flex items-center gap-4">
                  <Calendar size={28}/> {getTodayISO()}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar p-6 lg:p-12">
            <div className="max-w-[1600px] mx-auto space-y-12 pb-24">
            
              {/* DASHBOARD OPTIMIZADO HORIZONTAL */}
              {viewMode === 'dashboard' && (
                  <div className="space-y-12 animate-in fade-in duration-1000">
                      
                      {/* HEADER SECCIÓN CON ALINEACIÓN IZQUIERDA */}
                      <div className="space-y-4 border-l-[16px] border-[#0EA5E9] pl-10 py-2 bg-white/50 rounded-r-[2rem] max-w-4xl">
                         <h1 className="text-6xl lg:text-8xl font-black text-[#020617] tracking-tighter leading-none uppercase italic">Panel de <br/>Control Maestro</h1>
                         <p className="text-xl lg:text-3xl font-bold text-slate-400 tracking-tight flex items-center gap-6 italic">
                           <div className="w-24 h-2.5 bg-[#10B981] rounded-full shadow-[0_0_15px_#10B981]"></div> Gestión Estratégica
                         </p>
                      </div>

                      {/* GRID DE ESTADÍSTICAS RE-DISEÑADO PARA HORIZONTALIDAD */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                          {[
                            { title: "CARTERA CLIENTES", val: clients.length, icon: Building2, color: "#0EA5E9", sub: "TOTAL ENTIDADES" },
                            { title: "ALERTAS CRÍTICAS", val: clients.filter(c => getRiskStyle(c.ruc, c.taxStatus).text === 'VENCE HOY').length, icon: AlertTriangle, color: "#F43F5E", sub: "VENCIMIENTO SUNAT" },
                            { title: "STAFF AUDITOR", val: users.length, icon: Users, color: "#10B981", sub: "EQUIPO ACTIVO" },
                            { title: "REGISTROS HOY", val: reports.filter(r => r.date === getTodayISO()).length, icon: Activity, color: "#6366F1", sub: "AVANCES BITÁCORA" }
                          ].map((stat, i) => (
                            <div key={i} className="bg-white p-10 rounded-[4rem] shadow-xl border-2 border-slate-50 flex flex-row items-center gap-10 hover:shadow-2xl hover:translate-y-[-8px] transition-all relative overflow-hidden group border-b-[20px]" style={{ borderBottomColor: stat.color }}>
                                
                                {/* CONTENEDOR ICONO HORIZONTAL */}
                                <div className="w-28 h-28 shrink-0 rounded-[2.5rem] bg-slate-50 flex items-center justify-center border-2 border-slate-100 shadow-inner group-hover:bg-[#020617] transition-all duration-500 relative z-10">
                                  <stat.icon size={52} style={{ color: stat.color }} className="group-hover:text-white transition-colors duration-300"/>
                                </div>

                                {/* CONTENEDOR DATOS */}
                                <div className="flex-1 min-w-0 relative z-10">
                                    <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] mb-3 leading-none truncate">{stat.title}</h3>
                                    <div className="text-7xl font-black text-[#020617] tracking-tighter leading-none mb-2">{stat.val}</div>
                                    <p className="text-[9px] font-black text-slate-300 tracking-widest uppercase truncate">{stat.sub}</p>
                                </div>

                                {/* EFECTO DE FONDO */}
                                <div className="absolute -right-10 -bottom-10 opacity-[0.03] text-slate-900 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-700">
                                  <stat.icon size={200}/>
                                </div>
                            </div>
                          ))}
                      </div>

                      {/* SECCIÓN DE MONITOREO EN TIEMPO REAL */}
                      <div className="bg-white p-12 rounded-[5rem] border-2 border-slate-50 shadow-sm relative overflow-hidden group">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 relative z-10">
                              <h3 className="text-3xl font-black text-[#020617] flex items-center gap-8 italic uppercase tracking-tighter">
                                 <div className="p-4 bg-[#0EA5E9]/10 rounded-2xl text-[#0EA5E9] shadow-sm"><BarChart3 size={32}/></div>
                                 Monitoreo de Staff Sincronizado
                              </h3>
                              <div className="flex items-center gap-6 bg-slate-50 px-8 py-3 rounded-full border-2 border-slate-100">
                                <span className="w-3 h-3 bg-[#10B981] rounded-full animate-ping"></span>
                                <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Live Cloud Data</span>
                              </div>
                          </div>

                          <div className="space-y-6 relative z-10">
                              {reports.slice(0, 5).map(r => (
                                  <div key={r.id} className="p-8 bg-slate-50 rounded-[3.5rem] flex flex-col md:flex-row items-start md:items-center justify-between hover:bg-white hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#0EA5E9]/20 group/row">
                                      <div className="flex items-center gap-10 min-w-0 flex-1">
                                          <div className="w-16 h-16 rounded-[1.5rem] bg-white border-4 border-slate-100 flex items-center justify-center text-[#10B981] font-black text-3xl group-hover/row:bg-[#10B981] group-hover/row:text-white transition-all shadow-md shrink-0 leading-none">
                                            {String(r.userName || "U").charAt(0).toUpperCase()}
                                          </div>
                                          <div className="min-w-0 overflow-hidden">
                                              <p className="text-2xl font-bold text-[#020617] leading-tight mb-2 truncate italic group-hover/row:text-[#0EA5E9]">"{String(r.description)}"</p>
                                              <div className="flex items-center gap-6">
                                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">{String(r.userName)}</p>
                                                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                                <p className="text-[11px] font-black text-[#10B981] uppercase tracking-widest truncate italic">{String(r.clientName)}</p>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="mt-6 md:mt-0 flex items-center gap-6 shrink-0 ml-0 md:ml-10">
                                          <span className="bg-white px-8 py-3 rounded-full border-2 border-slate-100 text-lg font-mono font-black text-slate-500 shadow-inner flex items-center gap-4">
                                            <Clock size={20} className="text-[#0EA5E9]"/> {String(r.time)}
                                          </span>
                                      </div>
                                  </div>
                              ))}
                              {reports.length === 0 && (
                                <div className="py-24 text-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
                                    <Database size={100} className="mx-auto mb-8 text-slate-200 animate-pulse"/>
                                    <p className="text-3xl font-black text-slate-300 uppercase tracking-[0.5em] ml-[0.5em]">Bitácora Disponible</p>
                                </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {/* MANTENIMIENTO DE VISTAS EXISTENTES */}
              {viewMode === 'clients' && (
                  <div className="space-y-12 animate-in fade-in max-w-7xl mx-auto">
                      <div className="bg-[#020617] p-12 rounded-[4rem] shadow-2xl relative overflow-hidden border-b-[15px] border-[#10B981]">
                          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 border-b-2 border-white/5 pb-10 mb-10 relative z-10">
                             <h2 className="text-8xl font-black text-white tracking-tighter uppercase italic leading-none flex items-center gap-6">
                                <Building2 size={60} className="text-[#0EA5E9]"/> Cartera
                             </h2>
                             <button onClick={async () => {
                                if(!clientForm.name || !clientForm.ruc || !fbUser) return;
                                try {
                                  if(editingId) {
                                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingId), { ...clientForm, updatedAt: Timestamp.now() });
                                    notify("Cliente Actualizado");
                                  } else {
                                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() });
                                    notify("Cliente Guardado en Nube");
                                  }
                                  setClientForm({ name: '', ruc: '', sector: 'Servicios' }); setEditingId(null);
                                } catch(e) { notify("Fallo de escritura", "error"); }
                             }} className={`px-14 py-6 rounded-[3rem] text-[22px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all border-4 border-white/10 active:scale-95 ${editingId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                                {editingId ? "GUARDAR CAMBIOS" : "VINCULAR ENTIDAD"}
                             </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                              <input type="text" placeholder="RAZÓN SOCIAL / DENOMINACIÓN" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="lg:col-span-2 p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9] transition-all placeholder:text-slate-700"/>
                              <input type="text" placeholder="RUC" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-3xl uppercase outline-none text-center font-mono focus:border-[#0EA5E9] transition-all placeholder:text-slate-700"/>
                              <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-[16px] uppercase h-28 text-center outline-none cursor-pointer">
                                  <option value="Agricultura">AGRICULTURA</option>
                                  <option value="Construcción">CONSTRUCCIÓN</option>
                                  <option value="Servicios">SERVICIOS GLOBAL</option>
                                  <option value="Comercio">COMERCIO</option>
                                  <option value="Exportación">EXPORTACIÓN</option>
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                          {clients.map(c => {
                              const style = getRiskStyle(c.ruc, c.taxStatus);
                              return (
                                  <div key={c.id} className="bg-white p-10 rounded-[5rem] border-2 border-slate-50 shadow-xl flex flex-col justify-between items-start group hover:shadow-2xl transition-all border-b-[30px]" style={{ borderBottomColor: style.color }}>
                                      <div className="w-full">
                                          <div className="flex justify-between items-start mb-10">
                                              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-800 border-2 border-slate-100 shadow-inner group-hover:bg-[#020617] group-hover:text-white transition-all duration-500 shadow-xl"><Building2 size={44}/></div>
                                              <div className={`px-8 py-3 rounded-full text-[14px] font-black uppercase tracking-widest border-2 ${style.bg} ${style.tx} ${style.text === 'VENCE HOY' ? 'animate-pulse ring-4 ring-rose-100' : ''}`}>{style.text}</div>
                                          </div>
                                          <h3 className="font-black text-[#020617] uppercase text-[3rem] leading-[1] tracking-tighter mb-10 italic group-hover:text-[#0EA5E9] transition-colors duration-500">{String(c.name)}</h3>
                                          <div className="flex flex-wrap items-center gap-8 pt-8 border-t-2 border-slate-50">
                                                <span className="text-[22px] font-black text-slate-400 font-mono tracking-widest bg-slate-50 px-8 py-3 rounded-2xl border border-slate-100 shadow-inner">RUC {String(c.ruc)}</span>
                                                <span className="text-[16px] font-black text-[#10B981] uppercase tracking-widest flex items-center gap-4 italic"><Activity size={20}/> {String(c.sector)}</span>
                                          </div>
                                      </div>
                                      <div className="w-full flex justify-between items-center mt-12 pt-10 border-t-2 border-slate-50">
                                          <div className="flex items-center gap-8">
                                             <button onClick={async () => {
                                                try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', c.id), { taxStatus: 'declared' }); notify("Impuesto Declarado"); }
                                                catch(e) { console.error(e); }
                                             }} className={`p-8 rounded-[2.5rem] shadow-xl active:scale-90 border-4 transition-all ${c.taxStatus === 'declared' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-slate-50 text-slate-400 hover:bg-[#10B981] hover:text-white border-slate-100'}`}><CheckCircle2 size={44}/></button>
                                             <button onClick={() => { setEditingId(c.id); setClientForm({ name: c.name, ruc: c.ruc, sector: c.sector }); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-8 rounded-[2.5rem] bg-slate-50 text-slate-400 hover:bg-[#0EA5E9] hover:text-white transition-all border-4 border-slate-100 shadow-xl active:scale-90"><Edit size={44}/></button>
                                          </div>
                                          <button onClick={async () => { if(window.confirm("¿Confirmar eliminación permanente?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', c.id)); }} className="text-slate-100 hover:text-rose-600 transition-colors p-8 duration-500 active:scale-90"><Trash2 size={48}/></button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {viewMode === 'staff' && currentUserData?.role === 'Administrador' && (
                 <div className="space-y-12 animate-in fade-in max-w-7xl mx-auto">
                    <div className="bg-[#020617] p-12 rounded-[4rem] shadow-2xl relative overflow-hidden border-b-[15px] border-[#0EA5E9]">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 border-b-2 border-white/5 pb-10 mb-10 relative z-10">
                           <h2 className="text-8xl font-black text-white tracking-tighter uppercase italic leading-none flex items-center gap-6">
                              <UserCog size={60} className="text-[#0EA5E9]"/> Staff
                           </h2>
                           <button onClick={async () => {
                              if(!userForm.name || !userForm.username || !fbUser) return;
                              try {
                                if(editingId) {
                                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingId), { ...userForm, updatedAt: Timestamp.now() });
                                  notify("Staff Actualizado");
                                } else {
                                  await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { ...userForm, createdAt: Timestamp.now() });
                                  notify(`Usuario ${userForm.username} Activado`);
                                }
                                setUserForm({ name: '', username: '', password: '', role: 'Auditor' }); setEditingId(null);
                              } catch(e) { notify("Error de registro", "error"); }
                           }} className={`px-14 py-6 rounded-[3rem] text-[22px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all border-4 border-white/10 active:scale-95 ${editingId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                              {editingId ? "ACTUALIZAR" : "INTEGRAR AUDITOR"}
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                            <input type="text" placeholder="NOMBRE COMPLETO" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9] transition-all placeholder:text-slate-700"/>
                            <input type="text" placeholder="ID LOGIN (LIZ)" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9] transition-all placeholder:text-slate-700"/>
                            <input type="password" placeholder="CONTRASEÑA" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9] transition-all placeholder:text-slate-700"/>
                            <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="p-10 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-[18px] uppercase h-28 text-center outline-none cursor-pointer">
                                <option value="Auditor">AUDITOR (STAFF)</option>
                                <option value="Administrador">ADMINISTRADOR (CPC)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {users.map(u => (
                            <div key={u.id} className="bg-white p-12 rounded-[5rem] border-2 border-slate-50 shadow-xl flex flex-col items-center group hover:shadow-2xl transition-all border-b-[25px] hover:border-[#10B981] text-center">
                                <div className="w-36 h-36 bg-slate-50 rounded-[3rem] flex items-center justify-center text-slate-800 border-2 border-slate-100 shadow-inner group-hover:bg-[#020617] group-hover:text-white transition-all duration-500 mb-8 shadow-xl"><UserCog size={64}/></div>
                                <h3 className="font-black text-[#020617] uppercase text-[3rem] leading-[1] tracking-tighter mb-4 italic">{String(u.name)}</h3>
                                <div className="space-y-4 mb-8">
                                   <span className="px-8 py-3 rounded-full text-[14px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 shadow-sm block w-fit mx-auto">{String(u.role)}</span>
                                   <p className="text-slate-400 font-mono text-xl tracking-widest uppercase opacity-70">LOGIN: {String(u.username)}</p>
                                </div>
                                <div className="w-full flex justify-between items-center mt-auto pt-10 border-t-2 border-slate-50">
                                    <button onClick={() => { setEditingId(u.id); setUserForm({ name: u.name, username: u.username, password: u.password, role: u.role }); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-8 rounded-[2.5rem] bg-slate-50 text-slate-400 hover:bg-[#0EA5E9] hover:text-white transition-all border-4 border-slate-100 shadow-xl active:scale-90"><Edit size={44}/></button>
                                    <button onClick={async () => { if(window.confirm("¿Eliminar acceso staff?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id)); }} className="text-slate-100 hover:text-rose-600 transition-colors p-8 duration-500 active:scale-90"><Trash2 size={48}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
              )}

              {viewMode === 'reports' && (
                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 pb-20 animate-in fade-in duration-500">
                    <div className="bg-[#020617] p-10 rounded-[4rem] shadow-2xl h-fit sticky top-6 border-b-[15px] border-[#10B981]">
                          <div className="flex items-center gap-8 mb-10">
                             <div className="p-6 bg-[#10B981] rounded-3xl text-white shadow-xl"><Timer size={44}/></div>
                             <h2 className="text-4xl font-black text-white uppercase italic leading-none">Reportar</h2>
                          </div>
                          <div className="space-y-8">
                              <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-8 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-5xl uppercase outline-none focus:border-[#0EA5E9] transition-all"/>
                              <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-8 bg-white/5 rounded-[2.5rem] border-2 border-white/10 font-black text-white text-[16px] uppercase h-24 text-center outline-none">
                                  <option value="">CLIENTE...</option>
                                  {clients.map(c => <option key={c.id} value={c.name} className="text-black">{c.name}</option>)}
                              </select>
                              <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3rem] border-2 border-white/10 h-[400px] font-medium text-white text-2xl outline-none focus:border-[#0EA5E9] transition-all resize-none placeholder:text-slate-700" placeholder="LABOR REALIZADA..."></textarea>
                              <button onClick={async () => {
                                  if(!reportForm.description || !reportForm.clientName || !fbUser) return;
                                  try {
                                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { ...reportForm, userName: currentUserData?.name, createdAt: Timestamp.now() });
                                    setReportForm({ ...reportForm, description: '', time: '' }); notify("Bitácora Actualizada");
                                  } catch(e) { notify("Error al reportar", "error"); }
                              }} className="w-full bg-[#10B981] text-white py-10 rounded-[3rem] font-black text-xl uppercase tracking-widest shadow-xl hover:bg-emerald-700 active:scale-95 transition-all">ARCHIVAR</button>
                          </div>
                    </div>

                    <div className="xl:col-span-2 bg-white p-12 rounded-[5rem] border-2 border-slate-50 min-h-[1000px] shadow-sm relative overflow-hidden">
                          <h3 className="font-black text-[#020617] text-[6rem] uppercase tracking-tighter italic border-b-8 border-slate-50 pb-8 mb-16 leading-none flex items-center gap-10">
                             Historial <div className="h-1 w-full bg-slate-50"></div>
                          </h3>
                          <div className="space-y-20 relative border-l-[16px] border-slate-50 ml-16 pb-32">
                              {reports.map((r, i) => (
                                  <div key={r.id} className="relative pl-24 animate-in slide-in-from-left-20">
                                      <div className="absolute -left-[40px] top-4 w-12 h-12 rounded-full bg-[#10B981] border-[8px] border-white shadow-xl"></div>
                                      <div className="bg-slate-50/70 p-10 rounded-[4rem] border-2 border-slate-100 flex flex-col md:flex-row justify-between items-start gap-12 hover:bg-white hover:shadow-2xl transition-all duration-700 group relative overflow-hidden">
                                          <div className="flex-1">
                                              <div className="flex items-center gap-8 mb-6">
                                                  <span className="text-xl font-black text-[#10B981] uppercase tracking-widest bg-emerald-100/50 px-8 py-2 rounded-full border-2 border-emerald-100 leading-none">{String(r.clientName)}</span>
                                                  <span className="text-xl font-mono font-black text-slate-400 bg-white px-6 py-2 rounded-2xl border-2 border-slate-100 shadow-inner">{String(r.time)}</span>
                                              </div>
                                              <p className="text-[3.5rem] font-bold text-[#020617] italic font-serif leading-tight group-hover:text-black">"{String(r.description)}"</p>
                                              <div className="mt-12 flex items-center gap-8 text-[15px] font-black text-slate-400 uppercase tracking-widest leading-none italic">
                                                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-[#10B981] font-black text-4xl shadow-lg group-hover:bg-[#10B981] group-hover:text-white transition-all leading-none">{String(r.userName?.charAt(0))}</div>
                                                  <div>
                                                    <span className="block text-[#020617] text-3xl font-black italic tracking-tighter mb-2">{String(r.userName)}</span>
                                                    <span className="block opacity-60 tracking-[0.4em]">Audit Staff</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <button onClick={async () => { if(window.confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', r.id)); }} className="text-slate-100 hover:text-rose-600 p-8 transition-all duration-500 opacity-0 group-hover:opacity-100 active:scale-90"><Trash2 size={48}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                    </div>
                 </div>
              )}
            </div>
          </div>
          
          <footer className="h-20 bg-[#020617] flex items-center px-16 justify-between text-[11px] font-black text-slate-600 uppercase tracking-[1em] z-50 border-t-4 border-white/5 shrink-0">
             <div className="flex flex-col">
                <span>Nysem Montalbán EIRL • 2026</span>
                {currentUserData?.role === 'Administrador' && <span className="text-[10px] text-slate-800 lowercase tracking-widest opacity-30 mt-1 leading-none italic">Sync Node: {appId}</span>}
             </div>
             <span className="flex items-center gap-12">
                <span className={`flex items-center gap-4 font-black italic tracking-widest ${isConfigured ? 'text-[#10B981]' : 'text-amber-500'}`}>
                  <div className={`w-4 h-4 rounded-full animate-pulse ${isConfigured ? 'bg-[#10B981] shadow-[0_0_20px_#10B981]' : 'bg-amber-500 shadow-[0_0_20px_#f59e0b]'}`}></div> 
                  {isConfigured ? "NUBE SINCRONIZADA" : "FALLO DE NODO"}
                </span>
                <span className="hidden sm:flex items-center gap-4 opacity-40"><ShieldCheck size={24}/> v31.0 EXECUTIVE FLOW</span>
             </span>
          </footer>
       </main>
    </div>
  );
}
