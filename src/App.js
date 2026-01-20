import React, { useState, useEffect } from 'react';
import { 
  Users, BarChart3, Menu, Home, Timer, RefreshCw, FolderOpen, 
  FileText, CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, DollarSign, History, Lock, Database, 
  Server, LogIn, LogOut, Clock, AlertCircle, 
  Settings, Search, ChevronRight, Briefcase, TrendingUp, Layers,
  Activity, Zap, Globe, UserPlus, UserCog, BadgeCheck
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
 * VERSIÓN 17.0.0 - PROFESSIONAL STAFF MANAGER
 * DISEÑO: Interfaz Amigable de Alto Impacto Gerencial
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

  // Forms
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', sector: 'Servicios', honorario: '' });
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'Auditor', hourlyCost: '' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  // --- LÓGICA DE RIESGO SUNAT ---
  const calculateTaxRisk = (ruc, taxStatus) => {
    if (!ruc) return { color: 'slate', bg: 'bg-slate-50', text: 'text-slate-500', label: 'Sin RUC' }; 
    if (taxStatus === 'declared') return { color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Declarado' };
    const rucStr = String(ruc).trim();
    const lastDigit = parseInt(rucStr.charAt(rucStr.length - 1));
    if (isNaN(lastDigit)) return { color: 'slate', bg: 'bg-slate-50', text: 'text-slate-500', label: 'Inválido' };
    
    if ([0, 1, 2].includes(lastDigit)) return { color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600', label: 'VENCE HOY' }; 
    if ([3, 4, 5, 6].includes(lastDigit)) return { color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', label: 'PRÓXIMO' }; 
    return { color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', label: 'EN PLAZO' }; 
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
    
    const usersRef = collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'users');
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    const { username, password } = loginForm;
    
    // Credencial Maestra CPC Nysem
    if (username === 'admin' && password === 'admin') {
      setCurrentUserData({ name: 'CPC Nysem Montalbán', role: 'Administrador' });
      setIsLoggedIn(true);
      return;
    }

    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setCurrentUserData(found);
      setIsLoggedIn(true);
      setAccessError(null);
    } else {
      setAccessError("Identidad no reconocida en el nodo.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserData(null);
    setViewMode('dashboard');
  };

  // --- OPERACIONES FIREBASE ---
  const handleAddUser = async () => {
    if (!userForm.name || !userForm.username || !userForm.password) return;
    await addDoc(collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'users'), { 
      ...userForm, createdAt: Timestamp.now() 
    });
    setUserForm({ name: '', username: '', password: '', role: 'Auditor', hourlyCost: '' });
  };

  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.ruc) return;
    await addDoc(collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'clients'), { 
      ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() 
    });
    setClientForm({ name: '', ruc: '', sector: 'Servicios', honorario: '' });
  };

  const markAsDeclared = async (clientId) => {
    await updateDoc(doc(db, 'artifacts', 'nysem_app', 'public', 'data', 'clients', clientId), { taxStatus: 'declared' });
  };

  const deleteDocGeneric = async (col, id) => {
    if (window.confirm("¿Confirmar eliminación permanente de este registro?")) {
      await deleteDoc(doc(db, 'artifacts', 'nysem_app', 'public', 'data', col, id));
    }
  };

  // --- INTERFAZ DE CARGA ---
  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-white font-sans">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <RefreshCw className="text-blue-600 animate-spin" size={48} />
          <div className="text-center">
             <p className="text-[10px] font-black tracking-[0.6em] uppercase text-blue-600">Nysem Montalbán EIRL</p>
             <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-2">Sincronizando Seguridad de Firma...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F1F5F9] p-6 font-sans">
        <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden border border-white flex flex-col">
          <div className="bg-slate-900 p-12 text-center text-white relative">
            <Shield className="mx-auto mb-6 text-blue-500" size={60}/>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Acceso Auditoría</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-3 italic">Control Contable & Gestión de Capital</p>
          </div>
          <div className="p-12 space-y-8 bg-white">
            <form onSubmit={handleLogin} className="space-y-4">
              {accessError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in">
                  <AlertCircle className="text-rose-500 shrink-0" size={18}/>
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-tight">{accessError}</p>
                </div>
              )}
              <input type="text" placeholder="Usuario de Firma" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:ring-4 ring-blue-500/10 transition-all" required />
              <input type="password" placeholder="Clave de Seguridad" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:ring-4 ring-blue-500/10 transition-all" required />
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.2rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-700 transition-all shadow-xl active:scale-95 mt-4">Validar Identidad</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'Administrador';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden animate-in fade-in duration-700">
       
       {/* SIDEBAR */}
       <aside className={`${sidebarOpen ? 'w-80' : 'w-24'} bg-white flex flex-col transition-all duration-500 border-r border-slate-100 z-30 shadow-sm`}>
         <div className="h-28 flex items-center px-10 border-b border-slate-50">
            <div className="bg-blue-600 p-3.5 rounded-2xl shadow-lg shadow-blue-600/20">
              <Shield className="text-white" size={24}/>
            </div>
            {sidebarOpen && (
              <div className="ml-5">
                <span className="block font-black text-2xl text-slate-900 tracking-tighter uppercase leading-none">Nysem SGP</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1.5 block">Audit Node v17</span>
              </div>
            )}
         </div>

         <nav className="flex-1 p-8 space-y-2 overflow-y-auto custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Clientes', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora Staff', icon: Timer, show: true },
              { id: 'users', label: 'Gestión de Staff', icon: UserCog, show: isAdmin }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-5 p-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-50'}`}>
                <item.icon size={22}/> {sidebarOpen && item.label}
              </button>
            ))}
         </nav>

         <div className="p-8 border-t border-slate-50">
            <div className="bg-slate-50 p-5 rounded-[2.2rem] flex items-center gap-5 border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg">{currentUserData?.name?.charAt(0)}</div>
                {sidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black text-slate-900 truncate uppercase">{currentUserData?.name}</p>
                    <button onClick={handleLogout} className="text-[8px] font-black text-rose-500 uppercase mt-1 tracking-widest">Cerrar Sesión</button>
                  </div>
                )}
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* HEADER */}
          <header className="h-28 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex items-center px-12 justify-between z-20">
            <div className="flex items-center gap-8">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-4 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 border border-slate-100 transition-all"><Menu size={20}/></button>
                <div className="hidden xl:flex items-center gap-3">
                  <Shield size={18} className="text-blue-500"/>
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">CPC Nysem Montalbán | Asesoría & Capacitación</span>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
               <div className="flex flex-col items-end mr-4 hidden md:flex">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 leading-none">Conectividad</span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Nodo Activo
                  </span>
               </div>
               <div className="h-12 w-px bg-slate-100"></div>
               <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 font-mono text-[12px] font-black text-slate-700 shadow-inner">
                  <Calendar size={16} className="text-blue-600"/> {String(getTodayISO())}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-12 lg:p-16 custom-scrollbar">
            
            {/* DASHBOARD */}
            {viewMode === 'dashboard' && (
                <div className="space-y-16 animate-in fade-in duration-700">
                    <div className="space-y-4">
                       <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">Panel de <br/>Control Maestro</h2>
                       <p className="text-sm font-bold text-slate-400 tracking-tight flex items-center gap-3">
                         <div className="w-10 h-[1px] bg-blue-600"></div> Consola Administrativa Nysem Montalbán EIRL
                       </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
                        {[
                          { title: "Empresas", val: clients.length, icon: Building2, color: "blue" },
                          { title: "Vencimientos", val: clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).color === 'rose').length, icon: AlertTriangle, color: "rose" },
                          { title: "Staff Firma", val: users.length, icon: Users, color: "indigo" },
                          { title: "Producción", val: reports.filter(r => r.date === getTodayISO()).length, icon: TrendingUp, color: "emerald" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-12 rounded-[4rem] border border-slate-50 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                              <div className={`w-16 h-16 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 mb-8 group-hover:scale-110 transition-transform`}>
                                <stat.icon size={28}/>
                              </div>
                              <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.title}</h3>
                              <div className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{stat.val}</div>
                              <div className={`absolute -right-6 -bottom-6 opacity-[0.03] text-${stat.color}-600`}><stat.icon size={150}/></div>
                          </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GESTIÓN DE STAFF (NUEVO MODULO) */}
            {viewMode === 'users' && isAdmin && (
                <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-white p-14 rounded-[5rem] border border-slate-50 shadow-2xl relative overflow-hidden">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
                           <div className="space-y-3">
                              <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Gestión de Staff</h2>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3 italic">Control de Asistentes y Auditores de Firma</p>
                           </div>
                           <div className="bg-slate-900 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-white">
                               <span className="text-3xl font-black leading-none">{users.length}</span>
                               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2 leading-none">Colaboradores</span>
                           </div>
                        </div>
                        
                        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-3 lg:col-span-1">
                                <label className="text-[10px] font-black text-slate-400 ml-6 uppercase tracking-widest">Nombre Completo</label>
                                <input type="text" placeholder="Ej: Juan Pérez" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2.2rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:bg-white transition-all"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 ml-6 uppercase tracking-widest">Usuario (Login)</label>
                                <input type="text" placeholder="jperez" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2.2rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:bg-white transition-all"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 ml-6 uppercase tracking-widest">Contraseña Inicial</label>
                                <input type="text" placeholder="****" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2.2rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:bg-white transition-all"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 ml-6 uppercase tracking-widest">Rango de Acceso</label>
                                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2.2rem] border-none font-black text-slate-700 shadow-inner outline-none appearance-none cursor-pointer text-center">
                                    <option value="Auditor">Auditor (Staff)</option>
                                    <option value="Administrador">Administrador (CPC)</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={handleAddUser} className="mt-12 w-full bg-slate-900 text-white py-10 rounded-[3rem] font-black text-[12px] uppercase tracking-[0.5em] shadow-2xl hover:bg-blue-600 transition-all group flex items-center justify-center gap-4">
                           <UserPlus size={20}/> Integrar Colaborador al Nodo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {users.map((u, i) => (
                            <div key={u.id} className="bg-white p-12 rounded-[4.5rem] border border-slate-50 flex flex-col justify-between items-start group shadow-sm hover:shadow-2xl transition-all duration-700 animate-in slide-in-from-bottom-12">
                                <div className="w-full">
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-800 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-500"><UserCog size={36}/></div>
                                        <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${u.role === 'Administrador' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{u.role}</div>
                                    </div>
                                    <h3 className="font-black text-slate-900 uppercase text-2xl leading-tight mb-2 truncate w-full tracking-tighter">{u.name}</h3>
                                    <div className="flex items-center gap-3 pt-2">
                                       <span className="text-[12px] font-black text-slate-300 font-mono tracking-widest">USER: {u.username}</span>
                                       <span className="w-1.5 h-1.5 rounded-full bg-slate-100"></span>
                                       <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Activo</span>
                                    </div>
                                </div>
                                <div className="w-full flex justify-end mt-12 pt-10 border-t border-slate-50">
                                    <button onClick={() => deleteDocGeneric('users', u.id)} className="text-slate-100 hover:text-rose-500 transition-colors p-5 hover:bg-rose-50 rounded-[1.5rem] duration-500"><Trash2 size={26}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CARTERA CLIENTES */}
            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-white p-14 rounded-[5rem] border border-slate-50 shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
                           <div className="space-y-3">
                              <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Cartera Corporativa</h2>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3 italic">Registro de Entidades bajo Supervisión</p>
                           </div>
                           <div className="bg-blue-600 p-8 rounded-[2.5rem] flex flex-col items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                                 <span className="text-3xl font-black leading-none">{clients.length}</span>
                                 <span className="text-[9px] font-black text-white/50 uppercase tracking-widest mt-2 leading-none">Entidades Totales</span>
                           </div>
                        </div>
                        
                        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-3 lg:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 ml-6 uppercase tracking-widest">Razón Social</label>
                                <input type="text" placeholder="Ej: Consorcio Agrícola S.A.C." value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-bold text-slate-700 shadow-inner outline-none uppercase tracking-tight"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 ml-6 uppercase tracking-widest">RUC</label>
                                <input type="text" placeholder="11 Dígitos" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-black text-slate-700 shadow-inner outline-none text-center font-mono"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 ml-6 uppercase tracking-widest">Rubro Estratégico</label>
                                <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-black text-slate-700 shadow-inner outline-none text-[11px] uppercase tracking-[0.2em] cursor-pointer text-center appearance-none">
                                    <option value="Agricultura">Agricultura</option>
                                    <option value="Construcción">Construcción</option>
                                    <option value="Exportación">Exportación</option>
                                    <option value="Comercio">Comercio</option>
                                    <option value="Servicios">Servicios Globales</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={handleAddClient} className="mt-12 w-full bg-slate-900 text-white py-10 rounded-[3rem] font-black text-[12px] uppercase tracking-[0.5em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 group flex items-center justify-center gap-4">
                           <BadgeCheck size={20}/> Integrar Cliente al Nodo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {clients.map((c, i) => {
                            const risk = calculateTaxRisk(c.ruc, c.taxStatus);
                            const isDeclared = c.taxStatus === 'declared';
                            return (
                                <div key={c.id} className="bg-white p-14 rounded-[4.5rem] border border-slate-50 flex flex-col justify-between items-start group shadow-sm hover:shadow-2xl transition-all relative overflow-hidden">
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-12">
                                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-800 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all"><Building2 size={36}/></div>
                                            <div className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border-2 ${risk.bg} ${risk.text} ${risk.color === 'rose' ? 'animate-pulse' : ''}`}>{risk.label}</div>
                                        </div>
                                        <h3 className="font-black text-slate-900 uppercase text-2xl leading-[1.1] tracking-tighter truncate w-full">{String(c.name)}</h3>
                                        <div className="flex items-center gap-3 pt-4">
                                              <span className="text-[12px] font-black text-slate-300 font-mono tracking-widest">RUC {String(c.ruc)}</span>
                                              <span className="w-1.5 h-1.5 rounded-full bg-slate-100"></span>
                                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{String(c.sector)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full flex justify-between items-center mt-12 pt-12 border-t border-slate-50">
                                        <div className="flex items-center gap-4">
                                           <button onClick={() => markAsDeclared(c.id)} className={`p-5 rounded-[1.5rem] transition-all shadow-2xl ${isDeclared ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}>
                                              <CheckCircle2 size={26}/>
                                           </button>
                                        </div>
                                        <button onClick={() => deleteDocGeneric('clients', c.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-5 hover:bg-rose-50 rounded-[1.5rem] duration-500"><Trash2 size={26}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* BITÁCORA */}
            {viewMode === 'reports' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-16 animate-in fade-in duration-700 pb-32">
                    <div className="bg-white p-14 rounded-[5rem] border border-slate-50 shadow-sm h-fit sticky top-12">
                        <div className="flex items-center gap-6 mb-16">
                           <div className="p-5 bg-emerald-50 rounded-[1.8rem] text-emerald-600 shadow-inner"><Timer size={36}/></div>
                           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Bitácora de <br/>Producción</h2>
                        </div>
                        <div className="space-y-12">
                            <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border-none font-bold text-slate-800 shadow-inner outline-none"/>
                            <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border-none font-black text-slate-800 shadow-inner outline-none text-[11px] uppercase tracking-[0.2em] cursor-pointer appearance-none text-center">
                                <option value="">Selección de Entidad...</option>
                                {clients.map(c => <option key={c.id} value={c.name}>{String(c.name)}</option>)}
                            </select>
                            <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border-none resize-none h-64 font-medium text-slate-700 shadow-inner text-[15px] leading-relaxed outline-none" placeholder="Reporte el avance contable o tributario realizado..."></textarea>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName) return;
                                await addDoc(collection(db, 'artifacts', 'nysem_app', 'public', 'data', 'reports'), { 
                                  ...reportForm, 
                                  userName: currentUserData?.name, 
                                  createdAt: Timestamp.now() 
                                });
                                setReportForm({ ...reportForm, description: '', time: '' });
                            }} className="w-full bg-emerald-600 text-white py-8 rounded-[3rem] font-black text-[12px] uppercase tracking-[0.5em] shadow-2xl hover:bg-emerald-700 transition-all active:scale-95">Grabar Actividad</button>
                        </div>
                    </div>

                    <div className="xl:col-span-2 bg-white p-14 rounded-[6rem] border border-slate-50 shadow-sm min-h-[900px]">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-12 mb-16">
                            <div className="space-y-2">
                               <h3 className="font-black text-slate-900 text-3xl uppercase tracking-tighter leading-none">Historial Global</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Reportes Staff Diarios</p>
                            </div>
                            <div className="bg-slate-50 px-8 py-4 rounded-full border border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-widest shadow-inner flex items-center gap-4 italic">
                               <Clock size={16} className="text-blue-500"/> {String(getTodayISO())}
                            </div>
                        </div>
                        <div className="space-y-12 relative border-l-4 border-slate-50 ml-6 pb-24">
                            {reports.length > 0 ? (
                                reports.map((r, i) => (
                                    <div key={r.id} className="relative pl-14 animate-in slide-in-from-left-8">
                                        <div className="absolute -left-[18px] top-1 w-8 h-8 rounded-full bg-emerald-600 border-[6px] border-white shadow-xl ring-12 ring-emerald-50/50"></div>
                                        <div className="bg-slate-50/50 p-10 rounded-[4rem] border border-slate-100 flex justify-between items-start hover:bg-white hover:shadow-2xl transition-all duration-700 group relative">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-5 mb-6">
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] bg-emerald-100 px-5 py-2.5 rounded-full border border-emerald-100 leading-none">{String(r.clientName)}</span>
                                                    <span className="text-[10px] font-mono font-black text-slate-300 tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-50 shadow-sm">{String(r.time)}</span>
                                                </div>
                                                <p className="text-[18px] font-bold text-slate-700 leading-relaxed italic group-hover:text-slate-900 transition-colors duration-500">"{String(r.description)}"</p>
                                                <div className="mt-10 flex items-center gap-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 font-black group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">{r.userName?.charAt(0)}</div>
                                                    Staff Audit: <span className="text-slate-900 ml-1">{String(r.userName)}</span>
                                                </div>
                                            </div>
                                            <button onClick={async () => { if(window.confirm("¿Eliminar registro?")) await deleteDoc(doc(db, 'artifacts', 'nysem_app', 'public', 'data', 'reports', r.id)) }} className="text-slate-100 hover:text-rose-500 p-4 transition-all duration-500 opacity-0 group-hover:opacity-100 relative z-10"><Trash2 size={24}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-56 text-center opacity-30 italic font-black text-slate-300 uppercase text-xs tracking-[0.5em]">Sin actividades hoy</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

          </div>
          
          <footer className="h-10 bg-white border-t border-slate-100 flex items-center px-12 justify-between text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] z-20">
             <span>Nysem Montalbán EIRL • 2026</span>
             <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Nodo Seguro</span>
                <span className="text-slate-200">|</span>
                <span>Audit Console v17.0</span>
             </span>
          </footer>
       </main>
    </div>
  );
}
