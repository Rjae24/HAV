import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Activity, TrendingUp, Search, Download, RefreshCw, X, 
  Calendar, FileSpreadsheet, DollarSign, CalendarDays, BarChart2 
} from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function RendimientoEspecialistasReport({ showToast }) {
  const [specsData, setSpecsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Historial Individual
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [pagosList, setPagosList] = useState([]);
  const [timeFilter, setTimeFilter] = useState('mes'); // 'semana', 'quincena', 'mes', 'todas'

  const fetchSpecsPerformance = async () => {
    try {
      setLoading(true);
      // Obtener especialistas con cédula
      const { data: specs, error: errSpecs } = await supabase
        .from('especialista')
        .select('id_usuario, nombre_completo, especialidad, cedula')
        .order('nombre_completo');

      if (errSpecs) throw errSpecs;

      // Obtener todas las citas para cómputos
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select('id_especialista, estado, id_pago');

      if (errCitas) throw errCitas;

      // Obtener todos los pagos
      const { data: pagos, error: errPagos } = await supabase
        .from('pago')
        .select('id_pago, monto_usd');

      if (errPagos) throw errPagos;

      const mappedSpecs = (specs || []).map(s => {
        const sCitas = (citas || []).filter(c => c.id_especialista === s.id_usuario);
        const total = sCitas.length;
        const completed = sCitas.filter(c => c.estado === 'completada').length;
        const cancelled = sCitas.filter(c => c.estado === 'cancelada').length;
        
        // Sumar ingresos
        const revenue = sCitas
          .filter(c => c.id_pago !== null)
          .reduce((acc, c) => {
            const p = (pagos || []).find(pay => pay.id_pago === c.id_pago);
            return acc + parseFloat(p?.monto_usd || 0);
          }, 0);

        return {
          ...s,
          total,
          completed,
          cancelled,
          revenue
        };
      });

      setSpecsData(mappedSpecs);
    } catch (err) {
      console.error("Error al cargar rendimiento médico:", err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el rendimiento de especialistas.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecsPerformance();
  }, []);

  // Cargar citas y pagos individuales para el especialista seleccionado
  const fetchSpecHistory = async (spec) => {
    try {
      setLoadingAppts(true);
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select(`
          id_cita, fecha_pautada, estado, motivo_consulta, id_pago,
          pacientes ( cedula, nombre, apellidos )
        `)
        .eq('id_especialista', spec.id_usuario)
        .order('fecha_pautada', { ascending: false });

      if (errCitas) throw errCitas;

      const { data: pagos, error: errPagos } = await supabase
        .from('pago')
        .select('id_pago, monto_usd, metodo_pago');

      if (errPagos) throw errPagos;

      setAppointments(citas || []);
      setPagosList(pagos || []);
    } catch (err) {
      console.error("Error al cargar historial del especialista:", err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudieron sincronizar las citas de este médico.' });
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    if (selectedSpec) {
      fetchSpecHistory(selectedSpec);
    } else {
      setAppointments([]);
      setPagosList([]);
    }
  }, [selectedSpec]);

  // Cálculos de fechas dinámicas para los filtros temporales del modal
  const getFilteredAppts = () => {
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

    // 2. Quincena Actual
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
    const startOfFortnight = new Date(today.getFullYear(), today.getMonth(), startDay, 0, 0, 0, 0);
    const endOfFortnight = new Date(today.getFullYear(), today.getMonth(), endDay, 23, 59, 59, 999);

    // 3. Mes Calendario Actual
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    return appointments.filter(appt => {
      const apptDate = new Date(appt.fecha_pautada);
      if (timeFilter === 'todas') return true;
      if (timeFilter === 'semana') return apptDate >= startOfWeek && apptDate <= endOfWeek;
      if (timeFilter === 'quincena') return apptDate >= startOfFortnight && apptDate <= endOfFortnight;
      if (timeFilter === 'mes') return apptDate >= startOfMonth && apptDate <= endOfMonth;
      return true;
    }).map(appt => {
      const pago = pagosList.find(p => p.id_pago === appt.id_pago);
      return {
        ...appt,
        pago
      };
    });
  };

  const modalAppointments = getFilteredAppts();
  const modalRevenue = modalAppointments
    .filter(a => a.pago !== undefined)
    .reduce((acc, a) => acc + parseFloat(a.pago?.monto_usd || 0), 0);

  // Filtrado reactivo de la tabla de rendimiento
  const filteredSpecs = specsData.filter(s => {
    const query = searchQuery.toLowerCase();
    const ced = s.cedula || '';
    return (
      s.nombre_completo.toLowerCase().includes(query) ||
      s.especialidad.toLowerCase().includes(query) ||
      ced.toLowerCase().includes(query)
    );
  });

  // Exportadores
  const handleExportAllSpecs = () => {
    if (filteredSpecs.length === 0) return;
    const headers = ['Médico', 'Cédula', 'Especialidad', 'Citas Asignadas', 'Consultas Atendidas', 'Citas Canceladas', 'Ingresos Generados (USD)'];
    const rows = filteredSpecs.map(s => [
      `Dr. ${s.nombre_completo}`,
      s.cedula || 'N/A',
      s.especialidad,
      s.total,
      s.completed,
      s.cancelled,
      parseFloat(s.revenue).toFixed(2)
    ]);
    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Reporte_Rendimiento_Medicos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Se descargó el reporte de rendimiento médico.' });
  };

  const handleExportSpecHistory = () => {
    if (!selectedSpec || modalAppointments.length === 0) return;
    
    const headers = ['Fecha y Hora', 'Cédula Paciente', 'Paciente', 'Motivo Consulta', 'Estado Cita', 'Método Pago', 'Honorario (USD)'];
    
    const rows = modalAppointments.map(appt => {
      const dateStr = new Date(appt.fecha_pautada).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      const p = appt.pacientes;
      return [
        dateStr,
        p?.cedula || 'N/A',
        p ? `${p.nombre} ${p.apellidos}` : 'N/A',
        appt.motivo_consulta ? appt.motivo_consulta.replace(/[\n\r;]/g, ' ') : 'Sin especificar',
        appt.estado,
        appt.pago?.metodo_pago || 'Cortesía / Pendiente',
        appt.pago ? parseFloat(appt.pago.monto_usd).toFixed(2) : '0.00'
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = selectedSpec.nombre_completo.replace(/\s+/g, '_');
    link.setAttribute('download', `Rendimiento_Dr_${safeName}_${timeFilter.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Historial de citas del especialista descargado.' });
  };

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      {/* Controles de Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por cédula, nombre o especialidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-hav-primary bg-white transition-all w-60"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSpecsPerformance}
            className="p-2 text-gray-400 hover:text-hav-primary transition-colors bg-gray-50 rounded-xl border border-gray-100"
            title="Refrescar rendimiento"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportAllSpecs}
            disabled={filteredSpecs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-hav-primary text-white text-xs font-semibold rounded-xl hover:bg-hav-primary-dark transition-colors shadow-sm disabled:opacity-50"
          >
            <Download size={14} /> Exportar Rendimientos
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : (
        <>
          {/* Tarjetas Consolidadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-hav-primary/10 text-hav-primary flex items-center justify-center shadow-sm">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-hav-text-main">{filteredSpecs.length}</p>
                <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Especialistas Activos</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-sm">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-hav-text-main">
                  ${filteredSpecs.reduce((acc, s) => acc + s.revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Recaudación Total Especialistas</p>
              </div>
            </div>
          </div>

          {/* Tabla de Especialistas */}
          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex-shrink-0">
              <h3 className="font-semibold text-hav-text-main text-sm">Productividad y Facturación de Especialistas</h3>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="text-xs uppercase bg-gray-50/80 text-hav-text-muted font-semibold sticky top-0 bg-white z-10">
                  <tr>
                    <th className="px-6 py-3.5">Médico</th>
                    <th className="px-6 py-3.5">Cédula</th>
                    <th className="px-6 py-3.5">Especialidad</th>
                    <th className="px-6 py-3.5 text-center">Citas Asignadas</th>
                    <th className="px-6 py-3.5 text-center">Consultas Atendidas</th>
                    <th className="px-6 py-3.5 text-center">Citas Canceladas</th>
                    <th className="px-6 py-3.5 text-right">Recaudación (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSpecs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-400">No se encontraron especialistas.</td>
                    </tr>
                  ) : (
                    filteredSpecs.map((s) => (
                      <tr 
                        key={s.id_usuario} 
                        onClick={() => setSelectedSpec(s)}
                        className="hover:bg-hav-primary/5 cursor-pointer transition-colors"
                        title="Haz clic para auditar el historial de citas de este médico"
                      >
                        <td className="px-6 py-3.5 font-semibold text-hav-text-main">
                          Dr. {s.nombre_completo}
                        </td>
                        <td className="px-6 py-3.5 font-mono font-semibold text-gray-500">
                          {s.cedula || 'N/A'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="bg-hav-primary/10 text-hav-primary font-bold px-2.5 py-1 rounded-full text-xs">
                            {s.especialidad}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-gray-600">
                          {s.total}
                        </td>
                        <td className="px-6 py-3.5 text-center text-emerald-700 font-bold">
                          {s.completed}
                        </td>
                        <td className="px-6 py-3.5 text-center text-rose-600 font-bold">
                          {s.cancelled}
                        </td>
                        <td className="px-6 py-3.5 text-right font-extrabold text-hav-text-main">
                          ${s.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Historial Especialista */}
      {selectedSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cabecera del modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
                <BarChart2 size={18} className="text-hav-primary" /> Historial de Guardia e Ingresos: Dr. {selectedSpec.nombre_completo}
              </h3>
              <button onClick={() => setSelectedSpec(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Controles de filtro temporal y exportar */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
              <div className="flex bg-gray-100 p-0.5 rounded-xl text-xs font-semibold w-max">
                {[
                  { id: 'semana', label: 'Esta Semana' },
                  { id: 'quincena', label: 'Esta Quincena' },
                  { id: 'mes', label: 'Este Mes' },
                  { id: 'todas', label: 'Todas las Citas' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setTimeFilter(item.id)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      timeFilter === item.id 
                        ? 'bg-white text-hav-primary shadow-sm' 
                        : 'text-hav-text-muted hover:text-hav-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {modalAppointments.length > 0 && (
                <button
                  onClick={handleExportSpecHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e4f5c] hover:bg-[#12313a] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <FileSpreadsheet size={14} /> Exportar Reporte Filtrado
                </button>
              )}
            </div>

            {/* Métricas del médico filtradas */}
            <div className="px-6 py-4 grid grid-cols-3 gap-4 flex-shrink-0">
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
                <p className="text-2xl font-bold text-hav-text-main">{modalAppointments.length}</p>
                <p className="text-[10px] text-hav-text-muted font-bold uppercase mt-0.5">Citas en Período</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
                <p className="text-2xl font-bold text-emerald-700">{modalAppointments.filter(a => a.estado === 'completada').length}</p>
                <p className="text-[10px] text-hav-text-muted font-bold uppercase mt-0.5">Completadas</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
                <p className="text-2xl font-bold text-hav-primary">${modalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-hav-text-muted font-bold uppercase mt-0.5">Ingresos Cobrados</p>
              </div>
            </div>

            {/* Tabla de citas del médico */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30 flex flex-col min-h-0">
              {loadingAppts ? (
                <div className="flex-1 flex justify-center items-center py-20"><Spinner /></div>
              ) : modalAppointments.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <CalendarDays size={44} className="opacity-20 mb-3 text-hav-primary" />
                  <p className="text-sm font-semibold">No se encontraron citas registradas para este período.</p>
                </div>
              ) : (
                <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10">
                          <th className="px-6 py-3">Fecha y Hora</th>
                          <th className="px-6 py-3">Paciente</th>
                          <th className="px-6 py-3">Cédula</th>
                          <th className="px-6 py-3">Motivo Consulta</th>
                          <th className="px-6 py-3">Estado Cita</th>
                          <th className="px-6 py-3">Pago</th>
                          <th className="px-6 py-3 text-right">Monto (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {modalAppointments.map((appt) => {
                          const dateObj = new Date(appt.fecha_pautada);
                          const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                          const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                          const p = appt.pacientes;

                          const statusColors = {
                            pendiente: 'bg-amber-50 text-amber-700 border-amber-100',
                            confirmada: 'bg-sky-50 text-sky-700 border-sky-100',
                            en_espera: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                            en_consulta: 'bg-purple-50 text-purple-700 border-purple-100',
                            completada: 'bg-gray-100 text-gray-600 border-gray-200',
                            cancelada: 'bg-rose-50 text-rose-700 border-rose-100'
                          };

                          return (
                            <tr key={appt.id_cita} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-3.5">
                                <div className="leading-tight">
                                  <p className="font-semibold text-hav-text-main">{timeStr}</p>
                                  <p className="text-[10px] text-hav-text-muted mt-0.5">{dateStr}</p>
                                </div>
                              </td>
                              <td className="px-6 py-3.5 font-semibold text-hav-text-main">
                                {p ? `${p.nombre} ${p.apellidos}` : 'N/A'}
                              </td>
                              <td className="px-6 py-3.5 font-mono text-gray-600">
                                {p?.cedula || 'N/A'}
                              </td>
                              <td className="px-6 py-3.5 text-xs text-hav-text-muted truncate max-w-[140px]" title={appt.motivo_consulta}>
                                {appt.motivo_consulta || 'Sin motivo'}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[appt.estado] || 'bg-gray-50'}`}>
                                  {appt.estado}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-xs">
                                {appt.pago ? (
                                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                    {appt.pago.metodo_pago}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                                    Por Cobrar
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3.5 text-right font-bold text-hav-text-main">
                                {appt.pago ? `$${parseFloat(appt.pago.monto_usd).toFixed(2)}` : '$0.00'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
