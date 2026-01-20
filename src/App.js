import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, BarChart3, Menu, Home,
  Timer, RefreshCw, ExternalLink, FolderOpen,
  FileText, CheckCircle2, Building2, AlertTriangle, 
  Shield, Plus, Trash2, Calendar as CalendarIcon, DollarSign,
  History as HistoryIcon, Lock, Database, Server, TrendingUp, Briefcase,
  UserPlus, UserCog, Key, LogIn, LogOut, Clock, Search, AlertCircle
} from 'lucide-react';

// Firebase v11+ Imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, 
  onSnapshot, addDoc, updateDoc, deleteDoc, setDoc,
  Timestamp 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  signInWithCustomToken 
} from 'firebase/auth';

/**
 * NYSEM MONTALBAN EIRL - SISTEMA DE GESTIÓN DE PRODUCCIÓN (SGP)
 * VERSIÓN 11.5.1 - FIXED PERMISSION PATHS & AUTH SYNC
 * Auditoría Técnica: CPC Nysem Montalbán
 */

// --- INICIALIZACIÓN DE INFRAESTRUCTURA ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * REGLA DE ORO DE CANVAS:
 * El path DEBE ser: artifacts/{appId}/public/data/{collection}
 * Extraemos el UUID real del entorno para evitar "Permission Denied".
 */
const getValidatedAppId = () => {
  const rawId = typeof __app_id !== 'undefined' ? __app_id : 'nysem_master_prod';
  // Si rawId es "artifacts/UUID/public/data/...", extraemos solo el UUID
  if (rawId.includes('artifacts/')) {
    return rawId.split('artifacts/')[1].split('/')[0];
  }
  return rawId.replace(/[^a-zA-Z0-9-]/g, '_');
};

const appId = getValidatedAppId();
const getTodayISO = () => new Date().toISOString().split('T')[0];

export default function App() {
  // --- ESTADOS DE CONTROL ---
  const [fbUser, setFbUser] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [currentUserData, setCurrentUserData] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [accessError, setAccessError] = useState(null);
  
  // --- ESTADOS DE DATOS ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reports, setReports] = useState([]);

  // --- FORMULARIOS ---
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', ruc: '', fee: '', driveUrl: '' });
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'user', hourlyCost: '' });

  // --- PASO 1: AUTENTICACIÓN (REGLA 3: Auth Before Query) ---
  useEffect(() => {
    const performAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Failure:", err.message);
        setAccessError(`Falla de Red: ${err.message}`);
      } finally {
        setIsInitializing(false);
      }
    };
    performAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setFbUser(u);
        setAccessError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- PASO 2: SINCRONIZACIÓN (REGLA 1: Strict Paths) ---
  useEffect(() => {
    // IMPORTANTE: Escuchar la lista de usuarios apenas haya auth de Firebase
    // para que el login pueda validar contra la base de datos.
    if (!fbUser || !db) return;

    const handleSnapError = (err) => {
      console.error("Firestore Permission Error:", err.message);
      // No mostramos error de inmediato para permitir el login local admin/admin
    };

    // Estructura de 5 niveles: artifacts -> appId -> public -> data -> collection
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const assignmentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'assignments');
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');

    const unsubUsers = onSnapshot(usersRef, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, handleSnapError);

    // Solo escuchamos el resto de datos si ya estamos logueados en la app
    let unsubClients, unsubAssig, unsubReports;
    if (isLoggedIn) {
      unsubClients = onSnapshot(clientsRef, snap => setClients(snap.docs.map(d => ({id: d.id, ...d.data()}))), handleSnapError);
      unsubAssig = onSnapshot(assignmentsRef, snap => setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()}))), handleSnapError);
      unsubReports = onSnapshot(reportsRef, snap => setReports(snap.docs.map(d => ({id: d.id, ...d.data()}))), handleSnapError);
    }

    return () => {
      unsubUsers();
      if (unsubClients) unsubClients();
      if (unsubAssig) unsubAssig();
      if (unsubReports) unsubReports();
    };
  }, [fbUser, isLoggedIn]);

  // --- LÓGICA DE ACCESO (FAIL-SAFE) ---
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    const { username, password } = loginForm;

    // 1. Prioridad: Acceso de Emergencia CPC (admin/admin)
    if (username === 'admin' && password === 'admin') {
      const adminProfile = {
        uid: fbUser?.uid || 'initial-admin',
        name: 'CPC Nysem Montalbán',
        username: 'admin',
        role: 'admin',
        hourlyCost: 50
      };
      
      setCurrentUserData(adminProfile);
      setIsLoggedIn(true);
      setAccessError(null);

      // Auto-creación de registro maestro en nube
      if (fbUser && db) {
        try {
          const userDoc = doc(db, 'artifacts', appId, 'public', 'data', 'users', fbUser.uid);
          await setDoc(userDoc, { ...adminProfile, createdAt: Timestamp.now() }, { merge: true });
        } catch (e) { console.warn("Admin sync deferred"); }
      }
      return;
    }

    // 2. Validación contra Personal Registrado
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setCurrentUserData(found);
      setIsLoggedIn(true);
      setAccessError(null);
    } else {
      setAccessError("Usuario o contraseña no válidos.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserData(null);
    setLoginForm({ username: '', password: '' });
  };

  // --- CRUD OPERACIONES ---
  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.ruc || !db) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { 
        ...clientForm, createdAt: Timestamp.now() 
      });
      setClientForm({ name: '', ruc: '', fee: '', driveUrl: '' });
    } catch (e) { setAccessError("Error al grabar cliente: " + e.message); }
  };

  const deleteItem = async (col, id) => {
    if (!db) return;
    if (window.confirm("¿Confirmar eliminación permanente del registro contable?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
      } catch (e) { setAccessError("Falla de eliminación: " + e.message); }
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F172A] text-white p-6 font-sans">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-500 shadow-xl shadow-blue-500/20"></div>
          <p className="text-[10px] font-black tracking-[0.4em] uppercase text-blue-400">Autenticando Nodo Maestro v11.5.1</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-[#0F172A] p-12 text-center text-white relative overflow-hidden">
            <Shield className="mx-auto mb-4 text-blue-500 relative z-10" size={48}/>
            <h1 className="text-xl font-black uppercase tracking-tighter relative z-10">Acceso SGP Nysem</h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 relative z-10">Control Interno Despacho</p>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl"></div>
          </div>
          
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {accessError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="text-rose-500 flex-shrink-0" size={18}/>
                <p className="text-[11px] font-bold text-rose-800 leading-tight">{accessError}</p>
              </div>
            )}
            <div className="space-y-4">
              <input 
                type="text" placeholder="Usuario (admin)" value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 shadow-inner"
                required
              />
              <input 
                type="password" placeholder="Contraseña (admin)" value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 shadow-inner"
                required
              />
            </div>
            <button type="submit" className="w-full bg-[#0F172A] text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95">
              Entrar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'admin';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden animate-in fade-in duration-700">
       <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#0F172A] flex flex-col transition-all duration-300 shadow-2xl z-30`}>
         <div className="h-20 flex items-center justify-center border-b border-slate-800/50">
            <Database className="text-blue-500" size={24}/>
            {sidebarOpen && <span className="ml-3 font-black text-xl text-white tracking-tighter uppercase">Nysem SGP</span>}
         </div>
         <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <button onClick={() => setViewMode('dashboard')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Home size={18}/> {sidebarOpen && "Resumen General"}
            </button>
            <button onClick={() => setViewMode('clients')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${viewMode === 'clients' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Building2 size={18}/> {sidebarOpen && "Cartera Nysem"}
            </button>
            {isAdmin && (
              <button onClick={() => setViewMode('admin_users')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition-all ${viewMode === 'admin_users' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
                <UserCog size={18}/> {sidebarOpen && "Gestión Staff"}
              </button>
            )}
         </nav>
         <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/30">
                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-sm uppercase ${isAdmin ? 'bg-indigo-600' : 'bg-blue-500'}`}>
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
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Menu size={20}/></button>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Shield size={16} className={isAdmin ? "text-indigo-500" : "text-blue-500"}/>
                  {isAdmin ? "Control Administrativo" : "Producción Operativa"}
                </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 font-mono text-[11px] font-bold text-slate-600">
              <Server size={14} className="text-blue-500"/> {String(getTodayISO())}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            {viewMode === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest">Empresas en Cartera</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter">{Number(clients.length || 0)}</div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest">Staff Operativo</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter">{Number(users.length || 0)}</div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest">Labores Totales</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter">{assignments.length}</div>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'clients' && (
                <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-xl shadow-slate-100">
                        <h2 className="text-3xl font-black text-slate-800 mb-10 flex items-center gap-5 text-blue-600 tracking-tighter uppercase"><Building2 size={40} className="bg-blue-50 p-2 rounded-2xl"/> Alta de Empresas</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <input type="text" placeholder="Razón Social" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-700 shadow-inner"/>
                            <input type="text" placeholder="Número de RUC" value={clientForm.ruc} onChange={e => setClientForm({...clientForm, ruc: e.target.value})} className="p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-700 shadow-inner"/>
                        </div>
                        <button onClick={handleAddClient} className="mt-12 w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95">Integrar Cliente a Cartera</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {clients.map(c => (
                            <div key={c.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 flex justify-between items-center group transition-all hover:bg-slate-50 shadow-sm hover:shadow-2xl">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform"><Building2 size={32}/></div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight truncate w-36 leading-tight">{String(c.name)}</h3>
                                        <p className="text-[10px] font-black text-slate-300 font-mono mt-1 uppercase tracking-widest">RUC {String(c.ruc)}</p>
                                    </div>
                                </div>
                                <button onClick={() => deleteItem('clients', c.id)} className="text-slate-100 hover:text-rose-500 transition-colors p-3 hover:bg-rose-50 rounded-2xl"><Trash2 size={22}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
       </main>
    </div>
  );
}
