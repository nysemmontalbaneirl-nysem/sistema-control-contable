import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, BarChart3, Menu, Home, Timer, RefreshCw, FolderOpen, 
  FileText, CheckCircle2, Building2, AlertTriangle, Shield, 
  Plus, Trash2, Calendar, DollarSign, History, Lock, Database, 
  Server, UserPlus, UserCog, LogIn, LogOut, Clock, AlertCircle, Settings
} from 'lucide-react';

// Firebase v11+ Implementation
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
 * VERSIÓN 13.7.0 - PROTOCOLO REACT_APP PARA VERCEL
 * PROYECTO OBJETIVO: nysem-sgp-prod
 */

// --- CONFIGURACIÓN DE SEGURIDAD (ESTÁNDAR REQUERIDO PARA DESPLIEGUE WEB) ---
const firebaseConfig = {
  // El prefijo REACT_APP_ es obligatorio para que las variables sean visibles en el navegador
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).apiKey : ""),
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).authDomain : ""),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).projectId : ""),
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).storageBucket : ""),
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).messagingSenderId : ""),
  appId: process.env.REACT_APP_FIREBASE_APP_ID || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).appId : "")
};

// Validación de Infraestructura Crítica
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
    if (isNaN(lastDigit)) return { color: 'slate', text: 'RUC Inválido', level: 0 };
    
    // Basado en cronograma de vencimientos SUNAT (Perú)
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
        setAccessError(`Error de Sincronización Cloud: ${err.message}`);
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

    // Sincronización de Usuarios
    const unsubUsers = onSnapshot(collection(db, DB_PATH, "data", "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubClients, unsubReports;
    if (isLoggedIn) {
      unsubClients = onSnapshot(collection(db, DB_PATH, "data", "clients"), snap => {
          setClients(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      unsubReports = onSnapshot(query(collection(db, DB_PATH, "data", "reports"), orderBy("createdAt", "desc")), snap => {
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
    // Credencial Maestra para el CPC Nysem Montalbán
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
      setAccessError("Acceso denegado. Verifique usuario y clave.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserData(null);
    setLoginForm({ username: '', password: '' });
  };

  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.ruc) return;
    await addDoc(collection(db, DB_PATH, "data", "clients"), { 
      ...clientForm, taxStatus: 'pending', createdAt: Timestamp.now() 
    });
    setClientForm({ name: '', ruc: '', fee: '', sector: 'Servicios' });
  };

  const handleAddReport = async () => {
    if (!reportForm.description || !reportForm.clientName) return;
    await addDoc(collection(db, DB_PATH, "data", "reports"), { 
      ...reportForm, 
      userName: String(currentUserData?.name || 'Staff'), 
      userId: fbUser?.uid,
      createdAt: Timestamp.now() 
    });
    setReportForm({ ...reportForm, description: '', time: '' });
  };

  const markAsDeclared = async (clientId) => {
    await updateDoc(doc(db, DB_PATH, "data", "clients", clientId), { taxStatus: 'declared' });
  };

  const deleteItem = async (col, id) => {
    if (window.confirm("¿Confirmar eliminación permanente del registro contable?")) {
      await deleteDoc(doc(db, DB_PATH, "data", col, id));
    }
  };

  // --- UI: MONITOR DE AUDITORÍA TÉCNICA (FALLO DE VARIABLES) ---
  if (!isConfigValid) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F172A] text-white p-10 font-sans">
        <div className="max-w-2xl w-full bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-6 mb-10 text-amber-400">
            <Settings className="animate-spin-slow" size={52} />
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">Conexión Vercel Pendiente</h1>
          </div>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed italic">
            Colega Montalbán, el sistema requiere que las variables en Vercel utilicen el prefijo obligatorio <span className="text-blue-400 font-bold">REACT_APP_</span> para el proyecto <span className="text-blue-400 font-bold">nysem-sgp-prod</span>. Verifique los nombres:
          </p>
          <div className="bg-black/40 p-8 rounded-[2rem] mb-12 space-y-4 font-mono text-[10px] border border-slate-800 shadow-inner">
             <div className="grid grid-cols-2 gap-4 text-slate-500 font-black uppercase tracking-tighter">
                <div className="flex flex-col gap-1"><span>REACT_APP_FIREBASE_API_KEY</span> <span className={firebaseConfig.apiKey ? 'text-emerald-500':'text-rose-500'}>{firebaseConfig.apiKey ? '[OK]':'[FALTA]'}</span></div>
                <div className="flex flex-col gap-1"><span>REACT_APP_FIREBASE_PROJECT_ID</span> <span className={firebaseConfig.projectId ? 'text-emerald-500':'text-rose-500'}>{firebaseConfig.projectId ? '[OK]':'[FALTA]'}</span></div>
                <div className="flex flex-col gap-1"><span>REACT_APP_FIREBASE_AUTH_DOMAIN</span> <span className={firebaseConfig.authDomain ? 'text-emerald-500':'text-rose-500'}>{firebaseConfig.authDomain ? '[OK]':'[FALTA]'}</span></div>
                <div className="flex flex-col gap-1"><span>REACT_APP_FIREBASE_APP_ID</span> <span className={firebaseConfig.appId ? 'text-emerald-500':'text-rose-500'}>{firebaseConfig.appId ? '[OK]':'[FALTA]'}</span></div>
             </div>
          </div>
          <p className="text-center text-[10px] text-slate-600 uppercase font-black tracking-widest">Protocolo de Despliegue Nysem v13.7.0</p>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-8">
          <RefreshCw className="animate-spin text-blue-500" size={60} />
          <div className="text-center">
             <p className="text-[10px] font-black tracking-[0.5em] uppercase text-blue-400">Validando Nodo de Producción</p>
             <p className="text-[9px] text-slate-500 mt-2 font-mono">PROYECTO: nysem-sgp-prod</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-[4rem] shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-12 text-center text-white relative overflow-hidden">
            <Shield className="mx-auto mb-5 text-blue-500 relative z-10" size={56}/>
            <h1 className="text-3xl font-black uppercase tracking-tighter relative z-10 leading-none">Acceso SGP</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 relative z-10">Nysem Montalbán EIRL</p>
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
            <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95">Entrar al Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'admin';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden animate-in fade-in duration-1000">
       {/* SIDEBAR */}
       <aside className={`${sidebarOpen ? 'w-64' : 'w-24'} bg-slate-900 flex flex-col transition-all duration-500 shadow-2xl z-30`}>
         <div className="h-24 flex items-center justify-center border-b border-slate-800/50">
            <Database className="text-blue-500" size={28}/>
            {sidebarOpen && <span className="ml-3 font-black text-2xl text-white tracking-tighter uppercase">Nysem SGP</span>}
         </div>
         <nav className="flex-1 p-5 space-y-2 overflow-y-auto custom-scrollbar">
            <button onClick={() => setViewMode('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] text-sm font-bold transition-all ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Home size={20}/> {sidebarOpen && "Dashboard"}
            </button>
            <button onClick={() => setViewMode('clients')} className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] text-sm font-bold transition-all ${viewMode === 'clients' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Building2 size={20}/> {sidebarOpen && "Cartera"}
            </button>
            <button onClick={() => setViewMode('reports')} className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] text-sm font-bold transition-all ${viewMode === 'reports' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Timer size={20}/> {sidebarOpen && "Bitácora"}
            </button>
         </nav>
         <div className="p-5 border-t border-slate-800/50">
            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-[2rem] border border-slate-700/30">
                <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-black bg-blue-600 shadow-lg">{String(currentUserData?.name || 'U').charAt(0)}</div>
                {sidebarOpen && <div className="text-[10px] text-white font-black truncate uppercase flex-1">{String(currentUserData?.name)}</div>}
                <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 transition-colors p-2"><LogOut size={20}/></button>
            </div>
         </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-20 bg-white border-b flex items-center px-8 justify-between shadow-sm z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all"><Menu size={24}/></button>
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-blue-500"/>
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    CPC Nysem Montalbán | Asesoría & Capacitación
                  </span>
                </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 font-mono text-[12px] font-black text-slate-700 shadow-inner">
              <Server size={16} className="text-blue-500"/> {String(getTodayISO())}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {/* DASHBOARD */}
            {viewMode === 'dashboard' && (
                <div className="space-y-10 animate-in fade-in duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest">Cartera Activa</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter">{clients.length}</div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity"><Building2 size={120}/></div>
                        </div>
                        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest text-rose-500">Alertas SUNAT</h3>
                            <div className="text-5xl font-black text-rose-600 tracking-tighter">
                              {clients.filter(c => calculateTaxRisk(c.ruc, c.taxStatus).color === 'rose').length}
                            </div>
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-rose-600"><AlertTriangle size={120}/></div>
                        </div>
                        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest text-emerald-500">Declarados</h3>
                            <div className="text-5xl font-black text-emerald-600 tracking-tighter">
                              {clients.filter(c => c.taxStatus === 'declared').length}
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
       </main>
    </div>
  );
}
