import React, { useState, useEffect } from 'react';
import { 
  Users, Menu, Home, Timer, RefreshCw, FolderOpen, 
  CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, History, Lock, Database, 
  LogOut, Clock, AlertCircle, Edit, X, Save,
  ChevronRight, Briefcase, TrendingUp, UserPlus, UserCog, BadgeCheck
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
 * VERSIÓN 18.0.0 - CORPORATE BRAND EDITION
 * COLORES: Azul Oscuro (#0F172A), Celeste (#0EA5E9), Verde (#10B981)
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
    if (!ruc) return { color: 'slate', text: 'Sin RUC' }; 
    if (taxStatus === 'declared') return { color: 'emerald', text: 'Declarado' };
    const rucStr = String(ruc).trim();
    const lastDigit = parseInt(rucStr.charAt(rucStr.length - 1));
    if (isNaN(lastDigit)) return { color: 'slate', text: 'Inválido' };
    
    if ([0, 1, 2].includes(lastDigit)) return { color: 'rose', text: 'VENCE HOY' }; 
    if ([3, 4, 5, 6].includes(lastDigit)) return { color: 'amber', text: 'PRÓXIMO' }; 
    return { color: 'sky', text: 'EN PLAZO' }; 
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

  // --- CRUD FUNCTIONS (NUEVO, EDITAR, ELIMINAR, CANCELAR) ---

  // CLIENTS
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

  // USERS
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
    if (window.confirm("¿Confirmar eliminación permanente de este registro corporativo?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F172A] text-white font-sans">
        <div className="flex flex-col items-center gap-10">
          <RefreshCw className="text-sky-400 animate-spin" size={60} />
          <div className="text-center">
             <p className="text-[10px] font-black tracking-[0.8em] uppercase text-sky-400">Nysem Montalbán EIRL</p>
             <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-3 animate-pulse">Sincronizando Seguridad de Firma v18.0</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F1F5F9] p-6 font-sans">
        <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden border border-white flex flex-col">
          <div className="bg-[#0F172A] p-16 text-center text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
            <Shield className="mx-auto mb-8 text-sky-400 drop-shadow-lg" size={72}/>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Acceso SGP</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-5">Asesoría & Capacitación Empresarial</p>
          </div>
          <div className="p-16 space-y-10 bg-white">
            <form onSubmit={handleLogin} className="space-y-6">
              {accessError && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 animate-in fade-in zoom-in">
                  <AlertCircle className="text-rose-500 shrink-0" size={20}/>
                  <p className="text-[11px] font-bold text-rose-800 uppercase tracking-tight">{accessError}</p>
                </div>
              )}
              <div className="space-y-4">
                <input type="text" placeholder="ID de Usuario" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:ring-4 ring-sky-500/10 transition-all" required />
                <input type="password" placeholder="Contraseña de Firma" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:ring-4 ring-sky-500/10 transition-all" required />
              </div>
              <button type="submit" className="w-full bg-[#0F172A] text-white py-6 rounded-[3rem] font-black text-[12px] uppercase tracking-[0.4em] hover:bg-sky-600 transition-all shadow-xl active:scale-95 mt-6">Validar Credenciales</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'Administrador';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden animate-in fade-in duration-700">
       
       {/* SIDEBAR CORPORATIVO: AZUL OSCURO */}
       <aside className={`${sidebarOpen ? 'w-80' : 'w-24'} bg-[#0F172A] flex flex-col transition-all duration-500 shadow-2xl z-40 relative overflow-hidden`}>
         <div className="h-32 flex items-center px-10 border-b border-white/5">
            <div className="bg-[#10B981] p-4 rounded-[1.5rem] shadow-lg shadow-emerald-500/30">
              <Database className="text-white" size={28}/>
            </div>
            {sidebarOpen && (
              <div className="ml-5 animate-in fade-in slide-in-from-left-4">
                <span className="block font-black text-2xl text-white tracking-tighter uppercase leading-none">Nysem SGP</span>
                <span className="text-[9px] font-black text-sky-400 uppercase tracking-[0.4em] mt-2 block">Management v18.0</span>
              </div>
            )}
         </div>

         <nav className="flex-1 p-8 space-y-3 overflow-y-auto custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard Global', icon: Home, show: true },
              { id: 'clients', label: 'Cartera Clientes', icon: Building2, show: true },
              { id: 'reports', label: 'Bitácora Staff', icon: Timer, show: true },
              { id: 'users', label: 'Gestión de Staff', icon: UserCog, show: isAdmin }
            ].filter(i => i.show).map((item) => (
              <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center gap-6 p-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === item.id ? 'bg-sky-600 text-white shadow-xl shadow-sky-600/30' : 'text-slate-400 hover:bg-white/5'}`}>
                <item.icon size={24}/> {sidebarOpen && item.label}
              </button>
            ))}
         </nav>

         <div className="p-8 border-t border-white/5">
            <div className="bg-white/5 p-6 rounded-[2.5rem] flex items-center gap-5 border border-white/5 group hover:bg-white/10 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-[#10B981] flex items-center justify-center text-white font-black text-xl shadow-lg">{currentUserData?.name?.charAt(0)}</div>
                {sidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[11px] font-black text-white truncate uppercase tracking-tight leading-none">{currentUserData?.name}</p>
                    <button onClick={handleLogout} className="text-[9px] font-black text-sky-400 uppercase mt-3 tracking-widest hover:text-white transition-colors">Cerrar Sesión</button>
                  </div>
                )}
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* HEADER: AZUL OSCURO Y CELESTE */}
          <header className="h-28 bg-white border-b border-slate-100 flex items-center px-12 justify-between z-30">
            <div className="flex items-center gap-10">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-4 bg-slate-50 hover:bg-sky-50 rounded-2xl text-slate-400 hover:text-sky-600 border border-slate-100 transition-all"><Menu size={24}/></button>
                <div className="hidden lg:flex items-center gap-4">
                  <Shield size={24} className="text-sky-500"/>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-slate-800 uppercase tracking-tighter leading-none">Nysem Montalbán EIRL</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Asesoría & Capacitación Empresarial</span>
                  </div>
                </div>
            </div>
            
            <div className="flex items-center gap-8">
               <div className="flex flex-col items-end mr-6 hidden md:flex">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1.5 leading-none">Conectividad Nodo</span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div> Nodo Seguro
                  </span>
               </div>
               <div className="h-14 w-px bg-slate-100"></div>
               <div className="flex items-center gap-5 bg-slate-50 px-8 py-4 rounded-[1.5rem] border border-slate-100 font-mono text-[13px] font-black text-slate-700 shadow-inner">
                  <Calendar size={18} className="text-sky-600"/> {String(getTodayISO())}
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-12 lg:p-16 custom-scrollbar bg-[#F8FAFC]">
            
            {/* DASHBOARD */}
            {viewMode === 'dashboard' && (
                <div className="space-y-16 animate-in fade-in duration-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                        <div className="space-y-4">
                           <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">Visión <br/>Empresarial</h2>
                           <p className="text-sm font-bold text-slate-400 tracking-tight flex items-center gap-4">
                             <div className="w-12 h-1 bg-sky-500 rounded-full"></div> Gestión Integral de Producción
                           </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
                        {[
                          { title: "Empresas en Cartera", val: clients.length, icon: Building2, color: "sky" },
                          { title: "Vencimientos Hoy", val: clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).color === 'rose').length, icon: AlertTriangle, color: "rose" },
                          { title: "Staff Auditores", val: users.length, icon: Users, color: "emerald" },
                          { title: "Reportes Staff", val: reports.filter(r => r.date === getTodayISO()).length, icon: TrendingUp, color: "indigo" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white p-12 rounded-[4rem] border border-slate-50 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                              <div className={`w-20 h-20 rounded-[2rem] bg-${stat.color === 'sky' ? 'sky' : (stat.color === 'rose' ? 'rose' : (stat.color === 'emerald' ? 'emerald' : 'indigo'))}-50 flex items-center justify-center text-${stat.color === 'sky' ? 'sky-600' : (stat.color === 'rose' ? 'rose-600' : (stat.color === 'emerald' ? 'emerald-600' : 'indigo-600'))} mb-10 group-hover:scale-110 transition-transform duration-500`}>
                                <stat.icon size={36}/>
                              </div>
                              <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mb-2">{stat.title}</h3>
                              <div className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{stat.val}</div>
                              <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-slate-900"><stat.icon size={180}/></div>
                          </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GESTIÓN DE STAFF: CRUD COMPLETO */}
            {viewMode === 'users' && isAdmin && (
                <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-white p-16 rounded-[5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 border-b border-slate-50 pb-12 mb-16">
                           <div className="space-y-4">
                              <h2 className="text-5xl font-black text-[#0F172A] tracking-tighter uppercase leading-none">Gestión de Staff</h2>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-4 italic">Control de Asistentes y Auditores Nysem</p>
                           </div>
                           <div className="flex items-center gap-5">
                              {editingUserId && <button onClick={cancelUserEdit} className="bg-slate-100 text-slate-500 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-3"><X size={18}/> Cancelar</button>}
                              <button onClick={handleSaveUser} className={`px-12 py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-xl hover:scale-[1.02] transition-all flex items-center gap-5 ${editingUserId ? 'bg-sky-600 shadow-sky-200' : 'bg-[#10B981] shadow-emerald-200'}`}>
                                 {editingUserId ? <><Save size={20}/> Guardar Cambios</> : <><UserPlus size={20}/> Nuevo Auditor</>}
                              </button>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Nombre Completo</label>
                                <input type="text" placeholder="Ej: Juan Pérez" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-bold text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-4 ring-sky-500/5 transition-all"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Usuario Login</label>
                                <input type="text" placeholder="jperez" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-bold text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-4 ring-sky-500/5 transition-all"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Contraseña</label>
                                <input type="text" placeholder="****" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-bold text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-4 ring-sky-500/5 transition-all"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Rango</label>
                                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-black text-slate-800 shadow-inner outline-none appearance-none cursor-pointer text-center">
                                    <option value="Auditor">Auditor (Staff)</option>
                                    <option value="Administrador">Administrador (CPC)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {users.map((u) => (
                            <div key={u.id} className="bg-white p-12 rounded-[4.5rem] border border-slate-50 flex flex-col justify-between items-start group shadow-sm hover:shadow-2xl transition-all duration-700 animate-in slide-in-from-bottom-12">
                                <div className="w-full">
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-800 shadow-inner group-hover:bg-[#10B981] group-hover:text-white transition-all duration-500"><UserCog size={36}/></div>
                                        <div className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${u.role === 'Administrador' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-sky-50 text-sky-600 border-sky-100'}`}>{u.role}</div>
                                    </div>
                                    <h3 className="font-black text-slate-900 uppercase text-2xl leading-tight mb-2 truncate w-full tracking-tighter">{u.name}</h3>
                                    <p className="text-[12px] font-black text-slate-300 font-mono tracking-widest uppercase">ID: {u.username}</p>
                                </div>
                                <div className="w-full flex justify-between items-center mt-12 pt-10 border-t border-slate-50">
                                    <button onClick={() => handleEditUser(u)} className="p-5 rounded-[1.8rem] bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white transition-all shadow-lg shadow-sky-100/50"><Edit size={24}/></button>
                                    <button onClick={() => deleteDocGeneric('users', u.id)} className="text-slate-100 hover:text-rose-500 transition-colors p-5 hover:bg-rose-50 rounded-[1.8rem] duration-500"><Trash2 size={26}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CARTERA CLIENTES: CRUD COMPLETO */}
            {viewMode === 'clients' && (
                <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in zoom-in-95 duration-700 pb-32">
                    <div className="bg-white p-16 rounded-[5rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 border-b border-slate-50 pb-12 mb-16">
                           <div className="space-y-4">
                              <h2 className="text-5xl font-black text-[#0F172A] tracking-tighter uppercase leading-none">Cartera Corporativa</h2>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-4 italic">Registro de Entidades en Asesoría</p>
                           </div>
                           <div className="flex items-center gap-5">
                              {editingClientId && <button onClick={cancelClientEdit} className="bg-slate-100 text-slate-500 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-3"><X size={18}/> Cancelar</button>}
                              <button onClick={handleSaveClient} className={`px-12 py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-xl hover:scale-[1.02] transition-all flex items-center gap-5 ${editingClientId ? 'bg-sky-600 shadow-sky-200' : 'bg-[#10B981] shadow-emerald-200'}`}>
                                 {editingClientId ? <><Save size={20}/> Guardar Cambios</> : <><Plus size={20}/> Nuevo Cliente</>}
                              </button>
                           </div>
                        </div>
                        
                        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            <div className="space-y-4 lg:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Razón Social</label>
                                <input type="text" placeholder="Ej: Consorcio Agrícola S.A.C." value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-bold text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-4 ring-sky-500/5 transition-all uppercase tracking-tight"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Número de RUC</label>
                                <input type="text" placeholder="11 Dígitos" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-black text-slate-800 shadow-inner outline-none text-center font-mono focus:bg-white transition-all"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Sector Principal</label>
                                <select value={clientForm.sector} onChange={e => setClientForm({...clientForm, sector: e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] border-none font-black text-slate-800 shadow-inner outline-none appearance-none cursor-pointer text-center text-[11px] uppercase tracking-widest">
                                    <option value="Agricultura">Agricultura</option>
                                    <option value="Construcción">Construcción</option>
                                    <option value="Exportación">Exportación</option>
                                    <option value="Comercio">Comercio</option>
                                    <option value="Servicios">Servicios Globales</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-20">
                        {clients.map((c) => {
                            const risk = calculateTaxRisk(c.ruc, c.taxStatus);
                            const isDeclared = c.taxStatus === 'declared';
                            return (
                                <div key={c.id} className="bg-white p-14 rounded-[4.5rem] border border-slate-50 flex flex-col justify-between items-start group shadow-sm hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] transition-all duration-700 relative overflow-hidden animate-in slide-in-from-bottom-12">
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-12">
                                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-800 shadow-inner group-hover:bg-[#0F172A] group-hover:text-white transition-all duration-700 shadow-sm"><Building2 size={36}/></div>
                                            <div className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border-2 transition-all duration-500 ${risk.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : (isDeclared ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm':'bg-sky-50 text-sky-600 border-sky-100')}`}>{risk.text}</div>
                                        </div>
                                        <h3 className="font-black text-slate-900 uppercase text-2xl leading-[1.1] tracking-tighter truncate w-full group-hover:text-sky-600 transition-colors duration-500">{String(c.name)}</h3>
                                        <div className="flex items-center gap-4 pt-4">
                                              <span className="text-[12px] font-black text-slate-300 font-mono tracking-widest leading-none">RUC {String(c.ruc)}</span>
                                              <span className="w-2 h-2 rounded-full bg-slate-100"></span>
                                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] leading-none">{String(c.sector)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full flex justify-between items-center mt-12 pt-12 border-t border-slate-50">
                                        <div className="flex items-center gap-4">
                                           <button onClick={() => markAsDeclared(c.id)} className={`p-5 rounded-[1.8rem] transition-all shadow-xl active:scale-90 ${isDeclared ? 'bg-[#10B981] text-white shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}>
                                              <CheckCircle2 size={26}/>
                                           </button>
                                           <button onClick={() => handleEditClient(c)} className="p-5 rounded-[1.8rem] bg-slate-50 text-slate-400 hover:bg-sky-600 hover:text-white transition-all border border-slate-100 shadow-lg shadow-sky-100/10">
                                              <Edit size={26}/>
                                           </button>
                                        </div>
                                        <button onClick={() => deleteDocGeneric('clients', c.id)} className="text-slate-100 hover:text-rose-600 transition-colors p-5 hover:bg-rose-50 rounded-[1.8rem] duration-500"><Trash2 size={26}/></button>
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
                    <div className="bg-white p-14 rounded-[5rem] border border-slate-100 shadow-sm h-fit sticky top-12">
                        <div className="flex items-center gap-8 mb-16">
                           <div className="p-6 bg-emerald-50 rounded-[2rem] text-emerald-600 shadow-inner"><Timer size={36}/></div>
                           <div className="space-y-1">
                              <h2 className="text-2xl font-black text-[#0F172A] uppercase tracking-tighter leading-none">Bitácora de <br/>Producción</h2>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Staff Diario Nysem</p>
                           </div>
                        </div>
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Hora Reporte</label>
                                <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border-none font-bold text-slate-800 shadow-inner outline-none"/>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Empresa Destino</label>
                                <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.8rem] border-none font-black text-slate-800 shadow-inner outline-none text-[11px] uppercase tracking-[0.2em] cursor-pointer appearance-none text-center">
                                    <option value="">Selección de Cliente...</option>
                                    {clients.map(c => <option key={c.id} value={c.name}>{String(c.name)}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 ml-8 uppercase tracking-widest">Labor Realizada</label>
                                <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border-none resize-none h-64 font-medium text-slate-700 shadow-inner text-[15px] leading-relaxed outline-none focus:bg-white transition-all placeholder:text-slate-200" placeholder="Especifique el avance contable o tributario..."></textarea>
                            </div>
                            <button onClick={async () => {
                                if(!reportForm.description || !reportForm.clientName) return;
                                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { 
                                  ...reportForm, 
                                  userName: currentUserData?.name, 
                                  createdAt: Timestamp.now() 
                                });
                                setReportForm({ ...reportForm, description: '', time: '' });
                            }} className="w-full bg-[#10B981] text-white py-8 rounded-[3rem] font-black text-[12px] uppercase tracking-[0.5em] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.3)] hover:bg-emerald-700 transition-all active:scale-95">Archivar Avance</button>
                        </div>
                    </div>

                    <div className="xl:col-span-2 bg-white p-14 rounded-[6rem] border border-slate-50 shadow-sm min-h-[900px] relative overflow-hidden">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-12 mb-16 relative z-10">
                            <div className="space-y-2">
                               <h3 className="font-black text-slate-900 text-3xl uppercase tracking-tighter leading-none">Historial Global</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Reportes Staff Cronológicos</p>
                            </div>
                            <div className="bg-slate-50 px-8 py-4 rounded-full border border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-widest shadow-inner flex items-center gap-5">
                               <Clock size={16} className="text-sky-600"/> {String(getTodayISO())}
                            </div>
                        </div>
                        <div className="space-y-12 relative border-l-4 border-slate-50 ml-6 pb-24 z-10">
                            {reports.length > 0 ? (
                                reports.map((r, i) => (
                                    <div key={r.id} className="relative pl-14 animate-in slide-in-from-left-8" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="absolute -left-[18px] top-1 w-8 h-8 rounded-full bg-[#10B981] border-[6px] border-white shadow-xl ring-12 ring-emerald-50/50"></div>
                                        <div className="bg-slate-50/50 p-10 rounded-[4rem] border border-slate-100 flex justify-between items-start hover:bg-white hover:shadow-2xl hover:border-emerald-200 transition-all duration-700 group">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-6 mb-6">
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] bg-emerald-50 px-5 py-2.5 rounded-full border border-emerald-100 leading-none">{String(r.clientName)}</span>
                                                    <span className="text-[10px] font-mono font-black text-slate-300 leading-none tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-50 shadow-sm">{String(r.time)}</span>
                                                </div>
                                                <p className="text-[18px] font-bold text-slate-700 leading-relaxed italic group-hover:text-slate-900 transition-colors duration-500">"{String(r.description)}"</p>
                                                <div className="mt-10 flex items-center gap-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                    <div className="w-10 h-10 rounded-[1.2rem] bg-slate-200 flex items-center justify-center text-slate-600 font-black group-hover:bg-[#10B981] group-hover:text-white transition-all shadow-inner">{r.userName?.charAt(0)}</div>
                                                    Staff Audit: <span className="text-[#0F172A] ml-1">{String(r.userName)}</span>
                                                </div>
                                            </div>
                                            <button onClick={async () => { if(window.confirm("¿Eliminar registro?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', r.id)) }} className="text-slate-100 hover:text-rose-600 p-4 transition-all duration-500 opacity-0 group-hover:opacity-100 relative z-20"><Trash2 size={24}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-56 text-center opacity-30 italic font-black text-slate-300 uppercase text-xs tracking-[0.5em]">Sin registros actuales en el nodo</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

          </div>
          
          <footer className="h-10 bg-[#0F172A] flex items-center px-12 justify-between text-[8px] font-black text-slate-500 uppercase tracking-[0.6em] z-40">
             <span>Nysem Montalbán EIRL • Consultoría Especializada</span>
             <span className="flex items-center gap-6">
                <span className="flex items-center gap-2 text-sky-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> Canal Cifrado</span>
                <span className="text-white/5">|</span>
                <span>Audit Console v18.0</span>
             </span>
          </footer>
       </main>
    </div>
  );
}
