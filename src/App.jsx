import { useState, useCallback, useEffect } from 'react';
import { LogOut } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

// Views
import LoginScreen from './views/LoginScreen';
import SuperAdminDashboard from './views/superadmin/SuperAdminDashboard';
import StaffManagement from './views/superadmin/StaffManagement';
import ReportsView from './views/superadmin/ReportsView';
import SettingsView from './views/superadmin/SettingsView';
import RecepcionDashboard from './views/recepcion/RecepcionDashboard';
import MedicoDashboard from './views/medico/MedicoDashboard';
import InterconsultasView from './views/medico/InterconsultasView';
import PatientsView from './views/shared/PatientsView';
import CalendarView from './views/shared/CalendarView';

// ─── Router Helper ──────────────────────────────────────────────────────────
// Devuelve el componente correcto según el rol y la vista actual
function RouteView({ user, currentView, onNavigate, showToast }) {
  const props = { user, onNavigate, showToast };

  // Super Admin routes
  if (user.role === 'superadmin') {
    if (currentView === 'dashboard') return <SuperAdminDashboard {...props} />;
    if (currentView === 'staff') return <StaffManagement {...props} />;
    if (currentView === 'patients') return <PatientsView {...props} userRole={user.role} />;
    if (currentView === 'appointments') return <CalendarView {...props} />;
    if (currentView === 'reports') return <ReportsView {...props} />;
    if (currentView === 'settings') return <SettingsView {...props} />;
  }

  // Recepción routes
  if (user.role === 'recepcion') {
    if (currentView === 'dashboard') return <CalendarView {...props} userRole={user.role} />;
    if (currentView === 'appointments') return <CalendarView {...props} userRole={user.role} />;
    if (currentView === 'patients') return <PatientsView {...props} userRole={user.role} />;
  }

  // Médico routes
  if (user.role === 'medico') {
    if (currentView === 'dashboard') return <MedicoDashboard {...props} />;
    if (currentView === 'patients') return <PatientsView {...props} userRole={user.role} />;
    if (currentView === 'interconsultas') return <InterconsultasView {...props} />;
    if (currentView === 'history') return <PatientsView {...props} userRole={user.role} />;
    if (currentView === 'stats') return <div className="p-8 text-center text-gray-500">Módulo en construcción (Stats)</div>;
  }

  return <div className="p-8 text-center text-gray-500">Vista no encontrada</div>;
}

// ─── Top Header Bar ──────────────────────────────────────────────────────────
function TopBar({ user, currentView, onLogout }) {
  const viewLabels = {
    dashboard: user.role === 'superadmin' ? 'Resumen General' : user.role === 'medico' ? 'Mis Citas' : 'Inicio — Calendario de Citas',
    staff: 'Gestión de Personal',
    patients: 'Pacientes',
    appointments: 'Calendario de Citas',
    reports: 'Reportes',
    settings: 'Configuración',
    history: 'Historias Clínicas',
    stats: 'Estadísticas',
  };

  return (
    <header className="flex items-center justify-between md:justify-end px-8 py-5 bg-transparent w-full">
      {/* Mobile only brand */}
      <div className="md:hidden flex items-center gap-2">
        <p className="font-display font-bold text-hav-primary text-lg">HAV Portal</p>
      </div>

      {/* User Info & Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-hav-text-main leading-tight">{user.name}</p>
          <p className="text-[11px] text-hav-text-muted">{user.email}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#1e4f5c] text-white flex items-center justify-center font-bold text-sm shadow-sm">
          {user.avatar}
        </div>
        <button
          onClick={onLogout}
          className="w-10 h-10 flex items-center justify-center text-hav-text-muted bg-white border border-gray-100 rounded-lg hover:text-hav-danger hover:border-red-100 hover:bg-red-50 transition-colors shadow-sm"
          title="Cerrar Sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('hav_session');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('hav_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('hav_session');
    }
  }, [currentUser]);

  const showToast = useCallback((t) => {
    setToast(t);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
    showToast({ type: 'success', title: 'Sesión cerrada', message: 'Hasta pronto' });
  };

  const navigate = (view) => {
    setCurrentView(view);
  };

  // ── Not authenticated ──
  if (!currentUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} showToast={showToast} />
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── Authenticated layout ──
  return (
    <div className="flex min-h-screen bg-hav-bg">
      <Sidebar
        user={currentUser}
        currentView={currentView}
        onNavigate={navigate}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={currentUser} currentView={currentView} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto">
          <RouteView
            user={currentUser}
            currentView={currentView}
            onNavigate={navigate}
            showToast={showToast}
          />
        </main>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
