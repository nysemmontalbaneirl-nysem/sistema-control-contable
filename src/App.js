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
 * VERSIÓN 21.0.0 - ELITE CORPORATE PERFORMANCE
 * ENFOQUE: Legibilidad XL, Colores Forzados y Distribución Gerencial.
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

  // --- LÓGICA DE RIESGO SUNAT (MAPEO DE ESTILOS ESTÁTICOS) ---
  const getRiskStyle = (ruc, taxStatus) => {
    if (!ruc) return { text: 'SIN RUC', bg: 'bg-gray-100', tx: 'text-gray-600', ring: 'ring-gray-200' }; 
    if (taxStatus === 'declared') return { text: 'DECLARADO', bg: 'bg-[#10B981]/10', tx: 'text-[#10B981]', ring: 'ring-[#10B981]/30' };
    const rucStr = String(ruc).trim();
    const lastDigit = parseInt(rucStr.charAt(rucStr.length - 1));
    if (isNaN(lastDigit)) return { text: 'INVÁLIDO', bg: 'bg-gray-100', tx: 'text-gray-600', ring: 'ring-gray-200' };
    
    if ([0, 1, 2].includes(lastDigit)) return { text: 'VENCE HOY', bg: 'bg-rose-100', tx: 'text-rose-700', ring: 'ring-rose-300' }; 
    if ([3, 4, 5, 6].includes(lastDigit)) return { text: 'PRÓXIMO', bg: 'bg-amber-100', tx: 'text-amber-700', ring: 'ring-amber-300' }; 
    return { text: 'EN PLAZO', bg: 'bg-[#0EA5E9]/10', tx: 'text-[#0EA5E9]', ring: 'ring-[#0EA5E9]/30' }; 
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
        setAccessError(`Error de Sincronización: ${err.message}`);
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
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteDocGeneric = async (col, id) => {
    if (window.confirm("¿Confirmar eliminación definitiva del registro?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617] text-white font-sans">
        <div className="flex flex-col items-center gap-10">
          <RefreshCw className="text-[#0EA5E9] animate-spin" size={70} />
          <div className="text-center">
             <p className="text-[14px] font-black tracking-[1em] uppercase text-[#0EA5E9]">NYSEM MONTALBÁN EIRL</p>
             <p className="text-[16px] text-slate-500 uppercase tracking-widest mt-6 font-mono animate-pulse">Cargando Entorno Ejecutivo v21.0</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-8 font-sans">
        <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-[0_60px_100px_-20px_rgba(2,6,23,0.15)] overflow-hidden border border-white flex flex-col">
          <div className="bg-[#020617] p-24 text-center text-white relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#0EA5E9]/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <Shield className="mx-auto mb-12 text-[#0EA5E9] drop-shadow-[0_0_20px_rgba(14,165,233,0.5)]" size={100}/>
            <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-6">SGP ACCESS</h1>
            <p className="text-[13px] font-black text-slate-500 uppercase tracking-[0.6em] italic">Asesoría & Capacitación Empresarial</p>
          </div>
          <div className="p-24 space-y-12 bg-white">
            <form onSubmit={handleLogin} className="space-y-10">
              {accessError && (
                <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] flex items-center gap-6 animate-in fade-in zoom-in">
                  <AlertCircle className="text-rose-600 shrink-0" size={32}/>
                  <p className="text-[15px] font-black text-rose-800 uppercase tracking-tight">{accessError}</p>
                </div>
              )}
              <div className="space-y-8">
                <input type="text" placeholder="ID DE USUARIO" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-9 bg-slate-50 rounded-[3rem] border-2 border-slate-100 font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:border-[#0EA5E9]/30 transition-all text-xl uppercase tracking-widest placeholder:text-slate-300" required />
                <input type="password" placeholder="FIRMA DIGITAL" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-9 bg-slate-50 rounded-[3rem] border-2 border-slate-100 font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:border-[#0EA5E9]/30 transition-all text-xl uppercase tracking-widest placeholder:text-slate-300" required />
              </div>
              <button type="submit" className="w-full bg-[#020617] text-white py-10 rounded-[4rem] font-black text-[16px] uppercase tracking-[0.6em] hover:bg-[#0EA5E9] transition-all shadow-3xl active:scale-95 mt-10 hover:shadow-[#0EA5E9]/30">Validar Acceso</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'Administrador';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans overflow-hidden">
       
       {/* SIDEBAR: ESTRUCTURA EJECUTIVA */}
       <aside className={`${sidebarOpen ? 'w-96' : 'w-32'} bg-[#020617] flex flex-col transition-all duration-700 shadow-[25px_0_60px_rgba(0,0,0,0.2)] z-50 relative border-r border-white/5`}>
         <div className="h-40 flex items-center px-14 border-b border-white/5">
            <div className="bg-[#10B981] p-6 rounded-[2rem] shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-transform hover:rotate-12">
              <Database className="text-white" size={42}/>
            </div>
            {sidebarOpen && (
              <div className="ml-8 animate-in fade-in slide-in-from-left-10">
                <span className="block font-black text-4xl text-white tracking-tighter uppercase italic leading-none">NYSEM</span>
                <span className="text-[11px] font-black text-[#0EA5E9] uppercase tracking-[0.7em] mt-3 block opacity-90 leading-none">CONTROL v21</span>
              </div>
            )}
         </div>

         <nav className="flex-1 p-12 space-y-6 overflow-y-auto">
            {[
              { id: 'dashboard', label: 'Dashboard Real', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Clientes', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora Staff', icon: Timer, show: true },
              { id: 'users', label: 'Gestión Staff', icon: UserCog, show: isAdmin }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-8 p-7 rounded-[2.5rem] text-[14px] font-black uppercase tracking-[0.3em] transition-all duration-500 group relative ${viewMode === item.id ? 'bg-[#0EA5E9] text-white shadow-[0_30px_60px_-15px_rgba(14,165,233,0.5)] translate-x-4' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
                <item.icon size={30} className={viewMode === item.id ? 'animate-pulse' : 'group-hover:scale-125 transition-transform'}/> 
                {sidebarOpen && item.label}
              </button>
            ))}
         </nav>

         <div className="p-12">
            <div className="bg-white/5 p-8 rounded-[3.5rem] border border-white/10 flex items-center gap-8 backdrop-blur-3xl group hover:bg-white/10 transition-all duration-500">
                <div className="w-20 h-20 rounded-[1.8rem] bg-[#10B981] flex items-center justify-center text-white font-black text-4xl shadow-2xl border border-white/10 group-hover:rotate-6 transition-transform">
                  {currentUserData?.name?.charAt(0)}
                </div>
                {sidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[14px] font-black text-white truncate uppercase tracking-tight leading-none mb-3">{currentUserData?.name}</p>
                    <button onClick={handleLogout} className="text-[11px] font-black text-rose-500 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-3">
                       <LogOut size={16}/> Cerrar Sesión
                    </button>
                  </div>
                )}
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* HEADER: REFINADO Y VISIBLE */}
          <header className="h-36 bg-white border-b-4 border-[#0EA5E9]/10 flex items-center px-20 justify-between z-40">
            <div className="flex items-center gap-12">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-6 bg-slate-50 hover:bg-[#0EA5E9]/5 rounded-[2rem] text-slate-400 hover:text-[#0EA5E9] border-2 border-slate-100 shadow-sm transition-all">
                  <Menu size={36}/>
                </button>
                <div className="hidden lg:flex items-center gap-6 bg-[#020617] px-12 py-6 rounded-[2.5rem] text-white shadow-xl">
                    <Monitor size={24} className="text-[#0EA5E9] animate-pulse"/>
                    <div className="flex flex-col">
                        <span className="text-[15px] font-black tracking-tighter uppercase leading-none">Terminal Maestro</span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-1">Conexión Cifrada Activa</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-12">
               <div className="flex flex-col items-end mr-8 hidden xl:flex">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2 leading-none">Auditoría en Tiempo Real</span>
                  <span className="text-[14px] font-black text-[#10B981] uppercase flex items-center gap-4">
                    <Zap size={18} fill="currentColor"/> NODO SINCRONIZADO
                  </span>
               </div>
               <div className="h-20 w-[3px] bg-slate-100"></div>
               <div className="flex items-center gap-8 bg-slate-50 px-14 py-6 rounded-[2.2rem] border-2 border-slate-100 font-mono text-[20px] font-black text-slate-800 shadow-inner group">
                  <Calendar size={28} className="text-[#0EA5E9] group-hover:rotate-12 transition-transform"/> {getTodayISO()}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-16 lg:p-24 custom-scrollbar bg-[#F8FAFC]">
            
            {/* DASHBOARD: DISTRIBUCIÓN GERENCIAL */}
            {viewMode === 'dashboard' && (
                <div className="space-y-24 animate-in fade-in duration-1000">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-16 border-l-[12px] border-[#0EA5E9] pl-16">
                        <div className="space-y-6">
                           <h2 className="text-9xl font-black text-[#020617] tracking-tighter leading-[0.8] uppercase italic">Control <br/>Ejecutivo</h2>
                           <p className="text-2xl font-bold text-slate-400 tracking-tight flex items-center gap-8">
                             <div className="w-24 h-2.5 bg-[#10B981] rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div> Gestión de Producción & Auditoría
                           </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-16">
                        {[
                          { title: "CARTERA CLIENTES", val: clients.length, icon: Building2, color: "#0EA5E9", label: "ENTIDADES" },
                          { title: "ALERTAS SUNAT", val: clients.filter(c => getRiskStyle(c.ruc, c.taxStatus).text === 'VENCE HOY').length, icon: AlertTriangle, color: "#F43F5E", label: "HOY" },
                          { title: "EQUIPO AUDITOR", val: users.length, icon: Users, color: "#10B981", label: "STAFF" },
                          { title: "REPORTES HOY", val: reports.filter(r => r.date === getTodayISO()).length, icon: Activity, color: "#6366F1", label: "ACCIONES" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-16 rounded-[6rem] border-b-[15px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)] hover:shadow-[0_80px_150px_-30px_rgba(14,165,233,0.15)] transition-all group relative overflow-hidden" style={{ borderBottomColor: stat.color }}>
                              <div className="w-28 h-28 rounded-[2.8rem] bg-slate-50 flex items-center justify-center mb-14 group-hover:scale-110 transition-transform duration-700 shadow-xl border border-slate-100">
                                <stat.icon size={56} style={{ color: stat.color }}/>
                              </div>
                              <h3 className="text-slate-400 text-[14px] font-black uppercase tracking-[0.5em] mb-4">{stat.title}</h3>
                              <div className="text-8xl font-black text-[#020617] tracking-tighter leading-none mb-10">{stat.val}</div>
                              <p className="text-[13px] font-black text-slate-300 uppercase tracking-widest leading-none pt-8 border-t border-slate-50">{stat.label} REGISTRADOS</p>
                              <div className="absolute -right-20 -bottom-20 opacity-[0.03] text-[#020617]"><stat.icon size={320}/></div>
                          </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CARTERA CLIENTES: DISTRIBUCIÓN XL */}
            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-24 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-[#020617] p-20 rounded-[6rem] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0EA5E9]/10 rounded-full blur-[150px] -mr-72 -mt-72 transition-all group-hover:bg-[#0EA5E9]/20 duration-1000"></div>
                        
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-16 border-b border-white/5 pb-20 mb-20 relative z-10">
                           <div className="space-y-6">
                              <h2 className="text-7xl font-black text-white tracking-tighter uppercase leading-none italic">Apertura Entidad</h2>
                              <p className="text-[14px] font-bold text-[#0EA5E9] uppercase tracking-[0.6em] flex items-center gap-10 italic leading-none">
                                 <div className="w-20 h-1.5 bg-[#10B981]"></div> Gestión Corporativa de Cartera
                              </p>
                           </div>
                           <div className="flex items-center gap-8">
                              {editingClientId && (
                                <button onClick={() => { setEditingClientId(null); setClientForm({ name: '', ruc: '', sector: 'Servicios', honorario: '' }); }} className="bg-white/5 text-slate-400 px-14 py-8 rounded-[3rem] text-[13px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-white/10 flex items-center gap-5 active:scale-95">
                                   <X size={24}/> CANCELAR
                                </button>
                              )}
                              <button onClick={handleSaveClient} className={`px-24 py-9 rounded-[4rem] text-[16px] font-black uppercase tracking-[0.5em] text-white shadow-3xl hover:scale-[1.05] transition-all flex items-center gap-8 border-2 border-white/20 active:scale-95 ${editingClientId ? 'bg-[#0EA5E9] shadow-[#0EA5E9]/40' : 'bg-[#10B981] shadow-[#10B981]/40'}`}>
                                 {editingClientId ? <><Save size={32}/> ACTUALIZAR</> : <><Plus size={32}/> VINCULAR</>}
                              </button>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 relative z-10">
                            <div className="space-y-6 lg:col-span-2">
                                <label className="text-[13px] font-black text-slate-500 ml-12 uppercase tracking-widest">Razón Social o Denominación</label>
                                <input type="text" placeholder="CONSORCIO AGRÍCOLA MONTALBÁN S.A.C." value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all uppercase tracking-tight text-3xl placeholder:text-slate-700"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-500 ml-12 uppercase tracking-widest text-center block">RUC (11 Dígitos)</label>
                                <input type="text" placeholder="20XXXXXXXXX" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none text-center font-mono focus:bg-white/10 transition-all text-3xl placeholder:text-slate-700"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-500 ml-12 uppercase tracking-widest text-center block">Sector Principal</label>
                                <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none appearance-none cursor-pointer text-center text-[15px] uppercase tracking-[0.4em]">
                                    <option value="Agricultura">AGRICULTURA</option>
                                    <option value="Construcción">CONSTRUCCIÓN</option>
                                    <option value="Exportación">EXPORTACIÓN</option>
                                    <option value="Comercio">COMERCIO</option>
                                    <option value="Servicios">SERVICIOS GLOBAL</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
                        {clients.map((c) => {
                            const style = getRiskStyle(c.ruc, c.taxStatus);
                            return (
                                <div key={c.id} className="bg-white p-20 rounded-[7rem] border-2 border-slate-50 flex flex-col justify-between items-start group shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] hover:shadow-[0_80px_150px_-30px_rgba(14,165,233,0.15)] transition-all duration-700 relative overflow-hidden animate-in slide-in-from-bottom-20 border-b-[20px] hover:border-[#0EA5E9]" style={{ borderBottomColor: style.tx.includes('rose') ? '#F43F5E' : (style.tx.includes('emerald') ? '#10B981' : '#F8FAFC') }}>
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-16">
                                            <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-[#020617] shadow-inner group-hover:bg-[#020617] group-hover:text-white transition-all duration-700 border border-slate-100 shadow-md">
                                                <Building2 size={56}/>
                                            </div>
                                            <div className={`px-10 py-4 rounded-full text-[14px] font-black uppercase tracking-[0.4em] border-2 transition-all duration-500 ${style.bg} ${style.tx} ${style.ring}`}>
                                                {style.text}
                                            </div>
                                        </div>
                                        <h3 className="font-black text-[#020617] uppercase text-5xl leading-[1] tracking-tighter group-hover:text-[#0EA5E9] transition-colors duration-500 mb-10">{String(c.name)}</h3>
                                        <div className="flex flex-wrap items-center gap-8 pt-10 border-t-2 border-slate-50">
                                              <span className="text-[20px] font-black text-slate-400 font-mono tracking-widest leading-none bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100 shadow-inner">RUC {String(c.ruc)}</span>
                                              <span className="text-[14px] font-black text-[#10B981] uppercase tracking-[0.4em] leading-none flex items-center gap-5">
                                                 <div className="w-4 h-4 rounded-full bg-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse"></div> {String(c.sector)}
                                              </span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full flex justify-between items-center mt-20 pt-16 border-t-2 border-slate-50">
                                        <div className="flex items-center gap-6">
                                           <button onClick={() => markAsDeclared(c.id)} className={`p-8 rounded-[2.2rem] transition-all duration-500 shadow-2xl active:scale-90 border-2 ${c.taxStatus === 'declared' ? 'bg-[#10B981] text-white border-[#10B981] shadow-[#10B981]/30' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-[#10B981] hover:text-white hover:border-[#10B981]'}`}>
                                              <CheckCircle2 size={40}/>
                                           </button>
                                           <button onClick={() => handleEditClient(c)} className="p-8 rounded-[2.2rem] bg-slate-50 text-slate-400 hover:bg-[#0EA5E9] hover:text-white transition-all duration-500 border-2 border-slate-100 shadow-xl shadow-[#0EA5E9]/10">
                                              <Edit size={40}/>
                                           </button>
                                        </div>
                                        <button onClick={() => deleteDocGeneric('clients', c.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-8 hover:bg-rose-50 rounded-[2.2rem] duration-500"><Trash2 size={44}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* BITÁCORA STAFF: ESTRUCTURA EJECUTIVA */}
            {viewMode === 'reports' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-24 animate-in fade-in duration-700 pb-32">
                    <div className="bg-[#020617] p-20 rounded-[6rem] shadow-[0_80px_150px_-20px_rgba(0,0,0,0.4)] h-fit sticky top-12 overflow-hidden border-b-[20px] border-[#10B981]">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#10B981]/10 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-[#10B981]/20 duration-1000"></div>
                        
                        <div className="flex items-center gap-12 mb-20 relative z-10">
                           <div className="p-8 bg-[#10B981] rounded-[2.5rem] text-white shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-transform hover:scale-110 duration-500"><Timer size={56}/></div>
                           <div className="space-y-4">
                              <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Bitácora</h2>
                              <p className="text-[12px] font-black text-[#0EA5E9] uppercase tracking-[0.6em] leading-none">Staff Audit Diario</p>
                           </div>
                        </div>
                        <div className="space-y-16 relative z-10">
                            <div className="space-y-6">
                                <label className="text-[14px] font-black text-slate-500 ml-12 uppercase tracking-widest leading-none">Cronometría (Hora)</label>
                                <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all text-3xl"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[14px] font-black text-slate-500 ml-12 uppercase tracking-widest leading-none">Entidad Bajo Auditoría</label>
                                <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none text-[16px] uppercase tracking-[0.3em] cursor-pointer appearance-none text-center h-24">
                                    <option value="">SELECCIÓN NODO...</option>
                                    {clients.map(c => <option key={c.id} value={c.name} className="text-slate-900">{String(c.name)}</option>)}
                                </select>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[14px] font-black text-slate-500 ml-12 uppercase tracking-widest leading-none">Labor Operativa Detallada</label>
                                <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-12 bg-white/5 rounded-[4rem] border-2 border-white/10 resize-none h-96 font-medium text-white shadow-inner text-[22px] leading-relaxed outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all placeholder:text-slate-700" placeholder="Reporte el avance contable, tributario o fiscal detallado..."></textarea>
                            </div>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName) return;
                                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { 
                                  ...reportForm, 
                                  userName: currentUserData?.name, 
                                  createdAt: Timestamp.now() 
                                });
                                setReportForm({ ...reportForm, description: '', time: '' });
                            }} className="w-full bg-[#10B981] text-white py-12 rounded-[5rem] font-black text-[18px] uppercase tracking-[0.8em] shadow-[0_50px_100px_-20px_rgba(16,185,129,0.5)] hover:bg-emerald-700 transition-all active:scale-95 group flex items-center justify-center gap-10 border-2 border-white/20">
                               <Timer size={40} className="group-hover:rotate-12 transition-transform"/> GRABAR AVANCE
                            </button>
                        </div>
                    </div>

                    <div className="xl:col-span-2 bg-white p-24 rounded-[8rem] border-2 border-slate-50 shadow-sm min-h-[1400px] overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 border-slate-50 pb-20 mb-24 gap-12">
                            <div className="space-y-6">
                               <h3 className="font-black text-[#020617] text-6xl uppercase tracking-tighter leading-none italic">Auditoría Global</h3>
                               <p className="text-[15px] font-black text-slate-400 uppercase tracking-[0.8em] leading-none flex items-center gap-6">
                                 <div className="w-16 h-1 bg-[#0EA5E9]"></div> Registro Maestro de Productividad
                               </p>
                            </div>
                            <div className="bg-[#020617] px-14 py-8 rounded-full text-[18px] font-black text-[#0EA5E9] uppercase tracking-[0.4em] shadow-2xl flex items-center gap-8 border-2 border-white/10 animate-in fade-in zoom-in duration-1000">
                               <Clock size={32} className="animate-pulse"/> {String(getTodayISO())}
                            </div>
                        </div>
                        
                        <div className="space-y-24 relative border-l-[15px] border-slate-50 ml-16 pb-48">
                            {reports.length > 0 ? (
                                reports.map((r, i) => (
                                    <div key={r.id} className="relative pl-24 animate-in slide-in-from-left-24 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="absolute -left-[37px] top-2 w-14 h-14 rounded-full bg-[#10B981] border-[12px] border-white shadow-3xl ring-[25px] ring-[#10B981]/10 group hover:scale-150 transition-transform duration-500"></div>
                                        <div className="bg-slate-50/50 p-16 rounded-[7rem] border-2 border-slate-100 flex flex-col md:flex-row md:justify-between md:items-start gap-14 hover:bg-white hover:shadow-[0_100px_200px_-50px_rgba(0,0,0,0.15)] hover:border-[#10B981]/30 transition-all duration-700 group relative overflow-hidden">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-10 mb-12">
                                                    <span className="text-[16px] font-black text-[#10B981] uppercase tracking-[0.5em] bg-[#10B981]/10 px-10 py-5 rounded-full border-2 border-[#10B981]/20 leading-none shadow-sm">{String(r.clientName)}</span>
                                                    <span className="text-[16px] font-mono font-black text-slate-400 leading-none uppercase tracking-[0.4em] bg-white px-8 py-5 rounded-3xl border-2 border-slate-100 shadow-inner">{String(r.time)}</span>
                                                </div>
                                                <p className="text-[34px] font-bold text-[#020617] leading-tight italic group-hover:text-black transition-colors duration-500 font-serif drop-shadow-sm">"{String(r.description)}"</p>
                                                <div className="mt-20 flex items-center gap-10 text-[16px] font-black text-slate-400 uppercase tracking-[0.6em]">
                                                    <div className="w-24 h-24 rounded-[2.5rem] bg-white border-2 border-slate-100 flex items-center justify-center text-[#10B981] font-black text-4xl group-hover:bg-[#10B981] group-hover:text-white transition-all shadow-xl group-hover:rotate-6">
                                                      {r.userName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                      <span className="block text-[#020617] text-2xl tracking-tighter mb-2">{String(r.userName)}</span>
                                                      <span className="block opacity-60">Auditor Responsable</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={async () => { if(window.confirm("¿Eliminar registro definitivo?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', r.id)) }} className="text-slate-100 hover:text-rose-600 p-10 transition-all duration-500 opacity-0 group-hover:opacity-100 relative z-20"><Trash2 size={48}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-96 text-center opacity-30">
                                    <Activity size={180} className="mx-auto mb-16 text-slate-200 animate-pulse"/>
                                    <p className="text-2xl font-black text-slate-300 uppercase tracking-[1em]">NODO DE DATOS VACÍO</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* GESTIÓN DE STAFF: DISTRIBUCIÓN XL */}
            {viewMode === 'users' && isAdmin && (
                <div className="max-w-7xl mx-auto space-y-24 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-[#020617] p-20 rounded-[6rem] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#10B981]/10 rounded-full blur-[120px] -mr-64 -mt-64 transition-all group-hover:bg-[#10B981]/20 duration-1000"></div>
                        
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-16 border-b border-white/5 pb-20 mb-20 relative z-10">
                           <div className="space-y-6">
                              <h2 className="text-7xl font-black text-white tracking-tighter uppercase leading-none italic">Gestión Personal</h2>
                              <p className="text-[14px] font-bold text-[#10B981] uppercase tracking-[0.6em] flex items-center gap-10 italic leading-none">
                                 <div className="w-20 h-1.5 bg-[#0EA5E9]"></div> Control de Auditores y Asistentes
                              </p>
                           </div>
                           <div className="flex items-center gap-8">
                              {editingUserId && (
                                <button onClick={() => { setEditingUserId(null); setUserForm({ name: '', username: '', password: '', role: 'Auditor', hourlyCost: '' }); }} className="bg-white/5 text-slate-400 px-14 py-8 rounded-[3rem] text-[13px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-white/10 flex items-center gap-5">
                                   <X size={24}/> CANCELAR
                                </button>
                              )}
                              <button onClick={handleSaveUser} className={`px-24 py-9 rounded-[4rem] text-[16px] font-black uppercase tracking-[0.5em] text-white shadow-3xl hover:scale-[1.05] transition-all flex items-center gap-8 border-2 border-white/20 active:scale-95 ${editingUserId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                                 {editingUserId ? <><Save size={32}/> GUARDAR CAMBIOS</> : <><UserPlus size={32}/> NUEVO AUDITOR</>}
                              </button>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 relative z-10">
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-500 ml-12 uppercase tracking-widest">Nombre del Auditor</label>
                                <input type="text" placeholder="CPC JUAN PÉREZ" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all uppercase tracking-tight text-2xl placeholder:text-slate-700"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-500 ml-12 uppercase tracking-widest">ID de Acceso</label>
                                <input type="text" placeholder="jperez_nysem" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all uppercase tracking-tight text-2xl placeholder:text-slate-700"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-500 ml-12 uppercase tracking-widest">Firma Digital</label>
                                <input type="text" placeholder="********" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all uppercase tracking-tight text-2xl placeholder:text-slate-700"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[13px] font-black text-slate-500 ml-12 uppercase tracking-widest">Rango Nodo</label>
                                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-2 border-white/10 font-black text-white shadow-inner outline-none appearance-none cursor-pointer text-center text-[15px] uppercase tracking-[0.4em]">
                                    <option value="Auditor">AUDITOR (STAFF)</option>
                                    <option value="Administrador">ADMINISTRADOR (CPC)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20 pb-32">
                        {users.map((u) => (
                            <div key={u.id} className="bg-white p-20 rounded-[7rem] border-2 border-slate-50 flex flex-col justify-between items-start group shadow-sm hover:shadow-[0_80px_150px_-30px_rgba(0,0,0,0.1)] transition-all duration-700 animate-in slide-in-from-bottom-20 border-b-[20px] hover:border-[#10B981]">
                                <div className="w-full">
                                    <div className="flex justify-between items-start mb-16">
                                        <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-[#020617] shadow-inner group-hover:bg-[#10B981] group-hover:text-white transition-all duration-700 border border-slate-100 shadow-md">
                                            <UserCog size={56}/>
                                        </div>
                                        <div className={`px-10 py-4 rounded-full text-[14px] font-black uppercase tracking-[0.4em] border-2 transition-all duration-500 ${u.role === 'Administrador' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/20'}`}>{u.role}</div>
                                    </div>
                                    <h3 className="font-black text-[#020617] uppercase text-5xl leading-[1] tracking-tighter group-hover:text-[#10B981] transition-colors duration-500 mb-10">{u.name}</h3>
                                    <p className="text-[20px] font-black text-slate-300 font-mono tracking-[0.5em] uppercase opacity-80 bg-slate-50 p-6 rounded-3xl w-fit border border-slate-100 shadow-inner">ID: {u.username}</p>
                                </div>
                                <div className="w-full flex justify-between items-center mt-24 pt-16 border-t-2 border-slate-50">
                                    <button onClick={() => handleEditUser(u)} className="p-8 rounded-[2.2rem] bg-slate-50 text-slate-400 hover:bg-[#0EA5E9] hover:text-white transition-all shadow-xl shadow-[#0EA5E9]/10 border-2 border-slate-100 active:scale-90"><Edit size={40}/></button>
                                    <button onClick={() => deleteDocGeneric('users', u.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-8 hover:bg-rose-50 rounded-[2.2rem] duration-500 active:scale-90"><Trash2 size={44}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

          </div>
          
          <footer className="h-20 bg-[#020617] flex items-center px-24 justify-between text-[11px] font-black text-slate-600 uppercase tracking-[0.7em] z-50 border-t-4 border-[#0EA5E9]/20">
             <span>Nysem Montalbán EIRL • Consultoría Especializada 2026</span>
             <span className="flex items-center gap-14">
                <span className="flex items-center gap-4 text-[#0EA5E9] font-black">
                   <div className="w-3.5 h-3.5 rounded-full bg-[#10B981] shadow-[0_0_20px_rgba(16,185,129,1)]"></div> CONEXIÓN SEGURA
                </span>
                <span className="text-white/5 font-thin text-3xl">|</span>
                <span className="flex items-center gap-6 group cursor-help">
                   <Shield size={18} className="text-slate-700 group-hover:text-[#0EA5E9] transition-colors"/> ROYAL AUDIT v21.0.0
                </span>
             </span>
          </footer>
       </main>
    </div>
  );
}
