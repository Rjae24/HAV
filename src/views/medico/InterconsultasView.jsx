import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ExternalLink, ArrowRightLeft, User, Activity, AlertTriangle, Send, Filter, Info, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function InterconsultasView({ user, showToast }) {
  const [entrantes, setEntrantes] = useState([]);
  const [enviadas, setEnviadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('entrantes');

  const [responseForm, setResponseForm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchInterconsultas = async () => {
    try {
      setLoading(true);
      // Entrantes: donde id_especialista_recibe = user.id
      const { data: dataEntrantes, error: errIn } = await supabase
        .from('interconsulta')
        .select(`
          id_interconsulta, motivo_interconsulta, opinion_medica, estado, fecha_respuesta,
          id_especialista_envia,
          especialista_envia:id_especialista_envia ( nombre_completo, especialidad ),
          consulta (
            id_consulta, diagnostico, tratamiento, notas_medicas,
            cita ( fecha_pautada, paciente:pacientes ( nombre, apellidos, cedula, historial_clinico ( patologias, alergias ) ) )
          )
        `)
        .eq('id_especialista_recibe', user.id)
        .order('id_interconsulta', { ascending: false });

      if (errIn) throw errIn;

      // Enviadas: donde id_especialista_envia = user.id
      const { data: dataEnviadas, error: errOut } = await supabase
        .from('interconsulta')
        .select(`
          id_interconsulta, motivo_interconsulta, opinion_medica, estado, fecha_respuesta,
          id_especialista_recibe,
          especialista_recibe:id_especialista_recibe ( nombre_completo, especialidad ),
          consulta (
            id_consulta, diagnostico,
            cita ( fecha_pautada, paciente:pacientes ( nombre, apellidos, cedula ) )
          )
        `)
        .eq('id_especialista_envia', user.id)
        .order('id_interconsulta', { ascending: false });

      if (errOut) throw errOut;

      setEntrantes(dataEntrantes || []);
      setEnviadas(dataEnviadas || []);
    } catch (err) {
      console.error(err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'Fallo al cargar interconsultas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterconsultas();
  }, []);

  const handleSendResponse = async () => {
    if (!responseForm.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('interconsulta')
        .update({
          opinion_medica: responseForm,
          estado: 'completada',
          fecha_respuesta: new Date().toISOString()
        })
        .eq('id_interconsulta', selected.id_interconsulta);

      if (error) throw error;
      
      if (showToast) showToast({ type: 'success', title: 'Respuesta Enviada', message: 'La interconsulta fue cerrada exitosamente.' });
      
      setResponseForm('');
      setSelected(null);
      fetchInterconsultas();
    } catch (err) {
      console.error(err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudo enviar la respuesta' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 view-enter h-[calc(100vh-80px)] flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-display font-bold text-hav-text-main flex items-center gap-2">
          <ArrowRightLeft className="text-hav-primary" /> Red de Interconsultas Médicas
        </h1>
        <p className="text-hav-text-muted text-sm mt-0.5">Colaboración clínica entre especialistas</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
           
           {/* Sidebar List */}
           <div className="w-full lg:w-1/3 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-full flex-shrink-0">
             
             {/* Tabs */}
             <div className="flex p-2 gap-2 bg-gray-50/50 border-b border-gray-50">
                <button 
                  onClick={() => { setActiveTab('entrantes'); setSelected(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'entrantes' ? 'bg-hav-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                   Entrantes ({entrantes.filter(e => e.estado !== 'completada').length})
                </button>
                <button 
                  onClick={() => { setActiveTab('enviadas'); setSelected(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'enviadas' ? 'bg-hav-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                   Enviadas
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
               {activeTab === 'entrantes' && (
                 entrantes.length === 0 ? <p className="text-center text-xs text-gray-400 mt-10">Bandeja limpia temporalmente.</p> :
                 entrantes.map((i) => {
                   const isSel = selected?.id_interconsulta === i.id_interconsulta;
                   const pat = i.consulta?.cita?.paciente;
                   return (
                     <button
                       key={i.id_interconsulta}
                       onClick={() => setSelected(i)}
                       className={`w-full text-left p-3 border rounded-xl transition-all ${isSel ? 'border-hav-primary/40 bg-hav-primary/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                     >
                       <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${i.estado === 'completada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {i.estado}
                          </span>
                       </div>
                       <p className={`font-semibold text-sm ${isSel ? 'text-hav-primary-dark' : 'text-hav-text-main'}`}>
                         Paciente: {pat?.nombre} {pat?.apellidos}
                       </p>
                       <p className="text-xs text-gray-500 mt-1 truncate">De: Dr. {i.especialista_envia?.nombre_completo}</p>
                     </button>
                   );
                 })
               )}

               {activeTab === 'enviadas' && (
                 enviadas.length === 0 ? <p className="text-center text-xs text-gray-400 mt-10">No has enviado interconsultas.</p> :
                 enviadas.map((i) => {
                   const isSel = selected?.id_interconsulta === i.id_interconsulta;
                   const pat = i.consulta?.cita?.paciente;
                   return (
                     <button
                       key={i.id_interconsulta}
                       onClick={() => setSelected(i)}
                       className={`w-full text-left p-3 border rounded-xl transition-all ${isSel ? 'border-hav-primary/40 bg-hav-primary/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                     >
                       <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${i.estado === 'completada' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {i.estado}
                          </span>
                       </div>
                       <p className={`font-semibold text-sm ${isSel ? 'text-hav-primary-dark' : 'text-hav-text-main'}`}>
                         Para: Dr. {i.especialista_recibe?.nombre_completo}
                       </p>
                       <p className="text-xs text-gray-500 mt-1 truncate">{pat?.nombre} {pat?.apellidos}</p>
                     </button>
                   );
                 })
               )}
             </div>

           </div>

           {/* Detail View */}
           <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-y-auto custom-scrollbar p-6">
             {!selected ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                 <ArrowRightLeft size={64} className="mb-4 text-gray-300" />
                 <p className="font-semibold">Seleccione un ticket de interconsulta</p>
                 <p className="text-sm">Para evaluar la patología y redactar la opinión médica</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {/* Header Info */}
                 <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-12 h-12 bg-hav-primary text-white rounded-xl flex items-center justify-center">
                       <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-hav-text-main">
                        {selected.consulta?.cita?.paciente?.nombre} {selected.consulta?.cita?.paciente?.apellidos}
                      </h2>
                      <p className="text-sm text-gray-500">V- {selected.consulta?.cita?.paciente?.cedula}</p>
                    </div>
                 </div>

                 {/* Base History Excerpt (Only if 'entrantes') */}
                 {activeTab === 'entrantes' && selected.consulta?.cita?.paciente?.historial_clinico && (
                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                       <h3 className="text-xs font-bold text-red-800 uppercase flex items-center gap-2 mb-2"><AlertTriangle size={14}/> Contexto Clínico (Historial)</h3>
                       <p className="text-sm text-red-900 mb-1"><strong>Alergias:</strong> {selected.consulta.cita.paciente.historial_clinico[0]?.alergias}</p>
                       <p className="text-sm text-red-900"><strong>Patologías Previas:</strong> {selected.consulta.cita.paciente.historial_clinico[0]?.patologias}</p>
                    </div>
                 )}

                 {/* Consultation Trigger */}
                 <div className="space-y-3">
                   <h3 className="font-semibold text-hav-text-main text-sm uppercase tracking-wide opacity-80">Consulta Originaria</h3>
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <p className="text-xs text-gray-500 mb-2">Evaluado por: <strong className="text-gray-700">Dr. {activeTab === 'entrantes' ? selected.especialista_envia?.nombre_completo : user.name}</strong></p>
                     <p className="text-sm text-hav-text-main mb-1"><strong>Diagnóstico Original:</strong> {selected.consulta?.diagnostico}</p>
                     {selected.consulta?.notas_medicas && (
                       <p className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border border-gray-100 italic">"{selected.consulta.notas_medicas}"</p>
                     )}
                   </div>
                 </div>

                 {/* Interconsulta Request */}
                 <div className="space-y-3 relative">
                    <h3 className="font-semibold text-orange-700 text-sm uppercase tracking-wide">Motivo de la Interconsulta</h3>
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl relative">
                       <p className="text-sm text-orange-900">{selected.motivo_interconsulta}</p>
                    </div>
                 </div>

                 {/* Outcome / Form */}
                 <div className="pt-4 border-t border-gray-100">
                   {selected.estado === 'completada' ? (
                     <div className="bg-green-50 border border-green-100 p-5 rounded-xl">
                       <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2"><ShieldCheck size={18}/> Opinión Médica Emitida</h3>
                       <p className="text-sm text-green-900 whitespace-pre-wrap">{selected.opinion_medica}</p>
                       <p className="text-xs text-green-700 mt-3 pt-3 border-t border-green-200/50">Fecha de evaluación: {new Date(selected.fecha_respuesta).toLocaleDateString('es-ES')}</p>
                     </div>
                   ) : (
                     activeTab === 'entrantes' ? (
                        <div className="space-y-3">
                          <label className="font-semibold text-hav-text-main text-sm block">Redactar Opinión Científica / Recomendación</label>
                          <textarea
                             rows={4}
                             value={responseForm}
                             onChange={(e) => setResponseForm(e.target.value)}
                             placeholder="Escribe tu evaluación o sugerencia terapéutica en base a la información provista..."
                             className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-hav-primary focus:border-hav-primary"
                          />
                          <button
                             onClick={handleSendResponse}
                             disabled={isSaving || !responseForm.trim()}
                             className="flex items-center justify-center gap-2 w-full py-3 bg-hav-primary text-white font-semibold rounded-xl hover:bg-hav-primary-dark transition-colors shadow-sm disabled:opacity-50"
                          >
                             {isSaving ? <Spinner size="sm"/> : <><Send size={16}/> Sellar y Devolver Interconsulta</>}
                          </button>
                        </div>
                     ) : (
                        <div className="text-center p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-500 text-sm">
                           A la espera de respuesta médica del Dr. {selected.especialista_recibe?.nombre_completo}.
                        </div>
                     )
                   )}
                 </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
}
