import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, Calendar, Search, Download, RefreshCw, X, 
  ChevronLeft, ChevronRight, FileSpreadsheet, Activity, Clock 
} from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function CensoPacientesReport({ showToast }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25); // 25 o 50

  // Modal Detalle
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [apptHistory, setApptHistory] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

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

  useEffect(() => {
    fetchPatientsCenso();
  }, []);

  // Cargar historial de citas del paciente seleccionado
  const fetchPatientHistory = async (patient) => {
    try {
      setLoadingAppts(true);
      // 1. Obtener citas
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select(`
          id_cita, fecha_pautada, estado, motivo_consulta,
          especialista ( nombre_completo, especialidad )
        `)
        .eq('id_paciente', patient.id_paciente)
        .order('fecha_pautada', { ascending: false });

      if (errCitas) throw errCitas;

      // 2. Obtener diagnósticos
      const { data: consultas, error: errCons } = await supabase
        .from('consulta')
        .select('id_cita, diagnostico');

      if (errCons) throw errCons;

      const mappedHistory = (citas || []).map(c => {
        const diag = (consultas || []).find(cons => cons.id_cita === c.id_cita)?.diagnostico || 'Sin diagnóstico registrado';
        return {
          ...c,
          diagnostico: diag
        };
      });

      setApptHistory(mappedHistory);
    } catch (err) {
      console.error("Error al cargar historial del paciente:", err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el historial del paciente.' });
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientHistory(selectedPatient);
    } else {
      setApptHistory([]);
    }
  }, [selectedPatient]);

  // Filtrado reactivo de pacientes
  const filteredPatients = patients.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      `${p.nombre} ${p.apellidos}`.toLowerCase().includes(query) ||
      p.cedula.toLowerCase().includes(query)
    );
  });

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, recordsPerPage]);

  // Cálculos de paginación
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredPatients.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredPatients.length / recordsPerPage);

  // Exportar el censo general a Excel
  const handleExportCenso = () => {
    if (filteredPatients.length === 0) return;
    const headers = ['ID Paciente', 'Nombre', 'Apellidos', 'Cédula', 'Fecha Registro', 'Consultas Completadas'];
    const rows = filteredPatients.map(p => [
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

  // Exportar el historial de citas de un solo paciente a Excel
  const handleExportPatientHistory = () => {
    if (!selectedPatient || apptHistory.length === 0) return;
    
    const headers = ['Fecha y Hora', 'Médico Especialista', 'Especialidad', 'Motivo de Consulta', 'Diagnóstico Primario', 'Estado Cita'];
    
    const rows = apptHistory.map(appt => {
      const dateStr = new Date(appt.fecha_pautada).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      return [
        dateStr,
        `Dr. ${appt.especialista?.nombre_completo || 'N/A'}`,
        appt.especialista?.especialidad || 'N/A',
        appt.motivo_consulta ? appt.motivo_consulta.replace(/[\n\r;]/g, ' ') : 'Sin especificar',
        appt.diagnostico ? appt.diagnostico.replace(/[\n\r;]/g, ' ') : 'Sin diagnóstico',
        appt.estado
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
    const safeName = `${selectedPatient.nombre}_${selectedPatient.apellidos}`.replace(/\s+/g, '_');
    link.setAttribute('download', `Historial_Citas_${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Historial del paciente exportado con éxito.' });
  };

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      {/* Controles de Censo y búsqueda */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-hav-primary bg-white transition-all w-52"
            />
          </div>

          <select
            value={recordsPerPage}
            onChange={(e) => setRecordsPerPage(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-hav-primary bg-white font-semibold text-hav-text-muted"
          >
            <option value={25}>Mostrar 25 pacientes</option>
            <option value={50}>Mostrar 50 pacientes</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPatientsCenso}
            className="p-2 text-gray-400 hover:text-hav-primary transition-colors bg-gray-50 rounded-xl border border-gray-100"
            title="Refrescar censo"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportCenso}
            disabled={filteredPatients.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-hav-primary text-white text-xs font-semibold rounded-xl hover:bg-hav-primary-dark transition-colors shadow-sm disabled:opacity-50"
          >
            <Download size={14} /> Exportar Censo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : (
        <>
          {/* Tarjetas de métricas del censo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-hav-primary/10 text-hav-primary flex items-center justify-center shadow-sm">
                <Users size={24} />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-hav-text-main">{filteredPatients.length}</p>
                <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Pacientes Encontrados</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-sm">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-hav-text-main">
                  {filteredPatients.reduce((acc, p) => acc + p.completedCount, 0)}
                </p>
                <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Consultas Totales Realizadas</p>
              </div>
            </div>
          </div>

          {/* Tabla de Censo */}
          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
              <h3 className="font-semibold text-hav-text-main text-sm">Censo General de Pacientes</h3>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10">
                    <th className="px-6 py-3.5">ID Ficha</th>
                    <th className="px-6 py-3.5">Cédula</th>
                    <th className="px-6 py-3.5">Nombre y Apellidos</th>
                    <th className="px-6 py-3.5">Fecha Registro</th>
                    <th className="px-6 py-3.5 text-center">Consultas Atendidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400 font-medium">No se encontraron pacientes.</td>
                    </tr>
                  ) : (
                    currentRecords.map((p) => (
                      <tr 
                        key={p.id_paciente} 
                        onClick={() => setSelectedPatient(p)}
                        className="hover:bg-hav-primary/5 cursor-pointer transition-colors"
                        title="Haz clic para ver el historial clínico de citas"
                      >
                        <td className="px-6 py-3.5 font-medium text-hav-primary">#{p.id_paciente.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-3.5 font-mono font-semibold text-gray-700">C.I. {p.cedula}</td>
                        <td className="px-6 py-3.5 font-semibold text-hav-text-main">
                          {p.nombre} {p.apellidos}
                        </td>
                        <td className="px-6 py-3.5 text-gray-500">
                          {new Date(p.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-full text-xs ${
                            p.completedCount > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {p.completedCount} visita{p.completedCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación controles */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                <span className="text-xs text-hav-text-muted">
                  Mostrando <span className="font-semibold text-hav-text-main">{indexOfFirstRecord + 1}</span> a <span className="font-semibold text-hav-text-main">{Math.min(indexOfLastRecord, filteredPatients.length)}</span> de <span className="font-semibold text-hav-text-main">{filteredPatients.length}</span> pacientes
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 text-hav-text-muted"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page 
                          ? 'bg-hav-primary text-white shadow-sm shadow-hav-primary/20' 
                          : 'border border-gray-200 bg-white hover:bg-gray-50 text-hav-text-muted'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 text-hav-text-muted"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Historial de Paciente */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cabecera modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
                <Activity size={18} className="text-hav-primary" /> Historial de Consultas de {selectedPatient.nombre} {selectedPatient.apellidos}
              </h3>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo modal */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30 flex flex-col min-h-0 space-y-4">
              <div className="flex justify-between items-center flex-shrink-0">
                <div>
                  <p className="text-xs text-hav-text-muted">Cédula de Identidad: <span className="font-bold text-hav-text-main">{selectedPatient.cedula}</span></p>
                </div>
                {apptHistory.length > 0 && (
                  <button
                    onClick={handleExportPatientHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e4f5c] hover:bg-[#12313a] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <FileSpreadsheet size={14} /> Exportar Historial Paciente
                  </button>
                )}
              </div>

              {loadingAppts ? (
                <div className="flex-1 flex justify-center items-center py-20"><Spinner /></div>
              ) : apptHistory.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <Calendar size={44} className="opacity-20 mb-3 text-hav-primary" />
                  <p className="text-sm font-semibold">El paciente no registra citas médicas en el portal.</p>
                </div>
              ) : (
                <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10">
                          <th className="px-6 py-3">Fecha y Hora</th>
                          <th className="px-6 py-3">Especialista</th>
                          <th className="px-6 py-3">Motivo de Consulta</th>
                          <th className="px-6 py-3">Diagnóstico Primario</th>
                          <th className="px-6 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {apptHistory.map((appt) => {
                          const apptDateObj = new Date(appt.fecha_pautada);
                          const dateStr = apptDateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                          const timeStr = apptDateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

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
                                <div>
                                  <p className="font-semibold text-hav-text-main">{timeStr}</p>
                                  <p className="text-[10px] text-hav-text-muted mt-0.5">{dateStr}</p>
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <div>
                                  <p className="font-bold text-hav-text-main">Dr. {appt.especialista?.nombre_completo}</p>
                                  <p className="text-[10px] text-hav-primary font-medium mt-0.5">{appt.especialista?.especialidad}</p>
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <p className="text-xs text-hav-text-muted max-w-[200px] truncate" title={appt.motivo_consulta}>
                                  {appt.motivo_consulta || 'Sin motivo'}
                                </p>
                              </td>
                              <td className="px-6 py-3.5">
                                <p className="text-xs text-gray-700 font-medium max-w-[200px] truncate" title={appt.diagnostico}>
                                  {appt.diagnostico}
                                </p>
                              </td>
                              <td className="px-6 py-3.5 text-center">
                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[appt.estado] || 'bg-gray-50'}`}>
                                  {appt.estado}
                                </span>
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
