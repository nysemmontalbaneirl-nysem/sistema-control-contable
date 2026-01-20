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
 * VERSIÓN 13.2.0 - VERCEL CUSTOM ENV NAMES (RECONCILIACIÓN TÉCNICA)
 * -----------------------------------------------------------
 */

// --- CONFIGURACIÓN DE SEGURIDAD (AJUSTADA A NOMBRES ESPECÍFICOS DE VERCEL) ---
const firebaseConfig = {
  apiKey: process.env.REACTAPPFIREBASEAPIKEY || process.env.VITE_FIREBASE_API_KEY || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).apiKey : ""),
  authDomain: process.env.VITEFIREBASEAUTHDOMAIN || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).authDomain : ""),
  projectId: process.env.VITEFIREBASEPROJECTID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).projectId : ""),
  storageBucket: process.env.VITEFIREBASESTORAGEBUCKET || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).storageBucket : ""),
  messagingSenderId: process.env.VITEFIREBASEMESSAGINGSENDERID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).messagingSenderId : ""),
  appId: process.env.VITEFIREBASEAPPID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).appId : "")
};

// Validación de integridad de configuración
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app, auth, db;
if (isConfigValid) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Infrastructure Error:", e);
  }
}

const DATABASE_ROOT = "nysem_sgp_production_v13";
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
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', fee: '', sector: 'Comercio' });
  const [reportForm, setReportForm] = useState({ time: '', description: '', date: getTodayISO(), clientName: '' });

  // --- LÓGICA DE NEGOCIO: SEMÁFORO SUNAT (REGLA PERÚ) ---
  const calculateTaxRisk = (ruc, taxStatus) => {
    if (!ruc) return { color: 'slate', text: 'Sin RUC' }; 
    if (taxStatus === 'declared') return { color: 'emerald', text: 'Declarado' };
    const rucStr = String(ruc).trim();
    const lastDigit = parseInt(rucStr.charAt(rucStr.length - 1));
    if (isNaN(lastDigit)) return { color: 'slate', text: 'Inválido' };
    
    if ([0, 1, 2].includes(lastDigit)) return { color: 'rose', text: 'VENCE HOY/MAÑANA' }; 
    if ([3, 4, 5, 6].includes(lastDigit)) return { color: 'amber', text: 'PRÓXIMO' }; 
    return { color: 'blue', text: 'DENTRO DE PLAZO' }; 
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
    const unsubUsers = onSnapshot(collection(db, DATABASE_ROOT, "data", "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubClients, unsubReports;
    if (isLoggedIn) {
      unsubClients = onSnapshot(collection(db, DATABASE_ROOT, "data", "clients"), snap => setClients(snap.docs.map(d => ({id: d.id, ...d.data()}))));
      unsubReports = onSnapshot(query(collection(db, DATABASE_ROOT, "data", "reports"), orderBy("createdAt", "desc")), snap => setReports(snap.docs.map(d => ({id: d.id, ...d.data()}))));
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
    if (username === 'admin' && password === 'admin') {
      setCurrentUserData({ name: 'CPC Nysem Montalbán', role: 'admin', uid: fbUser?.uid });
      setIsLoggedIn(true);
      return;
    }
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setCurrentUserData(found);
      setIsLoggedIn(true);
      setAccessError(null);
    } else {
      setAccessError("Usuario o contraseña incorrectos.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserData(null);
    setLoginForm({ username: '', password: '' });
  };

  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.ruc) return;
    await addDoc(collection(db, DATABASE_ROOT, "data", "clients"), { 
      ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() 
    });
    setClientForm({ name: '', ruc: '', fee: '', sector: 'Comercio' });
  };

  const handleAddReport = async () => {
    if (!reportForm.description || !reportForm.clientName) return;
    await addDoc(collection(db, DATABASE_ROOT, "data", "reports"), { 
      ...reportForm, 
      userName: String(currentUserData?.name || 'Staff'), 
      userId: fbUser?.uid,
      createdAt: Timestamp.now() 
    });
    setReportForm({ ...reportForm, description: '', time: '' });
  };

  const markAsDeclared = async (clientId) => {
    await updateDoc(doc(db, DATABASE_ROOT, "data", "clients", clientId), { taxStatus: 'declared' });
  };

  const deleteItem = async (col, id) => {
    if (window.confirm("¿Confirmar eliminación permanente del registro contable?")) {
      await deleteDoc(doc(db, DATABASE_ROOT, "data", col, id));
    }
  };

  // --- PANTALLA DE DIAGNÓSTICO PROFESIONAL ---
  if (!isConfigValid) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F172A] text-white p-10 font-sans">
        <div className="max-w-2xl w-full bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-6 mb-10 text-amber-400">
            <Settings className="animate-spin-slow" size={48} />
            <h1 className="text-2xl font-black uppercase tracking-tighter">Sintonía de Variables Vercel</h1>
          </div>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed italic">
            Estimado Colega, la aplicación está detectando sus variables personalizadas. Si ve esta pantalla, verifique que los valores en Vercel correspondan a su proyecto de Firebase.
          </p>
          <div className="bg-black/40 p-8 rounded-[2rem] mb-12 space-y-3 font-mono text-[10px] border border-slate-800 shadow-inner">
            <p className="text-emerald-500 font-bold tracking-widest uppercase mb-4">Nombres detectados en su panel:</p>
            <div className="grid grid-cols-1 gap-2 text-slate-500 font-black">
              <div className="flex justify-between"><span>API KEY:</span> <span>REACTAPPFIREBASEAPIKEY</span></div>
              <div className="flex justify-between"><span>AUTH DOMAIN:</span> <span>VITEFIREBASEAUTHDOMAIN</span></div>
              <div className="flex justify-between"><span>PROJECT ID:</span> <span>VITEFIREBASEPROJECTID</span></div>
              <div className="flex justify-between"><span>STORAGE BUCKET:</span> <span>VITEFIREBASESTORAGEBUCKET</span></div>
              <div className="flex justify-between"><span>MESSAGING ID:</span> <span>VITEFIREBASEMESSAGINGSENDERID</span></div>
              <div className="flex justify-between"><span>APP ID:</span> <span>VITEFIREBASEAPPID</span></div>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest text-center tracking-[0.4em]">Auditoría de Infraestructura v13.2.0</p>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="flex flex-col items-center gap-6">
          <RefreshCw className="animate-spin text-blue-500" size={56} />
          <p className="text-[10px] font-black tracking-[0.5em] uppercase text-blue-400">Iniciando SGP Nysem...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-12 text-center text-white relative overflow-hidden">
            <Shield className="mx-auto mb-5 text-blue-500 relative z-10" size={56}/>
            <h1 className="text-3xl font-black uppercase tracking-tighter relative z-10 leading-none">Acceso SGP</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 relative z-10">Nysem Montalbán EIRL</p>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
          </div>
          <form onSubmit={handleLogin} className="p-12 space-y-6">
            {accessError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="text-rose-500" size={18}/>
                <p className="text-[11px] font-bold text-rose-800 leading-tight">{accessError}</p>
              </div>
            )}
            <input type="text" placeholder="Usuario" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 shadow-inner" required />
            <input type="password" placeholder="Contraseña" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 shadow-inner" required />
            <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl">Entrar al Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
       {/* SIDEBAR */}
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
              <Building2 size={18}/> {sidebarOpen && "Cartera"}
            </button>
            <button onClick={() => setViewMode('reports')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${viewMode === 'reports' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Timer size={18}/> {sidebarOpen && "Bitácora Staff"}
            </button>
         </nav>
         <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/30">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black bg-blue-600">{currentUserData?.name?.charAt(0)}</div>
                {sidebarOpen && <div className="text-[10px] text-white font-bold truncate uppercase flex-1">{String(currentUserData?.name)}</div>}
                <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 transition-colors"><LogOut size={16}/></button>
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center px-6 justify-between shadow-sm z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Menu size={20}/></button>
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-500"/>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">CPC Nysem Montalbán</span>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 font-mono text-[11px] font-bold text-slate-600 shadow-inner">
              <Server size={14} className="text-blue-500"/> {String(getTodayISO())}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            {viewMode === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest">Cartera Activa</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter">{clients.length}</div>
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest text-rose-500">Alertas SUNAT</h3>
                            <div className="text-5xl font-black text-rose-600 tracking-tighter">
                              {clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).color === 'rose').length}
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest text-emerald-500">Declarados</h3>
                            <div className="text-5xl font-black text-emerald-600 tracking-tighter">
                              {clients.filter(c => c.taxStatus === 'declared').length}
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest">Producción Hoy</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter">{reports.filter(r => r.date === getTodayISO()).length}</div>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-4 uppercase tracking-tighter"><History size={24} className="text-blue-500"/> Registro Maestro de Producción</h2>
                        <div className="space-y-4">
                            {reports.length > 0 ? reports.slice(0, 10).map(r => (
                                <div key={r.id} className="p-4 bg-slate-50 rounded-[1.5rem] flex justify-between items-center border border-slate-100 group hover:bg-white hover:border-blue-200 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-blue-600 font-black text-sm uppercase">{r.userName?.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 leading-none group-hover:text-blue-700 transition-colors">"{String(r.description)}"</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest leading-none">{r.userName} | {r.clientName}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 tracking-widest">{String(r.time)}</span>
                                </div>
                            )) : (
                                <p className="text-center py-20 text-slate-300 font-black uppercase text-xs tracking-[0.2em] italic">Sin actividad registrada en la bitácora</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'clients' && (
                <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl">
                        <h2 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-5 text-blue-600 tracking-tighter uppercase"><Building2 size={32}/> Gestión de Cartera de Clientes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <input type="text" placeholder="Razón Social" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-700 shadow-inner"/>
                            <input type="text" placeholder="Número de RUC" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-700 shadow-inner"/>
                        </div>
                        <button onClick={handleAddClient} className="mt-8 w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:bg-blue-700 transition-all active:scale-95">Integrar Cliente a Cartera</button>
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
                                        <button onClick={() => markAsDeclared(c.id)} className={`p-2 rounded-xl transition-all ${c.taxStatus === 'declared' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600'}`}><CheckCircle2 size={18}/></button>
                                        <button onClick={() => deleteItem('clients', c.id)} className="text-slate-100 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>
       </main>
    </div>
  );
}
