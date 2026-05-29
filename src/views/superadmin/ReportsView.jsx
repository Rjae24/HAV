import { useState, useEffect } from 'react';
import { 
  DollarSign, Download, RefreshCw, CreditCard, Calendar, Users, Activity, TrendingUp, BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function ReportsView({ showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('finanzas'); // 'finanzas', 'censo' o 'especialistas'
  const [pagos, setPagos] = useState([]);
  const [patients, setPatients] = useState([]);
  const [specsData, setSpecsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasaBase, setTasaBase] = useState(38.50); // Tasa por defecto
  
  // 1. Obtener pagos para el Reporte Financiero
  const fetchPagos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pago')
        .select(`
          id_pago, monto_usd, metodo_pago, fecha_pago,
          usuario:id_caja ( username )
        `)
        .order('fecha_pago', { ascending: false });

      if (error) throw error;
      setPagos(data || []);
    } catch (err) {
      console.error("Error al cargar pagos:", err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los pagos.' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Obtener censo de pacientes con visitas completadas
  const fetchPatientsCenso = async () => {
    try {
      setLoading(true);
      // Obtener todos los pacientes
      const { data: pats, error: errPats } = await supabase
        .from('pacientes')
        .select('id_paciente, cedula, nombre, apellidos, fecha_registro')
        .order('nombre');

      if (errPats) throw errPats;

      // Obtener todas las citas para computar asistencia completada en memoria
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select('id_paciente, estado');

      if (errCitas) throw errCitas;

      const mappedPats = (pats || []).map(p => {
        const completedCount = (citas || []).filter(c => c.id_paciente === p.id_paciente && c.estado === 'completada').length;
        return {
          ...p,
          completedCount
        };
      });

      setPatients(mappedPats);
    } catch (err) {
      console.error("Error al cargar censo de pacientes:", err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el censo de pacientes.' });
    } finally {
      setLoading(false);
    }
  };

  // 3. Obtener rendimiento de especialistas en el mes en curso
  const fetchSpecsPerformance = async () => {
    try {
      setLoading(true);
      // Obtener especialistas
      const { data: specs, error: errSpecs } = await supabase
        .from('especialista')
        .select('id_usuario, nombre_completo, especialidad')
        .order('nombre_completo');

      if (errSpecs) throw errSpecs;

      // Obtener citas del mes
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select('id_especialista, estado, id_pago');

      if (errCitas) throw errCitas;

      // Obtener pagos
      const { data: pagosList, error: errPagos } = await supabase
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
            const p = (pagosList || []).find(pay => pay.id_pago === c.id_pago);
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
    if (activeSubTab === 'finanzas') {
      fetchPagos();
    } else if (activeSubTab === 'censo') {
      fetchPatientsCenso();
    } else {
      fetchSpecsPerformance();
    }
  }, [activeSubTab]);

  const totalUSD = pagos.reduce((acc, curr) => acc + parseFloat(curr.monto_usd), 0);
  const totalBs = totalUSD * tasaBase;

  // Exportadores
  const handleExportFinanzas = () => {
    if (pagos.length === 0) return;
    const headers = ['ID Transacción', 'Fecha', 'Método Pago', 'Cajero', 'Monto (USD)', 'Equivalente (Bs)'];
    const rows = pagos.map(p => [
      `#${p.id_pago.toString().padStart(4, '0')}`,
      new Date(p.fecha_pago).toLocaleDateString('es-ES'),
      p.metodo_pago,
      p.usuario?.username || 'N/A',
      parseFloat(p.monto_usd).toFixed(2),
      (parseFloat(p.monto_usd) * tasaBase).toFixed(2)
    ]);
    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Reporte_Financiero_HAV.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Se descargó el reporte financiero.' });
  };

  const handleExportCenso = () => {
    if (patients.length === 0) return;
    const headers = ['ID Paciente', 'Nombre', 'Apellidos', 'Cédula', 'Fecha Registro', 'Consultas Completadas'];
    const rows = patients.map(p => [
      `#${p.id_paciente.toString().padStart(4, '0')}`,
      p.nombre,
      p.apellidos,
      p.cedula,
      new Date(p.fecha_registro).toLocaleDateString('es-ES'),
      p.completedCount
    ]);
    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Reporte_Censo_Pacientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Se descargó el censo de pacientes.' });
  };

  const handleExportSpecs = () => {
    if (specsData.length === 0) return;
    const headers = ['Médico', 'Especialidad', 'Citas Asignadas', 'Consultas Atendidas', 'Citas Canceladas', 'Ingresos Generados (USD)'];
    const rows = specsData.map(s => [
      `Dr. ${s.nombre_completo}`,
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

  return (
    <div className="p-6 space-y-6 view-enter h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar flex flex-col">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">
            Reportes Clínicos y Financieros
          </h1>
          <p className="text-hav-text-muted text-sm mt-0.5">
            Analítica de conversión, rendimiento médico y censo general del hospital
          </p>

          {/* Toggle de sub-pestañas */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold mt-4 w-max">
            {[
              { id: 'finanzas', label: 'Reporte Financiero' },
              { id: 'censo', label: 'Censo de Pacientes' },
              { id: 'especialistas', label: 'Rendimiento Especialistas' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeSubTab === tab.id ? 'bg-white text-hav-primary shadow-sm' : 'text-hav-text-muted hover:text-hav-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 md:pr-4 rounded-xl shadow-sm border border-gray-100">
           {activeSubTab === 'finanzas' && (
             <div className="flex items-center gap-3 px-3 py-1 bg-green-50 border border-green-100 rounded-lg">
                <RefreshCw size={14} className="text-green-600" />
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-green-700 uppercase">Tasa de Cambio (Bs)</span>
                   <input 
                      type="number"
                      step="0.01"
                      min="1"
                      value={tasaBase}
                      onChange={(e) => setTasaBase(parseFloat(e.target.value) || 0)}
                      className="bg-transparent font-medium text-sm focus:outline-none w-20 text-hav-text-main"
                   />
                </div>
             </div>
           )}
           
           <button 
             onClick={
               activeSubTab === 'finanzas' ? fetchPagos : 
               activeSubTab === 'censo' ? fetchPatientsCenso : fetchSpecsPerformance
             } 
             className="p-2 text-gray-400 hover:text-hav-primary transition-colors bg-gray-50 rounded-lg"
           >
              <RefreshCw size={18} />
           </button>
           <button 
             onClick={
               activeSubTab === 'finanzas' ? handleExportFinanzas : 
               activeSubTab === 'censo' ? handleExportCenso : handleExportSpecs
             }
             className="flex items-center gap-2 px-3 py-2 bg-hav-primary text-white text-sm font-semibold rounded-lg hover:bg-hav-primary-dark transition-colors shadow-sm"
           >
              <Download size={16} /> Exportar
           </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : activeSubTab === 'finanzas' ? (
        <>
          {/* VISTA 1: REPORTE FINANCIERO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-hav-primary/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-hav-text-muted">Ingresos Brutos (USD)</p>
                  <h2 className="text-4xl font-display font-bold text-hav-text-main mt-1">${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                </div>
                <div className="w-12 h-12 rounded-xl bg-hav-primary/10 text-hav-primary flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
              </div>
              <p className="text-sm text-green-600 flex items-center gap-1 font-medium mt-4">
                Listado de {pagos.length} transacciones registradas
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#1e4f5c] to-[#12313a] p-6 rounded-2xl shadow-md relative overflow-hidden border border-[#2a6675]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-hav-primary-light">Ingresos Equivalente (Bs)</p>
                  <h2 className="text-4xl font-display font-bold text-white mt-1">Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</h2>
                </div>
              </div>
              <p className="text-sm text-white/70 flex items-center gap-1 font-medium mt-4">
                 Tasa Calculada: {tasaBase} Bs/USD
              </p>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-semibold text-hav-text-main text-sm">Historial de Transacciones (Pago)</h3>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm text-hav-text-main">
                <thead className="text-xs uppercase bg-gray-50/80 text-hav-text-muted font-semibold">
                  <tr>
                    <th className="px-6 py-4">ID Trans.</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Método</th>
                    <th className="px-6 py-4">Cajero</th>
                    <th className="px-6 py-4 text-right">Monto (USD)</th>
                    <th className="px-6 py-4 text-right bg-green-50/30">Equivalente (Bs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {pagos.length === 0 && (
                      <tr>
                         <td colSpan="6" className="py-8 text-center text-gray-400">No hay pagos registrados.</td>
                      </tr>
                   )}
                   {pagos.map((p) => {
                      const equiv = parseFloat(p.monto_usd) * tasaBase;
                      return (
                         <tr key={p.id_pago} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-hav-primary">#{p.id_pago.toString().padStart(4, '0')}</td>
                            <td className="px-6 py-4 text-gray-500">
                               {new Date(p.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
                                  <CreditCard size={12} /> {p.metodo_pago}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                               {p.usuario?.username || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right font-bold">
                               ${parseFloat(p.monto_usd).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right text-green-700 font-semibold bg-green-50/10 scale-105 origin-right">
                               Bs {equiv.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </td>
                         </tr>
                      );
                   })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeSubTab === 'censo' ? (
        <>
          {/* VISTA 2: CENSO DE PACIENTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-hav-primary/10 text-hav-primary flex items-center justify-center shadow-sm">
                <Users size={24} />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-hav-text-main">{patients.length}</p>
                <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Pacientes Totales Registrados</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-sm">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-hav-text-main">
                  {patients.reduce((acc, p) => acc + p.completedCount, 0)}
                </p>
                <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Consultas Realizadas en el Hospital</p>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-hav-text-main text-sm">Censo General de Pacientes</h3>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm text-hav-text-main">
                <thead className="text-xs uppercase bg-gray-50/80 text-hav-text-muted font-semibold">
                  <tr>
                    <th className="px-6 py-4">ID Ficha</th>
                    <th className="px-6 py-4">Cédula</th>
                    <th className="px-6 py-4">Nombre y Apellidos</th>
                    <th className="px-6 py-4">Fecha Registro</th>
                    <th className="px-6 py-4 text-center">Consultas Atendidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {patients.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400">No hay pacientes registrados en el censo.</td>
                    </tr>
                  )}
                  {patients.map((p) => (
                    <tr key={p.id_paciente} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-hav-primary">#{p.id_paciente.toString().padStart(4, '0')}</td>
                      <td className="px-6 py-4 font-mono font-semibold text-gray-700">C.I. {p.cedula}</td>
                      <td className="px-6 py-4 font-semibold text-hav-text-main">
                        {p.nombre} {p.apellidos}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(p.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-full text-xs ${
                          p.completedCount > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {p.completedCount} visita{p.completedCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* VISTA 3: RENDIMIENTO DE ESPECIALISTAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-hav-primary/10 text-hav-primary flex items-center justify-center shadow-sm">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-hav-text-main">{specsData.length}</p>
                <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Especialistas Médicos Activos</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-sm">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-hav-text-main">
                  ${specsData.reduce((acc, s) => acc + s.revenue, 0).toFixed(2)}
                </p>
                <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Ingresos Totales por Consultas</p>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-hav-text-main text-sm">Productividad y Facturación de Especialistas</h3>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm text-hav-text-main">
                <thead className="text-xs uppercase bg-gray-50/80 text-hav-text-muted font-semibold">
                  <tr>
                    <th className="px-6 py-4">Médico</th>
                    <th className="px-6 py-4">Especialidad</th>
                    <th className="px-6 py-4 text-center">Citas Asignadas</th>
                    <th className="px-6 py-4 text-center">Consultas Atendidas</th>
                    <th className="px-6 py-4 text-center">Citas Canceladas</th>
                    <th className="px-6 py-4 text-right">Recaudación (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {specsData.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400">No hay especialistas registrados.</td>
                    </tr>
                  )}
                  {specsData.map((s) => (
                    <tr key={s.id_usuario} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-hav-text-main">
                        Dr. {s.nombre_completo}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-hav-primary/10 text-hav-primary font-bold px-2.5 py-1 rounded-full text-xs">
                          {s.especialidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-600">
                        {s.total}
                      </td>
                      <td className="px-6 py-4 text-center text-emerald-700 font-bold">
                        {s.completed}
                      </td>
                      <td className="px-6 py-4 text-center text-rose-600 font-bold">
                        {s.cancelled}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-hav-text-main">
                        ${s.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
