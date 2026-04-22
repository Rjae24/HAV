import { useState, useEffect } from 'react';
import { AlertTriangle, FileText, Save, ChevronDown, ChevronUp, Share2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function MedicoDashboard({ user, showToast }) {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  
  const [soap, setSoap] = useState({ subjetivo: '', objetivo: '', analisis: '', plan: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [patientHistory, setPatientHistory] = useState([]);
  const [expandedHistory, setExpandedHistory] = useState(null);

  // Modal Historial Global
  const [globalHistory, setGlobalHistory] = useState([]);
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Modal Interconsulta
  const [specialists, setSpecialists] = useState([]);
  const [showInterModal, setShowInterModal] = useState(false);
  const [interForm, setInterForm] = useState({ id_consulta: null, id_especialista_recibe: '', motivo: '' });
  const [sendingInter, setSendingInter] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Extraer citas del especialista
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select(`
          id_cita, fecha_pautada, motivo_consulta, estado,
          pacientes (
            id_paciente, cedula, nombre, apellidos,
            historial_clinico ( alergias, patologias, cirugias, tipo_sangre )
          )
        `)
        .eq('id_especialista', user.id)
        .order('fecha_pautada', { ascending: true });

      if (errCitas) throw errCitas;
      
      setAppointments(citas || []);
      if (citas && citas.length > 0 && !selectedAppt) {
        setSelectedAppt(citas[0]);
      }

      // Traer otros especialistas para interconsulta
      const { data: specs } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre_completo, especialidad')
        .eq('rol', 'medico')
        .neq('id_usuario', user.id);
      
      setSpecialists(specs || []);

    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Error', message: 'Fallo al cargar las citas' });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (pacienteId) => {
    try {
      const { data, error } = await supabase
        .from('consulta')
        .select(`
          id_consulta, diagnostico, tratamiento, notas_medicas, fecha_realizada,
          cita!inner(id_paciente, especialista (nombre_completo))
        `)
        .eq('cita.id_paciente', pacienteId)
        .order('fecha_realizada', { ascending: false });

      if (error) throw error;
      setPatientHistory(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGlobalHistory = async () => {
    setLoadingGlobal(true);
    try {
      const { data, error } = await supabase
        .from('consulta')
        .select(`
          id_consulta, diagnostico, tratamiento, notas_medicas, fecha_realizada,
          cita!inner(id_paciente, pacientes (cedula, nombre, apellidos))
        `)
        .eq('cita.id_especialista', user.id)
        .order('fecha_realizada', { ascending: false });

      if (error) throw error;
      setGlobalHistory(data || []);
      setShowGlobalModal(true);
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el historial global' });
    } finally {
      setLoadingGlobal(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedAppt?.pacientes?.id_paciente) {
      fetchHistory(selectedAppt.pacientes.id_paciente);
      setSoap({ 
         subjetivo: selectedAppt.motivo_consulta || '', 
         objetivo: '', 
         analisis: '', 
         plan: '' 
      });
    }
  }, [selectedAppt]);

  const handleSaveSOAP = async () => {
    if (!soap.subjetivo && !soap.objetivo) {
      showToast({ type: 'warning', title: 'SOAP incompleto', message: 'Ingrese al menos Subjetivo y Objetivo' });
      return;
    }
    
    setSaving(true);
    try {
      const notas = `S: ${soap.subjetivo}\nO: ${soap.objetivo}`;
      
      const { error: insertErr } = await supabase
        .from('consulta')
        .insert({
          id_cita: selectedAppt.id_cita,
          diagnostico: soap.analisis || 'Pendiente diagnóstico',
          tratamiento: soap.plan || 'Sin tratamiento farmacológico',
          notas_medicas: notas
        });

      if (insertErr) throw insertErr;

      // Marcar cita como completada
      await supabase.from('cita').update({ estado: 'completada' }).eq('id_cita', selectedAppt.id_cita);

      showToast({ type: 'success', title: '✅ Historia guardada', message: `Consulta registrada correctamente.` });
      
      setSoap({ subjetivo: '', objetivo: '', analisis: '', plan: '' });
      fetchDashboardData(); 
      fetchHistory(selectedAppt.pacientes.id_paciente); 
      
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Error', message: 'No se pudo guardar la historia' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInterconsulta = async (e) => {
    e.preventDefault();
    if (!interForm.id_especialista_recibe || !interForm.motivo) return;

    setSendingInter(true);
    try {
      const { error } = await supabase
        .from('interconsulta')
        .insert({
           id_consulta: interForm.id_consulta,
           id_especialista_envia: user.id,
           id_especialista_recibe: interForm.id_especialista_recibe,
           motivo_interconsulta: interForm.motivo,
           estado: 'pendiente'
        });
      
      if (error) throw error;

      showToast({ type: 'success', title: 'Interconsulta Solicitada', message: 'El especialista ha sido notificado.' });
      setShowInterModal(false);
      setInterForm({ id_consulta: null, id_especialista_recibe: '', motivo: '' });
    } catch(err) {
      console.error(err);
      showToast({ type: 'error', title: 'Error', message: 'Fallo al solicitar interconsulta' });
    } finally {
      setSendingInter(false);
    }
  };

  // Safe checks for nested selected properties
  const patientRecord = selectedAppt?.pacientes;
  const historyRecord = patientRecord?.historial_clinico?.[0] || patientRecord?.historial_clinico;
  const alergiasTexto = historyRecord?.alergias || '';
  const fullName = patientRecord ? `${patientRecord.nombre} ${patientRecord.apellidos}` : 'Seleccione un paciente';

  return (
    <div className="p-6 space-y-5 view-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">
            Citas de Hoy
          </h1>
          <p className="text-hav-text-muted text-sm mt-0.5">
            {user.name} · Especialista
          </p>
        </div>
        <button
          onClick={fetchGlobalHistory}
          className="flex items-center gap-2 bg-white border border-gray-200 text-hav-text-main hover:bg-gray-50 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
        >
          {loadingGlobal ? <Spinner size="sm" /> : <FileText size={16} className="text-hav-primary" />}
          Mis Consultas Anteriores
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Left: Patient queue */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
            <h3 className="font-semibold text-hav-text-main mb-3 text-sm">Cola de Pacientes</h3>
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : appointments.length === 0 ? (
                <p className="text-xs text-gray-400">No hay citas programadas.</p>
              ) : appointments.map((a) => {
                const isSelected = selectedAppt?.id_cita === a.id_cita;
                const pName = `${a.pacientes?.nombre} ${a.pacientes?.apellidos}`;
                const initial = a.pacientes?.nombre?.[0] || 'X';
                const timeStr = new Date(a.fecha_pautada).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
                
                return (
                  <button
                    key={a.id_cita}
                    onClick={() => setSelectedAppt(a)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected ? 'bg-hav-primary text-white' : 'bg-gray-50 hover:bg-hav-primary/10 text-hav-text-main'
                    } ${a.estado === 'completada' ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-hav-primary text-white'}`}>
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-hav-text-main'}`}>
                        {pName} {a.estado === 'completada' && ' (Ok)'}
                      </p>
                      <p className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-hav-text-muted'}`}>{timeStr} · {a.motivo_consulta}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedAppt && patientRecord && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-hav-primary text-white font-bold text-sm flex items-center justify-center">
                  {patientRecord.nombre?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-hav-text-main">{fullName}</p>
                  <p className="text-xs text-hav-text-muted">{patientRecord.cedula} · Grupo: {historyRecord?.tipo_sangre || 'N/A'}</p>
                </div>
              </div>

              {alergiasTexto && alergiasTexto.toLowerCase() !== 'ninguna' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                  <AlertTriangle size={14} className="text-hav-danger flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-hav-danger font-medium">
                    <span className="font-bold">Alergias: </span>{alergiasTexto}
                  </p>
                </div>
              )}
              
              <div className="text-xs text-gray-500 space-y-1 mt-2">
                 <p><strong>Patologías:</strong> {historyRecord?.patologias || 'Ninguna registrada'}</p>
                 <p><strong>Cirugías:</strong> {historyRecord?.cirugias || 'Ninguna registrada'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: SOAP form + history */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-hav-primary" />
              <h3 className="font-semibold text-hav-text-main">Nueva Nota Médica (SOAP)</h3>
            </div>
            
            {selectedAppt?.estado === 'completada' ? (
              <div className="p-4 bg-green-50 text-green-700 rounded-xl font-medium text-sm text-center border border-green-100">
                Consulta completada satisfactoriamente. <br /> Ahora puedes visualizar o interconsultar en el Registro Histórico.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {[
                    { key: 'subjetivo', label: 'S · Subjetivo', placeholder: 'Síntomas referidos, interrogatorio...' },
                    { key: 'objetivo', label: 'O · Objetivo', placeholder: 'Examen físico, signos vitales...' },
                    { key: 'analisis', label: 'A · Análisis / Diagnóstico', placeholder: 'Impresión diagnóstica...' },
                    { key: 'plan', label: 'P · Plan / Tratamiento', placeholder: 'Indicaciones médicas, recetas...' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-hav-primary uppercase tracking-wide block mb-1">{label}</label>
                      <textarea
                        value={soap[key]}
                        onChange={(e) => setSoap({ ...soap, [key]: e.target.value })}
                        placeholder={placeholder}
                        rows={3}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-hav-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hav-primary/30 focus:border-hav-primary resize-none transition-all"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveSOAP}
                  disabled={saving || !selectedAppt}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-hav-primary hover:bg-hav-primary-dark disabled:opacity-70 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-hav-primary/20"
                >
                  {saving ? <><Spinner size="sm" /> Guardando...</> : <><Save size={16} /> Completar Consulta</>}
                </button>
              </>
            )}
          </div>

          {/* Clinical History */}
          {patientHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
              <h3 className="font-semibold text-hav-text-main mb-3 text-sm">Registro Histórico del Paciente</h3>
              <div className="space-y-2">
                {patientHistory.map((h) => {
                   const fecha = new Date(h.fecha_realizada).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                   return (
                  <div key={h.id_consulta} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedHistory(expandedHistory === h.id_consulta ? null : h.id_consulta)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-hav-text-main">{h.diagnostico}</p>
                        <p className="text-xs text-hav-text-muted">{fecha} · {h.cita?.especialista?.nombre_completo || 'Médico internista'}</p>
                      </div>
                      {expandedHistory === h.id_consulta ? <ChevronUp size={15} className="text-hav-text-muted" /> : <ChevronDown size={15} className="text-hav-text-muted" />}
                    </button>
                    
                    {expandedHistory === h.id_consulta && (
                      <div className="px-4 pb-4 border-t border-gray-50 bg-gray-50/50 pt-3 flex flex-col gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-hav-primary uppercase">Notas (S/O)</p>
                          <p className="text-xs text-hav-text-main whitespace-pre-wrap">{h.notas_medicas}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-hav-primary uppercase">Tratamiento (P)</p>
                          <p className="text-xs text-hav-text-main whitespace-pre-wrap">{h.tratamiento}</p>
                        </div>

                        {/* Solicitar Interconsulta */}
                        <div className="pt-3 border-t border-white flex justify-end">
                          <button
                            onClick={() => {
                               setInterForm({ ...interForm, id_consulta: h.id_consulta });
                               setShowInterModal(true);
                            }}
                            className="bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                          >
                             <Share2 size={12} /> Solicitar Interconsulta
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Interconsulta */}
      {showInterModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
                 <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                   <Share2 size={16} /> Solicitar Interconsulta Médica
                 </h3>
                 <button onClick={() => setShowInterModal(false)} className="text-gray-400 hover:text-gray-700">
                    <X size={18} />
                 </button>
              </div>

              <form onSubmit={handleSaveInterconsulta} className="p-5 space-y-4">
                 <div>
                    <label className="text-xs font-bold text-hav-text-main block mb-1">Dirigido a: (Especialista)</label>
                    <select
                      required
                      value={interForm.id_especialista_recibe}
                      onChange={(e) => setInterForm({ ...interForm, id_especialista_recibe: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hav-primary bg-white"
                    >
                       <option value="">Seleccione un médico</option>
                       {specialists.map(s => (
                          <option key={s.id_usuario} value={s.id_usuario}>Dr. {s.nombre_completo} ({s.especialidad})</option>
                       ))}
                    </select>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-hav-text-main block mb-1">Motivo / Pregunta Clínica</label>
                    <textarea
                      required
                      placeholder="Explica qué patología u opinión requieres del especialista..."
                      rows={3}
                      value={interForm.motivo}
                      onChange={(e) => setInterForm({ ...interForm, motivo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hav-primary resize-none"
                    />
                 </div>

                 <div className="pt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowInterModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all">Cancelar</button>
                    <button type="submit" disabled={sendingInter} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2 transition-all">
                       {sendingInter ? <Spinner size="sm" /> : 'Enviar Solicitud'}
                    </button>
                 </div>
              </form>
           </div>
         </div>
      )}
      {/* Global History Modal */}
      {showGlobalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
                <FileText size={18} className="text-hav-primary"/> Historial Global de Consultas
              </h3>
              <button onClick={() => setShowGlobalModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
              {globalHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No tienes consultas registradas en tu historial.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {globalHistory.map((h) => {
                    const fecha = new Date(h.fecha_realizada).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    const p = h.cita.pacientes;
                    return (
                      <div key={h.id_consulta} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:border-hav-primary/30 transition-colors">
                        <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                          <div>
                            <p className="font-bold text-hav-text-main text-sm">
                              {p?.nombre} {p?.apellidos} <span className="text-gray-400 font-normal">({p?.cedula})</span>
                            </p>
                            <p className="text-xs text-hav-text-muted mt-0.5 capitalize">{fecha}</p>
                          </div>
                          <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded font-bold tracking-wider">CONSULTA #{h.id_consulta.substring(0, 8)}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-semibold text-hav-text-main mb-1">Notas Médicas (SOAP):</p>
                            <div className="bg-gray-50 p-2 rounded text-gray-600 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                              {h.notas_medicas}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="font-semibold text-hav-text-main mb-1">Diagnóstico:</p>
                              <div className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-100 leading-relaxed">
                                {h.diagnostico}
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold text-hav-text-main mb-1">Tratamiento / Plan:</p>
                              <div className="bg-blue-50 text-blue-800 p-2 rounded border border-blue-100 leading-relaxed">
                                {h.tratamiento}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
