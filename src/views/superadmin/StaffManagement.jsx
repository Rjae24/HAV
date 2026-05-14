import { useState, useEffect } from 'react';
import {
  Search, Plus, Pencil, Trash2, Phone, X,
  User, Mail, Clock, CalendarDays, ShieldCheck, ShieldOff,
  Stethoscope, Building2, CheckCircle2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

import { StaffDetailPanel } from './StaffDetailPanel';

const ROLE_LABELS = { 1: 'Súper Admin', 2: 'Especialista', 3: 'Recepción' };
const ROLE_BADGE  = {
  1: 'bg-indigo-100 text-indigo-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-emerald-100 text-emerald-700'
};


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
          .insert({ id_rol: parseInt(form.rol), username: form.email, password_hash: form.password, estado_activo: true })
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
                    <option value="1">Súper Admin</option>
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
