import { useState, useEffect } from 'react';
import { Search, Plus, AlertTriangle, Heart, User, Phone, Calendar as CalendarIcon, X, Mail, Activity, ClipboardList, CheckCircle, Pencil, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';
import HistorialClinicoPanel from '../../components/HistorialClinicoPanel';

export default function PatientsView({ showToast, userRole }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPatientId, setEditPatientId] = useState(null);
  const [form, setForm] = useState({ name: '', apellidos: '', cedula: '', phone: '', email: '', birthDate: '', address: '', genero: '', seguro_medico: '', estado_paciente: 'activo', contacto_emergencia_nombre: '', contacto_emergencia_telefono: '', contacto_emergencia_correo: '', contacto_emergencia_parentesco: '' });
  const [isSaving, setIsSaving] = useState(false);

  // (historial clínico manejado por HistorialClinicoPanel)

  const fetchPatients = async () => {
    try {

      // Recepcion only sees contact info + appointment list (no clinical data)
      const selectQuery = userRole === 'recepcion'
        ? `id_paciente, nombre, apellidos, cedula, telefono, correo, fecha_nacimiento, direccion, genero, seguro_medico, estado_paciente, tipo_sangre, contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_correo, contacto_emergencia_parentesco,
           cita ( id_cita, fecha_pautada, motivo_consulta, estado,
             especialista ( nombre_completo, especialidad )
           )`
        : `id_paciente, nombre, apellidos, cedula, telefono, correo, fecha_nacimiento, direccion, genero, seguro_medico, estado_paciente, tipo_sangre, contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_correo, contacto_emergencia_parentesco,
           historial_clinico ( id_historial, tipo_sangre, alergias, patologias, cirugias ),
           cita (
             id_cita, fecha_pautada, motivo_consulta, estado,
             especialista ( nombre_completo, especialidad ),
             consulta (
               id_consulta, diagnostico, tratamiento, notas_medicas,
               interconsulta (
                 id_interconsulta, motivo_interconsulta, opinion_medica, estado,
                 especialista_recibe:id_especialista_recibe ( nombre_completo, especialidad )
               )
             )
           )`;

      const { data, error } = await supabase
        .from('pacientes')
        .select(selectQuery)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error(err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los pacientes' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Insert patient
      const { data: pData, error: pErr } = await supabase
        .from('pacientes')
        .insert({
          nombre: form.name,
          apellidos: form.apellidos,
          cedula: form.cedula,
          telefono: form.phone,
          correo: form.email,
          fecha_nacimiento: form.birthDate || null,
          direccion: form.address,
          genero: form.genero || null,
          seguro_medico: form.seguro_medico || null,
          estado_paciente: form.estado_paciente || 'activo',
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // 2. Init clinical history empty
      const { error: hErr } = await supabase
        .from('historial_clinico')
        .insert({
          id_paciente: pData.id_paciente,
          tipo_sangre: 'Desconocido',
          alergias: 'Ninguna',
          patologias: 'Ninguna',
          cirugias: 'Ninguna',
        });

      if (hErr) console.warn('Error inicializando historial:', hErr); // No bloqueante

      if (showToast) showToast({ type: 'success', title: 'Éxito', message: 'Paciente registrado exitosamente' });
      setShowAddModal(false);
      setForm({ name: '', apellidos: '', cedula: '', phone: '', email: '', birthDate: '', address: '', genero: '', seguro_medico: '', estado_paciente: 'activo', contacto_emergencia_nombre: '', contacto_emergencia_telefono: '', contacto_emergencia_correo: '', contacto_emergencia_parentesco: '' });
      fetchPatients(); // reload
    } catch (error) {
      console.error(error);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'Fallo al guardar paciente' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPatients = patients.filter((p) =>
    (p.nombre + ' ' + p.apellidos).toLowerCase().includes(search.toLowerCase()) ||
    p.cedula.includes(search)
  );

  return (
    <div className="p-6 space-y-6 view-enter h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">
            Directorio de Pacientes
          </h1>
          <p className="text-hav-text-muted text-sm mt-0.5">
            {userRole === 'superadmin' ? 'Modo Dios: Visibilidad de expedientes clínicos completos' : 'Gestión centralizada de expedientes'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cédula o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hav-primary focus:ring-2 focus:ring-hav-primary/20 w-64 shadow-sm transition-all"
            />
          </div>
          {(userRole === 'recepcion' || userRole === 'superadmin') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-hav-primary hover:bg-hav-primary-dark text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-hav-primary/20 whitespace-nowrap"
            >
              <Plus size={16} /> Agregar Paciente
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        {/* Lista de pacientes */}
        <div className="w-full lg:w-96 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-semibold text-sm text-hav-text-main">Resultados ({filteredPatients.length})</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No hay pacientes registrados</div>
            ) : filteredPatients.map((p) => {
              const fullName = `${p.nombre} ${p.apellidos}`;
              const isSelected = selected?.id_paciente === p.id_paciente;
              
              return (
                <button
                  key={p.id_paciente}
                  onClick={() => setSelected(p)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isSelected ? 'bg-hav-primary/10 border-hav-primary/30 shadow-sm' : 'hover:bg-gray-50 border-transparent'
                  } border`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    isSelected ? 'bg-hav-primary text-white' : 'bg-gray-100 text-hav-text-main'
                  }`}>
                    {p.nombre[0]}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-hav-primary-dark' : 'text-hav-text-main'}`}>
                      {fullName}
                    </p>
                    <p className="text-xs text-hav-text-muted mt-0.5">V- {p.cedula}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del paciente */}
        {selected ? (
           <div className="hidden lg:block flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-y-auto custom-scrollbar p-6">
               {/* Patient Details Content */}
               <div className="flex items-start gap-5 pb-6 border-b border-gray-50">
                  <div className="w-20 h-20 rounded-2xl bg-hav-primary text-white flex items-center justify-center font-display font-bold text-3xl shadow-lg shadow-hav-primary/30 flex-shrink-0">
                     {selected.nombre[0]}
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-start">
                       <div>
                         <h2 className="text-2xl font-display font-bold text-hav-text-main mb-1">
                            {selected.nombre} {selected.apellidos}
                         </h2>
                         <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 w-max">
                            <CheckCircle size={10} /> Registrado
                         </span>
                       </div>
                       
                       {/* Botón de Edición */}
                       {(userRole === 'recepcion' || userRole === 'superadmin') && (
                         <button 
                           onClick={() => openEditModal(selected)}
                           className="p-2 text-gray-400 hover:text-hav-primary hover:bg-hav-primary/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold border border-transparent hover:border-hav-primary/20"
                         >
                           <Pencil size={16} /> Editar
                         </button>
                       )}
                     </div>
                     
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2 text-hav-text-muted"><User size={15} /> V- {selected.cedula}</div>
                        <div className="flex items-center gap-2 text-hav-text-muted"><CalendarIcon size={15} /> Nació: {selected.fecha_nacimiento || 'N/A'}</div>
                        <div className="flex items-center gap-2 text-hav-text-muted"><Phone size={15} /> {selected.telefono || 'N/A'}</div>
                        <div className="flex items-center gap-2 text-hav-text-muted"><Mail size={15} /> {selected.correo || 'N/A'}</div>
                        {selected.genero && <div className="flex items-center gap-2 text-hav-text-muted"><User size={15} /> {selected.genero}</div>}
                        {selected.seguro_medico && <div className="flex items-center gap-2 text-hav-text-muted"><Activity size={15} /> Seguro: {selected.seguro_medico}</div>}
                        {selected.estado_paciente && (
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selected.estado_paciente === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {selected.estado_paciente?.toUpperCase()}
                            </span>
                          </div>
                        )}
                     </div>

                     {/* Contacto de Emergencia */}
                     {(selected.contacto_emergencia_nombre || selected.contacto_emergencia_telefono) && (
                       <div className="mt-5 p-3 bg-red-50/50 border border-red-100 rounded-xl">
                         <div className="flex items-center gap-2 text-red-600 font-semibold mb-2 text-xs uppercase tracking-wide">
                           <AlertTriangle size={14} /> Contacto de Emergencia
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-hav-text-main">
                           <div>
                             <span className="font-semibold text-gray-500 text-xs block mb-0.5">Nombre y Parentesco</span> 
                             {selected.contacto_emergencia_nombre || 'N/A'} {selected.contacto_emergencia_parentesco ? `(${selected.contacto_emergencia_parentesco})` : ''}
                           </div>
                           <div>
                             <span className="font-semibold text-gray-500 text-xs block mb-0.5">Teléfono</span> 
                             {selected.contacto_emergencia_telefono || 'N/A'}
                           </div>
                           {selected.contacto_emergencia_correo && (
                             <div className="col-span-1 sm:col-span-2">
                               <span className="font-semibold text-gray-500 text-xs block mb-0.5">Correo</span> 
                               {selected.contacto_emergencia_correo}
                             </div>
                           )}
                         </div>
                       </div>
                     )}
                  </div>
               </div>

               {/* Clinical Details — hidden for recepcion */}

               {/* Clinical Details � hidden for recepcion */}
               <div className="mt-8 space-y-8">
                   {userRole !== 'recepcion' && (
                     <HistorialClinicoPanel
                       patient={selected}
                       showToast={showToast}
                       onRefresh={() => { fetchPatients(); }}
                     />
                   )}

                   {/* Recepcion sees only appointment list, no diagnoses */}
                   {userRole === 'recepcion' && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600 font-medium flex items-center gap-2">
                        <span>&#8505;</span> Los datos clinicos son confidenciales y solo visibles para el equipo medico.
                      </div>
                   )}

                  <div>
                     <h3 className="font-semibold text-hav-text-main text-lg flex items-center gap-2 mb-4">
                        <Activity size={18} className="text-hav-primary" /> Línea de Tiempo Clínica
                     </h3>
                     <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                        {(!selected.cita || selected.cita.length === 0) ? (
                           <div className="text-center py-6 text-gray-400 text-sm italic col-span-full border border-dashed border-gray-200 rounded-xl">Sin consultas registradas aún.</div>
                        ) : selected.cita.map((c) => {
                           // For each appointment, show Consultation data and Interconsultation if exists
                           const d = new Date(c.fecha_pautada);
                           const hasConsulta = c.consulta && c.consulta.length > 0;
                           const consult = hasConsulta ? c.consulta[0] : null;
                           const inter = (consult && consult.interconsulta && consult.interconsulta.length > 0) ? consult.interconsulta[0] : null;

                           return (
                              <div key={c.id_cita} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                 <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-hav-primary">
                                    <ClipboardList size={18} />
                                 </div>
                                 <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                       <span className="font-bold text-hav-primary-dark">{c.especialista?.nombre_completo}</span>
                                       <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{d.toLocaleDateString('es-ES')}</span>
                                    </div>
                                    <div className="text-xs font-semibold text-hav-text-muted mb-3">{c.motivo_consulta}</div>
                                    
                                    {hasConsulta ? (
                                       <div className="space-y-3 mt-3 pt-3 border-t border-gray-50">
                                          <div>
                                             <span className="text-[10px] uppercase font-bold text-gray-400 block">Diagnóstico</span>
                                             <p className="text-hav-text-main leading-relaxed text-sm">{consult.diagnostico}</p>
                                          </div>
                                          <div>
                                             <span className="text-[10px] uppercase font-bold text-gray-400 block">Tratamiento</span>
                                             <p className="text-hav-text-main leading-relaxed text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">{consult.tratamiento}</p>
                                          </div>
                                          {consult.notas_medicas && (
                                             <div className="text-xs italic text-gray-500">Nota: {consult.notas_medicas}</div>
                                          )}

                                          {inter && (
                                             <div className="mt-4 bg-orange-50/50 border border-orange-100 p-3 rounded-xl relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                   <span className="text-[10px] font-bold text-orange-600 uppercase">Interconsulta</span>
                                                   <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${inter.estado === 'completada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                      {inter.estado}
                                                   </span>
                                                </div>
                                                <p className="text-xs text-gray-700 mb-1"><strong>Enviado a:</strong> {inter.especialista_recibe?.nombre_completo}</p>
                                                <p className="text-xs text-gray-700 mb-2"><strong>Motivo:</strong> {inter.motivo_interconsulta}</p>
                                                {inter.opinion_medica && (
                                                   <div className="bg-white p-2 rounded-lg border border-gray-100 mt-2">
                                                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Opinión Retornada</span>
                                                      <p className="text-xs text-gray-800 font-medium">{inter.opinion_medica}</p>
                                                   </div>
                                                )}
                                             </div>
                                          )}
                                       </div>
                                    ) : (
                                       <div className="text-xs italic text-gray-400 mt-2">Consulta aún no realizada o sin notas médicas.</div>
                                    )}
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
           </div>
        ) : (
           <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50/50 border border-gray-100 rounded-2xl border-dashed">
              <div className="text-center text-hav-text-muted">
                 <User size={48} className="mx-auto mb-3 opacity-20" />
                 <p className="text-sm font-medium">Selecciona un paciente para inspeccionar todo su expediente</p>
                 {userRole === 'superadmin' && <p className="text-xs mt-2 text-hav-primary">Vista administrativa de Acceso Total habilitada</p>}
              </div>
           </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
                <Plus size={18} className="text-hav-primary" /> Agregar Nuevo Paciente
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSavePatient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">C\u00e9dula * (solo n\u00fameros)</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.cedula}
                    onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                    placeholder="Ej: 25000111"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Fecha Nacimiento</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Nombre *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Apellidos *</label>
                  <input
                    required
                    type="text"
                    value={form.apellidos}
                    onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Género</label>
                  <select
                    value={form.genero}
                    onChange={(e) => setForm({ ...form, genero: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                  >
                    <option value="">— Seleccione —</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Seguro Médico</label>
                  <input
                    type="text"
                    value={form.seguro_medico}
                    onChange={(e) => setForm({ ...form, seguro_medico: e.target.value })}
                    placeholder="Ej: Seguros Caracas, Ninguno"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                  />
                </div>
              </div>

              <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-hav-primary hover:bg-hav-primary-dark rounded-lg transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                >
                  {isSaving ? <Spinner size="sm" /> : 'Guardar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



