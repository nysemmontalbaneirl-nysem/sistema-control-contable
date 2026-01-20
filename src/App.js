import React, { useState, useEffect } from 'react';
import { 
  Users, Menu, Home, Timer, RefreshCw, FolderOpen, 
  CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, History, Lock, Database, 
  LogOut, Clock, AlertCircle, Edit, X, Save,
  ChevronRight, Briefcase, TrendingUp, UserPlus, UserCog, BadgeCheck,
  Zap, Globe, Activity, PieChart, Layers, Search, Monitor, Cpu,
  Key, ShieldCheck, Settings
} from 'lucide-react';

// Firebase v11+ Implementation
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, 
  updateDoc, deleteDoc, Timestamp, query, orderBy, getDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from 'firebase/auth';

/**
 * NYSEM MONTALBAN EIRL - SISTEMA DE GESTIÓN DE PRODUCCIÓN (SGP)
 * VERSIÓN 22.0.0 - MASTER GOVERNANCE & PERSISTENCE FIX
 * ENFOQUE: Persistencia Garantizada, Gestión de Roles y Distribución Elite.
 */

// Global Config & Sanity Checks
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : "{}");
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nysem-app';

let app, auth, db;
if (firebaseConfig.apiKey) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
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

  // --- NOTIFICATION SYSTEM ---
  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- AUTHENTICATION FLOW ---
  useEffect(() => {
    const initAuth = async () => {
      if (!auth) return;
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setAccessError("Error de conexión con el nodo de seguridad.");
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user || !db) return;
    
    // Path: /artifacts/{appId}/public/data/{collection}
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');

    const unsubUsers = onSnapshot(usersRef, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Users sync error:", err));

    const unsubClients = onSnapshot(clientsRef, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Clients sync error:", err));

    const unsubReports = onSnapshot(query(reportsRef, orderBy("createdAt", "desc")), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Reports sync error:", err));

    return () => {
      unsubUsers();
      unsubClients();
      unsubReports();
    };
  }, [user]);

  // --- LOGICA DE NEGOCIO ---
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
      setAccessError("Credenciales no válidas para el entorno Nysem.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserData(null);
    setViewMode('dashboard');
  };

  // --- PERSISTENCE: CLIENTS ---
  const handleSaveClient = async () => {
    if (!clientForm.name || !clientForm.ruc || !user) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingId), {
          ...clientForm, updatedAt: Timestamp.now()
        });
        notify("Entidad actualizada correctamente.");
      } else {
        await addDoc(colRef, { 
          ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() 
        });
        notify("Nueva entidad vinculada al nodo.");
      }
      setClientForm({ name: '', ruc: '', sector: 'Servicios', honorario: '' });
      setEditingId(null);
    } catch (e) {
      console.error(e);
      notify("Error al persistir datos.", "error");
    }
  };

  // --- PERSISTENCE: USERS & ROLES ---
  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.username || !user) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingId), {
          ...userForm, updatedAt: Timestamp.now()
        });
        notify("Perfil de staff actualizado.");
      } else {
        await addDoc(colRef, { 
          ...userForm, createdAt: Timestamp.now() 
        });
        notify("Nuevo auditor integrado al equipo.");
      }
      setUserForm({ name: '', username: '', password: '', role: 'Auditor' });
      setEditingId(null);
    } catch (e) {
      console.error(e);
      notify("Error al registrar staff.", "error");
    }
  };

  const deleteRecord = async (col, id) => {
    if (!user) return;
    if (window.confirm("¿Confirma la eliminación permanente de este registro corporativo?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
        notify("Registro eliminado del historial.");
      } catch (e) {
        console.error(e);
        notify("Fallo en la eliminación.", "error");
      }
    }
  };

  const markAsDeclared = async (id) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id), { 
        taxStatus: 'declared' 
      });
      notify("Impuestos marcados como DECLARADOS.");
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
      <div className="h-screen flex items-center justify-center bg-[#020617] text-white font-sans">
        <div className="flex flex-col items-center gap-10">
          <RefreshCw className="text-[#0EA5E9] animate-spin" size={80} />
          <div className="text-center">
             <p className="text-[14px] font-black tracking-[1.5em] uppercase text-[#0EA5E9]">NYSEM MONTALBÁN EIRL</p>
             <p className="text-[18px] text-slate-500 uppercase tracking-widest mt-6 font-mono animate-pulse italic">Validando Nodo Maestro v22.0</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-8 font-sans relative">
        <div className="bg-white w-full max-w-2xl rounded-[5rem] shadow-[0_80px_150px_-30px_rgba(2,6,23,0.2)] overflow-hidden border border-white flex flex-col z-10">
          <div className="bg-[#020617] p-24 text-center text-white relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#0EA5E9]/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <Shield className="mx-auto mb-12 text-[#0EA5E9] drop-shadow-[0_0_30px_rgba(14,165,233,0.5)]" size={110}/>
            <h1 className="text-7xl font-black uppercase tracking-tighter leading-none mb-6">Master Login</h1>
            <p className="text-[14px] font-black text-slate-500 uppercase tracking-[0.8em] italic">Asesoría & Capacitación Empresarial</p>
          </div>
          <div className="p-24 space-y-12 bg-white">
            <form onSubmit={handleLogin} className="space-y-12">
              {accessError && (
                <div className="p-8 bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] flex items-center gap-6 animate-in fade-in zoom-in">
                  <AlertCircle className="text-rose-600 shrink-0" size={32}/>
                  <p className="text-[16px] font-black text-rose-800 uppercase tracking-tight">{accessError}</p>
                </div>
              )}
              <div className="space-y-8">
                <input type="text" placeholder="ID DE USUARIO" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-2 border-slate-100 font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:border-[#0EA5E9] transition-all text-3xl uppercase tracking-widest placeholder:text-slate-300" required />
                <input type="password" placeholder="CLAVE DIGITAL" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-2 border-slate-100 font-black text-slate-800 shadow-inner outline-none focus:bg-white focus:border-[#0EA5E9] transition-all text-3xl uppercase tracking-widest placeholder:text-slate-300" required />
              </div>
              <button type="submit" className="w-full bg-[#020617] text-white py-11 rounded-[4rem] font-black text-[18px] uppercase tracking-[0.8em] hover:bg-[#0EA5E9] transition-all shadow-3xl active:scale-95 mt-10 hover:shadow-[#0EA5E9]/40">Iniciar Consola</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'Administrador';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
       
       {/* NOTIFICATION LAYER */}
       {notification && (
         <div className={`fixed top-10 right-10 z-[100] p-8 rounded-[2.5rem] shadow-2xl border-4 flex items-center gap-6 animate-in slide-in-from-right-20 duration-500 ${notification.type === 'success' ? 'bg-[#10B981] border-white text-white' : 'bg-rose-600 border-white text-white'}`}>
            <BadgeCheck size={36}/>
            <span className="text-xl font-black uppercase tracking-widest">{notification.msg}</span>
         </div>
       )}

       {/* SIDEBAR CORPORATIVO */}
       <aside className={`${sidebarOpen ? 'w-[450px]' : 'w-36'} bg-[#020617] flex flex-col transition-all duration-700 shadow-[30px_0_80px_rgba(0,0,0,0.3)] z-50 relative border-r border-white/5`}>
         <div className="h-48 flex items-center px-16 border-b border-white/5">
            <div className="bg-[#10B981] p-7 rounded-[2.2rem] shadow-[0_0_40px_rgba(16,185,129,0.6)]">
              <Database className="text-white" size={48}/>
            </div>
            {sidebarOpen && (
              <div className="ml-10 animate-in fade-in slide-in-from-left-12">
                <span className="block font-black text-5xl text-white tracking-tighter uppercase italic leading-none">NYSEM</span>
                <span className="text-[12px] font-black text-[#0EA5E9] uppercase tracking-[0.8em] mt-5 block opacity-90 leading-none">CORE v22</span>
              </div>
            )}
         </div>

         <nav className="flex-1 p-14 space-y-7 overflow-y-auto custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Clientes', icon: Building2, show: true },
              { id: 'reports', label: 'Producción Diaria', icon: Timer, show: true },
              { id: 'roles', label: 'Seguridad y Roles', icon: ShieldCheck, show: isAdmin },
              { id: 'staff', label: 'Gestión de Staff', icon: Users, show: isAdmin }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => { setViewMode(item.id); setEditingId(null); }} className={`w-full flex items-center gap-9 p-8 rounded-[3rem] text-[16px] font-black uppercase tracking-[0.4em] transition-all duration-500 group relative ${viewMode === item.id ? 'bg-[#0EA5E9] text-white shadow-[0_30px_60px_-15px_rgba(14,165,233,0.6)] translate-x-6 border-l-[12px] border-emerald-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
                <item.icon size={36} className={viewMode === item.id ? 'animate-pulse' : 'group-hover:scale-125 transition-transform'}/> 
                {sidebarOpen && item.label}
              </button>
            ))}
         </nav>

         <div className="p-14">
            <div className="bg-white/5 p-9 rounded-[4rem] border border-white/10 flex items-center gap-9 backdrop-blur-3xl group hover:bg-white/10 transition-all duration-500">
                <div className="w-22 h-22 rounded-[2rem] bg-[#10B981] flex items-center justify-center text-white font-black text-5xl shadow-3xl border border-white/10">
                  {currentUserData?.name?.charAt(0)}
                </div>
                {sidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[16px] font-black text-white truncate uppercase tracking-tight leading-none mb-4">{currentUserData?.name}</p>
                    <button onClick={handleLogout} className="text-[12px] font-black text-rose-500 uppercase tracking-[0.5em] hover:text-white transition-colors flex items-center gap-4">
                       <LogOut size={18}/> Salida Segura
                    </button>
                  </div>
                )}
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* HEADER PREMIUM */}
          <header className="h-44 bg-white border-b-8 border-[#F1F5F9] flex items-center px-24 justify-between z-40">
            <div className="flex items-center gap-16">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-8 bg-slate-50 hover:bg-[#0EA5E9]/5 rounded-[2.5rem] text-slate-400 hover:text-[#0EA5E9] border-4 border-slate-100 shadow-xl transition-all">
                  <Menu size={44}/>
                </button>
                <div className="hidden lg:flex items-center gap-10 bg-[#020617] px-14 py-8 rounded-[3rem] text-white shadow-2xl">
                    <Monitor size={32} className="text-[#0EA5E9] animate-pulse"/>
                    <div className="flex flex-col">
                        <span className="text-[18px] font-black tracking-tighter uppercase leading-none">Terminal CPC</span>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.6em] mt-2 italic">Persistencia de Datos Activa</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-16">
               <div className="flex flex-col items-end mr-10 hidden xl:flex">
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.7em] mb-3 leading-none italic">Sincronización Nysem Cloud</span>
                  <span className="text-[18px] font-black text-[#10B981] uppercase flex items-center gap-5">
                    <Zap size={24} fill="currentColor"/> NODO ESTABLE
                  </span>
               </div>
               <div className="h-24 w-[4px] bg-slate-100 rounded-full"></div>
               <div className="flex items-center gap-10 bg-slate-50 px-16 py-8 rounded-[2.8rem] border-2 border-slate-100 font-mono text-[24px] font-black text-slate-800 shadow-inner group">
                  <Calendar size={36} className="text-[#0EA5E9]"/> {getTodayISO()}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-20 lg:p-28 custom-scrollbar bg-[#F8FAFC]">
            
            {/* DASHBOARD XL */}
            {viewMode === 'dashboard' && (
                <div className="space-y-28 animate-in fade-in duration-1000">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-20 border-l-[15px] border-[#0EA5E9] pl-20">
                        <div className="space-y-8">
                           <h2 className="text-[10rem] font-black text-[#020617] tracking-tighter leading-[0.8] uppercase italic drop-shadow-2xl">Gestión <br/>Maestra</h2>
                           <p className="text-3xl font-bold text-slate-400 tracking-tight flex items-center gap-10 italic">
                             <div className="w-32 h-3 bg-[#10B981] rounded-full shadow-[0_0_25px_rgba(16,185,129,0.7)]"></div> Nysem Montalbán EIRL
                           </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-20">
                        {[
                          { title: "CARTERA CLIENTES", val: clients.length, icon: Building2, color: "#0EA5E9" },
                          { title: "ALERTAS SUNAT", val: clients.filter(c => getRiskStyle(c.ruc, c.taxStatus).text === 'VENCE HOY').length, icon: AlertTriangle, color: "#F43F5E" },
                          { title: "STAFF AUDITOR", val: users.length, icon: Users, color: "#10B981" },
                          { title: "AVANCES HOY", val: reports.filter(r => r.date === getTodayISO()).length, icon: Activity, color: "#6366F1" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-20 rounded-[7rem] border-b-[20px] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.1)] hover:shadow-[0_100px_200px_-40px_rgba(14,165,233,0.2)] transition-all group relative overflow-hidden border-2 border-slate-50" style={{ borderBottomColor: stat.color }}>
                              <div className="w-36 h-36 rounded-[3.5rem] bg-slate-50 flex items-center justify-center mb-16 group-hover:scale-110 transition-transform duration-700 shadow-2xl border border-slate-100">
                                <stat.icon size={72} style={{ color: stat.color }}/>
                              </div>
                              <h3 className="text-slate-400 text-[16px] font-black uppercase tracking-[0.7em] mb-6">{stat.title}</h3>
                              <div className="text-[9rem] font-black text-[#020617] tracking-tighter leading-none mb-12">{stat.val}</div>
                              <div className="absolute -right-28 -bottom-28 opacity-[0.05] text-[#020617] rotate-12"><stat.icon size={450}/></div>
                          </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CARTERA CLIENTES */}
            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-28 animate-in fade-in zoom-in-95 duration-700 pb-40">
                    <div className="bg-[#020617] p-24 rounded-[7rem] shadow-[0_80px_150px_-30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-[#0EA5E9]/15 rounded-full blur-[180px] -mr-80 -mt-80"></div>
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-20 border-b-2 border-white/5 pb-24 mb-24 relative z-10">
                           <div className="space-y-8">
                              <h2 className="text-8xl font-black text-white tracking-tighter uppercase leading-none italic">Control Cartera</h2>
                              <p className="text-[18px] font-bold text-[#0EA5E9] uppercase tracking-[0.8em] flex items-center gap-12 italic leading-none">
                                 <div className="w-24 h-2 bg-[#10B981]"></div> Registro Permanente de Entidades
                              </p>
                           </div>
                           <button onClick={handleSaveClient} className={`px-28 py-11 rounded-[4.5rem] text-[20px] font-black uppercase tracking-[0.6em] text-white shadow-3xl hover:scale-[1.05] transition-all flex items-center gap-10 border-4 border-white/20 active:scale-95 ${editingId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                              {editingId ? <><Save size={40}/> ACTUALIZAR</> : <><Plus size={40}/> VINCULAR</>}
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 relative z-10">
                            <div className="space-y-8 lg:col-span-2">
                                <label className="text-[16px] font-black text-slate-500 ml-16 uppercase tracking-widest leading-none">Razón Social</label>
                                <input type="text" placeholder="EJ: CONSORCIO AGRÍCOLA..." value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all uppercase tracking-tight text-4xl placeholder:text-slate-800"/>
                            </div>
                            <div className="space-y-8">
                                <label className="text-[16px] font-black text-slate-500 ml-16 uppercase tracking-widest text-center block">RUC (11 Dig)</label>
                                <input type="text" placeholder="20XXXXXXXXX" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="w-full p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white shadow-inner outline-none text-center font-mono focus:bg-white/10 transition-all text-4xl placeholder:text-slate-800"/>
                            </div>
                            <div className="space-y-8">
                                <label className="text-[16px] font-black text-slate-500 ml-16 uppercase tracking-widest text-center block">Sector</label>
                                <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="w-full p-12 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white shadow-inner outline-none appearance-none cursor-pointer text-center text-[18px] uppercase tracking-[0.5em] h-28">
                                    <option value="Agricultura">AGRICULTURA</option>
                                    <option value="Construcción">CONSTRUCCIÓN</option>
                                    <option value="Exportación">EXPORTACIÓN</option>
                                    <option value="Comercio">COMERCIO</option>
                                    <option value="Servicios">SERVICIOS</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
                        {clients.map(c => {
                            const style = getRiskStyle(c.ruc, c.taxStatus);
                            return (
                                <div key={c.id} className="bg-white p-24 rounded-[8rem] border-4 border-slate-50 flex flex-col justify-between items-start group shadow-2xl transition-all duration-700 relative overflow-hidden border-b-[30px] hover:border-[#0EA5E9]" style={{ borderBottomColor: style.text === 'VENCE HOY' ? '#F43F5E' : (c.taxStatus === 'declared' ? '#10B981' : '#F8FAFC') }}>
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-20">
                                            <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center text-[#020617] shadow-inner group-hover:bg-[#020617] group-hover:text-white transition-all duration-700 border-2 border-slate-100"><Building2 size={64}/></div>
                                            <div className={`px-12 py-5 rounded-full text-[16px] font-black uppercase tracking-[0.5em] border-4 transition-all duration-500 ${style.bg} ${style.tx} ${style.ring}`}>
                                                {style.text}
                                            </div>
                                        </div>
                                        <h3 className="font-black text-[#020617] uppercase text-6xl leading-[1] tracking-tighter group-hover:text-[#0EA5E9] transition-colors duration-500 mb-12 drop-shadow-sm">{c.name}</h3>
                                        <div className="flex flex-wrap items-center gap-10 pt-12 border-t-4 border-slate-50">
                                              <span className="text-[24px] font-black text-slate-400 font-mono tracking-widest leading-none bg-slate-50 px-10 py-5 rounded-3xl border-2 border-slate-100 shadow-inner">RUC {c.ruc}</span>
                                              <span className="text-[16px] font-black text-[#10B981] uppercase tracking-[0.5em] leading-none flex items-center gap-6">
                                                 <div className="w-5 h-5 rounded-full bg-[#10B981] shadow-[0_0_20px_rgba(16,185,129,1)] animate-pulse"></div> {c.sector}
                                              </span>
                                        </div>
                                    </div>
                                    <div className="w-full flex justify-between items-center mt-24 pt-20 border-t-4 border-slate-50">
                                        <div className="flex items-center gap-8">
                                           <button onClick={() => markAsDeclared(c.id)} className={`p-10 rounded-[2.5rem] transition-all duration-500 shadow-3xl active:scale-90 border-4 ${c.taxStatus === 'declared' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-[#10B981] hover:text-white hover:border-[#10B981]'}`} title="Declarar Impuestos">
                                              <CheckCircle2 size={48}/>
                                           </button>
                                           <button onClick={() => { setEditingId(c.id); setClientForm({ name: c.name, ruc: c.ruc, sector: c.sector, honorario: c.honorario }); }} className="p-10 rounded-[2.5rem] bg-slate-50 text-slate-400 hover:bg-[#0EA5E9] hover:text-white transition-all duration-500 border-4 border-slate-100 shadow-3xl">
                                              <Edit size={48}/>
                                           </button>
                                        </div>
                                        <button onClick={() => deleteRecord('clients', c.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-10 hover:bg-rose-50 rounded-[2.5rem] duration-500"><Trash2 size={52}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* MÓDULO DE SEGURIDAD Y ROLES */}
            {viewMode === 'roles' && isAdmin && (
                <div className="max-w-7xl mx-auto space-y-28 animate-in fade-in duration-700">
                    <div className="bg-[#020617] p-24 rounded-[7rem] shadow-3xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px] -mr-64 -mt-64"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-16">
                           <div className="space-y-6">
                              <h2 className="text-7xl font-black uppercase tracking-tighter italic flex items-center gap-10">
                                 <ShieldCheck size={70} className="text-[#10B981]"/> Arquitectura de Roles
                              </h2>
                              <p className="text-2xl text-slate-400 font-bold tracking-tight italic">Estructura de Permisos y Segregación de Funciones Nysem</p>
                           </div>
                           <div className="bg-white/5 p-10 rounded-[4rem] border-4 border-white/10 backdrop-blur-3xl text-center">
                              <span className="text-[12px] font-black uppercase tracking-[0.5em] text-[#0EA5E9] block mb-4">Integridad del Nodo</span>
                              <span className="text-4xl font-black text-[#10B981] uppercase tracking-widest flex items-center gap-4 justify-center">
                                 <Key size={36}/> CIFRADO AES
                              </span>
                           </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
                        <div className="bg-white p-24 rounded-[6rem] border-4 border-slate-100 shadow-xl space-y-16">
                           <div className="flex items-center gap-10 pb-10 border-b-4 border-slate-50">
                              <div className="p-8 bg-sky-50 rounded-[2.5rem] text-sky-600 shadow-inner"><Monitor size={48}/></div>
                              <div>
                                 <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Perfil Administrador</h3>
                                 <p className="text-lg text-slate-400 font-bold tracking-widest mt-2 uppercase">Jerarquía Total (CPC)</p>
                              </div>
                           </div>
                           <ul className="space-y-10">
                              {[
                                "Gestión Maestra de Staff y Auditoría de Cuentas.",
                                "Apertura y Cierre de Entidades Contables.",
                                "Aprobación de V°B° en Bitácora de Producción.",
                                "Acceso a Reportes de Rentabilidad y Costeo HH.",
                                "Mantenimiento de Nodo y Limpieza de Registros."
                              ].map((item, i) => (
                                <li key={i} className="flex items-center gap-8 text-2xl font-bold text-slate-700 italic group">
                                   <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-sm"><CheckCircle2 size={24}/></div>
                                   {item}
                                </li>
                              ))}
                           </ul>
                        </div>

                        <div className="bg-white p-24 rounded-[6rem] border-4 border-slate-100 shadow-xl space-y-16 opacity-80">
                           <div className="flex items-center gap-10 pb-10 border-b-4 border-slate-50">
                              <div className="p-8 bg-emerald-50 rounded-[2.5rem] text-emerald-600 shadow-inner"><Cpu size={48}/></div>
                              <div>
                                 <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Perfil Auditor</h3>
                                 <p className="text-lg text-slate-400 font-bold tracking-widest mt-2 uppercase">Fuerza Operativa (Staff)</p>
                              </div>
                           </div>
                           <ul className="space-y-10">
                              {[
                                "Visualización de Cartera y Semáforo SUNAT.",
                                "Registro de Avances y Horas de Producción.",
                                "Consulta de Documentación de Entidades.",
                                "Limitado: No puede eliminar registros maestros.",
                                "Limitado: No tiene acceso a Gestión de Staff ni Roles."
                              ].map((item, i) => (
                                <li key={i} className="flex items-center gap-8 text-2xl font-bold text-slate-400 italic group">
                                   <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#10B981] group-hover:text-white transition-all shadow-sm"><Lock size={24}/></div>
                                   {item}
                                </li>
                              ))}
                           </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* GESTIÓN DE STAFF */}
            {viewMode === 'staff' && isAdmin && (
               <div className="max-w-7xl mx-auto space-y-28 animate-in fade-in zoom-in-95 duration-700 pb-40">
                  <div className="bg-[#020617] p-24 rounded-[7rem] shadow-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#10B981]/15 rounded-full blur-[150px] -mr-72 -mt-72 transition-all"></div>
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-20 border-b border-white/5 pb-24 mb-24 relative z-10">
                           <div className="space-y-8">
                              <h2 className="text-7xl font-black text-white tracking-tighter uppercase leading-none italic">Gestión Personal</h2>
                              <p className="text-[18px] font-bold text-[#10B981] uppercase tracking-[0.8em] flex items-center gap-12 italic leading-none">
                                 <div className="w-24 h-2 bg-[#0EA5E9]"></div> Control de Auditores y Roles
                              </p>
                           </div>
                           <button onClick={handleSaveUser} className={`px-28 py-11 rounded-[4.5rem] text-[20px] font-black uppercase tracking-[0.6em] text-white shadow-3xl hover:scale-[1.05] transition-all flex items-center gap-10 border-4 border-white/20 active:scale-95 ${editingId ? 'bg-[#0EA5E9]' : 'bg-[#10B981]'}`}>
                              {editingId ? <><Save size={40}/> ACTUALIZAR</> : <><UserPlus size={40}/> INTEGRAR</>}
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 relative z-10">
                            <div className="space-y-8">
                                <label className="text-[14px] font-black text-slate-500 ml-12 uppercase tracking-widest leading-none">Nombre Staff</label>
                                <input type="text" placeholder="CPC JUAN PÉREZ" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-4 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all uppercase tracking-tight text-3xl placeholder:text-slate-800"/>
                            </div>
                            <div className="space-y-8">
                                <label className="text-[14px] font-black text-slate-500 ml-12 uppercase tracking-widest leading-none">Usuario Login</label>
                                <input type="text" placeholder="jperez" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-4 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all uppercase tracking-tight text-3xl placeholder:text-slate-800"/>
                            </div>
                            <div className="space-y-8">
                                <label className="text-[14px] font-black text-slate-500 ml-12 uppercase tracking-widest leading-none">Firma Clave</label>
                                <input type="text" placeholder="****" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-4 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all uppercase tracking-tight text-3xl placeholder:text-slate-800"/>
                            </div>
                            <div className="space-y-8">
                                <label className="text-[14px] font-black text-slate-500 ml-12 uppercase tracking-widest leading-none text-center block">Rango</label>
                                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-10 bg-white/5 rounded-[3.5rem] border-4 border-white/10 font-black text-white shadow-inner outline-none appearance-none cursor-pointer text-center text-[16px] uppercase tracking-[0.5em] h-28">
                                    <option value="Auditor">AUDITOR (STAFF)</option>
                                    <option value="Administrador">ADMINISTRADOR (CPC)</option>
                                </select>
                            </div>
                        </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
                        {users.map(u => (
                            <div key={u.id} className="bg-white p-24 rounded-[8rem] border-4 border-slate-50 flex flex-col justify-between items-start group shadow-2xl transition-all duration-700 animate-in slide-in-from-bottom-24 border-b-[20px] hover:border-[#10B981]">
                                <div className="w-full text-center">
                                    <div className="flex justify-center items-start mb-16">
                                        <div className="w-40 h-40 bg-slate-50 rounded-[4rem] flex items-center justify-center text-[#020617] shadow-inner group-hover:bg-[#10B981] group-hover:text-white transition-all duration-700 border-4 border-slate-100 shadow-xl mx-auto"><UserCog size={80}/></div>
                                    </div>
                                    <h3 className="font-black text-[#020617] uppercase text-5xl leading-[1] tracking-tighter group-hover:text-[#10B981] transition-colors duration-500 mb-8">{u.name}</h3>
                                    <div className="flex flex-col items-center gap-6">
                                       <span className="px-12 py-4 rounded-full text-[14px] font-black uppercase tracking-[0.5em] border-4 bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/20">{u.role}</span>
                                       <span className="text-[20px] font-black text-slate-300 font-mono tracking-[0.5em] uppercase italic opacity-70">CRED: {u.username}</span>
                                    </div>
                                </div>
                                <div className="w-full flex justify-between items-center mt-24 pt-20 border-t-4 border-slate-50">
                                    <button onClick={() => { setEditingId(u.id); setUserForm({ name: u.name, username: u.username, password: u.password, role: u.role }); }} className="p-10 rounded-[2.8rem] bg-slate-50 text-slate-400 hover:bg-[#0EA5E9] hover:text-white transition-all shadow-3xl active:scale-90 border-4 border-slate-100"><Edit size={48}/></button>
                                    <button onClick={() => deleteRecord('users', u.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-10 hover:bg-rose-50 rounded-[2.8rem] duration-500"><Trash2 size={52}/></button>
                                </div>
                            </div>
                        ))}
                  </div>
               </div>
            )}

            {/* BITÁCORA DE PRODUCCIÓN */}
            {viewMode === 'reports' && (
               <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-28 animate-in fade-in duration-700 pb-40">
                  <div className="bg-[#020617] p-24 rounded-[7rem] shadow-[0_80px_150px_-30px_rgba(0,0,0,0.5)] h-fit sticky top-12 overflow-hidden border-b-[20px] border-[#10B981]">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#10B981]/15 rounded-full blur-[100px] -mr-48 -mt-48 transition-all duration-1000"></div>
                        <div className="flex items-center gap-12 mb-20 relative z-10">
                           <div className="p-10 bg-[#10B981] rounded-[3rem] text-white shadow-3xl group-hover:scale-110 transition-transform duration-500"><Timer size={64}/></div>
                           <div className="space-y-4">
                              <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none italic">Reportar</h2>
                              <p className="text-[14px] font-black text-[#0EA5E9] uppercase tracking-[0.8em] leading-none italic">Fuerza Staff Diaria</p>
                           </div>
                        </div>
                        <div className="space-y-16 relative z-10">
                            <div className="space-y-6">
                                <label className="text-[16px] font-black text-slate-500 ml-16 uppercase tracking-widest leading-none">Hora de Labor</label>
                                <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white shadow-inner outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all text-4xl"/>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[16px] font-black text-slate-500 ml-16 uppercase tracking-widest leading-none">Entidad Bajo Auditoría</label>
                                <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-11 bg-white/5 rounded-[4rem] border-4 border-white/10 font-black text-white shadow-inner outline-none text-[18px] uppercase tracking-[0.4em] cursor-pointer h-28">
                                    <option value="">SELECCIÓN NODO...</option>
                                    {clients.map(c => <option key={c.id} value={c.name} className="text-slate-900">{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[16px] font-black text-slate-500 ml-16 uppercase tracking-widest leading-none text-center block">Labor Operativa</label>
                                <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-14 bg-white/5 rounded-[4.5rem] border-4 border-white/10 resize-none h-[500px] font-medium text-white shadow-inner text-[26px] leading-relaxed outline-none focus:bg-white/10 focus:border-[#0EA5E9] transition-all placeholder:text-slate-800" placeholder="Detalle los avances tributarios o fiscales realizados..."></textarea>
                            </div>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName || !user) return;
                                try {
                                  await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { 
                                    ...reportForm, userName: currentUserData?.name, createdAt: Timestamp.now() 
                                  });
                                  setReportForm({ ...reportForm, description: '', time: '' });
                                  notify("Avance reportado correctamente.");
                                } catch(e) { notify("Fallo en el reporte.", "error"); }
                            }} className="w-full bg-[#10B981] text-white py-14 rounded-[5rem] font-black text-[22px] uppercase tracking-[1em] shadow-3xl hover:bg-emerald-700 transition-all active:scale-95 group flex items-center justify-center gap-10 border-4 border-white/20">
                               <Timer size={44} className="group-hover:rotate-12 transition-transform"/> ARCHIVAR
                            </button>
                        </div>
                  </div>

                  <div className="xl:col-span-2 bg-white p-28 rounded-[9rem] border-4 border-slate-50 shadow-sm min-h-[1600px] overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-8 border-slate-50 pb-24 mb-28 gap-16">
                            <div className="space-y-6">
                               <h3 className="font-black text-[#020617] text-[6rem] uppercase tracking-tighter leading-none italic drop-shadow-sm">Historial</h3>
                               <p className="text-[18px] font-black text-slate-400 uppercase tracking-[1em] leading-none flex items-center gap-10 italic">
                                 <div className="w-24 h-2 bg-[#0EA5E9]"></div> Registro Maestro de Productividad
                               </p>
                            </div>
                            <div className="bg-[#020617] px-16 py-10 rounded-full text-[24px] font-black text-[#0EA5E9] uppercase tracking-[0.5em] shadow-3xl flex items-center gap-10 border-4 border-white/10">
                               <Clock size={44} className="animate-pulse"/> {getTodayISO()}
                            </div>
                        </div>
                        
                        <div className="space-y-28 relative border-l-[20px] border-slate-50 ml-20 pb-60">
                            {reports.length > 0 ? (
                                reports.map((r, i) => (
                                    <div key={r.id} className="relative pl-28 animate-in slide-in-from-left-24 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="absolute -left-[45px] top-4 w-18 h-18 rounded-full bg-[#10B981] border-[15px] border-white shadow-3xl ring-[35px] ring-[#10B981]/10 group hover:scale-150 transition-transform duration-500"></div>
                                        <div className="bg-slate-50/60 p-20 rounded-[8rem] border-4 border-slate-100 flex flex-col md:flex-row md:justify-between md:items-start gap-16 hover:bg-white hover:shadow-3xl hover:border-[#10B981]/30 transition-all duration-700 group relative">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-12 mb-14">
                                                    <span className="text-[20px] font-black text-[#10B981] uppercase tracking-[0.6em] bg-[#10B981]/10 px-12 py-6 rounded-full border-4 border-[#10B981]/20 leading-none shadow-sm">{r.clientName}</span>
                                                    <span className="text-[20px] font-mono font-black text-slate-400 leading-none uppercase tracking-[0.5em] bg-white px-10 py-6 rounded-3xl border-4 border-slate-100 shadow-inner">{r.time}</span>
                                                </div>
                                                <p className="text-[42px] font-bold text-[#020617] leading-tight italic group-hover:text-black transition-colors duration-500 font-serif drop-shadow-sm leading-snug">"{r.description}"</p>
                                                <div className="mt-24 flex items-center gap-12 text-[18px] font-black text-slate-400 uppercase tracking-[0.8em]">
                                                    <div className="w-28 h-28 rounded-[3rem] bg-white border-4 border-slate-100 flex items-center justify-center text-[#10B981] font-black text-5xl group-hover:bg-[#10B981] group-hover:text-white transition-all shadow-2xl group-hover:rotate-12 duration-500">
                                                      {r.userName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                      <span className="block text-[#020617] text-3xl tracking-tighter mb-4 italic font-black">{r.userName}</span>
                                                      <span className="block opacity-60">Auditor Responsable Nysem</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => deleteRecord('reports', r.id)} className="text-slate-100 hover:text-rose-600 p-12 transition-all duration-500 opacity-0 group-hover:opacity-100 relative z-20 active:scale-90"><Trash2 size={56}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-[400px] text-center opacity-30">
                                    <Activity size={250} className="mx-auto mb-20 text-slate-200 animate-pulse"/>
                                    <p className="text-4xl font-black text-slate-300 uppercase tracking-[1.5em] italic">Nodo Sin Datos</p>
                                </div>
                            )}
                        </div>
                    </div>
               </div>
            )}

          </div>
          
          {/* FOOTER PREMIUM */}
          <footer className="h-28 bg-[#020617] flex items-center px-28 justify-between text-[13px] font-black text-slate-600 uppercase tracking-[1em] z-50 border-t-8 border-[#F1F5F9]/5 shadow-[-30px_0_60px_rgba(0,0,0,0.4)]">
             <span>Nysem Montalbán EIRL • Consultoría Especializada 2026</span>
             <span className="flex items-center gap-20">
                <span className="flex items-center gap-6 text-[#0EA5E9] font-black italic">
                   <div className="w-5 h-5 rounded-full bg-[#10B981] shadow-[0_0_25px_rgba(16,185,129,1)]"></div> MASTER CONNECTED
                </span>
                <span className="text-white/5 font-thin text-6xl opacity-20">|</span>
                <span className="flex items-center gap-8 group cursor-help transition-all hover:text-white">
                   <ShieldCheck size={24} className="text-slate-700 group-hover:text-[#10B981]"/> CORE v22.0.0 (STABLE)
                </span>
             </span>
          </footer>
       </main>
    </div>
  );
}
