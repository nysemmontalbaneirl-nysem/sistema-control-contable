import React, { useState, useEffect } from 'react';
import { 
  Users, CheckSquare, Clock, AlertCircle, BarChart3, Plus, Search,
  FileText, Trash2, CheckCircle2, Calendar as CalendarIcon, List,
  ChevronLeft, ChevronRight, Download, Database, Upload, Save,
  Bell, Scale, FileWarning, Paperclip, UploadCloud, FileCheck,
  ExternalLink, Link as LinkIcon, FolderOpen, FolderPlus, Menu, X,
  Shield, LogOut, History, Lock, UserCog, Eye
} from 'lucide-react';

// --- UTILIDADES ---
const formatDate = (date) => new Date(date).toISOString().split('T')[0];
const formatDateTime = (date) => new Date(date).toLocaleString('es-PE');

// --- COMPONENTES UI BÁSICOS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    'Pendiente': 'bg-gray-100 text-gray-800 border-gray-200',
    'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
    'En Revisión': 'bg-amber-50 text-amber-700 border-amber-200',
    'Completado': 'bg-green-50 text-green-700 border-green-200',
    'Atrasado': 'bg-red-50 text-red-700 border-red-200',
    'FAVORABLE': 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold',
    'DESFAVORABLE': 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
    'EN EVALUACIÓN': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'POR PRESENTAR': 'bg-orange-50 text-orange-700 border-orange-200'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles['Pendiente']}`}>
      {status}
    </span>
  );
};

// --- DATOS INICIALES Y MOCKS ---

const INITIAL_CLIENTS = [
  { id: 1, name: 'Constructora Del Norte SAC', ruc: '20100000001', driveUrl: 'https://drive.google.com/drive/folders/example1' },
  { id: 2, name: 'Agroexportadora Piura EIRL', ruc: '20601234567', driveUrl: '' },
  { id: 3, name: 'Servicios Generales ABC', ruc: '10456789012', driveUrl: '' }
];

const INITIAL_USERS = [
  { 
    id: 1, 
    username: 'admin', 
    password: 'admin', // En prod usar hash
    name: 'Contador General', 
    role: 'admin', 
    assignments: [] // Admin ve todo
  },
  { 
    id: 2, 
    username: 'asistente', 
    password: '123', 
    name: 'Juan Pérez', 
    role: 'user', 
    assignments: [
      { clientId: 1, permission: 'edit' },     // Constructora: Edita
      { clientId: 3, permission: 'read_only' } // Servicios ABC: Solo ve
    ]
  }
];

const INITIAL_TASKS = [
  { id: 1, title: 'Declaración IGV-Renta Octubre', client: 'Constructora Del Norte SAC', ruc: '20100000001', assistant: 'Juan Pérez', dueDate: '2025-10-15', status: 'En Revisión', priority: 'Alta' },
];

const INITIAL_NOTIFICATIONS = [
  { 
    id: 1, 
    notificationNum: '0120250000123', 
    reqNum: 'REQ-055-2025', 
    client: 'Constructora Del Norte SAC', 
    type: 'Fiscalización Parcial IGV', 
    dateNotified: '2025-10-01', 
    deadline: '2025-10-10', 
    dateSubmitted: '2025-10-09', 
    sunatStatus: 'EN EVALUACIÓN', 
    details: 'Inconsistencia en compras Nov 2024',
    notificationLink: '',
    responseLink: ''
  }
];

const ASSISTANTS_NAMES = ['Juan Pérez', 'Maria Lopez', 'Carlos Ruiz', 'Ana Torres'];
const TASK_TYPES = ['Impuestos Mensuales', 'Planillas/Laboral', 'Libros Electrónicos', 'Trámite SUNAT', 'Estados Financieros'];
const NOTIF_TYPES = ['Fiscalización Parcial', 'Fiscalización Definitiva', 'Carta Inductiva', 'Esquela de Citación', 'Orden de Pago', 'Resolución de Multa'];

// --- APP PRINCIPAL ---

export default function AccountingApp() {
  // --- ESTADOS GLOBALES ---
  const [currentUser, setCurrentUser] = useState(null); // null = no logueado
  const [users, setUsers] = useState(INITIAL_USERS);
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [logs, setLogs] = useState([]); // Historial de auditoría

  // --- ESTADOS DE VISTA ---
  const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', 'notifications', 'admin'
  const [showForm, setShowForm] = useState(false);
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showClientManager, setShowClientManager] = useState(false);

  // --- LOGGING ---
  const logAction = (action, details) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser ? currentUser.username : 'Sistema',
      action,
      details
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // --- PERMISOS ---
  const checkPermission = (clientName, requiredPerm = 'read_only') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    // Buscar ID cliente por nombre (en prod usar IDs estables)
    const client = clients.find(c => c.name === clientName);
    if (!client) return false;

    const assignment = currentUser.assignments.find(a => a.clientId === client.id);
    if (!assignment) return false;

    if (requiredPerm === 'read_only') return true; // Si existe asignación, puede leer
    if (requiredPerm === 'edit') return assignment.permission === 'edit';
    
    return false;
  };

  // Filtrar datos según usuario
  const getVisibleClients = () => {
    if (currentUser?.role === 'admin') return clients;
    const assignedIds = currentUser.assignments.map(a => a.clientId);
    return clients.filter(c => assignedIds.includes(c.id));
  };

  const getVisibleTasks = () => {
    const visibleClientNames = getVisibleClients().map(c => c.name);
    return tasks.filter(t => visibleClientNames.includes(t.client));
  };

  const getVisibleNotifications = () => {
    const visibleClientNames = getVisibleClients().map(c => c.name);
    return notifications.filter(n => visibleClientNames.includes(n.client));
  };

  // --- LOGIN COMPONENT ---
  if (!currentUser) {
    return (
      <LoginScreen 
        users={users} 
        onLogin={(user) => {
          setCurrentUser(user);
          logAction('Inicio de Sesión', `Usuario ${user.username} ingresó al sistema.`);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header 
        currentUser={currentUser} 
        onLogout={() => {
          logAction('Cierre de Sesión', `Usuario ${currentUser.username} salió.`);
          setCurrentUser(null);
        }}
        viewMode={viewMode}
        setViewMode={setViewMode}
        notificationsCount={getVisibleNotifications().filter(n => n.sunatStatus !== 'FAVORABLE').length}
        setShowClientManager={setShowClientManager}
        setShowGenerator={setShowGenerator}
        setShowForm={setShowForm}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {viewMode === 'admin' && currentUser.role === 'admin' ? (
          <AdminPanel 
            users={users} 
            setUsers={setUsers} 
            clients={clients} 
            logs={logs}
            logAction={logAction}
          />
        ) : (
          <>
            {/* KPI Cards */}
            {viewMode !== 'notifications' && (
              <KpiCards tasks={getVisibleTasks()} />
            )}

            {/* Vistas Principales */}
            {viewMode === 'calendar' ? (
              <CalendarView tasks={getVisibleTasks()} />
            ) : viewMode === 'notifications' ? (
              <NotificationsView 
                notifications={getVisibleNotifications()} 
                setNotifications={setNotifications}
                clients={getVisibleClients()}
                setShowNotifForm={setShowNotifForm}
                checkPermission={checkPermission}
                logAction={logAction}
              />
            ) : (
              <TaskListView 
                tasks={getVisibleTasks()} 
                setTasks={setTasks}
                checkPermission={checkPermission}
                logAction={logAction}
              />
            )}
          </>
        )}
      </main>

      {/* MODALES */}
      {showForm && (
        <TaskFormModal 
          onClose={() => setShowForm(false)} 
          onSave={(newTask) => {
            setTasks([newTask, ...tasks]);
            logAction('Creación Tarea', `Nueva tarea: ${newTask.title} para ${newTask.client}`);
          }}
          clients={getVisibleClients()} // Solo puede crear para clientes que ve
          // Solo permitir crear si tiene permiso de edición en AL MENOS un cliente
          canCreate={currentUser.role === 'admin' || currentUser.assignments.some(a => a.permission === 'edit')}
        />
      )}

      {showNotifForm && (
        <NotificationFormModal 
          onClose={() => setShowNotifForm(false)}
          onSave={(newNotif) => {
            setNotifications([newNotif, ...notifications]);
            logAction('Registro Notificación', `Nueva notificación ${newNotif.notificationNum} para ${newNotif.client}`);
          }}
          clients={getVisibleClients().filter(c => checkPermission(c.name, 'edit'))} // Solo clientes editables
        />
      )}

      {showClientManager && (
        <ClientManagerModal 
          onClose={() => setShowClientManager(false)}
          clients={clients} // Admin ve todos
          setClients={setClients}
          isReadOnly={currentUser.role !== 'admin'}
          logAction={logAction}
        />
      )}

      {showGenerator && (
        <GeneratorModal 
          onClose={() => setShowGenerator(false)}
          onGenerate={(newTasks) => {
            setTasks([...newTasks, ...tasks]);
            logAction('Generación Masiva', `Se generaron ${newTasks.length} tareas automáticas.`);
          }}
          clients={getVisibleClients().filter(c => checkPermission(c.name, 'edit'))}
        />
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENTES
// ==========================================

// --- LOGIN ---
const LoginScreen = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full">
            <Shield className="text-white w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Acceso Corporativo</h2>
        {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded focus:ring-blue-500"
              value={username} onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full border-gray-300 rounded focus:ring-blue-500"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition">
            Ingresar
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4 text-center">Sistema de Control Interno Contable v2.0</p>
        <p className="text-[10px] text-gray-300 text-center">Demo: admin/admin o asistente/123</p>
      </div>
    </div>
  );
};

// --- ADMIN PANEL ---
const AdminPanel = ({ users, setUsers, clients, logs, logAction }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState(null);

  const handleSaveUser = (userData) => {
    if (userData.id) {
      setUsers(users.map(u => u.id === userData.id ? userData : u));
      logAction('Gestión Usuarios', `Usuario modificado: ${userData.username}`);
    } else {
      const newUser = { ...userData, id: Date.now() };
      setUsers([...users, newUser]);
      logAction('Gestión Usuarios', `Usuario creado: ${userData.username}`);
    }
    setEditingUser(null);
  };

  const handleDeleteUser = (userId) => {
    if (confirm('¿Eliminar usuario?')) {
      const u = users.find(x => x.id === userId);
      setUsers(users.filter(u => u.id !== userId));
      logAction('Gestión Usuarios', `Usuario eliminado: ${u.username}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex gap-4 border-b border-gray-200 pb-2">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-2 px-4 font-medium text-sm flex items-center gap-2 ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          <Users size={18}/> Gestión de Usuarios y Permisos
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`pb-2 px-4 font-medium text-sm flex items-center gap-2 ${activeTab === 'logs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          <History size={18}/> Historial de Auditoría
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-800">Usuarios del Sistema</h3>
            <button 
              onClick={() => setEditingUser({ username: '', password: '', name: '', role: 'user', assignments: [] })}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
            >
              <Plus size={16}/> Nuevo Usuario
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(u => (
              <div key={u.id} className="border border-gray-200 rounded p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role === 'admin' ? <Shield size={20}/> : <UserCog size={20}/>}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">@{u.username}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingUser(u)} className="p-1 text-gray-400 hover:text-blue-600"><UserCog size={16}/></button>
                    {u.username !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
                  <p className="font-semibold text-gray-600 mb-1">Accesos ({u.role === 'admin' ? 'Total' : u.assignments.length}):</p>
                  {u.role === 'admin' ? (
                    <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Acceso Completo</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.assignments.length > 0 ? u.assignments.map((a, idx) => {
                        const cName = clients.find(c => c.id === parseInt(a.clientId))?.name || 'Cliente?';
                        return (
                          <span key={idx} className={`px-1.5 py-0.5 rounded border ${a.permission === 'edit' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {cName.substring(0, 10)}... {a.permission === 'edit' ? '(Ed)' : '(Ver)'}
                          </span>
                        );
                      }) : <span className="text-gray-400 italic">Sin clientes asignados</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
           <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
               <tr>
                 <th className="px-4 py-3">Fecha/Hora</th>
                 <th className="px-4 py-3">Usuario</th>
                 <th className="px-4 py-3">Acción</th>
                 <th className="px-4 py-3">Detalle</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {logs.map(log => (
                 <tr key={log.id} className="hover:bg-gray-50">
                   <td className="px-4 py-2 font-mono text-xs text-gray-500">{formatDateTime(log.timestamp)}</td>
                   <td className="px-4 py-2 font-bold text-gray-700">{log.user}</td>
                   <td className="px-4 py-2 text-blue-600">{log.action}</td>
                   <td className="px-4 py-2 text-gray-600">{log.details}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {editingUser && (
        <UserEditModal 
          user={editingUser} 
          clients={clients} 
          onSave={handleSaveUser} 
          onClose={() => setEditingUser(null)} 
        />
      )}
    </div>
  );
};

// --- MODAL EDICION USUARIO ---
const UserEditModal = ({ user, clients, onSave, onClose }) => {
  const [formData, setFormData] = useState({...user});

  const toggleAssignment = (clientId, currentAssignment) => {
    if (currentAssignment) {
      // Remover
      setFormData({
        ...formData,
        assignments: formData.assignments.filter(a => a.clientId !== clientId)
      });
    } else {
      // Agregar (default read_only)
      setFormData({
        ...formData,
        assignments: [...formData.assignments, { clientId, permission: 'read_only' }]
      });
    }
  };

  const changePermission = (clientId, newPerm) => {
    setFormData({
      ...formData,
      assignments: formData.assignments.map(a => 
        a.clientId === clientId ? { ...a, permission: newPerm } : a
      )
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
        <h3 className="text-lg font-bold mb-4">Configurar Usuario</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-700">Nombre</label>
            <input type="text" className="w-full border-gray-300 rounded text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700">Username</label>
            <input type="text" className="w-full border-gray-300 rounded text-sm" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700">Contraseña</label>
            <input type="text" className="w-full border-gray-300 rounded text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700">Rol Global</label>
            <select className="w-full border-gray-300 rounded text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="user">Usuario Estándar</option>
              <option value="admin">Administrador (Total)</option>
            </select>
          </div>
        </div>

        {formData.role !== 'admin' && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-bold text-sm mb-2 text-gray-700">Asignación de Clientes y Permisos</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded border border-gray-200">
              {clients.map(client => {
                const assignment = formData.assignments.find(a => a.clientId === client.id);
                return (
                  <div key={client.id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={!!assignment} 
                        onChange={() => toggleAssignment(client.id, assignment)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{client.name}</span>
                    </div>
                    {assignment && (
                      <select 
                        value={assignment.permission} 
                        onChange={(e) => changePermission(client.id, e.target.value)}
                        className="text-xs border-gray-200 rounded py-1 bg-gray-50"
                      >
                        <option value="read_only">👁️ Solo Lectura</option>
                        <option value="edit">✏️ Edición Total</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded text-gray-700 text-sm">Cancelar</button>
          <button onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">Guardar Usuario</button>
        </div>
      </div>
    </div>
  );
};

// --- HEADER ---
const Header = ({ currentUser, onLogout, viewMode, setViewMode, notificationsCount, setShowClientManager, setShowGenerator, setShowForm }) => (
  <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-20 shadow-sm">
    <div className="max-w-7xl mx-auto flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg"><BarChart3 className="text-white w-6 h-6" /></div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">Control Contable</h1>
            <p className="text-[10px] md:text-xs text-gray-500 hidden md:block">Usuario: <span className="font-bold text-blue-600">{currentUser.name}</span> ({currentUser.role})</p>
          </div>
        </div>
        
        {/* User Actions Mobile */}
        <div className="flex items-center gap-2">
           <button onClick={onLogout} className="text-xs flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100">
             <LogOut size={14}/> <span className="hidden md:inline">Salir</span>
           </button>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 md:justify-end no-scrollbar items-center">
         {currentUser.role === 'admin' && (
           <button 
             onClick={() => setViewMode('admin')} 
             className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shrink-0 ${viewMode === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`}
           >
             <Shield size={16}/> Admin
           </button>
         )}

         <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><List size={18} /> <span className="hidden md:inline">Lista</span></button>
          <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><CalendarIcon size={18} /> <span className="hidden md:inline">Calendario</span></button>
          <button onClick={() => setViewMode('notifications')} className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'notifications' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-red-600'}`}>
            <FileWarning size={18} /> <span className="hidden md:inline">Notif.</span>
            {notificationsCount > 0 && <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold">{notificationsCount}</span>}
          </button>
        </div>

        <button onClick={() => setShowClientManager(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shrink-0">
          <Database size={18} /> <span className="hidden md:inline">Clientes</span>
        </button>

        <button onClick={() => setShowGenerator(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shrink-0">
          <Download size={18} /> <span className="hidden md:inline">Generar</span>
        </button>
        
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shrink-0">
          <Plus size={18} /> <span className="hidden md:inline">Tarea</span>
        </button>
      </div>
    </div>
  </header>
);

// --- VISTAS PRINCIPALES (Simplificadas para brevedad, lógica RBAC añadida) ---

const TaskListView = ({ tasks, setTasks, checkPermission, logAction }) => {
  const updateStatus = (taskId, newStatus, clientName) => {
    if (!checkPermission(clientName, 'edit')) return alert("Acceso de Solo Lectura");
    
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    logAction('Actualización Estado', `Tarea ID ${taskId} (${clientName}) -> ${newStatus}`);
  };

  const deleteTask = (taskId, clientName) => {
    if (!checkPermission(clientName, 'edit')) return alert("Acceso de Solo Lectura");
    
    if(confirm('¿Eliminar tarea?')) {
      setTasks(tasks.filter(t => t.id !== taskId));
      logAction('Eliminación Tarea', `Se eliminó tarea ID ${taskId} de ${clientName}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Tarea / Cliente</th>
              <th className="px-6 py-4">Asignado</th>
              <th className="px-6 py-4">Vencimiento</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map(task => {
              const canEdit = checkPermission(task.client, 'edit');
              return (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{task.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <FileText size={12} /> {task.client} {!canEdit && <Lock size={10} className="text-gray-400"/>}
                    </div>
                  </td>
                  <td className="px-6 py-4">{task.assistant}</td>
                  <td className="px-6 py-4">{task.dueDate}</td>
                  <td className="px-6 py-4"><Badge status={task.status} /></td>
                  <td className="px-6 py-4 text-center">
                    {canEdit ? (
                      <div className="flex justify-center gap-2">
                        <select 
                          className="text-xs border-gray-300 rounded py-1"
                          value={task.status}
                          onChange={(e) => updateStatus(task.id, e.target.value, task.client)}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="En Proceso">En Proceso</option>
                          <option value="En Revisión">Enviar a Revisión</option>
                          <option value="Completado">Finalizar</option>
                        </select>
                        <button onClick={() => deleteTask(task.id, task.client)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic flex items-center justify-center gap-1"><Eye size={12}/> Solo Lectura</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-500">No tiene tareas asignadas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KpiCards = ({ tasks }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    <Card className="p-3 border-l-4 border-l-gray-400">
      <div className="flex justify-between items-start">
        <div><p className="text-xs text-gray-500 font-medium">Pendientes</p><h3 className="text-xl md:text-2xl font-bold text-gray-700">{tasks.filter(t=>t.status==='Pendiente').length}</h3></div>
        <Clock className="text-gray-400 opacity-50 w-5 h-5 md:w-6 md:h-6" />
      </div>
    </Card>
    <Card className="p-3 border-l-4 border-l-blue-500">
      <div className="flex justify-between items-start">
        <div><p className="text-xs text-gray-500 font-medium">En Proceso</p><h3 className="text-xl md:text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'En Proceso').length}</h3></div>
        <Users className="text-blue-400 opacity-50 w-5 h-5 md:w-6 md:h-6" />
      </div>
    </Card>
    <Card className="p-3 border-l-4 border-l-amber-500 bg-amber-50/30">
      <div className="flex justify-between items-start">
        <div><p className="text-xs text-amber-700 font-bold">POR REVISAR</p><h3 className="text-xl md:text-2xl font-bold text-amber-600">{tasks.filter(t => t.status === 'En Revisión').length}</h3></div>
        <AlertCircle className="text-amber-500 w-5 h-5 md:w-6 md:h-6" />
      </div>
    </Card>
    <Card className="p-3 border-l-4 border-l-green-500">
      <div className="flex justify-between items-start">
        <div><p className="text-xs text-gray-500 font-medium">Cerradas</p><h3 className="text-xl md:text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'Completado').length}</h3></div>
        <CheckSquare className="text-green-400 opacity-50 w-5 h-5 md:w-6 md:h-6" />
      </div>
    </Card>
  </div>
);

// --- COMPONENTES AUXILIARES ---
const NotificationsView = ({ notifications, setNotifications, clients, setShowNotifForm, checkPermission, logAction }) => {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className="flex justify-between mb-4">
        <h3 className="font-bold text-red-800">Control de Fiscalizaciones</h3>
        <button onClick={() => setShowNotifForm(true)} className="bg-red-600 text-white px-3 py-1 rounded text-xs">Registrar</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 uppercase text-xs"><th>Cliente</th><th>Notif</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>
            {notifications.map(n => {
              const canEdit = checkPermission(n.client, 'edit');
              return (
                <tr key={n.id} className="border-b border-gray-100">
                  <td className="py-2">{n.client}</td>
                  <td className="py-2">{n.notificationNum}</td>
                  <td className="py-2"><Badge status={n.sunatStatus}/></td>
                  <td className="py-2">
                    {canEdit && (
                      <select 
                        value={n.sunatStatus} 
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          setNotifications(notifications.map(x => x.id === n.id ? {...x, sunatStatus: newStatus} : x));
                          logAction('Estado Notificación', `Notif ${n.notificationNum} -> ${newStatus}`);
                        }}
                        className="text-xs border-gray-200 rounded"
                      >
                         <option value="POR PRESENTAR">Por Presentar</option>
                         <option value="EN EVALUACIÓN">En Evaluación</option>
                         <option value="FAVORABLE">Favorable</option>
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CalendarView = ({ tasks }) => (
  <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
    Vista de Calendario con {tasks.length} tareas cargadas.
  </div>
);

const TaskFormModal = ({ onClose, onSave, clients, canCreate }) => {
  const [newTask, setNewTask] = useState({ title: '', client: clients[0]?.name || '', assistant: '', dueDate: '', status: 'Pendiente' });
  
  if (!canCreate) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded shadow-lg text-center">
        <Lock className="mx-auto text-gray-400 mb-2" size={32}/>
        <h3 className="text-lg font-bold">Acceso Restringido</h3>
        <p className="text-sm text-gray-600 mb-4">No tiene permisos de edición en ningún cliente para crear tareas.</p>
        <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cerrar</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Nueva Tarea</h3>
        <div className="space-y-4">
          <select 
            className="w-full border-gray-300 rounded" 
            value={newTask.client}
            onChange={e => setNewTask({...newTask, client: e.target.value})}
          >
            {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <input type="text" placeholder="Título" className="w-full border-gray-300 rounded" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
          <input type="text" placeholder="Asistente" className="w-full border-gray-300 rounded" value={newTask.assistant} onChange={e => setNewTask({...newTask, assistant: e.target.value})} />
          <input type="date" className="w-full border-gray-300 rounded" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
          
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded">Cancelar</button>
            <button onClick={() => { onSave({...newTask, id: Date.now()}); onClose(); }} className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationFormModal = ({ onClose, onSave, clients }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-4 text-red-700">Registrar Fiscalización</h3>
        <p className="text-sm text-gray-500 mb-4">Solo verá clientes donde tenga permiso de Edición.</p>
        <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded w-full">Cerrar Demo</button>
      </div>
  </div>
);

const ClientManagerModal = ({ onClose, clients, setClients, isReadOnly, logAction }) => {
  const [newClient, setNewClient] = useState({ name: '', ruc: '', driveUrl: '' });
  const [pastedData, setPastedData] = useState('');

  const handleAddManual = () => {
    if (!newClient.name || !newClient.ruc) return alert('Nombre y RUC obligatorios');
    const clientToAdd = { ...newClient, id: Date.now() };
    setClients([...clients, clientToAdd]);
    logAction('Gestión Clientes', `Cliente agregado manualmente: ${newClient.name}`);
    setNewClient({ name: '', ruc: '', driveUrl: '' });
  };

  const handleImport = () => {
    if (!pastedData.trim()) return;
    const rows = pastedData.split('\n');
    const newClients = [];
    rows.forEach((row, idx) => {
      const cols = row.split('\t');
      if (cols[0] && cols[0].trim() !== '') {
        newClients.push({
          id: Date.now() + idx,
          name: cols[0].trim(),
          ruc: cols[1] ? cols[1].trim() : 'S/N',
          driveUrl: cols[2] ? cols[2].trim() : ''
        });
      }
    });
    setClients([...clients, ...newClients]);
    logAction('Gestión Clientes', `Importación masiva: ${newClients.length} clientes agregados.`);
    setPastedData('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 flex flex-col max-h-[90vh]">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Database size={20} className="text-emerald-600"/> Gestión de Clientes</h3>
        
        {/* Modulo de Agregado (Solo si no es ReadOnly) */}
        {!isReadOnly && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Manual */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <h4 className="font-bold text-sm text-gray-700 mb-2">Nuevo Cliente (Manual)</h4>
              <div className="space-y-2">
                <input type="text" placeholder="Razón Social" className="w-full text-xs border-gray-300 rounded" value={newClient.name} onChange={e=>setNewClient({...newClient, name: e.target.value})}/>
                <input type="text" placeholder="RUC" className="w-full text-xs border-gray-300 rounded" value={newClient.ruc} onChange={e=>setNewClient({...newClient, ruc: e.target.value})}/>
                <input type="text" placeholder="Link Carpeta Drive (Opcional)" className="w-full text-xs border-gray-300 rounded" value={newClient.driveUrl} onChange={e=>setNewClient({...newClient, driveUrl: e.target.value})}/>
                <button onClick={handleAddManual} className="w-full bg-blue-600 text-white text-xs py-2 rounded font-bold hover:bg-blue-700">Agregar Cliente</button>
              </div>
            </div>
            
            {/* Importación */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200 flex flex-col">
              <h4 className="font-bold text-sm text-gray-700 mb-2">Importar desde Excel</h4>
              <p className="text-[10px] text-gray-500 mb-2">Copie celdas: Nombre | RUC | Link Drive</p>
              <textarea className="flex-1 w-full text-xs border-gray-300 rounded font-mono" placeholder="Pegue aquí..." value={pastedData} onChange={e=>setPastedData(e.target.value)}/>
              <button onClick={handleImport} className="w-full bg-emerald-600 text-white text-xs py-2 rounded font-bold hover:bg-emerald-700 mt-2">Procesar Importación</button>
            </div>
          </div>
        )}

        {/* Listado */}
        <div className="flex-1 overflow-y-auto border-t border-gray-200 pt-4">
          <h4 className="font-bold text-sm text-gray-700 mb-2">Cartera Registrada ({clients.length})</h4>
          <div className="space-y-2">
            {clients.map(c => (
              <div key={c.id} className="border p-2 rounded text-sm flex justify-between items-center bg-white">
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-gray-500 font-mono">RUC: {c.ruc}</div>
                </div>
                {c.driveUrl && <a href={c.driveUrl} target="_blank" className="text-blue-600"><FolderOpen size={16}/></a>}
              </div>
            ))}
          </div>
        </div>

        {isReadOnly && <p className="text-xs text-red-500 italic mt-2">Modo Solo Lectura: Contacte al Admin para agregar clientes.</p>}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded text-gray-700 text-sm hover:bg-gray-200">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const GeneratorModal = ({ onClose, onGenerate, clients }) => (
   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-4 text-indigo-700">Generador Masivo</h3>
        <p className="text-sm text-gray-500 mb-4">Se generarán tareas solo para los {clients.length} clientes que usted puede editar.</p>
        <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded w-full">Cerrar</button>
      </div>
  </div>
);