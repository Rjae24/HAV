import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, ShieldAlert, CheckCircle, HelpCircle, 
  ChevronLeft, ChevronRight, User, Stethoscope, Download, RefreshCw 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function RecepcionGuardiasReport({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('quincena'); // 'quincena' o 'mes'
  const [specialists, setSpecialists] = useState([]);
  const [blockages, setBlockages] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [days, setDays] = useState([]);

  // Configuración de límites y horarios estándar
  const MAX_CITAS_DIARIAS = 15;
  const HORA_INICIO_STD = 8;  // 08:00 AM
  const HORA_FIN_STD = 18;    // 06:00 PM

  // Obtener fechas del período seleccionado
  const calculateDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const list = [];

    if (periodo === 'quincena') {
      const currentDay = today.getDate();
      const start = currentDay <= 15 ? 1 : 16;
      const end = currentDay <= 15 ? 15 : new Date(year, month + 1, 0).getDate();
      
      for (let d = start; d <= end; d++) {
        list.push(new Date(year, month, d));
      }
    } else {
      // Mes completo
      const end = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= end; d++) {
        list.push(new Date(year, month, d));
      }
    }
    setDays(list);
  };

  useEffect(() => {
    calculateDays();
  }, [periodo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Obtener especialistas activos
      const { data: specs, error: errSpecs } = await supabase
        .from('especialista')
        .select('id_usuario, nombre_completo, especialidad, tlf')
        .order('nombre_completo');
      if (errSpecs) throw errSpecs;

      // 2. Obtener bloqueos de disponibilidad activos
      const { data: blocks, error: errBlocks } = await supabase
        .from('horario_especialista')
        .select('*')
        .eq('activo', true);
      if (errBlocks) throw errBlocks;

      // 3. Obtener citas
      const { data: appts, error: errAppts } = await supabase
        .from('cita')
        .select('id_cita, id_especialista, fecha_pautada, estado')
        .neq('estado', 'cancelada'); // Excluir canceladas del cupo diario
      if (errAppts) throw errAppts;

      setSpecialists(specs || []);
      setBlockages(blocks || []);
      setAppointments(appts || []);
    } catch (err) {
      console.error("Error al cargar datos de guardias:", err);
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Error de Carga',
          message: 'No se pudieron sincronizar los horarios de guardias.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Analizar la disponibilidad y estado de un especialista para una fecha dada
  const getAvailability = (specId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Filtrar bloqueos para este especialista y esta fecha
    const specBlocks = blockages.filter(b => b.id_usuario === specId && b.fecha === dateStr);
    
    // Contar citas activas para este especialista en esta fecha
    const dailyAppts = appointments.filter(a => {
      if (a.id_especialista !== specId) return false;
      const apptDate = a.fecha_pautada.split('T')[0];
      return apptDate === dateStr;
    });

    const citasCount = dailyAppts.length;
    const cupoDisponible = Math.max(0, MAX_CITAS_DIARIAS - citasCount);

    if (specBlocks.length === 0) {
      return {
        status: 'disponible',
        label: 'Mañana y Tarde',
        hours: '08:00 AM - 06:00 PM',
        citasCount,
        cupoDisponible,
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }

    // Analizar el rango de bloqueos
    let morningBlocked = false;
    let afternoonBlocked = false;
    let fullDayBlocked = false;

    specBlocks.forEach(b => {
      const [sh, sm] = b.hora_inicio.split(':').map(Number);
      const [eh, em] = b.hora_fin.split(':').map(Number);
      
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      // Mañana: 08:00 a 13:00 (480 a 780 mins)
      if (startMins <= 8 * 60 && endMins >= 13 * 60) {
        morningBlocked = true;
      }
      // Tarde: 13:00 a 18:00 (780 a 1080 mins)
      if (startMins <= 13 * 60 && endMins >= 18 * 60) {
        afternoonBlocked = true;
      }
      // Todo el día laboral: 08:00 a 18:00
      if (startMins <= 8 * 60 && endMins >= 18 * 60) {
        fullDayBlocked = true;
      }
    });

    if (fullDayBlocked || (morningBlocked && afternoonBlocked)) {
      return {
        status: 'bloqueado',
        label: 'No Laborable',
        hours: 'Sin disponibilidad (Bloqueo)',
        citasCount: 0,
        cupoDisponible: 0,
        color: 'bg-rose-50 text-rose-700 border-rose-200'
      };
    } else if (morningBlocked) {
      return {
        status: 'tarde',
        label: 'Solo Tarde',
        hours: '01:00 PM - 06:00 PM',
        citasCount,
        cupoDisponible: Math.max(0, Math.floor(MAX_CITAS_DIARIAS / 2) - citasCount),
        color: 'bg-sky-50 text-sky-700 border-sky-200'
      };
    } else if (afternoonBlocked) {
      return {
        status: 'manana',
        label: 'Solo Mañana',
        hours: '08:00 AM - 01:00 PM',
        citasCount,
        cupoDisponible: Math.max(0, Math.floor(MAX_CITAS_DIARIAS / 2) - citasCount),
        color: 'bg-amber-50 text-amber-700 border-amber-200'
      };
    }

    return {
      status: 'parcial',
      label: 'Horario Reducido',
      hours: 'Disponible con excepciones',
      citasCount,
      cupoDisponible,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
  };

  // Exportar Horario a Excel
  const handleExportGuardias = () => {
    if (specialists.length === 0 || days.length === 0) return;

    const headers = [
      'Especialista', 'Especialidad', 'Fecha', 'Día Semana', 'Estado Guardia', 'Horario de Guardia', 'Citas Agendadas', 'Cupo Disponible'
    ];

    const rows = [];
    specialists.forEach(spec => {
      days.forEach(day => {
        const avail = getAvailability(spec.id_usuario, day);
        const dateStr = day.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const dowName = day.toLocaleDateString('es-ES', { weekday: 'long' });

        rows.push([
          `Dr. ${spec.nombre_completo}`,
          spec.especialidad,
          dateStr,
          dowName,
          avail.label,
          avail.hours,
          avail.citasCount,
          avail.cupoDisponible
        ]);
      });
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Disponibilidad_Guardias_${periodo.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) {
      showToast({
        type: 'success',
        title: 'Exportación Exitosa',
        message: 'El cronograma de guardias y horarios se ha exportado con éxito.'
      });
    }
  };

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      {/* Controles de Selección */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex bg-gray-100 p-0.5 rounded-xl text-xs font-semibold w-max">
          <button
            onClick={() => setPeriodo('quincena')}
            className={`px-4 py-2 rounded-lg transition-all ${
              periodo === 'quincena' ? 'bg-white text-hav-primary shadow-sm' : 'text-hav-text-muted hover:text-hav-primary'
            }`}
          >
            Quincena Actual
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`px-4 py-2 rounded-lg transition-all ${
              periodo === 'mes' ? 'bg-white text-hav-primary shadow-sm' : 'text-hav-text-muted hover:text-hav-primary'
            }`}
          >
            Mes Completo
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-hav-primary transition-colors bg-gray-50 rounded-lg border border-gray-100"
            title="Refrescar disponibilidad"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportGuardias}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e4f5c] hover:bg-[#12313a] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Download size={14} /> Exportar Guardias
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : (
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-50 bg-gray-50/20">
            <h3 className="font-bold text-hav-text-main text-sm flex items-center gap-1.5">
              <Clock size={16} className="text-hav-primary" /> Guardias y Horarios de Especialistas
            </h3>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar p-5 space-y-6">
            {specialists.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                <User size={44} className="opacity-20 mb-3 text-hav-primary" />
                <p className="text-sm font-semibold">No se encontraron especialistas en el sistema</p>
              </div>
            ) : (
              specialists.map(spec => {
                return (
                  <div key={spec.id_usuario} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-4">
                    {/* Fila superior: Info del Médico */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-hav-primary/10 text-hav-primary font-bold flex items-center justify-center">
                          {spec.nombre_completo[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-hav-text-main text-sm">Dr. {spec.nombre_completo}</h4>
                          <span className="text-[10px] bg-hav-primary/10 text-hav-primary font-bold px-2 py-0.5 rounded-full">
                            {spec.especialidad}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-hav-text-muted">
                        Contacto: <span className="font-medium text-hav-text-main">{spec.tlf || 'No registrado'}</span>
                      </div>
                    </div>

                    {/* Strip de días (scroll horizontal) */}
                    <div className="overflow-x-auto pb-2 custom-scrollbar">
                      <div className="flex gap-2 min-w-max">
                        {days.map((day, idx) => {
                          const avail = getAvailability(spec.id_usuario, day);
                          const dayNum = day.getDate();
                          const dayName = day.toLocaleDateString('es-ES', { weekday: 'short' });
                          
                          return (
                            <div 
                              key={idx} 
                              className={`w-28 p-2.5 rounded-xl border flex flex-col items-center justify-between transition-all hover:shadow-sm ${avail.color}`}
                            >
                              <div className="text-center">
                                <p className="text-[9px] uppercase tracking-wider font-bold opacity-60">{dayName}</p>
                                <p className="text-lg font-display font-extrabold leading-none mt-1">{dayNum}</p>
                              </div>
                              
                              <div className="text-center my-2">
                                <p className="text-[9px] font-extrabold uppercase leading-tight">{avail.label}</p>
                                <p className="text-[8px] opacity-70 mt-0.5 max-w-[100px] truncate">{avail.hours}</p>
                              </div>

                              <div className="w-full bg-white/60 rounded-lg p-1 text-center text-[9px] font-bold">
                                {avail.status === 'bloqueado' ? (
                                  <span className="text-rose-600">No Disp.</span>
                                ) : (
                                  <span className={avail.cupoDisponible > 0 ? "text-emerald-700" : "text-amber-700"}>
                                    Cupo: {avail.citasCount}/{MAX_CITAS_DIARIAS}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
