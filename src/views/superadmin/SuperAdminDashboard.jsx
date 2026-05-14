import { useState, useEffect } from 'react';
import { Users, UserPlus, FileText, Activity, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

const ROLE_LABELS = {
  1: 'Súper Admin',
  2: 'Médico',
  3: 'Recepción'
};

export default function SuperAdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    patients: 0,
    activeStaff: 0,
    appointments: 0,
    newRegistrations: 0
  });
  const [chartData, setChartData] = useState([]);
  const [activeStaff, setActiveStaff] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Fetch Stats
        const [patientsRes, staffRes, appointmentsRes, recentPacRes, recentCitasRes] = await Promise.all([
          supabase.from('pacientes').select('id_paciente', { count: 'exact' }),
          supabase.from('usuario').select('id_usuario', { count: 'exact' }).eq('estado_activo', true),
          supabase.from('cita').select('id_cita', { count: 'exact' }).eq('estado', 'pendiente'),
          // For recent activity and new registrations
          supabase.from('pacientes').select('nombre, apellidos, fecha_registro').order('fecha_registro', { ascending: false }).limit(5),
          supabase.from('cita').select('estado, fecha_registro, pacientes(nombre, apellidos)').order('fecha_registro', { ascending: false }).limit(5)
        ]);

        setStats({
          patients: patientsRes.count || 0,
          activeStaff: staffRes.count || 0,
          appointments: appointmentsRes.count || 0,
          newRegistrations: recentPacRes.data?.length || 0 // Proxy for new registrations
        });

        // 2. Fetch Active Staff List
        const { data: staffData } = await supabase
          .from('usuario')
          .select(`
            id_usuario, id_rol,
            especialista (nombre_completo),
            recepcion (nombre_empleado)
          `)
          .eq('estado_activo', true)
          .limit(6);

        if (staffData) {
          setActiveStaff(staffData.map(u => {
            let name = 'Admin Global';
            if (u.id_rol === 2 && u.especialista?.[0]) name = u.especialista[0].nombre_completo;
            else if (u.id_rol === 3 && u.recepcion?.[0]) name = u.recepcion[0].nombre_empleado;
            return { id: u.id_usuario, name, role: u.id_rol };
          }));
        }

        // 3. Make mock chart data from Specialists (since appointments might be empty)
        const { data: espData } = await supabase.from('especialista').select('especialidad');
        if (espData) {
          const counts = espData.reduce((acc, curr) => {
             acc[curr.especialidad] = (acc[curr.especialidad] || 0) + 1;
             return acc;
          }, {});
          setChartData(Object.keys(counts).map(k => ({ name: k, count: counts[k] })));
        }

        // 4. Transform recent activity
        let activities = [];
        if (recentPacRes.data) {
          activities.push(...recentPacRes.data.map(p => ({
            id: 'p-'+p.fecha_registro,
            action: 'Nuevo Paciente',
            detail: `${p.nombre} ${p.apellidos} registrado.`,
            time: new Date(p.fecha_registro).toLocaleDateString(),
            avatar: 'P',
            timestamp: new Date(p.fecha_registro).getTime()
          })));
        }
        if (recentCitasRes.data) {
          activities.push(...recentCitasRes.data.map(c => ({
            id: 'c-'+c.fecha_registro,
            action: 'Cita Agendada',
            detail: `Cita para ${c.pacientes?.nombre} ${c.pacientes?.apellidos}`,
            time: new Date(c.fecha_registro).toLocaleDateString(),
            avatar: 'C',
            timestamp: new Date(c.fecha_registro).getTime()
          })));
        }
        activities.sort((a,b) => b.timestamp - a.timestamp);
        setRecentActivity(activities.slice(0, 5));

      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const STAT_CARDS = [
    { label: 'Total Pacientes', value: stats.patients, delta: 'histórico', icon: Users, color: 'bg-hav-primary' },
    { label: 'Personal Activo', value: stats.activeStaff, delta: 'en sistema', icon: UserPlus, color: 'bg-hav-secondary' },
    { label: 'Citas Pendientes', value: stats.appointments, delta: 'por atender', icon: FileText, color: 'bg-indigo-500' },
    { label: 'Nuevos Registros', value: stats.newRegistrations, delta: 'recientes', icon: TrendingUp, color: 'bg-amber-500' },
  ];

  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  if (loading) {
     return <div className="p-6 h-full flex items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="p-6 space-y-6 view-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">Resumen General</h1>
          <p className="text-hav-text-muted text-sm mt-0.5">{formattedDate} · Conectado a DB</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-hav-secondary rounded-full animate-pulse" />
          <span className="text-xs text-hav-text-muted font-medium">Tiempo real</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, delta, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm text-hav-text-muted font-medium leading-tight max-w-[120px]">{label}</p>
              <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-hav-text-main">{value}</p>
            <p className="text-xs text-hav-text-muted mt-1">{delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Chart Proxy */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-hav-text-main">Médicos por Especialidad</h3>
              <p className="text-xs text-hav-text-muted">Distribución de personal clínico</p>
            </div>
            <Activity size={16} className="text-hav-text-muted" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              {chartData.length === 0 ? (
                <div className="py-6 text-center text-sm text-hav-text-muted bg-gray-50 rounded-xl">Sin especialidades registradas</div>
              ) : chartData.map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-1/3 text-xs font-semibold text-hav-text-main truncate text-right">{c.name}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-hav-primary rounded-full transition-all" style={{ width: `${Math.max((c.count / stats.activeStaff) * 100, 10)}%` }} />
                  </div>
                  <span className="text-xs text-hav-text-muted font-medium w-8">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-hav-text-main">Actividad Reciente</h3>
              <p className="text-xs text-hav-text-muted">Extracto de registros</p>
            </div>
            <Clock size={16} className="text-hav-text-muted" />
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
               <p className="text-sm text-hav-text-muted">No hay actividad reciente.</p>
            ) : (
                recentActivity.map((act) => (
                  <div key={act.id} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-hav-primary/10 text-hav-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {act.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-hav-text-main">{act.action}</p>
                      <p className="text-xs text-hav-text-muted truncate">{act.detail}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Staff quick list */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-hav-text-main">Personal Activo en Base de Datos</h3>
          <button
            onClick={() => onNavigate && onNavigate('staff')}
            className="text-xs text-hav-primary hover:underline font-medium"
          >
            Ver gestión completa →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeStaff.length === 0 ? (
              <div className="col-span-full py-4 text-center text-sm text-hav-text-muted bg-gray-50 rounded-xl">Cargando personal...</div>
          ) : (
              activeStaff.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-hav-primary/5 transition-colors border border-transparent hover:border-hav-primary/20 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-hav-primary/10 text-hav-primary text-xs font-bold flex items-center justify-center shadow-inner">
                    {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-hav-text-main truncate">{s.name}</p>
                    <p className="text-xs text-hav-text-muted">{ROLE_LABELS[s.role]}</p>
                  </div>
                  <div className="ml-auto w-2 h-2 rounded-full bg-hav-secondary shadow-[0_0_8px_rgba(161,217,90,0.8)] flex-shrink-0" title="Cuenta Activa" />
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
