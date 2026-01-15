import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, AlertCircle, BarChart3, Plus, Search,
  FileText, Trash2, Calendar as CalendarIcon, List,
  Database, Download, Bell, Shield, LogOut, History, 
  Lock, UserCog, Eye, Menu, X, ChevronRight, Home,
  Settings, FileCheck, CheckCircle2, ExternalLink
} from 'lucide-react';

// --- UTILIDADES ---
const formatDateTime = (date) => new Date(date).toLocaleString('es-PE', { 
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
});

// --- ESTILOS DE COLORES CORPORATIVOS ---
const COLORS = {
  sidebar: 'bg-slate-900',
  sidebarHover: 'hover:bg-slate-800',
  primary: 'bg-blue-600 hover:bg-blue-700',
  success: 'bg-emerald-600 hover:bg-emerald-700',
  warning: 'bg-amber-500 hover:bg-amber-600',
  danger: 'bg-red-600 hover:bg-red-700',
  background: 'bg-slate-50',
  card: 'bg-white',
  textMain: 'text-slate-800',
  textMuted: 'text-slate-500'
};

// --- COMPONENTES UI ATÓMICOS ---

const Badge = ({ status }) => {
  const styles = {
    'Pendiente': 'bg-slate-100 text-slate-700 border-slate-200',
    'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
    'En Revisión': 'bg-amber-50 text-amber-700 border-amber-200',
    'Completado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Atrasado': 'bg-rose-50 text-rose-700 border-rose-200',
    'FAVORABLE': 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold',
    'EN EVALUACIÓN': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'POR PRESENTAR': 'bg-orange-50 text-orange-700 border-orange-200'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${styles[status] || styles['Pendiente']}`}>
      {status}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass, subtext }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
  </div>
);

// --- DATOS INICIALES (MOCKS) ---
const INITIAL_CLIENTS = [
  { id: 1, name: 'Constructora Del Norte SAC', ruc: '20100000001', driveUrl: 'https://drive.google.com' },
  { id: 2, name: 'Agroexportadora Piura EIRL', ruc: '20601234567', driveUrl: '' },
  { id: 3, name: 'Servicios Generales ABC', ruc: '10456789012', driveUrl: '' }
];

const INITIAL_USERS = [
  { id: 1, username: 'admin', password: 'admin', name: 'Gerencia General', role: 'admin', assignments: [] },
  { id: 2, username: 'asistente', password: '123', name: 'Juan Pérez', role: 'user', assignments: [{ clientId: 1, permission: 'edit' }] }
];

const INITIAL_TASKS = [
  { id: 1, title: 'Declaración IGV-Renta Octubre', client: 'Constructora Del Norte SAC', assistant: 'Juan Pérez', dueDate: '2025-10-15', status: 'En Revisión', priority: 'Alta' },
  { id: 2, title: 'Planilla Electrónica Plame', client: 'Agroexportadora Piura EIRL', assistant: 'Maria Lopez', dueDate: '2025-10-18', status: 'Pendiente', priority: 'Media' },
];

const INITIAL_NOTIFICATIONS = [
  { id: 1, notificationNum: '0120250000123', client: 'Constructora Del Norte SAC', type: 'Fiscalización Parcial IGV', sunatStatus: 'EN EVALUACIÓN' }
];

// --- APLICACIÓN PRINCIPAL ---

export default function AccountingApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard'); // dashboard, tasks, notifications, admin, clients
  
  // Estados de datos
  const [users, setUsers] = useState(INITIAL_USERS);
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [logs, setLogs] = useState([]);

  // Modales
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  // --- AUTO-CORRECCIÓN DE ESTILOS ---
  // Este efecto inyecta el motor de diseño (Tailwind) automáticamente si falta en la nube.
  useEffect(() => {
    const existingScript = document.getElementById('tailwind-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'tailwind-script';
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // --- LOGGING ---
  const logAction = (action, details) => {
    const newLog = { id: Date.now(), timestamp: new Date().toISOString(), user: currentUser.username, action, details };
    setLogs(prev => [newLog, ...prev]);
  };

  // --- LOGIN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-4 rounded-xl shadow-lg shadow-blue-200 mb-4">
              <Shield className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Acceso Seguro</h2>
            <p className="text-sm text-slate-400">Sistema de Control Interno</p>
          </div>
          <LoginForm users={users} onLogin={setCurrentUser} />
        </div>
      </div>
    );
  }

  // --- NAVEGACIÓN LATERAL (SIDEBAR) ---
  const SidebarItem = ({ id, icon: Icon, label, active, onClick }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 
        ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
      <Icon size={20} />
      {sidebarOpen && <span>{label}</span>}
      {active && sidebarOpen && <ChevronRight size={16} className="ml-auto opacity-50"/>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 flex flex-col transition-all duration-300 shadow-2xl z-20`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-white text-xl tracking-tight">
            <div className="bg-blue-600 p-1.5 rounded-lg"><BarChart3 size={20} /></div>
            {sidebarOpen && <span>NYSEM</span>}
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {sidebarOpen ? 'Principal' : '...'}
          </div>
          <SidebarItem id="dashboard" icon={Home} label="Dashboard" active={viewMode === 'dashboard'} onClick={() => setViewMode('dashboard')} />
          <SidebarItem id="tasks" icon={List} label="Tareas & Obligaciones" active={viewMode === 'tasks'} onClick={() => setViewMode('tasks')} />
          <SidebarItem id="notifications" icon={Bell} label="Notificaciones SUNAT" active={viewMode === 'notifications'} onClick={() => setViewMode('notifications')} />
          
          <div className="mt-8 px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {sidebarOpen ? 'Gestión' : '...'}
          </div>
          <SidebarItem id="clients" icon={Database} label="Cartera de Clientes" active={viewMode === 'clients'} onClick={() => setViewMode('clients')} />
          {currentUser.role === 'admin' && (
            <SidebarItem id="admin" icon={Settings} label="Administración" active={viewMode === 'admin'} onClick={() => setViewMode('admin')} />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setCurrentUser(null)}
            className="flex items-center gap-3 text-slate-400 hover:text-white text-sm w-full transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-blue-600 transition-colors">
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-xs text-slate-500 capitalize">{currentUser.role === 'admin' ? 'Administrador' : 'Asistente Contable'}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-200">
              {currentUser.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* AREA DE TRABAJO */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            
            {/* VISTA DASHBOARD (Resumen Ejecutivo) */}
            {viewMode === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800">Resumen Ejecutivo</h2>
                  <p className="text-sm text-slate-500">{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Tareas Pendientes" 
                    value={tasks.filter(t => t.status === 'Pendiente').length} 
                    icon={Clock} 
                    colorClass="bg-slate-600"
                    subtext="Vencen esta semana"
                  />
                  <StatCard 
                    title="En Proceso" 
                    value={tasks.filter(t => t.status === 'En Proceso').length} 
                    icon={Users} 
                    colorClass="bg-blue-600"
                    subtext="Asignadas a equipo"
                  />
                  <StatCard 
                    title="Por Revisar" 
                    value={tasks.filter(t => t.status === 'En Revisión').length} 
                    icon={FileCheck} 
                    colorClass="bg-amber-500"
                    subtext="Requieren VB del Contador"
                  />
                  <StatCard 
                    title="Notificaciones" 
                    value={notifications.filter(n => n.sunatStatus !== 'FAVORABLE').length} 
                    icon={AlertCircle} 
                    colorClass="bg-red-600"
                    subtext="Fiscalizaciones activas"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ultimas Tareas */}
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <List size={18} className="text-blue-600"/> Tareas Recientes
                    </h3>
                    <div className="space-y-3">
                      {tasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{task.title}</p>
                            <p className="text-xs text-slate-500">{task.client}</p>
                          </div>
                          <Badge status={task.status} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Avisos Importantes */}
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Bell size={18} className="text-red-600"/> Alertas Fiscales
                    </h3>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No hay alertas pendientes.</p>
                    ) : (
                      <div className="space-y-3">
                         {notifications.map(n => (
                           <div key={n.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                             <div className="flex justify-between">
                               <span className="text-xs font-bold text-red-700">{n.type}</span>
                               <span className="text-xs text-red-500">{n.notificationNum}</span>
                             </div>
                             <p className="text-sm font-medium text-slate-800 mt-1">{n.client}</p>
                             <div className="mt-2 flex justify-end">
                               <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-red-600 border border-red-200">{n.sunatStatus}</span>
                             </div>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* OTRAS VISTAS (Funcionales para pruebas) */}
            {viewMode === 'tasks' && (
              <TasksModule 
                tasks={tasks} setTasks={setTasks} 
                clients={clients} 
                currentUser={currentUser} 
                logAction={logAction}
                onNewTask={() => setShowTaskForm(true)}
              />
            )}
            
            {viewMode === 'clients' && (
              <ClientsModule 
                 clients={clients} setClients={setClients} 
                 currentUser={currentUser} 
                 onNewClient={() => setShowClientModal(true)}
              />
            )}

            {viewMode === 'admin' && (
              <AdminModule 
                users={users} setUsers={setUsers}
                logs={logs}
                clients={clients}
              />
            )}

            {viewMode === 'notifications' && (
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h2 className="text-xl font-bold text-slate-800 mb-4">Central de Notificaciones SUNAT</h2>
                 <p className="text-sm text-slate-500 mb-4">Bandeja unificada de alertas fiscales.</p>
                 <div className="text-center py-10 bg-slate-50 rounded border border-dashed border-slate-300 text-slate-400">
                   Módulo de Notificaciones Activo (Ver Dashboard para resumen)
                 </div>
               </div>
            )}

          </div>
        </main>
      </div>

      {/* MODALES FLOTANTES */}
      {showTaskForm && (
        <TaskFormModal 
            clients={clients}
            onClose={() => setShowTaskForm(false)}
            onSave={(task) => {
                setTasks([task, ...tasks]);
                logAction('Nueva Tarea', task.title);
                setShowTaskForm(false);
            }}
        />
      )}
      {showClientModal && (
        <ClientFormModal
            onClose={() => setShowClientModal(false)}
            onSave={(client) => {
                setClients([...clients, client]);
                logAction('Nuevo Cliente', client.name);
                setShowClientModal(false);
            }}
        />
      )}
    </div>
  );
}

// ==========================================
// SUB-MÓDULOS DE INTERFAZ
// ==========================================

const LoginForm = ({ users, onLogin }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');

  const handle = (e) => {
    e.preventDefault();
    const found = users.find(user => user.username === u && user.password === p);
    if (found) onLogin(found);
    else setErr('Credenciales inválidas');
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      {err && <div className="bg-red-50 text-red-600 text-xs p-2 rounded text-center">{err}</div>}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase">Usuario</label>
        <input className="w-full mt-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" autoFocus value={u} onChange={e=>setU(e.target.value)}/>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
        <input type="password" className="w-full mt-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={p} onChange={e=>setP(e.target.value)}/>
      </div>
      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-200">Ingresar al Sistema</button>
    </form>
  );
};

const TasksModule = ({ tasks, setTasks, clients, currentUser, logAction, onNewTask }) => {
  const canEdit = (clientName) => currentUser.role === 'admin' || currentUser.assignments.some(a => a.clientId === clients.find(c=>c.name===clientName)?.id && a.permission === 'edit');
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Control de Obligaciones</h2>
          <p className="text-sm text-slate-500">Gestión de tareas recurrentes y vencimientos</p>
        </div>
        <button onClick={onNewTask} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus size={18} /> Nueva Tarea
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Descripción</th>
              <th className="px-6 py-4">Responsable</th>
              <th className="px-6 py-4">Vencimiento</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map(task => (
              <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">{task.title}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Database size={10}/> {task.client}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{task.assistant}</td>
                <td className="px-6 py-4 text-slate-600 font-mono">{task.dueDate}</td>
                <td className="px-6 py-4"><Badge status={task.status}/></td>
                <td className="px-6 py-4 text-center">
                  {canEdit(task.client) ? (
                     <div className="flex items-center justify-center gap-2">
                         <select 
                           className="text-xs border-slate-300 rounded py-1 px-2 bg-white text-slate-700"
                           value={task.status}
                           onChange={(e) => {
                             setTasks(tasks.map(t => t.id === task.id ? { ...t, status: e.target.value } : t));
                             logAction('Estado Tarea', `ID ${task.id} -> ${e.target.value}`);
                           }}
                         >
                           <option value="Pendiente">Pendiente</option>
                           <option value="En Proceso">En Proceso</option>
                           <option value="En Revisión">En Revisión</option>
                           <option value="Completado">Completado</option>
                         </select>
                         <button onClick={() => {
                            if(confirm('¿Eliminar esta tarea?')) {
                                setTasks(tasks.filter(t => t.id !== task.id));
                                logAction('Tarea Eliminada', `ID ${task.id}`);
                            }
                         }} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                      </div>
                  ) : <Lock size={14} className="mx-auto text-slate-300"/>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ClientsModule = ({ clients, setClients, currentUser, onNewClient }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Cartera de Clientes</h2>
        {currentUser.role === 'admin' && (
            <button onClick={onNewClient} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus size={18} /> Nuevo Cliente
            </button>
        )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map(c => (
        <div key={c.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all group bg-white">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Database size={20} />
            </div>
            {c.driveUrl && (
              <a href={c.driveUrl} target="_blank" className="text-slate-300 hover:text-blue-600 transition-colors">
                <ExternalLink size={18} />
              </a>
            )}
          </div>
          <h3 className="font-bold text-slate-800 truncate" title={c.name}>{c.name}</h3>
          <p className="text-xs text-slate-500 font-mono mt-1">RUC: {c.ruc}</p>
          <div className="mt-4 pt-3 border-t border-slate-50 flex gap-2">
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600">Contabilidad</span>
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600">Laboral</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AdminModule = ({ users, logs }) => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Usuarios del Sistema</h2>
      <div className="flex gap-2 flex-wrap">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg pr-6">
            <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>
              {u.role === 'admin' ? <Shield size={16}/> : <Users size={16}/>}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{u.name}</p>
              <p className="text-xs text-slate-500">@{u.username}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={16}/> Auditoría de Cambios</h3>
      </div>
      <div className="max-h-60 overflow-y-auto">
        <table className="w-full text-xs text-left">
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr><td className="p-4 text-center text-slate-400">Sin registros recientes</td></tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td className="px-4 py-2 font-mono text-slate-500">{formatDateTime(log.timestamp)}</td>
                <td className="px-4 py-2 font-bold text-slate-700">{log.user}</td>
                <td className="px-4 py-2 text-blue-600">{log.action}</td>
                <td className="px-4 py-2 text-slate-600 truncate max-w-xs">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// --- MODALES (NUEVOS COMPONENTES) ---

const TaskFormModal = ({ onClose, onSave, clients }) => {
    const [formData, setFormData] = useState({ title: '', client: clients[0]?.name || '', assistant: '', dueDate: '', status: 'Pendiente' });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Nueva Tarea</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cliente</label>
                        <select className="w-full border-slate-300 rounded-lg p-2 text-sm" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})}>
                            {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descripción</label>
                        <input type="text" className="w-full border-slate-300 rounded-lg p-2 text-sm" placeholder="Ej: Declaración Mensual" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Responsable</label>
                        <input type="text" className="w-full border-slate-300 rounded-lg p-2 text-sm" placeholder="Nombre del Asistente" value={formData.assistant} onChange={e => setFormData({...formData, assistant: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Vencimiento</label>
                        <input type="date" className="w-full border-slate-300 rounded-lg p-2 text-sm" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancelar</button>
                        <button onClick={() => onSave({...formData, id: Date.now()})} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium">Guardar Tarea</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ClientFormModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({ name: '', ruc: '', driveUrl: '' });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Nuevo Cliente</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Razón Social</label>
                        <input type="text" className="w-full border-slate-300 rounded-lg p-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">RUC</label>
                        <input type="text" className="w-full border-slate-300 rounded-lg p-2 text-sm" value={formData.ruc} onChange={e => setFormData({...formData, ruc: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Carpeta Drive (Link)</label>
                        <input type="text" className="w-full border-slate-300 rounded-lg p-2 text-sm" placeholder="https://..." value={formData.driveUrl} onChange={e => setFormData({...formData, driveUrl: e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancelar</button>
                        <button onClick={() => onSave({...formData, id: Date.now()})} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium">Registrar Cliente</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
