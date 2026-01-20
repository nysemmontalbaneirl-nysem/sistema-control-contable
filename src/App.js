import React, { useState, useEffect } from 'react';
import { 
  Users, Menu, Home, Timer, RefreshCw, FolderOpen, 
  CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, History, Lock, Database, 
  LogOut, Clock, AlertCircle, Edit, X, Save,
  ChevronRight, Briefcase, TrendingUp, UserPlus, UserCog, BadgeCheck,
  Zap, Globe, Activity, PieChart, Layers, Search, Monitor, Cpu,
  Key, ShieldCheck, Settings, Layout, Wifi, WifiOff
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
 * VERSIÓN 28.0.0 - CLOUD INTEGRITY & MULTI-DEVICE SYNC
 * OBJETIVO: Garantizar que los datos de "LIZ" y otros usuarios sean visibles globalmente.
 */

const getFirebaseConfig = () => {
  // 1. Intentar leer del entorno de simulación (Canvas)
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try { return JSON.parse(__firebase_config); } catch (e) { return null; }
  }
  // 2. Intentar leer de las Variables de Entorno de Vercel (Producción)
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

// IDENTIFICADOR DE NODO ESTÁTICO (Crítico para que todas las PCs apunten al mismo lugar)
const appId = "nysem_sgp_production_node"; 

let app, auth, db;
const isConfigured = !!(firebaseConfig && firebaseConfig.apiKey);

if (isConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) { console.error("Error al conectar con el servidor de Google:", e); }
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

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Estados de Formulario
  const [editingId, setEditingId] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', sector: 'Servicios' });
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'Auditor' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  // 1. Autenticación Global (Garantiza que el sistema reconozca el dispositivo)
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
      } catch (err) { console.error("Error de enlace con la nube:", err); }
      finally { setIsInitializing(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  // 2. Sincronización en Tiempo Real (Asegura que "LIZ" aparezca en todas las PCs)
  useEffect(() => {
    if (!fbUser || !db) return;
    
    // Rutas de 5 segmentos (Requisito estricto de seguridad)
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');

    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    }, (err) => console.error("Error de sincronización de Staff:", err));

    const unsubClients = onSnapshot(clientsRef, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReports = onSnapshot(query(reportsRef, orderBy("createdAt", "desc")), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUsers(); unsubClients(); unsubReports(); };
  }, [fbUser]);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const inputUser = loginForm.username.trim().toLowerCase();
    const inputPass = loginForm.password.trim();

    // Acceso Maestro (Fallback)
    if (inputUser === 'admin' && inputPass === 'admin') {
      setCurrentUserData({ name: 'CPC Nysem Montalbán', role: 'Administrador' });
      setIsLoggedIn(true);
      return;
    }

    // Validación contra base de datos en la nube (Aquí es donde LIZ debe aparecer)
    const found = users.find(u => 
      String(u.username || "").trim().toLowerCase() === inputUser && 
      String(u.password || "").trim() === inputPass
    );

    if (found) {
      setCurrentUserData(found);
      setIsLoggedIn(true);
      setAccessError(null);
    } else {
      setAccessError("Acceso fallido. Asegúrese de que el usuario fue guardado en la nube.");
    }
  };

  const handleSaveClient = async () => {
    if (!clientForm.name || !clientForm.ruc || !fbUser) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingId), { ...clientForm, updatedAt: Timestamp.now() });
        notify("Entidad Actualizada.");
      } else {
        await addDoc(colRef, { ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() });
        notify("Entidad Guardada Globalmente.");
      }
      setClientForm({ name: '', ruc: '', sector: 'Servicios' });
      setEditingId(null);
    } catch (e) { notify("Error al guardar en nube.", "error"); }
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.username || !fbUser) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingId), { ...userForm, updatedAt: Timestamp.now() });
        notify("Staff Actualizado.");
      } else {
        await addDoc(colRef, { ...userForm, createdAt: Timestamp.now() });
        notify(`Usuario ${userForm.username} habilitado en la nube.`);
      }
      setUserForm({ name: '', username: '', password: '', role: 'Auditor' });
      setEditingId(null);
    } catch (e) { notify("Error al registrar personal.", "error"); }
  };

  const deleteRecord = async (col, id) => {
    if (window.confirm("¿Confirmar eliminación permanente del registro?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
        notify("Eliminado de la nube.");
      } catch (e) { notify("Error al eliminar.", "error"); }
    }
  };

  const getRiskStyle = (ruc, taxStatus) => {
    if (taxStatus === 'declared') return { text: 'DECLARADO', bg: 'bg-[#10B981]/10', tx: 'text-[#10B981]' };
    const lastDigit = parseInt(String(ruc || "").slice(-1));
    if ([0, 1, 2].includes(lastDigit)) return { text: 'VENCE HOY', bg: 'bg-red-50', tx: 'text-red-600' };
    return { text: 'EN PLAZO', bg: 'bg-[#0EA5E9]/10', tx: 'text-[#0EA5E9]' };
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-10">
          <RefreshCw className="text-[#0EA5E9] animate-spin" size={96} />
          <div className="text-center">
             <p className="text-[16px] font-black tracking-[1.8em] uppercase text-[#0EA5E9] ml-[1.8em]">NYSEM MONTALBÁN</p>
             <p className="text-[20px] text-slate-500 uppercase tracking-widest mt-8 animate-pulse italic">Validando Integridad de Nube v28.0</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] p-10 font-sans">
        
        {/* DETECTOR DE CONFIGURACIÓN VERCEL */}
        {!isConfigured && (
          <div className="mb-10 w-full max-w-3xl bg-amber-600 p-8 rounded-[3rem] text-white flex items-center gap-6 shadow-2xl border-b-8 border-amber-800 animate-pulse">
            <AlertTriangle size={60} className="shrink-0"/>
            <div>
              <p className="text-2xl font-black uppercase leading-none mb-2">Error de Sincronización (Nube Desconectada)</p>
              <p className="text-lg opacity-90">Faltan las Variables de Entorno en Vercel. Por esto los datos creados en una PC no aparecen en otra.</p>
            </div>
          </div>
        )}

        <div className="bg-white w-full max-w-3xl rounded-[6rem] shadow-2xl overflow-hidden border border-white relative">
          <div className="bg-[#020617] p-24 text-center text-white relative border-b-[12px] border-[#10B981]">
            <Shield className="mx-auto mb-14 text-[#0EA5E9]" size={130}/>
            <h1 className="text-8xl font-black uppercase tracking-tighter mb-8 italic leading-none">MASTER LOGIN</h1>
            <p className="text-[16px] font-black text-slate-500 uppercase tracking-[1em] ml-[1em]">Consola Multi-Puesto Nysem</p>
          </div>
          <div className="p-24 space-y-12 bg-white">
            <form onSubmit={handleLogin} className="space-y-10">
              {accessError && (
                <div className="p-10 bg-red-50 border-4 border-red-100 rounded-[3rem] text-red-600 font-black uppercase text-center">
                  {accessError}
                </div>
              )}
              <div className="space-y-8">
                <input type="text" placeholder="USUARIO" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-11 bg-slate-50 rounded-[4rem] border-4 border-slate-100 font-black text-slate-900 shadow-inner outline-none focus:bg-white focus:border-[#0EA5E9] transition-all text-4xl uppercase tracking-widest" required />
                <input type="password" placeholder="CLAVE" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-11 bg-slate-50 rounded-[4rem] border-4 border-slate-100 font-black text-slate-900 shadow-inner outline-none focus:bg-white focus:border-[#0EA5E9] transition-all text-4xl uppercase tracking-widest" required />
              </div>
              <button type="submit" className="w-full bg-[#020617] text-white py-12 rounded-[5rem] font-black text-[22px] uppercase tracking-[0.8em] hover:bg-[#0EA5E9] transition-all shadow-3xl active:scale-95 mt-10">Acceder al Sistema</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'Administrador';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
       
       {notification && (
         <div className={`fixed top-12 right-12 z-[100] p-10 rounded-[3rem] shadow-2xl border-4 flex items-center gap-8 animate-in slide-in-from-right-32 ${notification.type === 'success' ? 'bg-[#10B981] border-white text-white' : 'bg-red-600 border-white text-white'}`}>
            <BadgeCheck size={48}/>
            <span className="text-2xl font-black uppercase tracking-widest">{notification.msg}</span>
         </div>
       )}

       <aside className={`${sidebarOpen ? 'w-[480px]' : 'w-40'} bg-[#020617] flex flex-col transition-all duration-700 shadow-2xl z-50 relative border-r border-white/5`}>
         <div className="h-56 flex items-center px-20 border-b border-white/5">
            <Database className="text-[#10B981]" size={60}/>
            {sidebarOpen && (
              <div className="ml-12 animate-in fade-in">
                <span className="block font-black text-6xl text-white tracking-tighter uppercase italic leading-none">NYSEM</span>
                <span className="text-[14px] font-black text-[#0EA5E9] uppercase tracking-[0.8em] mt-6">CLOUD v28</span>
              </div>
            )}
         </div>

         <nav className="flex-1 p-16 space-y-8 overflow-y-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Clientes', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora Staff', icon: Timer, show: true },
              { id: 'staff', label: 'Gestión Personal', icon: UserCog, show: isAdmin }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-10 p-9 rounded-[3.5rem] text-[18px] font-black uppercase tracking-[0.4em] transition-all duration-500 group ${viewMode === item.id ? 'bg-[#0EA5E9] text-white shadow-xl translate-x-8 border-l-[12px] border-[#10B981]' : 'text-slate-500 hover:text-white'}`}>
                <item.icon size={44}/> {sidebarOpen && item.label}
              </button>
            ))}
         </nav>

         <div className="p-16 border-t border-white/5">
            <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center justify-center gap-10 p-10 rounded-[4rem] bg-red-600/10 text-red-500 font-black uppercase tracking-[0.5em] hover:bg-red-600 hover:text-white transition-all">
               <LogOut size={40}/> {sidebarOpen && "SALIR"}
            </button>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-48 bg-white border-b-[10px] border-[#F1F5F9] flex items-center px-28 justify-between z-40 shadow-sm">
            <div className="flex items-center gap-20">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-10 bg-slate-50 rounded-[3rem] text-slate-400 hover:text-[#0EA5E9] border-4 border-slate-100 transition-all">
                  <Menu size={56}/>
                </button>
                <div className="hidden lg:block border-l-8 border-[#0EA5E9] pl-8">
                    <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{viewMode}</h2>
                    <p className="text-[14px] font-black text-slate-400 tracking-[0.6em] uppercase mt-4 italic">Estudio Nysem Montalbán</p>
                </div>
            </div>
            
            <div className="flex items-center gap-16">
               <div className="hidden xl:flex flex-col items-end">
                  <span className="text-[12px] font-black text-slate-300 uppercase tracking-[0.6em] mb-3 leading-none italic uppercase">Estatus de Sincronización Global</span>
                  <span className={`text-[20px] font-black uppercase flex items-center gap-5 ${isConfigured ? 'text-[#10B981]' : 'text-amber-500'}`}>
                    {isConfigured ? <><Wifi size={28}/> NODO EN LÍNEA</> : <><WifiOff size={28}/> MODO LOCAL (SIN NUBE)</>}
                  </span>
               </div>
               <div className="h-28 w-[4px] bg-slate-100 rounded-full"></div>
               <div className="bg-[#020617] px-16 py-8 rounded-[3rem] font-mono text-[28px] font-black text-[#0EA5E9] flex items-center gap-10">
                  <Calendar size={40}/> {getTodayISO()}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-20 lg:p-32 custom-scrollbar bg-[#F8FAFC] space-y-32">
            
            {viewMode === 'dashboard' && (
                <div className="space-y-32 animate-in fade-in duration-1000">
                    <div className="space-y-10 border-l-[20px] border-[#0EA5E9] pl-20 py-4">
                       <h1 className="text-[11rem] font-black text-[#020617] tracking-tighter leading-[0.8] uppercase italic drop-shadow-2xl">Control <br/>Maestro</h1>
                       <p className="text-4xl font-bold text-slate-400 tracking-tight flex items-center gap-10 italic">
                         <div className="w-40 h-3 bg-[#10B981] rounded-full shadow-[0_0_20px_rgba(16,185,129,0.7)]"></div> Gestión Integral de Producción Contable
                       </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-24">
                        {[
                          { title: "CARTERA CLIENTES", val: clients.length, icon: Building2, color: "#0EA5E9" },
                          { title: "ALERTAS CRÍTICAS", val: clients.filter(c => getRiskStyle(c.ruc, c.taxStatus).text === 'VENCE HOY').length, icon: AlertTriangle, color: "#EF4444" },
                          { title: "STAFF AUDITOR", val: users.length, icon: Users, color: "#10B981" },
                          { title: "AVANCES HOY", val: reports.filter(r => r.date === getTodayISO()).length, icon: Activity, color: "#6366F1" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-14 rounded-[5rem] shadow-xl border-2 border-slate-50 flex flex-row items-center gap-12 group hover:shadow-3xl transition-all relative overflow-hidden border-b-[20px]" style={{ borderBottomColor: stat.color }}>
                                <div className="w-40 h-40 shrink-0 rounded-[3.5rem] bg-slate-50 flex items-center justify-center border-4 border-slate-100 shadow-inner group-hover:bg-[#020617] transition-all duration-500">
                                  <stat.icon size={80} style={{ color: stat.color }} className="group-hover:text-white transition-colors"/>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-slate-400 text-[18px] font-black uppercase tracking-[0.4em] mb-4 truncate leading-none">{stat.title}</h3>
                                    <div className="text-[10rem] font-black text-[#020617] tracking-tighter leading-none italic">{stat.val}</div>
                                </div>
                                <div className="absolute -right-20 -bottom-20 opacity-[0.03] text-slate-900 rotate-12 group-hover:rotate-0">
                                  <stat.icon size={350}/>
                                </div>
                          </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-32 pb-48 animate-in fade-in">
                    <div className="bg-[#020617] p-24 rounded-[8rem] shadow-2xl relative overflow-hidden border-b-[15px] border-[#10B981]">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-24 border-b-4 border-white/5 pb-24 mb-24 relative z-10">
                           <div className="space-y-10">
                              <h2 className="text-9xl font-black text-white tracking-tighter uppercase italic leading-none">Cartera</h2>
                              <p className="text-[20px] font-bold text-[#0EA5E9] uppercase tracking-[1em] italic leading-none ml-2 flex items-center gap-10">
                                <div className="w-10 h-2 bg-[#10B981]"></div> Sincronizado Globalmente
                              </p>
                           </div>
                           <button onClick={handleSaveClient} className={`px-32 py-12 rounded-[5rem] text-[24px] font-black uppercase tracking-[0.6em] text-white shadow-3xl hover:scale-[1.05] transition-all flex items-center gap-12 border-4 border-white/20 active:scale-95 ${editingId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                              {editingId ? <><Save size={48}/> ACTUALIZAR</> : <><Plus size={48}/> VINCULAR CLIENTE</>}
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 relative z-10">
                            <input type="text" placeholder="RAZÓN SOCIAL" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="lg:col-span-2 p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-4xl uppercase outline-none focus:border-[#0EA5E9] transition-all"/>
                            <input type="text" placeholder="RUC" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-4xl uppercase outline-none text-center font-mono focus:border-[#0EA5E9] transition-all"/>
                            <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-[20px] uppercase h-28 text-center outline-none">
                                <option value="Agricultura">AGRICULTURA</option>
                                <option value="Construcción">CONSTRUCCIÓN</option>
                                <option value="Exportación">EXPORTACIÓN</option>
                                <option value="Comercio">COMERCIO</option>
                                <option value="Servicios">SERVICIOS GLOBAL</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-28">
                        {clients.map(c => {
                            const style = getRiskStyle(c.ruc, c.taxStatus);
                            return (
                                <div key={c.id} className="bg-white p-24 rounded-[8rem] border-4 border-slate-50 flex flex-col justify-between items-start group shadow-2xl transition-all border-b-[35px] hover:border-[#0EA5E9]" style={{ borderBottomColor: style.text === 'VENCE HOY' ? '#EF4444' : (c.taxStatus === 'declared' ? '#10B981' : '#F1F5F9') }}>
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-24">
                                            <div className="w-36 h-36 bg-slate-50 rounded-[3.5rem] flex items-center justify-center text-[#020617] border-2 border-slate-100 group-hover:bg-[#020617] group-hover:text-white transition-all duration-500"><Building2 size={80}/></div>
                                            <div className={`px-12 py-6 rounded-full text-[18px] font-black uppercase tracking-[0.5em] border-4 ${style.bg} ${style.tx} ${style.text === 'VENCE HOY' ? 'animate-pulse ring-4 ring-red-100' : ''}`}>{style.text}</div>
                                        </div>
                                        <h3 className="font-black text-[#020617] uppercase text-[3.5rem] leading-[1] tracking-tighter mb-14 italic group-hover:text-[#0EA5E9] transition-colors">{String(c.name)}</h3>
                                        <div className="flex flex-wrap items-center gap-10 pt-14 border-t-4 border-slate-50">
                                              <span className="text-[26px] font-black text-slate-400 font-mono tracking-widest leading-none bg-slate-50 px-10 py-5 rounded-3xl border-2 border-slate-100 shadow-inner">RUC {String(c.ruc)}</span>
                                              <span className="text-[18px] font-black text-[#10B981] uppercase tracking-[0.5em] leading-none flex items-center gap-8"><Zap size={24}/> {String(c.sector)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full flex justify-between items-center mt-28 pt-20 border-t-4 border-slate-50">
                                        <div className="flex items-center gap-10">
                                           <button onClick={() => markAsDeclared(c.id)} className={`p-10 rounded-[3rem] transition-all shadow-3xl border-4 ${c.taxStatus === 'declared' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-[#10B981] hover:text-white'}`}><CheckCircle2 size={56}/></button>
                                           <button onClick={() => { setEditingId(c.id); setClientForm({ name: c.name, ruc: c.ruc, sector: c.sector }); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-10 rounded-[3rem] bg-slate-50 text-slate-400 hover:bg-[#0EA5E9] hover:text-white border-4 border-slate-100 transition-all shadow-3xl"><Edit size={56}/></button>
                                        </div>
                                        <button onClick={() => deleteRecord('clients', c.id)} className="text-slate-100 hover:text-red-600 p-10 transition-colors duration-500"><Trash2 size={60}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {viewMode === 'staff' && isAdmin && (
               <div className="max-w-7xl mx-auto space-y-32 pb-48 animate-in fade-in">
                  <div className="bg-[#020617] p-28 rounded-[8rem] shadow-3xl relative overflow-hidden group border-b-[15px] border-[#0EA5E9]">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-24 border-b-4 border-white/5 pb-24 mb-24 relative z-10">
                           <div className="space-y-10">
                              <h2 className="text-8xl font-black text-white tracking-tighter uppercase leading-none italic">Asistentes</h2>
                              <p className="text-[20px] font-bold text-[#10B981] uppercase tracking-[1em] italic leading-none ml-2">Control de Personal Nysem</p>
                           </div>
                           <button onClick={handleSaveUser} className={`px-32 py-12 rounded-[5rem] text-[24px] font-black uppercase tracking-[0.6em] text-white shadow-3xl hover:scale-[1.05] transition-all flex items-center gap-12 border-4 border-white/20 active:scale-95 ${editingId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                              {editingId ? "GUARDAR" : "INTEGRAR AUDITOR"}
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 relative z-10">
                            <input type="text" placeholder="NOMBRE STAFF" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9]"/>
                            <input type="text" placeholder="USUARIO LOGIN" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9]"/>
                            <input type="text" placeholder="CONTRASEÑA" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-3xl uppercase outline-none focus:border-[#0EA5E9]"/>
                            <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-[18px] uppercase h-28 text-center outline-none cursor-pointer">
                                <option value="Auditor">AUDITOR (STAFF)</option>
                                <option value="Administrador">ADMINISTRADOR (CPC)</option>
                            </select>
                        </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-28">
                        {users.map(u => (
                            <div key={u.id} className="bg-white p-24 rounded-[8rem] border-4 border-slate-50 flex flex-col items-center group shadow-2xl transition-all border-b-[25px] hover:border-[#10B981] text-center">
                                <div className="w-48 h-48 bg-slate-50 rounded-[4rem] flex items-center justify-center text-[#020617] border-4 border-slate-100 shadow-xl mb-16 mx-auto"><UserCog size={100}/></div>
                                <h3 className="font-black text-[#020617] uppercase text-[3.5rem] leading-[1] tracking-tighter mb-10 italic">{String(u.name)}</h3>
                                <div className="flex flex-col items-center gap-8 mb-20">
                                   <span className="px-12 py-5 rounded-full text-[16px] font-black uppercase tracking-[0.6em] border-4 bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/20">{String(u.role)}</span>
                                   <span className="text-[24px] font-black text-slate-300 font-mono tracking-[0.6em] uppercase italic opacity-70">ID: {String(u.username)}</span>
                                </div>
                                <div className="w-full flex justify-between items-center mt-auto pt-20 border-t-4 border-slate-50">
                                    <button onClick={() => { setEditingId(u.id); setUserForm({ name: u.name, username: u.username, password: u.password, role: u.role }); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-10 rounded-[3rem] bg-slate-50 text-slate-400 hover:bg-[#0EA5E9] hover:text-white transition-all shadow-3xl border-4 border-slate-100"><Edit size={56}/></button>
                                    <button onClick={() => deleteRecord('users', u.id)} className="text-slate-100 hover:text-red-600 transition-colors p-10 hover:bg-red-50 rounded-[3rem] duration-500"><Trash2 size={60}/></button>
                                </div>
                            </div>
                        ))}
                  </div>
               </div>
            )}

            {viewMode === 'reports' && (
               <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-32 pb-48 animate-in fade-in">
                  <div className="bg-[#020617] p-24 rounded-[8rem] shadow-2xl h-fit sticky top-12 overflow-hidden border-b-[20px] border-[#10B981]">
                        <div className="flex items-center gap-14 mb-20 relative z-10">
                           <div className="p-10 bg-[#10B981] rounded-[3.5rem] text-white shadow-3xl"><Timer size={72}/></div>
                           <h2 className="text-6xl font-black text-white uppercase italic leading-none">Reportar</h2>
                        </div>
                        <div className="space-y-16 relative z-10">
                            <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all text-5xl"/>
                            <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white text-[20px] uppercase h-28 text-center outline-none">
                                <option value="">CLIENTE...</option>
                                {clients.map(c => <option key={c.id} value={c.name} className="text-black">{String(c.name)}</option>)}
                            </select>
                            <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-14 bg-white/5 rounded-[5rem] border-4 border-white/10 resize-none h-[600px] font-medium text-white shadow-inner text-[30px] leading-relaxed outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all" placeholder="LABOR REALIZADA..."></textarea>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName || !fbUser) return;
                                try {
                                  await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { 
                                    ...reportForm, userName: currentUserData?.name, createdAt: Timestamp.now() 
                                  });
                                  setReportForm({ ...reportForm, description: '', time: '' });
                                  notify("Avance Archivado.");
                                } catch(e) { notify("Error al archivar.", "error"); }
                            }} className="w-full bg-[#10B981] text-white py-14 rounded-[5.5rem] font-black text-[24px] uppercase tracking-[1em] shadow-3xl active:scale-95 transition-all">ARCHIVAR</button>
                        </div>
                  </div>

                  <div className="xl:col-span-2 bg-white p-28 rounded-[9rem] border-4 border-slate-50 min-h-[1800px] shadow-sm relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-8 border-slate-50 pb-28 mb-32 gap-16 relative z-10">
                            <h3 className="font-black text-[#020617] text-[7rem] uppercase tracking-tighter italic drop-shadow-sm">Historial</h3>
                            <div className="bg-[#020617] px-20 py-12 rounded-full text-[30px] font-black text-[#0EA5E9] shadow-3xl flex items-center gap-12 border-4 border-white/10">
                               <Clock size={48} className="animate-pulse text-[#10B981]"/> {getTodayISO()}
                            </div>
                        </div>
                        
                        <div className="space-y-32 relative border-l-[25px] border-slate-50 ml-24 pb-72 relative z-10">
                            {reports.length > 0 ? (
                                reports.map((r, i) => (
                                    <div key={r.id} className="relative pl-32 animate-in slide-in-from-left-32 duration-700">
                                        <div className="absolute -left-[54px] top-6 w-20 h-20 rounded-full bg-[#10B981] border-[15px] border-white shadow-3xl"></div>
                                        <div className="bg-slate-50/70 p-24 rounded-[9rem] border-4 border-slate-100 flex flex-col md:flex-row md:justify-between md:items-start gap-20 hover:bg-white transition-all group relative overflow-hidden">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-14 mb-14">
                                                    <span className="text-[22px] font-black text-[#10B981] uppercase tracking-[0.6em] bg-[#10B981]/10 px-14 py-7 rounded-full border-4 border-[#10B981]/20 leading-none">{String(r.clientName)}</span>
                                                    <span className="text-[22px] font-mono font-black text-slate-400 bg-white px-12 py-7 rounded-4xl border-4 border-slate-100">{String(r.time)}</span>
                                                </div>
                                                <p className="text-[50px] font-bold text-[#020617] italic font-serif leading-tight drop-shadow-sm leading-snug">"{String(r.description)}"</p>
                                                <div className="mt-28 flex items-center gap-14 text-[20px] font-black text-slate-400 uppercase tracking-[1em]">
                                                    <div className="w-36 h-36 rounded-[3.5rem] bg-white border-4 border-slate-100 flex items-center justify-center text-[#10B981] font-black text-6xl shadow-2xl">
                                                      {String(r.userName || "A").charAt(0)}
                                                    </div>
                                                    <div>
                                                      <span className="block text-[#020617] text-[2.8rem] font-black italic tracking-tighter mb-4">{String(r.userName)}</span>
                                                      <span className="block opacity-60 tracking-[0.5em]">AUDITOR RESPONSABLE</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => deleteRecord('reports', r.id)} className="text-slate-100 hover:text-red-600 p-14 transition-all duration-500 opacity-0 group-hover:opacity-100 active:scale-90"><Trash2 size={72}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-[500px] text-center opacity-30 italic">
                                    <Activity size={300} className="mx-auto mb-24 text-slate-200 animate-pulse"/>
                                    <p className="text-5xl font-black text-slate-300 uppercase tracking-[2em] ml-[2em]">Nodo Vacío</p>
                                </div>
                            )}
                        </div>
                  </div>
               </div>
            )}

          </div>
          
          <footer className="h-32 bg-[#020617] flex items-center px-32 justify-between text-[15px] font-black text-slate-600 uppercase tracking-[1.2em] z-50 border-t-8 border-white/5">
             <div className="flex flex-col">
                <span>Nysem Montalbán EIRL • 2026</span>
                {isAdmin && <span className="text-[10px] text-slate-800 lowercase tracking-widest opacity-30 leading-none mt-2 italic">Master Node: {appId}</span>}
             </div>
             <span className="flex items-center gap-24">
                <span className={`flex items-center gap-8 font-black italic ${isConfigured ? 'text-[#10B981]' : 'text-amber-500'}`}>
                  <div className={`w-6 h-6 rounded-full animate-pulse ${isConfigured ? 'bg-[#10B981] shadow-[0_0_20px_#10B981]' : 'bg-amber-500 shadow-[0_0_20px_#f59e0b]'}`}></div> 
                  {isConfigured ? "NUBE SINCRONIZADA" : "SIN CONEXIÓN A NUBE"}
                </span>
                <span className="flex items-center gap-10 opacity-50"><ShieldCheck size={32}/> SUPREME v28.0.0</span>
             </span>
          </footer>
       </main>
    </div>
  );
}
