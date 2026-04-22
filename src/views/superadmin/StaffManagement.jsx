import { useState, useEffect } from 'react';
import {
  Search, Plus, Pencil, Trash2, Phone, X,
  User, Mail, Clock, CalendarDays, ShieldCheck, ShieldOff,
  Stethoscope, Building2, CheckCircle2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

const ROLE_LABELS = { 1: 'Súper Admin', 2: 'Especialista', 3: 'Recepción' };
const ROLE_BADGE  = {
  1: 'bg-indigo-100 text-indigo-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-emerald-100 text-emerald-700'
};
const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Converts hForm {hour, minute, period} → '14:30'
const to24h = ({ hour, minute, period }) => {
  let h = parseInt(hour);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${minute}`;
};

// Converts '14:30' → {hour:'2', minute:'30', period:'PM'}
const from24h = (t) => {
  if (!t) return { hour: '8', minute: '00', period: 'AM' };
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return { hour: String(h), minute: mStr || '00', period };
};

// Mini Calendar component
function MiniCalendar({ selected, onSelect }) {
  const today = new Date();
  const [view, setView] = useState(() => {
    const d = selected ? new Date(selected + 'T00:00:00') : today;
    return { month: d.getMonth(), year: d.getFullYear() };
  });

  const firstDay  = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const isoDate = (d) => `${view.year}-${String(view.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const prev = () => setView(v => v.month === 0 ? { month:11, year:v.year-1 } : { month:v.month-1, year:v.year });
  const next = () => setView(v => v.month === 11 ? { month:0, year:v.year+1 } : { month:v.month+1, year:v.year });

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-hav-primary/5 border-b border-gray-100">
        <button type="button" onClick={prev} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={14}/></button>
        <span className="text-xs font-bold text-hav-text-main">{MESES[view.month]} {view.year}</span>
        <button type="button" onClick={next} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={14}/></button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {DIAS_CORTO.map(d => (
          <div key={d} className="text-[9px] font-bold text-gray-400 py-1.5">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;
          const iso = isoDate(d);
          const isToday = iso === today.toISOString().slice(0,10);
          const isSel   = iso === selected;
          return (
            <button
              key={iso} type="button"
              onClick={() => onSelect(iso)}
              className={`m-0.5 text-xs rounded-lg py-1 font-medium transition-colors ${
                isSel   ? 'bg-hav-primary text-white' :
                isToday ? 'bg-hav-primary/10 text-hav-primary font-bold' :
                          'hover:bg-gray-100 text-hav-text-main'
              }`}
            >{d}</button>
          );
        })}
      </div>
    </div>
  );
}

// AM/PM Time Picker
function TimePicker({ label, value, onChange }) {
  const HOURS   = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  const MINUTES = ['00','15','30','45'];
  return (
    <div>
      <label className="text-[10px] font-bold text-hav-text-muted uppercase block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <select value={value.hour} onChange={e => onChange({...value, hour: e.target.value})}
          className="px-1.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-hav-primary focus:outline-none">
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-xs font-bold text-gray-400">:</span>
        <select value={value.minute} onChange={e => onChange({...value, minute: e.target.value})}
          className="px-1.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-hav-primary focus:outline-none">
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={value.period} onChange={e => onChange({...value, period: e.target.value})}
          className="px-1.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-hav-primary focus:outline-none font-bold">
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

// ─── Staff Detail Panel ──────────────────────────────────────────────────────
function StaffDetailPanel({ member, showToast, onStatusToggle, onEdit }) {
  const [horarios, setHorarios] = useState([]);
  const [loadingH, setLoadingH] = useState(true);
  const [showHorarioForm, setShowHorarioForm] = useState(false);
  const [savingH, setSavingH] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [inicioT, setInicioT] = useState({ hour:'8', minute:'00', period:'AM' });
  const [finT,    setFinT]    = useState({ hour:'12', minute:'00', period:'PM' });

  const fetchHorarios = async () => {
    setLoadingH(true);
    const { data } = await supabase
      .from('horario_especialista')
      .select('*')
      .eq('id_usuario', member.id)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });
    setHorarios(data || []);
    setLoadingH(false);
  };

  useEffect(() => {
    setShowHorarioForm(false);
    if (member.roleId === '2') fetchHorarios();
    else setLoadingH(false);
  }, [member.id]);

  const handleAddHorario = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      showToast?.({ type: 'error', title: 'Fecha requerida', message: 'Selecciona un día en el calendario' });
      return;
    }
    const hi = to24h(inicioT);
    const hf = to24h(finT);
    if (hi >= hf) {
      showToast?.({ type: 'error', title: 'Rango inválido', message: 'La hora de inicio debe ser antes que la hora de fin' });
      return;
    }
    setSavingH(true);
    // derive dia_semana from date
    const dow  = new Date(selectedDate + 'T12:00:00').getDay();
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const { error } = await supabase.from('horario_especialista').insert({
      id_usuario:  member.id,
      fecha:       selectedDate,
      dia_semana:  dias[dow],
      hora_inicio: hi,
      hora_fin:    hf,
    });
    if (error) {
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudo agregar. ¿Ya existe ese bloque?' });
    } else {
      const label = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
      showToast?.({ type: 'success', title: 'Jornada Registrada', message: `Bloque del ${label} guardado` });
      setShowHorarioForm(false);
      fetchHorarios();
    }
    setSavingH(false);
  };

  const handleDeleteHorario = async (id_horario) => {
    const { error } = await supabase.from('horario_especialista').delete().eq('id_horario', id_horario);
    if (error) {
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudo eliminar el bloque' });
    } else {
      showToast?.({ type: 'success', title: 'Eliminado', message: 'Jornada eliminada' });
      fetchHorarios();
    }
  };

  const handleToggleHorario = async (id_horario, currentActivo) => {
    await supabase.from('horario_especialista').update({ activo: !currentActivo }).eq('id_horario', id_horario);
    fetchHorarios();
  };

  // Group by month label
  const byMonth = horarios.reduce((acc, h) => {
    if (!h.fecha) return acc;
    const d = new Date(h.fecha + 'T12:00:00');
    const key = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  return (
    <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-y-auto custom-scrollbar p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md flex-shrink-0 ${
            member.status === 'activo' ? 'bg-hav-primary text-white shadow-hav-primary/30' : 'bg-gray-200 text-gray-400'
          }`}>
            {member.name[0]}
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-hav-text-main leading-tight">{member.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE[member.roleId]}`}>
                {ROLE_LABELS[member.roleId]}
              </span>
              {member.specialty && (
                <span className="text-xs text-hav-text-muted flex items-center gap-1">
                  <Stethoscope size={11} /> {member.specialty}
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                member.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {member.status === 'activo' ? '● Activo' : '● Inactivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {member.roleId !== '1' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onEdit(member)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-hav-primary border border-hav-primary/30 bg-hav-primary/5 hover:bg-hav-primary/10 rounded-lg transition-colors"
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              onClick={() => onStatusToggle(member.id, member.status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                member.status === 'activo'
                  ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                  : 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
              }`}
            >
              {member.status === 'activo' ? <><ShieldOff size={13}/> Desactivar</> : <><ShieldCheck size={13}/> Reactivar</>}
            </button>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <User size={14}/>,      label:'Cédula',    val: member.cedula    || '—' },
          { icon: <Mail size={14}/>,      label:'Correo',    val: member.email     || '—' },
          { icon: <Phone size={14}/>,     label:'Teléfono',  val: member.phone     || '—' },
          { icon: <Building2 size={14}/>, label:'Dirección', val: member.direccion || '—' },
        ].map(({ icon, label, val }) => (
          <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-[10px] text-hav-text-muted font-bold uppercase tracking-wide flex items-center gap-1 mb-1">
              {icon} {label}
            </p>
            <p className="text-sm text-hav-text-main font-medium truncate">{val}</p>
          </div>
        ))}
      </div>

      {/* Horario — solo para especialistas */}
      {member.roleId === '2' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
              <CalendarDays size={17} className="text-hav-primary" /> Bloques de Horario
            </h3>
            <button
              onClick={() => setShowHorarioForm(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-hav-primary bg-hav-primary/10 hover:bg-hav-primary/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} /> {showHorarioForm ? 'Cancelar' : 'Agregar Bloque'}
            </button>
          </div>

          {/* Add block form */}
          {showHorarioForm && (
            <form onSubmit={handleAddHorario} className="mb-4 bg-hav-primary/5 border border-hav-primary/20 rounded-xl p-4 space-y-4">
              <p className="text-xs font-bold text-hav-primary uppercase tracking-wide">Nueva Jornada</p>

              {/* Calendar */}
              <div>
                <label className="text-[10px] font-bold text-hav-text-muted uppercase block mb-2">
                  Día seleccionado: {selectedDate
                    ? new Date(selectedDate+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
                    : 'Ninguno'}
                </label>
                <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <TimePicker label="Hora de inicio" value={inicioT} onChange={setInicioT} />
                <TimePicker label="Hora de fin"    value={finT}    onChange={setFinT}    />
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={savingH}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-hav-primary hover:bg-hav-primary-dark rounded-lg disabled:opacity-70 transition-colors"
                >
                  {savingH ? <Spinner size="sm"/> : <><CheckCircle2 size={13}/> Guardar Jornada</>}
                </button>
              </div>
            </form>
          )}

          {loadingH ? (
            <div className="py-6 flex justify-center"><Spinner /></div>
          ) : Object.keys(byMonth).length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
              Sin jornadas registradas. Usa <strong>Agregar Jornada</strong> para configurar la disponibilidad.
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(byMonth).map(([mes, slots]) => (
                <div key={mes}>
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays size={13} className="text-hav-primary" />
                    <span className="text-xs font-bold text-hav-primary uppercase tracking-wide">{mes}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] text-gray-400">{slots.length} jornada{slots.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1.5">
                    {slots.map(h => {
                      const d = new Date(h.fecha + 'T12:00:00');
                      const inicioFmt = from24h(h.hora_inicio);
                      const finFmt    = from24h(h.hora_fin);
                      const hiDisplay = `${inicioFmt.hour}:${inicioFmt.minute} ${inicioFmt.period}`;
                      const hfDisplay = `${finFmt.hour}:${finFmt.minute} ${finFmt.period}`;
                      return (
                        <div key={h.id_horario}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border group transition-all ${
                            h.activo ? 'bg-white border-gray-100 hover:border-hav-primary/20 hover:shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'
                          }`}>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-hav-primary/8 rounded-lg flex-shrink-0">
                              <span className="text-[11px] font-bold text-hav-primary leading-none">{d.getDate()}</span>
                              <span className="text-[9px] text-hav-text-muted uppercase">{DIAS_CORTO[d.getDay()]}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-gray-400" />
                                <span className={`text-sm font-semibold ${
                                  !h.activo ? 'line-through text-gray-400' : 'text-hav-text-main'
                                }`}>
                                  {hiDisplay} – {hfDisplay}
                                </span>
                              </div>
                              {!h.activo && <span className="text-[10px] text-amber-500 font-semibold">Pausada</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleToggleHorario(h.id_horario, h.activo)}
                              title={h.activo ? 'Pausar jornada' : 'Reactivar jornada'}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors">
                              {h.activo ? <ShieldOff size={13}/> : <ShieldCheck size={13}/>}
                            </button>
                            <button onClick={() => handleDeleteHorario(h.id_horario)}
                              title="Eliminar jornada"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recepcionistas no tienen horario por bloques */}
      {member.roleId === '3' && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
          <Building2 size={32} className="mx-auto mb-2 opacity-30" />
          El personal de Recepción opera en horario institucional fijo.
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StaffManagement({ showToast }) {
  const [staff, setStaff]       = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving]  = useState(false);
  const [form, setForm] = useState({
    nombre: '', especialidad: '', email: '', password: '',
    telefono: '', direccion: '', rol: '2', cedula: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuario')
        .select(`
          id_usuario, username, estado_activo, id_rol,
          rol (nombre_rol),
          especialista (nombre_completo, especialidad, tlf, direccion, cedula),
          recepcion (nombre_empleado, telefono, direccion, cedula)
        `)
        .order('id_rol', { ascending: true });

      if (error) throw error;

      const mapped = data.map(u => {
        let name = 'Admin Global', phone = '', specialty = '', ced = '', dir = '';
        const esp = Array.isArray(u.especialista) ? u.especialista[0] : u.especialista;
        const rec = Array.isArray(u.recepcion)    ? u.recepcion[0]    : u.recepcion;

        if (u.id_rol === 2 && esp) {
          name = esp.nombre_completo || name;
          specialty = esp.especialidad || '';
          phone = esp.tlf || '';
          ced   = esp.cedula || '';
          dir   = esp.direccion || '';
        } else if (u.id_rol === 3 && rec) {
          name  = rec.nombre_empleado || name;
          phone = rec.telefono || '';
          ced   = rec.cedula || '';
          dir   = rec.direccion || '';
        }

        return {
          id: u.id_usuario, name, email: u.username, phone,
          specialty, cedula: ced, direccion: dir,
          roleId: String(u.id_rol),
          status: u.estado_activo ? 'activo' : 'inactivo'
        };
      });

      setStaff(mapped);
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudo listar el personal' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleToggleStatus = async (id_usuario, currentStatus) => {
    try {
      const { error } = await supabase
        .from('usuario')
        .update({ estado_activo: currentStatus !== 'activo' })
        .eq('id_usuario', id_usuario);
      if (error) throw error;
      showToast?.({
        type: 'success', title: 'Estado Actualizado',
        message: `Usuario ${currentStatus === 'activo' ? 'desactivado' : 'reactivado'} correctamente`
      });
      fetchStaff();
      setSelected(prev => prev?.id === id_usuario
        ? { ...prev, status: currentStatus === 'activo' ? 'inactivo' : 'activo' }
        : prev
      );
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudo actualizar el estado' });
    }
  };

  const openNewEmployee = () => {
    setForm({ nombre: '', especialidad: '', email: '', password: '', telefono: '', direccion: '', rol: '2', cedula: '' });
    setIsEditing(false); setEditingId(null); setShowModal(true);
  };

  const openEditEmployee = (s) => {
    if (s.roleId === '1') return;
    setForm({
      nombre: s.name || '', especialidad: s.specialty || '', email: s.email || '',
      password: '', telefono: s.phone || '', direccion: s.direccion || '',
      rol: String(s.roleId), cedula: s.cedula || ''
    });
    setIsEditing(true); setEditingId(s.id); setShowModal(true);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault(); setIsSaving(true);
    try {
      if (isEditing) {
        if (form.password) {
          const { error } = await supabase.from('usuario').update({ password_hash: form.password }).eq('id_usuario', editingId);
          if (error) throw error;
        }
        if (form.rol === '2') {
          const { error: e1 } = await supabase.from('especialista').update({
            nombre_completo: form.nombre, cedula: form.cedula, especialidad: form.especialidad,
            tlf: form.telefono, direccion: form.direccion, correo: form.email
          }).eq('id_usuario', editingId);
          if (e1) throw e1;
        } else if (form.rol === '3') {
          const { error: e2 } = await supabase.from('recepcion').update({
            nombre_empleado: form.nombre, cedula: form.cedula,
            telefono: form.telefono, direccion: form.direccion, correo: form.email
          }).eq('id_usuario', editingId);
          if (e2) throw e2;
        }
        showToast?.({ type: 'success', title: 'Personal Editado', message: 'Datos actualizados correctamente' });
      } else {
        const { data: usuario, error: uErr } = await supabase
          .from('usuario')
          .insert({ id_rol: parseInt(form.rol), username: form.email, password_hash: form.password })
          .select().single();
        if (uErr) throw uErr;

        if (form.rol === '2') {
          await supabase.from('especialista').insert({
            id_usuario: usuario.id_usuario, nombre_completo: form.nombre, cedula: form.cedula,
            especialidad: form.especialidad, tlf: form.telefono, direccion: form.direccion, correo: form.email
          });
        } else if (form.rol === '3') {
          await supabase.from('recepcion').insert({
            id_usuario: usuario.id_usuario, nombre_empleado: form.nombre, cedula: form.cedula,
            telefono: form.telefono, direccion: form.direccion, correo: form.email
          });
        }
        showToast?.({ type: 'success', title: 'Personal Añadido', message: 'Usuario registrado exitosamente' });
      }
      setShowModal(false);
      fetchStaff();
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 h-[calc(100vh-80px)] flex flex-col view-enter gap-4">

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">Gestión de Personal</h1>
          <p className="text-hav-text-muted text-sm mt-0.5">Administración de usuarios, roles y horarios</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Buscar empleado..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hav-primary focus:ring-1 focus:ring-hav-primary w-56 shadow-sm"
            />
          </div>
          <button
            onClick={openNewEmployee}
            className="flex items-center gap-2 bg-hav-primary hover:bg-hav-primary-dark text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            <Plus size={15} /> Añadir Personal
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 min-h-0 flex gap-4">

        {/* Left — staff list */}
        <div className="w-72 flex-shrink-0 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-hav-text-muted uppercase tracking-wide">Empleados ({filteredStaff.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {loading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Sin resultados</div>
            ) : filteredStaff.map(s => {
              const isSelected = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'bg-hav-primary/10 border-hav-primary/30 shadow-sm'
                      : 'hover:bg-gray-50 border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    s.status !== 'activo'
                      ? 'bg-gray-100 text-gray-400'
                      : isSelected ? 'bg-hav-primary text-white' : 'bg-hav-primary/10 text-hav-primary'
                  }`}>
                    {s.name[0]}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className={`text-sm font-semibold truncate ${s.status !== 'activo' ? 'text-gray-400' : isSelected ? 'text-hav-primary-dark' : 'text-hav-text-main'}`}>
                      {s.name}
                    </p>
                    <p className="text-[10px] text-hav-text-muted truncate">{ROLE_LABELS[s.roleId]} {s.specialty ? `· ${s.specialty}` : ''}</p>
                  </div>
                  {s.status !== 'activo' && (
                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" title="Inactivo"/>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — detail panel */}
        {selected ? (
          <StaffDetailPanel
            key={selected.id}
            member={selected}
            showToast={showToast}
            onStatusToggle={handleToggleStatus}
            onEdit={openEditEmployee}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/50 border border-gray-100 border-dashed rounded-2xl">
            <div className="text-center text-hav-text-muted">
              <User size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Selecciona un empleado para ver su perfil y horarios</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Agregar / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
                <Plus size={18} className="text-hav-primary" />
                {isEditing ? 'Editar Empleado' : 'Agregar Nuevo Empleado'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Nombre Completo *</label>
                  <input required type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-hav-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Cédula de Identidad *</label>
                  <input required type="text" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})}
                    placeholder="V-12345678" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-hav-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Correo Electrónico *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-hav-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">
                    {isEditing ? 'Contraseña (vacío = sin cambio)' : 'Contraseña Inicial *'}
                  </label>
                  <input required={!isEditing} type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-hav-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Teléfono</label>
                  <input type="text" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                    placeholder="04141234567" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-hav-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Rol en Sistema *</label>
                  <select required value={form.rol} disabled={isEditing} onChange={e => setForm({...form, rol: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:bg-gray-100 focus:ring-1 focus:ring-hav-primary focus:outline-none">
                    <option value="2">Médico Especialista</option>
                    <option value="3">Recepción / Caja</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-hav-text-main mb-1">Dirección</label>
                <input type="text" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})}
                  placeholder="Ej: Consultorio 1A, Edif. Principal"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-hav-primary focus:outline-none" />
              </div>
              {form.rol === '2' && (
                <div>
                  <label className="block text-xs font-semibold text-hav-text-main mb-1">Especialidad Médica *</label>
                  <select required value={form.especialidad} onChange={e => setForm({...form, especialidad: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-1 focus:ring-hav-primary focus:outline-none">
                    <option value="" disabled hidden>Seleccione especialidad...</option>
                    <option value="Internista">Internista</option>
                    <option value="Traumatología">Traumatología</option>
                    <option value="Cardiología">Cardiología</option>
                    <option value="Neurología">Neurología</option>
                    <option value="Pediatría">Pediatría</option>
                    <option value="Ginecología">Ginecología</option>
                    <option value="Odontología">Odontología</option>
                  </select>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-hav-primary hover:bg-hav-primary-dark rounded-lg flex items-center gap-2 disabled:opacity-70">
                  {isSaving ? <Spinner size="sm"/> : (isEditing ? 'Guardar Cambios' : 'Registrar Empleado')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
