import { useState, useEffect } from 'react';
import { CalendarDays, Users, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function RecepcionDashboard({ user, onNavigate, showToast }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  // Fetch from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetching all for the demo. In prod, we'd filter by today's date.
      const { data, error } = await supabase
        .from('cita')
        .select(`
          id_cita,
          estado,
          fecha_pautada,
          pacientes ( nombre, apellidos ),
          especialista ( especialidad )
        `)
        .order('fecha_pautada', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar las citas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmAppt = async (id) => {
    try {
      const { error } = await supabase
        .from('cita')
        .update({ estado: 'confirmada' })
        .eq('id_cita', id);

      if (error) throw error;
      
      setAppointments((prev) => prev.map((a) => a.id_cita === id ? { ...a, estado: 'confirmada' } : a));
      showToast({ type: 'success', title: 'Cita confirmada', message: 'Estado actualizado en el sistema' });
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Error', message: 'Fallo al confirmar cita' });
    }
  };

  return (
    <div className="p-6 space-y-5 view-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">Panel de Recepción</h1>
          <p className="text-hav-text-muted text-sm mt-0.5">
            {formattedDate} · {user.name}
          </p>
        </div>
        <button
          onClick={() => onNavigate('appointments')}
          className="flex items-center gap-2 bg-hav-primary hover:bg-hav-primary-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-hav-primary/20"
        >
          <Plus size={16} /> Nueva Cita
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Citas', value: appointments.length, icon: CalendarDays, color: 'bg-hav-primary' },
          { label: 'Confirmadas', value: appointments.filter((a) => a.estado === 'confirmada' || a.estado === 'completada').length, icon: CheckCircle, color: 'bg-hav-secondary' },
          { label: 'En Espera', value: appointments.filter((a) => a.estado === 'pendiente').length, icon: Clock, color: 'bg-amber-400' },
          { label: 'Pacientes BD', value: '+', icon: Users, color: 'bg-indigo-500' },
        ].map(({ label, value, icon: I, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex items-center gap-3">
            <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
              <I size={18} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-hav-text-main">{value}</p>
              <p className="text-xs text-hav-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Appointments List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-hav-text-main">Citas Activas</h3>
            <button onClick={() => fetchData()} className="text-xs text-hav-primary hover:underline">Actualizar</button>
          </div>
          
          {loading ? (
            <div className="py-8 flex justify-center"><Spinner /></div>
          ) : appointments.length === 0 ? (
             <p className="text-sm text-gray-400 py-4">No hay citas registradas</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => {
                const fullName = `${a.pacientes?.nombre} ${a.pacientes?.apellidos}`;
                const initial = a.pacientes?.nombre?.[0] || 'P';
                const timeStr = new Date(a.fecha_pautada).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
                
                return (
                <div key={a.id_cita} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-hav-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-hav-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-hav-text-main truncate">{fullName}</p>
                    <p className="text-xs text-hav-text-muted truncate">{a.especialista?.especialidad || 'Especialista'} · {timeStr}</p>
                  </div>
                  {(a.estado === 'confirmada' || a.estado === 'completada') ? (
                    <span className="flex items-center gap-1 text-[10px] text-hav-secondary font-semibold bg-green-50 px-2 py-1 rounded-full flex-shrink-0">
                      <CheckCircle size={10} /> {a.estado.toUpperCase()}
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmAppt(a.id_cita)}
                      className="text-xs bg-hav-primary text-white px-3 py-1.5 rounded-full hover:bg-hav-primary-dark transition-colors flex-shrink-0"
                    >
                      Confirmar
                    </button>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
