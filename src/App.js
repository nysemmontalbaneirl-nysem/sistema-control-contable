import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, AlertCircle, BarChart3, Plus, Search,
  FileText, Trash2, Calendar as CalendarIcon, List,
  Database, Download, Bell, Shield, LogOut, History, 
  Lock, UserCog, Eye, Menu, X, ChevronRight, Home,
  Settings, FileCheck, CheckCircle2, ExternalLink, Pencil,
  ClipboardList, Timer, RefreshCw
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, 
  onSnapshot, query, addDoc, updateDoc, deleteDoc, 
  Timestamp 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  signInWithCustomToken 
} from 'firebase/auth';

// --- CONFIGURACIÓN FIREBASE (ASIGNADA POR EL ENTORNO) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- UTILIDADES ---
const formatDateTime = (date) => {
  if (!date) return "---";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('es-PE', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
};

const getTodayISO = () => new Date().toISOString().split('T')[0];

// --- COMPONENTES UI ATÓMICOS ---
const Badge = ({ status }) => {
  const styles = {
    'Pendiente': 'bg-slate-100 text-slate-700 border-slate-200',
    'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
    'En Revisión': 'bg-amber-50 text-amber-700 border-amber-200',
    'Completado': 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm ${styles[status] || styles['Pendiente']}`}>
      {status.toUpperCase()}
    </span>
  );
};

// --- APLICACIÓN PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadError, setLoadError] = useState(null);
  
  // Estados de datos sincronizados con Firestore
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reports, setReports] = useState([]);

  // Modales
  const [editingUser, setEditingUser] = useState(null);

  // --- REGLA 3: AUTENTICACIÓN ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setLoadError("Error de conexión con el servidor de seguridad.");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // --- REGLA 1 y 4: CARGA DE DATOS ---
  useEffect(() => {
    if (!user) return;

    // Sincronizar Usuarios y Auto-inicialización (Admin por defecto)
    const qUsers = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubUsers = onSnapshot(qUsers, async (snap) => {
      if (snap.empty) {
        const adminData = {
          uid: user.uid,
          username: 'admin',
          password: 'admin',
          name: 'Gerencia General',
          role: 'admin',
          createdAt: Timestamp.now()
        };
        await addDoc(qUsers, adminData);
        return;
      }

      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      
      // Buscamos al usuario actual
      const found = data.find(u => u.uid === user.uid) || data[0];
      setCurrentUserData(found);
      setIsInitializing(false);
    }, () => setLoadError("Error al sincronizar usuarios."));

    // Sincronizar Clientes
    const qClients = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const unsubClients = onSnapshot(qClients, (snap) => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sincronizar Asignaciones (Regla 2: Ordenar en memoria)
    const qAssig = collection(db, 'artifacts', appId, 'public', 'data', 'assignments');
    const unsubAssig = onSnapshot(qAssig, (snap) => {
      const sorted = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAssignments(sorted);
    });

    // Sincronizar Reportes de Labores
    const qReports = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const unsubReports = onSnapshot(qReports, (snap) => {
      const sorted = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReports(sorted);
    });

    return () => {
      unsubUsers();
      unsubClients();
      unsubAssig();
      unsubReports();
    };
  }, [user]);

  // --- ACCIONES DE GUARDADO ---
  const handleSaveAssignment = async (newAssign) => {
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'assignments');
    await addDoc(ref, { ...newAssign, createdAt: Timestamp.now() });
  };

  const handleSaveReport = async (reportEntry) => {
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    await addDoc(ref, { 
      ...reportEntry, 
      userId: user.uid, 
      userName: currentUserData.name,
      createdAt: Timestamp.now() 
    });
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-sm font-bold tracking-widest animate-pulse uppercase">Sincronizando NYSEM...</p>
        </div>
      </div>
    );
  }

  const SidebarItem = ({ id, icon: Icon, label, active, onClick }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 
        ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
      <Icon size={20} />
      {sidebarOpen && <span>{label}</span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 flex flex-col transition-all duration-300 shadow-2xl z-30`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-white text-xl">
            <div className="bg-blue-600 p-1.5 rounded-lg"><BarChart3 size={20} /></div>
            {sidebarOpen && <span>NYSEM</span>}
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <SidebarItem id="dashboard" icon={Home} label="Panel Central" active={viewMode === 'dashboard'} onClick={() => setViewMode('dashboard')} />
          <SidebarItem id="planning" icon={CalendarIcon} label="Planificación" active={viewMode === 'planning'} onClick={() => setViewMode('planning')} />
          <SidebarItem id="reports" icon={Timer} label="Mi Reporte" active={viewMode === 'reports'} onClick={() => setViewMode('reports')} />
          <SidebarItem id="clients" icon={Database} label="Clientes" active={viewMode === 'clients'} onClick={() => setViewMode('clients')} />
          {currentUserData?.role === 'admin' && (
            <SidebarItem id="admin" icon={Settings} label="Admin" active={viewMode === 'admin'} onClick={() => setViewMode('admin')} />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 text-slate-400 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold uppercase">
              {currentUserData?.name?.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{currentUserData?.name}</p>
                <p className="text-[9px] opacity-50 uppercase">{currentUserData?.role === 'admin' ? 'Gerente' : 'Asistente'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-blue-600 transition-colors">
            <Menu size={24} />
          </button>
          <div className="text-sm font-medium text-slate-500">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {viewMode === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <ClipboardList className="text-blue-600" size={20}/> Labores Programadas para Hoy
                    </h2>
                    <div className="space-y-3">
                      {assignments
                        .filter(a => a.date === getTodayISO() && (currentUserData?.role === 'admin' || a.userName === currentUserData?.name))
                        .map(a => (
                          <div key={a.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center hover:border-blue-300 transition-all">
                            <div>
                              <p className="text-sm font-bold text-slate-700">{a.taskDescription}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">CLIENTE: {a.clientName}</p>
                            </div>
                            <Badge status="Pendiente" />
                          </div>
                        ))}
                      {assignments.filter(a => a.date === getTodayISO()).length === 0 && (
                        <p className="text-center py-10 text-slate-400 italic text-sm">No hay tareas programadas para el día de hoy.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <History className="text-emerald-600" size={20}/> Actividad Reciente
                  </h2>
                  <div className="space-y-4">
                    {reports.slice(0, 5).map(r => (
                      <div key={r.id} className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-slate-700 uppercase">{r.userName}</span>
                          <span className="text-emerald-600 font-mono">{r.time}</span>
                        </div>
                        <p className="text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'planning' && (
              <PlanningModule 
                isAdmin={currentUserData?.role === 'admin'}
                users={users} 
                clients={clients} 
                assignments={assignments} 
                onSave={handleSaveAssignment} 
              />
            )}

            {viewMode === 'reports' && (
              <DailyReportModule 
                reports={reports} 
                onSave={handleSaveReport} 
                currentUser={currentUserData} 
              />
            )}

            {viewMode === 'clients' && (
              <ClientsModule 
                clients={clients} 
                onAdd={async (c) => {
                  const ref = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
                  await addDoc(ref, { ...c, createdAt: Timestamp.now() });
                }}
              />
            )}

            {viewMode === 'admin' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Administración de Equipo</h2>
                  <button onClick={() => setEditingUser({ name: '', username: '', password: '', role: 'user' })} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg">Nuevo Colaborador</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map(u => (
                    <div key={u.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center hover:bg-white transition-all hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {u.role === 'admin' ? <Shield size={16}/> : <Users size={16}/>}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{u.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{u.role}</p>
                        </div>
                      </div>
                      <button onClick={() => setEditingUser(u)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Pencil size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {editingUser && (
        <UserModal 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
          onSave={async (u) => {
            const ref = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            if(u.id) await updateDoc(doc(ref, u.id), u);
            else await addDoc(ref, { ...u, uid: crypto.randomUUID(), createdAt: Timestamp.now() });
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

// --- MÓDULO: PLANIFICACIÓN (PARA GERENCIA) ---
function PlanningModule({ isAdmin, users, clients, assignments, onSave }) {
  const [form, setForm] = useState({ date: getTodayISO(), userName: '', clientName: '', taskDescription: '' });

  if (!isAdmin) return (
    <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
      <Lock className="mx-auto text-slate-300 mb-4" size={48} />
      <h2 className="text-xl font-bold text-slate-800">Módulo Restringido</h2>
      <p className="text-sm text-slate-500">Solo la Gerencia General puede realizar la asignación diaria de tareas.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <CalendarIcon size={20} className="text-blue-600"/> Programación Diaria de Labores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fecha de Ejecución</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full text-sm p-2 rounded-xl border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Colaborador</label>
            <select value={form.userName} onChange={e => setForm({...form, userName: e.target.value})} className="w-full text-sm p-2 rounded-xl border-slate-200 outline-none">
              <option value="">Seleccionar Asistente...</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Empresa Destino</label>
            <select value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} className="w-full text-sm p-2 rounded-xl border-slate-200 outline-none">
              <option value="">Seleccionar Cliente...</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Labor a Realizar</label>
            <input type="text" placeholder="Ej: Analizar Cuentas por Cobrar" value={form.taskDescription} onChange={e => setForm({...form, taskDescription: e.target.value})} className="w-full text-sm p-2 rounded-xl border-slate-200 outline-none"/>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => {
              if(!form.userName || !form.taskDescription || !form.clientName) return;
              onSave(form);
              setForm({...form, taskDescription: ''});
            }}
            className="bg-slate-900 text-white px-8 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            ASIGNAR TAREA DIARIA
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-widest text-[9px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Responsable</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Labor Específica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {assignments.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-500 font-mono">{a.date}</td>
                  <td className="px-6 py-4 font-bold text-slate-800 uppercase tracking-tighter">{a.userName}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{a.clientName}</td>
                  <td className="px-6 py-4 italic text-slate-400">{a.taskDescription}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- MÓDULO: REPORTE DIARIO (PARA ASISTENTES) ---
function DailyReportModule({ reports, onSave, currentUser }) {
  const [form, setForm] = useState({ time: '', description: '', date: getTodayISO() });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="md:col-span-1">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Timer size={20} className="text-emerald-600"/> Mi Reporte de Producción
          </h2>
          <p className="text-[10px] text-slate-400 mb-6 uppercase tracking-widest font-bold">Registro de Actividades del Día</p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Hora Actual</label>
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full p-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descripción de la Tarea Realizada</label>
              <textarea 
                rows="5" 
                placeholder="Ej: Revisión de buzón SOL, descarga de facturas..." 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              ></textarea>
            </div>
            <button 
              onClick={() => {
                if(!form.time || !form.description) return;
                onSave(form);
                setForm({...form, description: '', time: ''});
              }}
              className="w-full bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold shadow-xl shadow-emerald-50 hover:bg-emerald-700 transition-all"
            >
              REGISTRAR EN BITÁCORA
            </button>
          </div>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white rounded-3xl border border-slate-200 min-h-[500px] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Línea de Tiempo de Labores</h3>
            <span className="text-[10px] font-bold bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500 uppercase tracking-widest">{getTodayISO()}</span>
          </div>
          <div className="p-8">
             <div className="relative border-l-2 border-slate-100 ml-4 space-y-10">
               {reports
                .filter(r => r.date === getTodayISO() && (currentUser?.role === 'admin' || r.userName === currentUser?.name))
                .map(r => (
                  <div key={r.id} className="relative pl-8">
                    <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-white border-4 border-emerald-500 shadow-md"></div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{r.time}</span>
                        {currentUser?.role === 'admin' && <span className="text-[10px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded-lg">{r.userName}</span>}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">{r.description}</p>
                    </div>
                  </div>
                ))}
                {reports.filter(r => r.date === getTodayISO()).length === 0 && (
                  <div className="text-center py-20 opacity-20 text-slate-400">
                    <ClipboardList className="mx-auto mb-4" size={64} />
                    <p className="text-sm font-bold uppercase tracking-widest">Sin registros registrados hoy</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- OTROS MÓDULOS DE SOPORTE ---
function ClientsModule({ clients, onAdd }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', ruc: '' });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
       <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-slate-800">Cartera de Clientes NYSEM</h2>
          <button onClick={() => setShowAdd(!showAdd)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-lg">
            {showAdd ? 'Cerrar' : '+ Registrar Nueva Empresa'}
          </button>
       </div>

       {showAdd && (
         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end animate-in slide-in-from-top duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Razón Social</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 rounded-xl border-slate-200 text-sm"/>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">RUC</label>
              <input type="text" value={form.ruc} onChange={e => setForm({...form, ruc: e.target.value})} className="w-full p-2 rounded-xl border-slate-200 text-sm" placeholder="20XXXXXXXXX"/>
            </div>
            <button onClick={() => { if(form.name && form.ruc) { onAdd(form); setForm({name:'', ruc:''}); setShowAdd(false); } }} className="bg-slate-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">Guardar Empresa</button>
         </div>
       )}

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(c => (
            <div key={c.id} className="p-6 border border-slate-100 rounded-3xl hover:border-blue-300 hover:shadow-xl transition-all group bg-white">
               <div className="flex justify-between items-start mb-6">
                 <div className="bg-slate-100 p-3 rounded-2xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Database size={32}/></div>
                 <ExternalLink size={20} className="text-slate-200 group-hover:text-blue-400 transition-colors"/>
               </div>
               <h3 className="font-bold text-lg text-slate-800 truncate uppercase" title={c.name}>{c.name}</h3>
               <p className="text-xs text-slate-400 font-mono mt-1 tracking-widest font-bold">RUC {c.ruc}</p>
            </div>
          ))}
       </div>
    </div>
  );
}

function UserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...user });
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
       <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 transform transition-all scale-100">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-slate-800">Ficha del Personal</h3>
            <p className="text-sm text-slate-500">Credenciales Corporativas NYSEM</p>
          </div>
          <div className="space-y-6">
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Nombre Completo</label>
               <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-slate-200 rounded-2xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"/>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Usuario</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 border-slate-200 rounded-2xl bg-slate-50 outline-none focus:bg-white transition-all"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Contraseña</label>
                  <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border-slate-200 rounded-2xl bg-slate-50 outline-none focus:bg-white transition-all"/>
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Rol</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 border-slate-200 rounded-2xl bg-slate-50 outline-none transition-all appearance-none cursor-pointer">
                  <option value="user">Asistente Contable</option>
                  <option value="admin">CPC (Gerente)</option>
                </select>
             </div>
          </div>
          <div className="flex justify-end gap-4 mt-10">
             <button onClick={onClose} className="px-8 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase text-xs tracking-widest">Cancelar</button>
             <button onClick={() => onSave(formData)} className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all text-xs tracking-widest uppercase">Guardar Perfil</button>
          </div>
       </div>
    </div>
  );
}
