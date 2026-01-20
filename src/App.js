import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, BarChart3, Menu, Home, Timer, RefreshCw, FolderOpen, 
  FileText, CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, DollarSign, History, Lock, Database, 
  Server, UserPlus, UserCog, LogIn, LogOut, Clock, AlertCircle, Settings
} from 'lucide-react';

// Firebase v11+
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, 
  updateDoc, deleteDoc, setDoc, Timestamp, query, orderBy 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

/**
 * NYSEM MONTALBAN EIRL - SISTEMA DE GESTIÓN DE PRODUCCIÓN (SGP)
 * VERSIÓN 13.0.0 - PRODUCTION READY (GITHUB/VERCEL/NETLIFY)
 * -----------------------------------------------------------
 * Esta versión utiliza variables de entorno estándar para despliegue web.
 */

// --- CONFIGURACIÓN DE INFRAESTRUCTURA ---
// Fuera de Canvas, se recomienda configurar estas variables en su panel de Vercel/GitHub
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).apiKey : ""),
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).authDomain : ""),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).projectId : ""),
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).storageBucket : ""),
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).messagingSenderId : ""),
  appId: process.env.REACT_APP_FIREBASE_APP_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).appId : "")
};

// Inicialización segura
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Estructura de base de datos estándar para Producción Web
const DB_ROOT = "produccion_nysem_v1"; 

const getTodayISO = () => new Date().toISOString().split('T')[0];

export default function App() {
  // --- ESTADOS DE CONTROL ---
  const [fbUser, setFbUser] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [currentUserData, setCurrentUserData] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  
  // --- ESTADOS DE DATOS ---
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);

  // --- FORMULARIOS ---
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', fee: '', sector: 'Agricultura' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  // --- LÓGICA DE NEGOCIO: SEMÁFORO SUNAT (NORMATIVA PERÚ) ---
  const calculateTaxRisk = (ruc, taxStatus) => {
    if (!ruc) return { color: 'slate', text: 'Sin RUC' }; 
    if (taxStatus === 'declared') return { color: 'emerald', text: 'Declarado' };
    const rucStr = String(ruc).trim();
    const lastDigit = parseInt(rucStr.charAt(rucStr.length - 1));
    if (isNaN(lastDigit)) return { color: 'slate', text: 'RUC Inválido' };
    
    // Alertas según Cronograma de Vencimientos SUNAT
    if ([0, 1, 2].includes(lastDigit)) return { color: 'rose', text: 'VENCIMIENTO CRÍTICO' }; 
    if ([3, 4, 5, 6].includes(lastDigit)) return { color: 'amber', text: 'PRÓXIMO' }; 
    return { color: 'blue', text: 'DENTRO DE PLAZO' }; 
  };

  // --- AUTENTICACIÓN ---
  useEffect(() => {
    const performAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        setAccessError(`Error de conexión con el servidor: ${err.message}`);
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

    // Sincronización de Usuarios para validación de Login
    const unsubUsers = onSnapshot(collection(db, DB_ROOT, "config", "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubClients, unsubReports;
    if (isLoggedIn) {
      unsubClients = onSnapshot(collection(db, DB_ROOT, "data", "clients"), snap => {
        setClients(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      
      const reportsQuery = query(collection(db, DB_ROOT, "data", "reports"), orderBy("createdAt", "desc"));
      unsubReports = onSnapshot(reportsQuery, snap => {
        setReports(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
    }

    return () => {
      unsubUsers();
      if (unsubClients) unsubClients();
      if (unsubReports) unsubReports();
    };
  }, [fbUser, isLoggedIn]);

  // --- GESTIÓN DE SESIÓN ---
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const { username, password } = loginForm;

    // Login Maestro CPC (Fail-safe para implementación)
    if (username === 'admin' && password === 'admin') {
      setCurrentUserData({ name: 'CPC Nysem Montalbán', role: 'admin', uid: fbUser?.uid });
      setIsLoggedIn(true);
      setAccessError(null);
      return;
    }

    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setCurrentUserData(found);
      setIsLoggedIn(true);
      setAccessError(null);
    } else {
      setAccessError("Credenciales inválidas. Verifique sus datos de acceso.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserData(null);
    setLoginForm({ username: '', password: '' });
  };

  // --- OPERACIONES DE GESTIÓN ---
  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.ruc) return;
    await addDoc(collection(db, DB_ROOT, "data", "clients"), { 
      ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() 
    });
    setClientForm({ name: '', ruc: '', fee: '', sector: 'Agricultura' });
  };

  const handleAddReport = async () => {
    if (!reportForm.description || !reportForm.clientName) return;
    await addDoc(collection(db, DB_ROOT, "data", "reports"), { 
      ...reportForm, 
      userName: String(currentUserData?.name || 'Staff'), 
      userId: fbUser?.uid,
      createdAt: Timestamp.now() 
    });
    setReportForm({ ...reportForm, description: '', time: '' });
  };

  const markAsDeclared = async (clientId) => {
    await updateDoc(doc(db, DB_ROOT, "data", "clients", clientId), { taxStatus: 'declared' });
  };

  const deleteItem = async (col, id) => {
    if (window.confirm("¿Está seguro de eliminar este registro permanentemente?")) {
      await deleteDoc(doc(db, DB_ROOT, "data", col, id));
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F172A] text-white p-6 font-sans">
        <div className="flex flex-col items-center gap-6">
          <RefreshCw className="animate-spin text-blue-500" size={56} />
          <div className="text-center">
            <p className="text-[10px] font-black tracking-[0.6em] uppercase text-blue-400">Nysem Montalbán EIRL</p>
            <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-2 italic">Iniciando Consola de Producción Web</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-12 text-center text-white relative">
            <Shield className="mx-auto mb-4 text-blue-500 relative z-10" size={52}/>
            <h1 className="text-2xl font-black uppercase tracking-tighter relative z-10 leading-none">Acceso SGP Nysem</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 relative z-10">Intranet Corporativa</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {accessError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="text-rose-500" size={18}/>
                <p className="text-[11px] font-bold text-rose-800 leading-tight">{accessError}</p>
              </div>
            )}
            <div className="space-y-4">
              <input 
                type="text" placeholder="Usuario" value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full p-5 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 shadow-inner"
              />
              <input 
                type="password" placeholder="Contraseña" value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full p-5 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 shadow-inner"
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl">
              Entrar al Sistema
            </button>
            <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">Asesoría & Capacitación Empresarial<br/>CPC Nysem Montalbán</p>
          </form>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'admin';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden animate-in fade-in duration-700">
       {/* SIDEBAR CORPORATIVO */}
       <aside className={`${sidebarOpen ? 'w-64' : 'w-24'} bg-slate-900 flex flex-col transition-all duration-300 shadow-2xl z-30`}>
         <div className="h-20 flex items-center justify-center border-b border-slate-800/50">
            <Database className="text-blue-500" size={24}/>
            {sidebarOpen && <span className="ml-3 font-black text-xl text-white tracking-tighter uppercase">Nysem SGP</span>}
         </div>
         <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            <button onClick={() => setViewMode('dashboard')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Home size={18}/> {sidebarOpen && "Dashboard"}
            </button>
            <button onClick={() => setViewMode('clients')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${viewMode === 'clients' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Building2 size={18}/> {sidebarOpen && "Cartera Nysem"}
            </button>
            <button onClick={() => setViewMode('reports')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${viewMode === 'reports' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Timer size={18}/> {sidebarOpen && "Bitácora Staff"}
            </button>
         </nav>
         <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/30">
                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black bg-blue-600`}>
                  {String(currentUserData?.name || 'U').charAt(0)}
                </div>
                {sidebarOpen && <div className="text-[10px] text-white font-bold truncate uppercase flex-1">{String(currentUserData?.name)}</div>}
                <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 transition-colors"><LogOut size={16}/></button>
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center px-6 justify-between shadow-sm z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all"><Menu size={20}/></button>
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-500"/>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {isAdmin ? "Control Administrativo" : "Producción Operativa"} | CPC Nysem Montalbán
                  </span>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 font-mono text-[11px] font-bold text-slate-600 shadow-inner">
              <Server size={14} className="text-blue-500"/> {String(getTodayISO())}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            
            {/* DASHBOARD PRINCIPAL */}
            {viewMode === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest">Cartera Activa</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter">{clients.length}</div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity"><Building2 size={100}/></div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest text-rose-500">Alertas SUNAT</h3>
                            <div className="text-5xl font-black text-rose-600 tracking-tighter">
                              {clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).color === 'rose').length}
                            </div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-rose-600"><AlertTriangle size={100}/></div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest text-emerald-500">Declarados</h3>
                            <div className="text-5xl font-black text-emerald-600 tracking-tighter">
                              {clients.filter(c => c.taxStatus === 'declared').length}
                            </div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-600"><CheckCircle2 size={100}/></div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest">Labores Hoy</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter">{reports.filter(r => r.date === getTodayISO()).length}</div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity"><Timer size={100}/></div>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-4 uppercase tracking-tighter"><History size={24} className="text-blue-500"/> Registro Maestro de Producción</h2>
                        <div className="space-y-4">
                            {reports.length > 0 ? reports.slice(0, 10).map(r => (
                                <div key={r.id} className="p-4 bg-slate-50 rounded-[1.5rem] flex justify-between items-center border border-slate-100 group hover:bg-white hover:border-blue-200 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-blue-600 font-black text-sm uppercase">
                                            {r.userName?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 leading-none group-hover:text-blue-700 transition-colors">"{String(r.description)}"</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest leading-none">{r.userName} | {r.clientName}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100">{String(r.time)}</span>
                                </div>
                            )) : (
                                <p className="text-center py-20 text-slate-300 font-black uppercase text-xs tracking-[0.2em] italic">Sin actividad registrada en la bitácora</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA CLIENTES */}
            {viewMode === 'clients' && (
                <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl">
                        <h2 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-5 text-blue-600 tracking-tighter uppercase"><Building2 size={32}/> Registro de Empresas en Cartera</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Razón Social</label><input type="text" placeholder="Ej: Consorcio Agrícola S.A." value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-700 shadow-inner"/></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">RUC (11 Dígitos)</label><input type="text" placeholder="20XXXXXXXXX" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-700 shadow-inner"/></div>
                        </div>
                        <button onClick={handleAddClient} className="mt-8 w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:bg-blue-700 transition-all active:scale-95">Integrar Cliente a Cartera Nysem</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clients.map(c => {
                            const risk = calculateTaxRisk(c.ruc, c.taxStatus);
                            return (
                                <div key={c.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 flex flex-col justify-between items-start group shadow-sm hover:shadow-xl transition-all">
                                    <div className="w-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-blue-50 rounded-[1.2rem] flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform"><Building2 size={28}/></div>
                                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${risk.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{risk.text}</div>
                                        </div>
                                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight truncate w-full leading-tight">{String(c.name)}</h3>
                                        <p className="text-[10px] font-black text-slate-300 font-mono mt-1 uppercase tracking-widest">RUC {String(c.ruc)}</p>
                                    </div>
                                    <div className="w-full flex justify-between items-center mt-8 pt-6 border-t border-slate-50">
                                        <button onClick={() => markAsDeclared(c.id)} className={`p-2 rounded-xl transition-all ${c.taxStatus === 'declared' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600'}`}>
                                          <CheckCircle2 size={18}/>
                                        </button>
                                        <button onClick={() => deleteItem('clients', c.id)} className="text-slate-100 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* VISTA REPORTES STAFF */}
            {viewMode === 'reports' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-700 pb-20">
                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm h-fit sticky top-6">
                        <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-4 uppercase tracking-tighter"><Timer className="text-emerald-500"/> Registro Staff</h2>
                        <div className="space-y-6">
                            <input type="time" value={reportForm.time} onChange={e => setReportForm({...reportForm, time: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 shadow-inner border border-slate-100"/>
                            <select value={reportForm.clientName} onChange={e => setReportForm({...reportForm, clientName: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 shadow-inner text-[10px] uppercase">
                                <option value="">Seleccionar Empresa...</option>
                                {clients.map(c => <option key={c.id} value={c.name}>{String(c.name)}</option>)}
                            </select>
                            <textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[2rem] border-none resize-none h-40 font-medium text-slate-600 shadow-inner text-sm leading-relaxed" placeholder="Resumen de labores diarias..."></textarea>
                            <button onClick={handleAddReport} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all active:scale-95 tracking-widest">Grabar Producción</button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white p-10 rounded-[4rem] border border-slate-200 shadow-sm min-h-[600px] overflow-hidden">
                        <h3 className="font-black text-slate-800 border-b border-slate-100 pb-6 mb-10 text-xl leading-none uppercase tracking-tighter">Bitácora de Producción Staff - Diario</h3>
                        <div className="space-y-6 relative border-l-4 border-slate-50 ml-4 pb-12">
                            {reports.filter(r => r.date === getTodayISO()).length > 0 ? (
                                reports.filter(r => r.date === getTodayISO()).map(r => (
                                    <div key={r.id} className="relative pl-10 animate-in slide-in-from-left-6">
                                        <div className="absolute -left-[12px] top-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white shadow-md ring-4 ring-emerald-50"></div>
                                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex justify-between items-start hover:bg-white shadow-sm transition-all group">
                                            <div>
                                                <p className="text-[10px] font-black text-blue-500 uppercase mb-2 tracking-[0.2em] leading-none">{String(r.clientName)}</p>
                                                <p className="text-[13px] font-bold text-slate-700 leading-relaxed italic group-hover:text-slate-900 transition-colors">"{String(r.description)}"</p>
                                                <p className="text-[9px] font-black text-slate-300 uppercase mt-4 tracking-widest">Responsable: {String(r.userName)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                              <div className="text-[10px] font-mono font-black text-emerald-600 bg-white px-3 py-1.5 rounded-full shadow-inner border border-slate-100 tracking-widest">{String(r.time)}</div>
                                              <button onClick={() => deleteItem('reports', r.id)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-40 text-center opacity-30">
                                    <History size={64} className="mx-auto mb-6 text-slate-200"/>
                                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">Aún no se reportan labores para hoy</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
          </div>
       </main>
    </div>
  );
}
