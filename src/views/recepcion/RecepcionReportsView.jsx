import { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Users, DollarSign, Download, 
  Search, RefreshCw, Percent, Phone, CheckCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';
import RecepcionGuardiasReport from './RecepcionGuardiasReport';
import { printArqueo } from '../../lib/printArqueo';

export default function RecepcionReportsView({ showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('citas'); // 'citas', 'llamadas' o 'guardias'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('semana'); // 'semana', 'quincena', 'mes', 'todas'
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizar datos
  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener Citas con datos demográficos expandidos para el control de ficha
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select(`
          id_cita,
          estado,
          fecha_pautada,
          motivo_consulta,
          id_pago,
          pacientes ( id_paciente, cedula, nombre, apellidos, telefono, correo, nombre_contacto_emergencia, tlf_contacto_emergencia ),
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

  // Filtrado de citas basadas en el período y búsqueda
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

  // Métricas de citas/ingresos
  const totalCitas = filteredAppointments.length;
  const citasPagadas = filteredAppointments.filter(c => c.pago !== null).length;
  const ingresosUSD = filteredAppointments.reduce((acc, curr) => acc + parseFloat(curr.pago?.monto_usd || 0), 0);
  const porcentajeCobro = totalCitas > 0 ? (citasPagadas / totalCitas) * 100 : 0;

  // Filtrar citas específicas de la semana en curso para llamadas
  const weeklyAppointments = appointments.filter(appt => {
    const apptDate = new Date(appt.fecha_pautada);
    
    // Búsqueda en llamadas
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const p = appt.pacientes;
      const matchName = `${p?.nombre} ${p?.apellidos}`.toLowerCase().includes(query);
      const matchCedula = p?.cedula?.toLowerCase().includes(query);
      return matchName || matchCedula;
    }

    return apptDate >= startOfWeek && apptDate <= endOfWeek;
  });

  // Verificar integridad de la ficha del paciente
  const isProfileComplete = (p) => {
    return p && p.telefono && p.nombre_contacto_emergencia && p.tlf_contacto_emergencia;
  };

  // Exportar a Excel Citas de Reportes
  const handleExportExcel = () => {
    if (filteredAppointments.length === 0) return;

    const headers = [
      'ID Cita', 'Paciente', 'Cédula', 'Teléfono', 'Especialista', 'Especialidad', 'Fecha y Hora', 'Motivo', 'Estado Cita', 'Estado Pago', 'Monto Pagado', 'Método Pago'
    ];

    const rows = filteredAppointments.map(appt => {
      const p = appt.pacientes;
      const spec = appt.especialista;
      const pago = appt.pago;
      const dateStr = new Date(appt.fecha_pautada).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

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

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Citas_HAV_${filterType.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Reporte de citas descargado con éxito.' });
  };

  // Exportar listado de llamadas de la semana a Excel
  const handleExportLlamadas = () => {
    if (weeklyAppointments.length === 0) return;

    const headers = [
      'Fecha Cita', 'Hora Cita', 'Cédula', 'Paciente', 'Teléfono', 'Correo', 'Especialista', 'Contacto de Emergencia', 'Teléfono Emergencia', 'Ficha Completa'
    ];

    const rows = weeklyAppointments.map(appt => {
      const p = appt.pacientes;
      const spec = appt.especialista;
      const apptDateObj = new Date(appt.fecha_pautada);
      const dateStr = apptDateObj.toLocaleDateString('es-ES');
      const timeStr = apptDateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const completed = isProfileComplete(p) ? 'COMPLETA' : 'INCOMPLETA (Faltan datos)';

      return [
        dateStr,
        timeStr,
        p?.cedula || '',
        `${p?.nombre || ''} ${p?.apellidos || ''}`,
        p?.telefono || 'No registrado',
        p?.correo || 'No registrado',
        `Dr. ${spec?.nombre_completo || ''} (${spec?.especialidad || ''})`,
        p?.nombre_contacto_emergencia || 'No registrado',
        p?.tlf_contacto_emergencia || 'No registrado',
        completed
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Listado_Seguimiento_Llamadas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Se ha descargado el listado de llamadas semanales.' });
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

          {/* Toggle de sub-pestañas */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold mt-4 w-max">
            <button 
              onClick={() => setActiveSubTab('citas')}
              className={`px-4 py-2 rounded-md transition-all ${activeSubTab === 'citas' ? 'bg-white text-hav-primary shadow-sm' : 'text-hav-text-muted hover:text-hav-primary'}`}
            >
              Reportes de Caja
            </button>
            <button 
              onClick={() => setActiveSubTab('llamadas')}
              className={`px-4 py-2 rounded-md transition-all ${activeSubTab === 'llamadas' ? 'bg-white text-hav-primary shadow-sm' : 'text-hav-text-muted hover:text-hav-primary'}`}
            >
              Llamadas Semanales
            </button>
            <button 
              onClick={() => setActiveSubTab('guardias')}
              className={`px-4 py-2 rounded-md transition-all ${activeSubTab === 'guardias' ? 'bg-white text-hav-primary shadow-sm' : 'text-hav-text-muted hover:text-hav-primary'}`}
            >
              Guardias y Horarios
            </button>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex gap-2.5">
          {activeSubTab !== 'guardias' && (
            <>
              <button
                onClick={fetchReportData}
                className="p-2.5 text-hav-text-muted hover:text-hav-primary transition-all bg-white hover:bg-gray-50 border border-gray-100 rounded-xl shadow-sm"
                title="Refrescar Datos"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              {activeSubTab === 'citas' && (
                <button
                  onClick={() => {
                    const session = JSON.parse(localStorage.getItem('hav_session') || 'null');
                    const cashierObj = {
                      name: session?.name || user?.name || 'Cajero de Guardia',
                      email: session?.email || user?.email || 'recepcion@hav.edu.ve'
                    };
                    printArqueo({
                      appointments: filteredAppointments,
                      cashier: cashierObj,
                      tasaBase: 38.50,
                      periodLabel: `Reporte de Caja (${filterType.toUpperCase()})`
                    });
                  }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                >
                  <BarChart3 size={16} /> Imprimir Arqueo (PDF)
                </button>
              )}
              <button
                onClick={activeSubTab === 'citas' ? handleExportExcel : handleExportLlamadas}
                className="flex items-center gap-2 bg-[#1e4f5c] hover:bg-[#12313a] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#1e4f5c]/20"
              >
                <Download size={16} /> Exportar a Excel
              </button>
            </>
          )}
        </div>
      </div>

      {loading && activeSubTab !== 'guardias' ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : activeSubTab === 'citas' ? (
        <>
          {/* VISTA 1: INGRESOS DE CAJA / CITAS */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-shrink-0">
            {[
              { label: 'Citas en el Período', value: totalCitas, icon: Calendar, color: 'bg-hav-primary text-white', details: 'Agendadas totales' },
              { label: 'Ingresos Registrados (USD)', value: `$${ingresosUSD.toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-500 text-white', details: `${citasPagadas} consultas cobradas` },
              { label: 'Rendimiento de Cobro', value: `${porcentajeCobro.toFixed(1)}%`, icon: Percent, color: 'bg-indigo-500 text-white', details: 'Proporción de consultas pagadas' }
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
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10 font-display">
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

                      return (
                        <tr key={appt.id_cita} className="hover:bg-gray-50/30 transition-colors">
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
                          <td>
                            <div>
                              <p className="font-medium text-hav-text-main">Dr. {spec?.nombre_completo}</p>
                              <p className="text-[10px] text-hav-primary font-medium mt-0.5">{spec?.especialidad}</p>
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="font-semibold text-hav-text-main">{timeStr}</p>
                              <p className="text-[10px] text-hav-text-muted mt-0.5">{dateStr}</p>
                            </div>
                          </td>
                          <td>
                            <p className="text-xs text-hav-text-muted max-w-[140px] truncate" title={appt.motivo_consulta}>
                              {appt.motivo_consulta || 'Sin motivo'}
                            </p>
                          </td>
                          <td>
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[appt.estado] || 'bg-gray-50'}`}>
                              {appt.estado}
                            </span>
                          </td>
                          <td>
                            {pago ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                {pago.metodo_pago}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                                Por Cobrar
                              </span>
                            )}
                          </td>
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
      ) : activeSubTab === 'llamadas' ? (
        <>
          {/* VISTA 2: LISTADO DE LLAMADAS Y SEGUIMIENTO SEMANAL */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-hav-primary/10 text-hav-primary font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm border border-hav-primary/10">
                <Calendar size={14} /> Semana en Curso
              </span>
              <span className="text-xs text-hav-text-muted">
                {startOfWeek.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {endOfWeek.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por paciente o cédula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hav-primary/20 focus:border-hav-primary bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-50 bg-gray-50/20 flex justify-between items-center">
              <h3 className="font-bold text-hav-text-main text-sm flex items-center gap-1.5">
                <Phone size={15} className="text-hav-primary" /> Directorio de Confirmación de Citas Semanales
              </h3>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              {weeklyAppointments.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <Phone size={44} className="opacity-20 mb-3 text-hav-primary" />
                  <p className="text-sm font-semibold">No hay citas registradas en la semana</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10">
                      <th className="px-6 py-3.5">Paciente</th>
                      <th className="px-6 py-3.5">Cédula</th>
                      <th className="px-6 py-3.5">Teléfono Principal</th>
                      <th className="px-6 py-3.5">Correo Electrónico</th>
                      <th className="px-6 py-3.5">Cita Asignada</th>
                      <th className="px-6 py-3.5">Contacto Emergencia</th>
                      <th className="px-6 py-3.5 text-center">Estado Ficha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {weeklyAppointments.map((appt) => {
                      const p = appt.pacientes;
                      const spec = appt.especialista;
                      const dateObj = new Date(appt.fecha_pautada);
                      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
                      const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                      const isComplete = isProfileComplete(p);

                      return (
                        <tr key={appt.id_cita} className="hover:bg-gray-50/30 transition-colors">
                          {/* Paciente */}
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-hav-primary/5 text-hav-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {p?.nombre?.[0] || 'P'}
                              </div>
                              <span className="font-semibold text-hav-text-main">{p?.nombre} {p?.apellidos}</span>
                            </div>
                          </td>

                          {/* Cédula */}
                          <td className="px-6 py-3.5 font-mono font-semibold text-gray-700">
                            C.I. {p?.cedula}
                          </td>

                          {/* Teléfono */}
                          <td className="px-6 py-3.5 font-semibold text-hav-primary">
                            {p?.telefono || 'No registrado ⚠️'}
                          </td>

                          {/* Correo */}
                          <td className="px-6 py-3.5 text-gray-500 text-xs">
                            {p?.correo || 'No registrado'}
                          </td>

                          {/* Cita Asignada */}
                          <td className="px-6 py-3.5 text-xs">
                            <div className="leading-tight">
                              <p className="font-semibold text-hav-text-main capitalize">{dayName} · {timeStr}</p>
                              <p className="text-hav-text-muted mt-0.5">Dr. {spec?.nombre_completo}</p>
                            </div>
                          </td>

                          {/* Contacto Emergencia */}
                          <td className="px-6 py-3.5 text-xs">
                            {p?.nombre_contacto_emergencia ? (
                              <div className="leading-tight">
                                <p className="font-medium text-hav-text-main">{p.nombre_contacto_emergencia}</p>
                                <p className="text-hav-text-muted mt-0.5">{p.tlf_contacto_emergencia}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No registrado</span>
                            )}
                          </td>

                          {/* Estado Ficha */}
                          <td className="px-6 py-3.5 text-center">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-[10px] font-bold">
                                <CheckCircle2 size={10} /> Completa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-[10px] font-bold">
                                <AlertCircle size={10} /> Incompleta
                              </span>
                            )}
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
      ) : (
        <RecepcionGuardiasReport showToast={showToast} />
      )}
    </div>
  );
}
