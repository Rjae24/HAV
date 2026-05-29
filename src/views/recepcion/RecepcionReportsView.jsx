import { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Users, DollarSign, Download, 
  Search, RefreshCw, ChevronRight, Activity, Percent
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function RecepcionReportsView({ showToast }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('semana'); // 'semana', 'quincena', 'mes', 'todas'
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizar datos
  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener Citas
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select(`
          id_cita,
          estado,
          fecha_pautada,
          motivo_consulta,
          id_pago,
          pacientes ( id_paciente, cedula, nombre, apellidos, telefono ),
          especialista ( id_usuario, nombre_completo, especialidad )
        `)
        .order('fecha_pautada', { ascending: false });

      if (errCitas) throw errCitas;

      // 2. Obtener Pagos
      const { data: pagos, error: errPagos } = await supabase
        .from('pago')
        .select('id_pago, monto_usd, metodo_pago, fecha_pago');

      if (errPagos) throw errPagos;

      // Mapear pagos en memoria
      const mapped = (citas || []).map(c => ({
        ...c,
        pago: pagos ? pagos.find(p => p.id_pago === c.id_pago) : null
      }));

      setAppointments(mapped);

    } catch (err) {
      console.error("Error en RecepcionReportsView.fetchReportData:", err);
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Error de Sincronización',
          message: 'No se pudieron estructurar los reportes de citas.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Calcular Rangos de Fechas Dinámicos
  const today = new Date();

  // 1. Semana Actual (Lunes a Domingo)
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // 2. Quincena Actual (Día 1 al 15, o Día 16 al fin de mes)
  const currentDay = today.getDate();
  let startDay, endDay;
  if (currentDay <= 15) {
    startDay = 1;
    endDay = 15;
  } else {
    startDay = 16;
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    endDay = lastDayOfMonth;
  }
  const startOfFortnightDate = new Date(today.getFullYear(), today.getMonth(), startDay, 0, 0, 0, 0);
  const endOfFortnightDate = new Date(today.getFullYear(), today.getMonth(), endDay, 23, 59, 59, 999);

  // 3. Mes Calendario Actual
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  // Filtrado de citas basadas en el periodo y búsqueda
  const filteredAppointments = appointments.filter(appt => {
    const apptDate = new Date(appt.fecha_pautada);

    // Búsqueda de texto reactiva
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const p = appt.pacientes;
      const matchName = `${p?.nombre} ${p?.apellidos}`.toLowerCase().includes(query);
      const matchCedula = p?.cedula?.toLowerCase().includes(query);
      const matchSpec = appt.especialista?.nombre_completo?.toLowerCase().includes(query);
      if (!matchName && !matchCedula && !matchSpec) return false;
    }

    if (filterType === 'todas') return true;
    if (filterType === 'semana') return apptDate >= startOfWeek && apptDate <= endOfWeek;
    if (filterType === 'quincena') return apptDate >= startOfFortnightDate && apptDate <= endOfFortnightDate;
    if (filterType === 'mes') return apptDate >= startOfMonth && apptDate <= endOfMonth;

    return true;
  });

  // Métricas del periodo seleccionado
  const totalCitas = filteredAppointments.length;
  const citasPagadas = filteredAppointments.filter(c => c.pago !== null).length;
  const ingresosUSD = filteredAppointments.reduce((acc, curr) => acc + parseFloat(curr.pago?.monto_usd || 0), 0);
  const porcentajeCobro = totalCitas > 0 ? (citasPagadas / totalCitas) * 100 : 0;

  // Exportar a Excel (CSV con soporte UTF-8 BOM para Excel)
  const handleExportExcel = () => {
    if (filteredAppointments.length === 0) {
      if (showToast) {
        showToast({
          type: 'warning',
          title: 'Sin Datos',
          message: 'No existen registros en este periodo para exportar.'
        });
      }
      return;
    }

    // Cabeceras de Excel
    const headers = [
      'ID Cita',
      'Paciente',
      'Cédula Paciente',
      'Teléfono Paciente',
      'Especialista Médico',
      'Especialidad Médica',
      'Fecha y Hora Cita',
      'Motivo de Consulta',
      'Estado Cita',
      'Estado Pago',
      'Monto Pagado (USD)',
      'Método de Pago'
    ];

    // Filas estructuradas
    const rows = filteredAppointments.map(appt => {
      const p = appt.pacientes;
      const spec = appt.especialista;
      const pago = appt.pago;
      const dateStr = new Date(appt.fecha_pautada).toLocaleString('es-ES', { 
        dateStyle: 'short', timeStyle: 'short' 
      });

      return [
        `#${appt.id_cita.toString().padStart(4, '0')}`,
        `${p?.nombre || ''} ${p?.apellidos || ''}`,
        p?.cedula || '',
        p?.telefono || '',
        `Dr. ${spec?.nombre_completo || ''}`,
        spec?.especialidad || '',
        dateStr,
        appt.motivo_consulta ? appt.motivo_consulta.replace(/[\n\r;]/g, ' ') : 'Sin especificar',
        appt.estado || 'pendiente',
        pago ? 'Pagado' : 'Por Cobrar',
        pago ? parseFloat(pago.monto_usd || 0).toFixed(2) : '0.00',
        pago ? pago.metodo_pago : 'N/A'
      ];
    });

    // Compilar contenido del archivo delimitado por punto y coma (;)
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    // Inyectar byte order mark (\uFEFF) para UTF-8 en Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Nombre estético del archivo
    const periodNames = { semana: 'SEMANAL', quincena: 'QUINCENAL', mes: 'MENSUAL', todas: 'TOTAL_ACUMULADO' };
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Citas_HAV_${periodNames[filterType]}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) {
      showToast({
        type: 'success',
        title: 'Exportación Finalizada',
        message: 'El reporte de Excel se ha descargado de forma satisfactoria.'
      });
    }
  };

  return (
    <div className="p-6 space-y-6 view-enter h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar flex flex-col">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main flex items-center gap-2">
            <BarChart3 className="text-hav-primary" size={24} /> Reportes de Citas
          </h1>
          <p className="text-hav-text-muted text-sm mt-0.5">
            Consulta estadísticas de agendamiento y descarga archivos estructurados para Excel
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex gap-2.5">
          <button
            onClick={fetchReportData}
            className="p-2.5 text-hav-text-muted hover:text-hav-primary transition-all bg-white hover:bg-gray-50 border border-gray-100 rounded-xl shadow-sm"
            title="Refrescar Datos"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-[#1e4f5c] hover:bg-[#12313a] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#1e4f5c]/20"
          >
            <Download size={16} /> Exportar a Excel
          </button>
        </div>
      </div>

      {/* Selectores de Período & Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        {/* Toggle del período */}
        <div className="flex bg-gray-100 p-0.5 rounded-xl text-xs font-semibold w-max">
          {[
            { id: 'semana', label: 'Esta Semana' },
            { id: 'quincena', label: 'Esta Quincena' },
            { id: 'mes', label: 'Este Mes' },
            { id: 'todas', label: 'Todas las Citas' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilterType(p.id)}
              className={`px-4 py-2 rounded-lg transition-all ${
                filterType === p.id 
                  ? 'bg-white text-hav-primary shadow-sm' 
                  : 'text-hav-text-muted hover:text-hav-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Buscador reactivo */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por paciente, cédula o especialista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hav-primary/20 focus:border-hav-primary bg-white transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : (
        <>
          {/* Métricas e Indicadores del Periodo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-shrink-0">
            {[
              { 
                label: 'Citas en el Período', 
                value: totalCitas, 
                icon: Calendar, 
                color: 'bg-hav-primary text-white',
                details: 'Agendadas totales' 
              },
              { 
                label: 'Ingresos Registrados (USD)', 
                value: `$${ingresosUSD.toFixed(2)}`, 
                icon: DollarSign, 
                color: 'bg-emerald-500 text-white',
                details: `${citasPagadas} consultas ya cobradas` 
              },
              { 
                label: 'Rendimiento de Cobro', 
                value: `${porcentajeCobro.toFixed(1)}%`, 
                icon: Percent, 
                color: 'bg-indigo-500 text-white',
                details: 'Proporción de consultas pagadas' 
              }
            ].map(({ label, value, icon: Icon, color, details }) => (
              <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/50 flex items-center gap-4 transition-all hover:shadow-md">
                <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-hav-text-main leading-tight">{value}</p>
                  <p className="text-xs font-semibold text-hav-text-muted mt-0.5">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{details}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla de Reportes */}
          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-50 bg-gray-50/20 flex justify-between items-center">
              <h3 className="font-bold text-hav-text-main text-sm">Resumen Detallado</h3>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              {filteredAppointments.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <Calendar size={44} className="opacity-20 mb-3 text-hav-primary" />
                  <p className="text-sm font-semibold">No se encontraron citas para este período</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10">
                      <th className="px-6 py-3.5">Paciente</th>
                      <th className="px-6 py-3.5">Especialista</th>
                      <th className="px-6 py-3.5">Fecha y Hora</th>
                      <th className="px-6 py-3.5">Motivo</th>
                      <th className="px-6 py-3.5">Estado Cita</th>
                      <th className="px-6 py-3.5">Estado Pago</th>
                      <th className="px-6 py-3.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAppointments.map((appt) => {
                      const p = appt.pacientes;
                      const spec = appt.especialista;
                      const pago = appt.pago;
                      
                      const apptDateObj = new Date(appt.fecha_pautada);
                      const timeStr = apptDateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                      const dateStr = apptDateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

                      const statusColors = {
                        pendiente: 'bg-amber-50 text-amber-700 border-amber-100',
                        confirmada: 'bg-sky-50 text-sky-700 border-sky-100',
                        en_espera: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        en_consulta: 'bg-purple-50 text-purple-700 border-purple-100',
                        completada: 'bg-gray-100 text-gray-600 border-gray-200'
                      };
                      const statusLabel = {
                        pendiente: 'Pendiente',
                        confirmada: 'Confirmada',
                        en_espera: 'En Espera',
                        en_consulta: 'En Consulta',
                        completada: 'Atendido'
                      };

                      return (
                        <tr key={appt.id_cita} className="hover:bg-gray-50/30 transition-colors">
                          {/* Paciente */}
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-hav-primary/5 text-hav-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {p?.nombre?.[0] || 'P'}
                              </div>
                              <div>
                                <p className="font-semibold text-hav-text-main leading-tight">{p?.nombre} {p?.apellidos}</p>
                                <p className="text-[10px] text-hav-text-muted mt-0.5">C.I. {p?.cedula}</p>
                              </div>
                            </div>
                          </td>

                          {/* Especialista */}
                          <td className="px-6 py-3.5">
                            <div>
                              <p className="font-medium text-hav-text-main">Dr. {spec?.nombre_completo}</p>
                              <p className="text-[10px] text-hav-primary font-medium mt-0.5">{spec?.especialidad}</p>
                            </div>
                          </td>

                          {/* Fecha y Hora */}
                          <td className="px-6 py-3.5">
                            <div>
                              <p className="font-semibold text-hav-text-main">{timeStr}</p>
                              <p className="text-[10px] text-hav-text-muted mt-0.5">{dateStr}</p>
                            </div>
                          </td>

                          {/* Motivo */}
                          <td className="px-6 py-3.5">
                            <p className="text-xs text-hav-text-muted max-w-[140px] truncate" title={appt.motivo_consulta}>
                              {appt.motivo_consulta || 'Sin motivo'}
                            </p>
                          </td>

                          {/* Estado Cita */}
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[appt.estado] || 'bg-gray-50'}`}>
                              {statusLabel[appt.estado] || appt.estado}
                            </span>
                          </td>

                          {/* Estado Pago */}
                          <td className="px-6 py-3.5">
                            {pago ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                {pago.metodo_pago}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                                Por Cobrar
                              </span>
                            )}
                          </td>

                          {/* Monto */}
                          <td className="px-6 py-3.5 text-right font-bold text-hav-text-main">
                            {pago ? `$${parseFloat(pago.monto_usd).toFixed(2)}` : '$0.00'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
