import {
  LayoutDashboard, Users, CalendarDays,
  ClipboardList, BarChart3, Settings, HeartPulse,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = {
  superadmin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff', label: 'Personal', icon: Users },
    { id: 'patients', label: 'Pacientes', icon: ClipboardList },
    { id: 'appointments', label: 'Calendario', icon: CalendarDays },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ],
  recepcion: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Calendario', icon: CalendarDays },
    { id: 'patients', label: 'Pacientes', icon: ClipboardList },
  ],
  medico: [
    { id: 'dashboard', label: 'Mis Citas', icon: CalendarDays },
    { id: 'patients', label: 'Pacientes', icon: ClipboardList },
    { id: 'interconsultas', label: 'Interconsultas', icon: HeartPulse },
  ],
};

export default function Sidebar({ user, currentView, onNavigate }) {
  const items = NAV_ITEMS[user.role] || NAV_ITEMS.recepcion;

  const roleLabels = {
    superadmin: 'Super Admin',
    recepcion: 'Recepción',
    medico: 'Médico',
  };

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 shadow-sm">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #367281, #1e4f5c)' }}>
            <HeartPulse size={18} className="text-white" />
          </div>
          <div className="leading-none">
            <p className="font-display font-bold text-hav-primary text-base">HAV Portal</p>
            <p className="text-hav-text-muted text-[10px] mt-0.5">{roleLabels[user.role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-hav-primary text-white shadow-md shadow-hav-primary/20'
                  : 'text-hav-text-muted hover:bg-hav-primary/8 hover:text-hav-primary'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-hav-text-muted group-hover:text-hav-primary'} />
              <span className="flex-1 text-left">{label}</span>
              {isActive && <ChevronRight size={14} className="text-white/70" />}
            </button>
          );
        })}
      </nav>

    </aside>
  );
}
