import { useState, useEffect } from 'react';
import { 
  Clock, CalendarDays, ShieldCheck, ShieldOff, 
  Stethoscope, Building2, User, Mail, Phone, Pencil, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const ROLE_LABELS = { 1: 'Súper Admin', 2: 'Especialista', 3: 'Recepción' };
const ROLE_BADGE  = {
  1: 'bg-indigo-100 text-indigo-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-emerald-100 text-emerald-700'
};

// Helper: Converts hForm {hour, minute, period} → '14:30'
const to24h = ({ hour, minute, period }) => {
  let h = parseInt(hour);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${minute}`;
};

// Helper: Converts '14:30' → {hour:'2', minute:'30', period:'PM'}
const from24h = (t) => {
  if (!t) return { hour: '8', minute: '00', period: 'AM' };
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return { hour: String(h), minute: mStr || '00', period };
};

// Mini Calendar component for multiple selection
function MiniCalendar({ selectedDates = [], onToggle }) {
  const today = new Date();
  const [view, setView] = useState(() => {
    const lastSelected = selectedDates[selectedDates.length - 1];
    const d = lastSelected ? new Date(lastSelected + 'T00:00:00') : today;
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
          const isSel   = selectedDates.includes(iso);
          return (
            <button
              key={iso} type="button"
              onClick={() => onToggle(iso)}
              className={`m-0.5 text-xs rounded-lg py-1 font-medium transition-colors ${
                isSel   ? 'bg-red-500 text-white' :
                isToday ? 'bg-hav-primary/10 text-hav-primary font-bold' :
                          'hover:bg-gray-100 text-hav-text-main'
              }`}
            >{d}</button>
          );
        })}
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 italic text-center">Toca los días para seleccionarlos/deseleccionarlos</p>
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

export function StaffDetailPanel({ member, showToast, onStatusToggle, onEdit }) {
  const [horarios, setHorarios] = useState([]);
  const [loadingH, setLoadingH] = useState(true);
  const [showHorarioForm, setShowHorarioForm] = useState(false);
  const [savingH, setSavingH] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const [selectedDates, setSelectedDates] = useState([today]);
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
    setSelectedDates([today]);
    if (member.roleId === '2') fetchHorarios();
    else setLoadingH(false);
  }, [member.id]);

  const handleAddHorario = async (e) => {
    e.preventDefault();
    if (selectedDates.length === 0) {
      showToast?.({ type: 'error', title: 'Fecha requerida', message: 'Selecciona al menos un día en el calendario' });
      return;
    }
    const hi = to24h(inicioT);
    const hf = to24h(finT);
    if (hi >= hf) {
      showToast?.({ type: 'error', title: 'Rango inválido', message: 'La hora de inicio debe ser antes que la hora de fin' });
      return;
    }
    setSavingH(true);
    try {
      const inserts = selectedDates.map(date => {
        const dow  = new Date(date + 'T12:00:00').getDay();
        const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        return {
          id_usuario:  member.id,
          fecha:       date,
          dia_semana:  dias[dow],
          hora_inicio: hi,
          hora_fin:    hf,
        };
      });

      const { error } = await supabase.from('horario_especialista').insert(inserts);
      
      if (error) {
        showToast?.({ type: 'error', title: 'Error', message: 'No se pudieron agregar algunos bloques. ¿Ya existen?' });
      } else {
        showToast?.({ type: 'success', title: 'Bloqueos Registrados', message: `${selectedDates.length} días marcados como no laborables` });
        setShowHorarioForm(false);
        setSelectedDates([today]);
        fetchHorarios();
      }
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', title: 'Error Fatal', message: 'Ocurrió un error al guardar los bloqueos' });
    } finally {
      setSavingH(false);
    }
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

        {member.roleId !== '1' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onEdit(member)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-hav-primary border border-hav-primary/30 bg-hav-primary/5 hover:bg-hav-primary/10 rounded-lg transition-colors">
              <Pencil size={13} /> Editar
            </button>
            <button onClick={() => onStatusToggle(member.id, member.status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                member.status === 'activo'
                  ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                  : 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
              }`}>
              {member.status === 'activo' ? <><ShieldOff size={13}/> Desactivar</> : <><ShieldCheck size={13}/> Reactivar</>}
            </button>
          </div>
        )}
      </div>

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

      {member.roleId === '2' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
              <CalendarDays size={17} className="text-hav-danger" /> Bloqueos de Disponibilidad (Días No Laborables)
            </h3>
            <button onClick={() => setShowHorarioForm(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-hav-danger bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-200">
              <Plus size={13} /> {showHorarioForm ? 'Cancelar' : 'Bloquear Horario'}
            </button>
          </div>

          {showHorarioForm && (
            <form onSubmit={handleAddHorario} className="mb-4 bg-red-50/50 border border-red-200 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Nuevo Bloqueo (Múltiples Días)</p>
              <div>
                <label className="text-[10px] font-bold text-hav-text-muted uppercase block mb-2">
                  Días seleccionados: {selectedDates.length}
                </label>
                <MiniCalendar 
                  selectedDates={selectedDates} 
                  onToggle={(iso) => {
                    setSelectedDates(prev => prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso]);
                  }} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <TimePicker label="Desde las..." value={inicioT} onChange={setInicioT} />
                <TimePicker label="Hasta las..."    value={finT}    onChange={setFinT}    />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={savingH}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-70 transition-colors">
                  {savingH ? <Spinner size="sm"/> : <><CheckCircle2 size={13}/> Confirmar Bloqueo</>}
                </button>
              </div>
            </form>
          ) /* (continúa con la lista de bloqueos) */}

          {loadingH ? (
            <div className="py-6 flex justify-center"><Spinner /></div>
          ) : Object.keys(byMonth).length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
              <p>El médico está disponible todos los días.</p>
              <p className="text-[10px] mt-1 italic">Añade bloqueos para días festivos, vacaciones o descansos.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(byMonth).map(([mes, slots]) => (
                <div key={mes}>
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays size={13} className="text-hav-primary" />
                    <span className="text-xs font-bold text-hav-primary uppercase tracking-wide">{mes}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] text-gray-400">{slots.length} jornadas</span>
                  </div>
                  <div className="space-y-1.5">
                    {slots.map(h => {
                      const d = new Date(h.fecha + 'T12:00:00');
                      const inicioFmt = from24h(h.hora_inicio);
                      const finFmt    = from24h(h.hora_fin);
                      return (
                        <div key={h.id_horario} className={`flex items-center justify-between px-4 py-3 rounded-xl border group transition-all ${
                          h.activo ? 'bg-red-50/30 border-red-100 hover:border-red-200 hover:shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${h.activo ? 'bg-red-100' : 'bg-gray-100'}`}>
                              <span className={`text-[11px] font-bold leading-none ${h.activo ? 'text-red-600' : 'text-gray-400'}`}>{d.getDate()}</span>
                              <span className="text-[9px] text-gray-400 uppercase">{DIAS_CORTO[d.getDay()]}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-gray-400" />
                                <span className={`text-sm font-semibold ${!h.activo ? 'line-through text-gray-400' : 'text-hav-text-main'}`}>
                                  Bloqueado: {inicioFmt.hour}:{inicioFmt.minute} {inicioFmt.period} – {finFmt.hour}:{finFmt.minute} {finFmt.period}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleToggleHorario(h.id_horario, h.activo)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors">
                              {h.activo ? <ShieldOff size={13}/> : <ShieldCheck size={13}/>}
                            </button>
                            <button onClick={() => handleDeleteHorario(h.id_horario)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
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

      {member.roleId === '3' && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
          <Building2 size={32} className="mx-auto mb-2 opacity-30" />
          El personal de Recepción opera en horario institucional fijo.
        </div>
      )}
    </div>
  );
}
