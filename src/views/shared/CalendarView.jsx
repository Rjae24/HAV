import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ESTADO_COLOR = {
  completada: 'bg-green-500',
  confirmada:  'bg-blue-500',
  pendiente:   'bg-amber-400',
  cancelada:   'bg-red-400',
};
const ESTADO_BADGE = {
  completada: 'bg-green-100 text-green-700',
  confirmada:  'bg-blue-100 text-blue-700',
  pendiente:   'bg-amber-100 text-amber-700',
  cancelada:   'bg-red-100 text-red-600',
};

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const days     = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells    = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, isCurrent: false });
  for (let i = 1; i <= days; i++)          cells.push({ day: i, isCurrent: true });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++)     cells.push({ day: i, isCurrent: false });
  return cells;
}

// Checks if a given dateStr (YYYY-MM-DD) and time ('HH:MM') fall within any active block
function isWithinBlock(blocks, dateStr, timeHHMM) {
  if (!blocks || blocks.length === 0) return false;
  const [th, tm] = timeHHMM.split(':').map(Number);
  const tMins = th * 60 + tm;
  return blocks.some(b => {
    if (!b.activo) return false;
    // block must match the exact date OR has no fecha (legacy dia_semana only)
    const matchDate = b.fecha ? b.fecha === dateStr : true;
    if (!matchDate) return false;
    const [sh, sm] = b.hora_inicio.split(':').map(Number);
    const [eh, em] = b.hora_fin.split(':').map(Number);
    return tMins >= sh * 60 + sm && tMins < eh * 60 + em;
  });
}

// Format 24h string to 12h AM/PM
function fmt12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${p}`;
}

export default function CalendarView({ userRole, showToast }) {
  const today = new Date();
  const [curYear, setCurYear]     = useState(today.getFullYear());
  const [curMonth, setCurMonth]   = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);

  const [showModal, setShowModal]       = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [specialistsList, setSpecialistsList] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');

  // Specialist availability blocks for the selected specialist
  const [availableBlocks, setAvailableBlocks]   = useState([]);
  const [loadingBlocks, setLoadingBlocks]         = useState(false);
  const [availabilityWarning, setAvailabilityWarning] = useState('');

  const [form, setForm]     = useState({ patientId: '', time: '', motivo: 'Consulta Nueva', specialistId: '', monto: '', metodo_pago: 'Efectivo', editingId: null });
  const [isSaving, setIsSaving] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ cedula: '', nombre: '', apellidos: '', telefono: '', fecha_nacimiento: '' });
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  const pad = (n) => String(n).padStart(2, '0');
  const selectedDateStr = `${curYear}-${pad(curMonth + 1)}-${pad(selectedDay)}`;
  const cells = buildCalendar(curYear, curMonth);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cita')
        .select(`
          id_cita, fecha_pautada, motivo_consulta, estado,
          pacientes ( id_paciente, nombre, apellidos, cedula ),
          especialista ( id_usuario, nombre_completo, especialidad )
        `)
        .order('fecha_pautada', { ascending: true });
      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudieron cargar las citas' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDropdowns = useCallback(async () => {
    const [pac, esp] = await Promise.all([
      supabase.from('pacientes').select('id_paciente, nombre, apellidos, cedula').order('nombre'),
      supabase.from('especialista')
        .select('id_usuario, nombre_completo, especialidad')
        .order('nombre_completo'),
    ]);
    setPatientsList(pac.data || []);
    setSpecialistsList(esp.data || []);
  }, []);

  // Fetch blocks for a specialist on the selected date (and legacy dia_semana)
  const fetchBlocks = useCallback(async (specialistId, dateStr) => {
    if (!specialistId) { setAvailableBlocks([]); return; }
    setLoadingBlocks(true);
    const { data } = await supabase
      .from('horario_especialista')
      .select('*')
      .eq('id_usuario', specialistId)
      .eq('activo', true);
    // filter to blocks that match this date OR have no date (legacy)
    const filtered = (data || []).filter(b => !b.fecha || b.fecha === dateStr);
    setAvailableBlocks(filtered);
    setLoadingBlocks(false);
  }, []);

  useEffect(() => { fetchCalendarData(); fetchDropdowns(); }, []);

  // When specialist or date changes, reload blocks
  useEffect(() => {
    if (form.specialistId) fetchBlocks(form.specialistId, selectedDateStr);
    else setAvailableBlocks([]);
    setAvailabilityWarning('');
    setForm(f => ({ ...f, time: '' }));
  }, [form.specialistId, selectedDateStr]);

  // Validate time when it changes
  useEffect(() => {
    if (!form.time || !form.specialistId) { setAvailabilityWarning(''); return; }
    if (!isWithinBlock(availableBlocks, selectedDateStr, form.time)) {
      setAvailabilityWarning('⚠ El especialista no tiene disponibilidad en ese horario.');
    } else {
      setAvailabilityWarning('');
    }
  }, [form.time, availableBlocks, selectedDateStr, form.specialistId]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handlePrev = () => {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); }
    else setCurMonth(m => m - 1);
  };
  const handleNext = () => {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); }
    else setCurMonth(m => m + 1);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const selectedDateAppts = appointments.filter(a => {
    const d = new Date(a.fecha_pautada);
    return d.getFullYear() === curYear && d.getMonth() === curMonth && d.getDate() === selectedDay;
  });

  const filteredPatients = patientsList.filter(p =>
    `${p.nombre} ${p.apellidos} ${p.cedula}`.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // ── Create Inline Patient ──────────────────────────────────────────────────
  const handleCreatePatient = async () => {
    if (!newPatient.cedula || !newPatient.nombre || !newPatient.apellidos) {
      showToast?.({ type: 'error', title: 'Error', message: 'Cédula, nombre y apellidos son obligatorios' });
      return;
    }
    setIsSavingPatient(true);
    try {
      const { data: patient, error } = await supabase
        .from('pacientes')
        .insert([{
          cedula: newPatient.cedula,
          nombre: newPatient.nombre,
          apellidos: newPatient.apellidos,
          telefono: newPatient.telefono,
          fecha_nacimiento: newPatient.fecha_nacimiento || null
        }])
        .select('id_paciente, nombre, apellidos, cedula').single();
      if (error) throw error;
      
      // Initialize empty historial_clinico
      await supabase.from('historial_clinico').insert([{ id_paciente: patient.id_paciente }]);

      showToast?.({ type: 'success', title: 'Paciente Creado', message: 'Paciente registrado exitosamente' });
      
      // Update lists and select it
      setPatientsList(prev => [...prev, patient].sort((a,b) => a.nombre.localeCompare(b.nombre)));
      setForm(f => ({ ...f, patientId: patient.id_paciente }));
      setPatientSearch('');
      setShowNewPatientForm(false);
      setNewPatient({ cedula: '', nombre: '', apellidos: '', telefono: '', fecha_nacimiento: '' });
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudo crear el paciente (Cédula duplicada?)' });
    } finally {
      setIsSavingPatient(false);
    }
  };

  // ── Save appointment ──────────────────────────────────────────────────────
  const handleSaveAppt = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.specialistId || !form.time) {
      showToast?.({ type: 'error', title: 'Campos incompletos', message: 'Complete todos los campos obligatorios' });
      return;
    }
    if (availableBlocks.length > 0 && !isWithinBlock(availableBlocks, selectedDateStr, form.time)) {
      showToast?.({ type: 'error', title: 'Sin disponibilidad', message: 'La hora elegida está fuera del horario del especialista' });
      return;
    }
    setIsSaving(true);
    try {
      const fullDate = `${selectedDateStr}T${form.time}:00`;
      
      if (form.editingId) {
        // UPDATE Existing
        const { error } = await supabase.from('cita').update({
          id_especialista: form.specialistId,
          fecha_pautada: fullDate,
          motivo_consulta: form.motivo
        }).eq('id_cita', form.editingId);
        if (error) throw error;
        showToast?.({ type: 'success', title: 'Cita Actualizada', message: 'La cita fue reprogramada exitosamente' });
      } else {
        // CREATE New
        // 1. Process payment if provided
        let pagoId = null;
        if (form.monto && Number(form.monto) > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const id_usuario = userData.user?.id;
          if (id_usuario) {
            const { data: pagoData, error: pagoErr } = await supabase.from('pago').insert([{
              id_usuario: id_usuario,
              monto_total: Number(form.monto),
              metodo_pago: form.metodo_pago,
              estado: 'completado',
              fecha_pago: new Date().toISOString()
            }]).select('id_pago').single();
            if (pagoErr) throw pagoErr;
            pagoId = pagoData.id_pago;
          }
        }

        // 2. Insert Cita
        const { error } = await supabase.from('cita').insert({
          id_paciente:    form.patientId,
          id_especialista: form.specialistId,
          fecha_pautada:  fullDate,
          motivo_consulta: form.motivo,
          estado: 'pendiente',
          id_pago: pagoId
        });
        if (error) throw error;
        showToast?.({ type: 'success', title: 'Cita Agendada', message: 'La cita fue registrada exitosamente' });
      }

      setShowModal(false);
      setForm({ patientId: '', time: '', motivo: 'Consulta Nueva', specialistId: '', monto: '', metodo_pago: 'Efectivo', editingId: null });
      setPatientSearch('');
      setShowNewPatientForm(false);
      fetchCalendarData();
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', title: 'Error', message: err.message || 'No se pudo guardar la cita' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Cancel appointment ────────────────────────────────────────────────────
  const handleCancelAppt = async (id) => {
    const { error } = await supabase.from('cita').update({ estado: 'cancelada' }).eq('id_cita', id);
    if (error) {
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudo cancelar la cita' });
    } else {
      showToast?.({ type: 'success', title: 'Cita cancelada', message: 'La cita fue cancelada' });
      fetchCalendarData();
    }
  };

  const handleConfirmAppt = async (id) => {
    const { error } = await supabase.from('cita').update({ estado: 'confirmada' }).eq('id_cita', id);
    if (error) {
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudo confirmar' });
    } else {
      showToast?.({ type: 'success', title: 'Confirmada', message: 'Cita confirmada' });
      fetchCalendarData();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 h-[calc(100vh-80px)] flex flex-col view-enter">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">Calendario de Citas</h1>
          <p className="text-hav-text-muted text-sm mt-0.5">
            {userRole === 'recepcion' ? 'Agenda y gestión de citas — Recepción' : 'Gestión de programación global'}
          </p>
        </div>
        {(userRole === 'recepcion' || userRole === 'superadmin') && (
          <button
            onClick={() => { setForm({ patientId:'', time:'', motivo:'Consulta Nueva', specialistId:'', monto: '', metodo_pago: 'Efectivo', editingId: null }); setPatientSearch(''); setShowModal(true); setShowNewPatientForm(false); }}
            className="flex items-center gap-2 bg-hav-primary hover:bg-hav-primary-dark text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-hav-primary/20"
          >
            <Plus size={16} /> Nueva Cita
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {/* ── Calendar grid ─────────────────────────────────────────── */}
        <div className="w-full lg:w-[380px] bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-lg text-hav-text-main">{MONTHS[curMonth]} {curYear}</h2>
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={18}/></button>
              <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={18}/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 flex-1">
            {cells.map((c, i) => {
              const isSelected = c.isCurrent && c.day === selectedDay;
              const hasAppts   = c.isCurrent && appointments.some(a => {
                const d = new Date(a.fecha_pautada);
                return d.getFullYear() === curYear && d.getMonth() === curMonth && d.getDate() === c.day;
              });
              const isToday = c.isCurrent && c.day === today.getDate() && curMonth === today.getMonth() && curYear === today.getFullYear();
              return (
                <button key={i} onClick={() => c.isCurrent && setSelectedDay(c.day)} disabled={!c.isCurrent}
                  className={`w-full aspect-square flex flex-col items-center justify-center rounded-xl text-[13px] font-medium transition-all relative ${
                    !c.isCurrent ? 'text-gray-300 cursor-not-allowed' :
                    isSelected   ? 'bg-hav-primary text-white font-bold shadow-md shadow-hav-primary/30' :
                    isToday      ? 'ring-2 ring-hav-primary/40 text-hav-primary font-bold' :
                                   'text-hav-text-main hover:bg-gray-100'
                  }`}
                >
                  {c.day}
                  {hasAppts && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-hav-secondary absolute bottom-1.5"/>}
                  {hasAppts && isSelected  && <div className="w-1.5 h-1.5 rounded-full bg-white absolute bottom-1.5"/>}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-4 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-hav-secondary inline-block"/>Con citas</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Completada</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Pendiente</span>
          </div>
        </div>

        {/* ── Daily schedule ─────────────────────────────────────────── */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <h3 className="font-semibold text-hav-text-main">
              Agenda del {selectedDay} de {MONTHS[curMonth]} {curYear}
            </h3>
            <span className="bg-hav-primary/10 text-hav-primary font-bold text-xs px-2.5 py-1 rounded-full">
              {selectedDateAppts.length} cita{selectedDateAppts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : selectedDateAppts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-hav-text-muted opacity-50">
                <Clock size={40} className="mb-3 opacity-30"/>
                <p className="text-sm font-medium">Sin citas para este día</p>
                {(userRole === 'recepcion' || userRole === 'superadmin') && (
                  <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-hav-primary hover:underline font-semibold">
                    + Agendar una cita
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateAppts.map(a => {
                  const timeStr = new Date(a.fecha_pautada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={a.id_cita} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-hav-primary/20 transition-colors bg-white shadow-sm group">
                      {/* Time */}
                      <div className="w-16 flex-shrink-0 text-right">
                        <p className="font-display font-bold text-hav-primary text-base leading-tight">{timeStr}</p>
                      </div>
                      {/* Dot line */}
                      <div className="w-px bg-gray-100 relative">
                        <div className={`absolute top-2 -left-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${ESTADO_COLOR[a.estado] || 'bg-gray-400'}`}/>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-hav-text-main text-sm truncate">
                            {a.pacientes?.nombre} {a.pacientes?.apellidos}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${ESTADO_BADGE[a.estado] || 'bg-gray-100 text-gray-500'}`}>
                            {a.estado?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-hav-text-muted truncate">
                          {a.especialista?.nombre_completo} · {a.especialista?.especialidad}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 italic">{a.motivo_consulta}</p>

                        {/* Actions for recepcion */}
                        {(userRole === 'recepcion' || userRole === 'superadmin') && a.estado === 'pendiente' && (
                          <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => {
                              const d = new Date(a.fecha_pautada);
                              setCurYear(d.getFullYear()); setCurMonth(d.getMonth()); setSelectedDay(d.getDate());
                              setForm({
                                patientId: a.pacientes.id_paciente,
                                time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                                motivo: a.motivo_consulta || '',
                                specialistId: a.especialista.id_usuario,
                                monto: '', metodo_pago: 'Efectivo', editingId: a.id_cita
                              });
                              setPatientSearch(''); setShowNewPatientForm(false); setShowModal(true);
                            }}
                              className="text-[10px] font-semibold text-hav-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                              Editar
                            </button>
                            <button onClick={() => handleConfirmAppt(a.id_cita)}
                              className="text-[10px] font-semibold text-white bg-green-500 hover:bg-green-600 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
                              <CheckCircle size={10}/> Confirmar
                            </button>
                            <button onClick={() => handleCancelAppt(a.id_cita)}
                              className="text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors">
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New Appointment Modal ────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
                <Plus size={18} className="text-hav-primary"/> {form.editingId ? 'Editar Cita' : 'Agendar Cita'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            <form onSubmit={handleSaveAppt} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

              {/* Patient search */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-hav-text-main">Paciente *</label>
                  {!form.editingId && (
                    <button type="button" onClick={() => setShowNewPatientForm(!showNewPatientForm)} className="text-[10px] font-bold text-hav-primary hover:underline">
                      {showNewPatientForm ? 'Usar paciente existente' : '+ Nuevo paciente rápido'}
                    </button>
                  )}
                </div>
                {showNewPatientForm ? (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] text-gray-500">Cédula *</label><input type="text" value={newPatient.cedula} onChange={e=>setNewPatient({...newPatient, cedula: e.target.value})} className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-hav-primary"/></div>
                      <div><label className="text-[10px] text-gray-500">Teléfono</label><input type="text" value={newPatient.telefono} onChange={e=>setNewPatient({...newPatient, telefono: e.target.value})} className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-hav-primary"/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] text-gray-500">Nombre *</label><input type="text" value={newPatient.nombre} onChange={e=>setNewPatient({...newPatient, nombre: e.target.value})} className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-hav-primary"/></div>
                      <div><label className="text-[10px] text-gray-500">Apellidos *</label><input type="text" value={newPatient.apellidos} onChange={e=>setNewPatient({...newPatient, apellidos: e.target.value})} className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-hav-primary"/></div>
                    </div>
                    <div><label className="text-[10px] text-gray-500">F. Nacimiento</label><input type="date" value={newPatient.fecha_nacimiento} onChange={e=>setNewPatient({...newPatient, fecha_nacimiento: e.target.value})} className="w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-hav-primary"/></div>
                    <button type="button" onClick={handleCreatePatient} disabled={isSavingPatient} className="w-full bg-hav-primary text-white text-xs font-bold py-2 rounded shadow-sm flex items-center justify-center gap-1">
                      {isSavingPatient ? <Spinner size="sm"/> : 'Guardar y Seleccionar Paciente'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-1">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type="text" placeholder="Buscar por nombre o cédula…" value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)} disabled={!!form.editingId}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary disabled:bg-gray-100 disabled:opacity-70"
                      />
                    </div>
                    <select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} disabled={!!form.editingId}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary disabled:bg-gray-100 disabled:opacity-70"
                      size={form.editingId ? 1 : Math.min(filteredPatients.length + 1, 5)}
                    >
                      <option value="" disabled>— Seleccione —</option>
                      {filteredPatients.map(p => (
                        <option key={p.id_paciente} value={p.id_paciente}>
                          {p.nombre} {p.apellidos} · {p.cedula}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* Specialist */}
              <div>
                <label className="block text-xs font-semibold text-hav-text-main mb-1">Especialista *</label>
                <select required value={form.specialistId}
                  onChange={e => setForm({...form, specialistId: e.target.value, time: ''})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                >
                  <option value="" disabled>— Seleccione especialista —</option>
                  {specialistsList.map(s => (
                    <option key={s.id_usuario} value={s.id_usuario}>
                      {s.nombre_completo} · {s.especialidad}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date info */}
              <div className="bg-hav-primary/5 border border-hav-primary/20 rounded-xl px-4 py-3 text-xs text-hav-primary font-semibold">
                📅 Agendando para: {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </div>

              {/* Available slots */}
              {form.specialistId && (
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-2">
                    Bloques disponibles ese día {loadingBlocks && <Spinner size="sm" className="inline ml-1"/>}
                  </label>
                  {!loadingBlocks && availableBlocks.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={14}/> Este especialista no tiene bloques de horario para este día.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableBlocks.map(b => (
                        <div key={b.id_horario} className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-hav-text-muted font-medium">
                          {fmt12(b.hora_inicio)} – {fmt12(b.hora_fin)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Time input */}
              <div>
                <label className="block text-xs font-semibold text-hav-text-main mb-1">Hora de la cita *</label>
                <input type="time" required value={form.time}
                  onChange={e => setForm({...form, time: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-hav-primary ${
                    availabilityWarning ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {availabilityWarning && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12}/> {availabilityWarning}
                  </p>
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold text-hav-text-main mb-1">Motivo de la cita</label>
                <input type="text" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary"
                />
              </div>

              {/* Pago (Only for new appts) */}
              {!form.editingId && (
                <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 mt-2 space-y-3">
                  <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide">Registro de Pago</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-hav-text-main mb-1">Monto (USD)</label>
                      <input type="number" step="0.01" min="0" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} placeholder="Ej: 50.00"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-hav-text-main mb-1">Método</label>
                      <select value={form.metodo_pago} onChange={e => setForm({...form, metodo_pago: e.target.value})}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Punto de Venta">Punto de Venta</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Seguro">Seguro</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving || !!availabilityWarning || (showNewPatientForm && !form.patientId)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-hav-primary hover:bg-hav-primary-dark rounded-lg disabled:opacity-60 flex items-center gap-2">
                  {isSaving ? <Spinner size="sm"/> : (form.editingId ? 'Actualizar Cita' : 'Confirmar Cita')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
