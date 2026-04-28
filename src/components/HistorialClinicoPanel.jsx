import { useState, useEffect } from 'react';
import { AlertTriangle, Heart, Plus, X, Save, Pencil, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from './Spinner';

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function HistorialClinicoPanel({ patient, showToast, onRefresh }) {
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);

  // Catálogos
  const [catAlergias, setCatAlergias]     = useState([]);
  const [catPatologias, setCatPatologias] = useState([]);

  // Seleccionados (junction)
  const [selAlergias, setSelAlergias]     = useState([]); // [{id_alergia, nombre}]
  const [selPatologias, setSelPatologias] = useState([]); // [{id_patologia, nombre}]

  // Formulario
  const [cirugias, setCirugias]   = useState('');
  const [newAlergia, setNewAlergia]     = useState('');
  const [newPatologia, setNewPatologia] = useState('');
  const [addingA, setAddingA]     = useState(false);
  const [addingP, setAddingP]     = useState(false);

  const historial = patient?.historial_clinico?.[0] || patient?.historial_clinico || null;

  // Cargar catálogos y seleccionados cuando se abre edición
  const loadCatalogs = async () => {
    const [{ data: ca }, { data: cp }] = await Promise.all([
      supabase.from('alergias').select('*').order('nombre'),
      supabase.from('patologias').select('*').order('nombre'),
    ]);
    setCatAlergias(ca || []);
    setCatPatologias(cp || []);
  };

  const loadSelected = async () => {
    if (!historial?.id_historial) return;
    const [{ data: ha }, { data: hp }] = await Promise.all([
      supabase.from('historial_alergias').select('id_alergia, alergias(nombre)').eq('id_historial', historial.id_historial),
      supabase.from('historial_patologias').select('id_patologia, patologias(nombre)').eq('id_historial', historial.id_historial),
    ]);
    setSelAlergias((ha || []).map(r => ({ id: r.id_alergia, nombre: r.alergias?.nombre })));
    setSelPatologias((hp || []).map(r => ({ id: r.id_patologia, nombre: r.patologias?.nombre })));
  };

  const openEdit = async () => {
    setCirugias(historial?.cirugias || '');
    await Promise.all([loadCatalogs(), loadSelected()]);
    setEditing(true);
  };

  // Añadir alergia al catálogo + junction
  const handleAddAlergia = async () => {
    const nombre = newAlergia.trim();
    if (!nombre) return;
    setAddingA(true);
    try {
      // Upsert catálogo
      const { data: existing } = await supabase.from('alergias').select('id_alergia').eq('nombre', nombre).maybeSingle();
      let id_alergia = existing?.id_alergia;
      if (!id_alergia) {
        const { data: inserted } = await supabase.from('alergias').insert({ nombre }).select('id_alergia').single();
        id_alergia = inserted.id_alergia;
        setCatAlergias(prev => [...prev, { id_alergia, nombre }]);
      }
      if (!selAlergias.find(a => a.id === id_alergia)) {
        setSelAlergias(prev => [...prev, { id: id_alergia, nombre }]);
      }
      setNewAlergia('');
    } catch (e) { console.error(e); }
    finally { setAddingA(false); }
  };

  // Añadir patología al catálogo + selección
  const handleAddPatologia = async () => {
    const nombre = newPatologia.trim();
    if (!nombre) return;
    setAddingP(true);
    try {
      const { data: existing } = await supabase.from('patologias').select('id_patologia').eq('nombre', nombre).maybeSingle();
      let id_patologia = existing?.id_patologia;
      if (!id_patologia) {
        const { data: inserted } = await supabase.from('patologias').insert({ nombre }).select('id_patologia').single();
        id_patologia = inserted.id_patologia;
        setCatPatologias(prev => [...prev, { id_patologia, nombre }]);
      }
      if (!selPatologias.find(p => p.id === id_patologia)) {
        setSelPatologias(prev => [...prev, { id: id_patologia, nombre }]);
      }
      setNewPatologia('');
    } catch (e) { console.error(e); }
    finally { setAddingP(false); }
  };

  const handleSave = async () => {
    if (!patient) return;
    setSaving(true);
    try {
      let id_historial = historial?.id_historial;

      // Upsert historial_clinico
      if (id_historial) {
        await supabase.from('historial_clinico').update({ cirugias: cirugias || null, ultima_actualizacion: new Date().toISOString() }).eq('id_historial', id_historial);
      } else {
        const { data } = await supabase.from('historial_clinico').insert({ id_paciente: patient.id_paciente, cirugias: cirugias || null }).select('id_historial').single();
        id_historial = data.id_historial;
      }

      // Sync junction alergias — delete all then insert selected
      await supabase.from('historial_alergias').delete().eq('id_historial', id_historial);
      if (selAlergias.length > 0) {
        await supabase.from('historial_alergias').insert(selAlergias.map(a => ({ id_historial, id_alergia: a.id })));
      }

      // Sync junction patologias
      await supabase.from('historial_patologias').delete().eq('id_historial', id_historial);
      if (selPatologias.length > 0) {
        await supabase.from('historial_patologias').insert(selPatologias.map(p => ({ id_historial, id_patologia: p.id })));
      }

      showToast?.({ type: 'success', title: 'Historial actualizado', message: 'Datos clínicos guardados correctamente' });
      setEditing(false);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showToast?.({ type: 'error', title: 'Error', message: 'No se pudo guardar el historial' });
    } finally { setSaving(false); }
  };

  // ── VIEW MODE ──
  const ViewMode = () => (
    <div className="space-y-4">
      {/* Tipo de Sangre (viene del paciente) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-hav-primary font-bold uppercase tracking-wide mb-1">Tipo de Sangre</p>
          <p className="text-lg font-bold text-hav-text-main">{patient.tipo_sangre || <span className="text-gray-400 font-normal text-sm">No registrado</span>}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-hav-primary font-bold uppercase tracking-wide mb-1">Cirugías Previas</p>
          <p className="text-sm text-hav-text-main">{historial?.cirugias || <span className="text-gray-400">Ninguna registrada</span>}</p>
        </div>
      </div>

      {/* Alergias */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-4">
        <p className="text-xs text-red-500 font-bold uppercase tracking-wide mb-2 flex items-center gap-1"><AlertTriangle size={11}/> Alergias</p>
        <AlergiasTags historialId={historial?.id_historial} />
      </div>

      {/* Patologías */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
        <p className="text-xs text-hav-primary font-bold uppercase tracking-wide mb-2">Patologías / Enfermedades Crónicas</p>
        <PatologiasTags historialId={historial?.id_historial} />
      </div>
    </div>
  );

  // ── EDIT MODE ──
  const EditMode = () => (
    <div className="space-y-5">
      {/* Tipo Sangre — se edita desde el paciente directamente */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600">
        ℹ El tipo de sangre se edita en la sección de <strong>datos del paciente</strong>.
      </div>

      {/* Alergias */}
      <div>
        <label className="text-xs font-bold text-red-500 uppercase tracking-wide block mb-2 flex items-center gap-1"><AlertTriangle size={11}/> Alergias</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selAlergias.map(a => (
            <span key={a.id} className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {a.nombre}
              <button onClick={() => setSelAlergias(prev => prev.filter(x => x.id !== a.id))}><X size={10}/></button>
            </span>
          ))}
        </div>
        {/* Catálogo existente */}
        <select onChange={e => {
          const opt = catAlergias.find(a => a.id_alergia === Number(e.target.value));
          if (opt && !selAlergias.find(a => a.id === opt.id_alergia)) setSelAlergias(prev => [...prev, { id: opt.id_alergia, nombre: opt.nombre }]);
          e.target.value = '';
        }} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white mb-2 focus:ring-1 focus:ring-hav-primary">
          <option value="">— Seleccionar del catálogo —</option>
          {catAlergias.map(a => <option key={a.id_alergia} value={a.id_alergia}>{a.nombre}</option>)}
        </select>
        {/* Nueva alergia */}
        <div className="flex gap-2">
          <input value={newAlergia} onChange={e => setNewAlergia(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAlergia()}
            placeholder="Nueva alergia..." className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-hav-primary" />
          <button onClick={handleAddAlergia} disabled={addingA} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg">
            {addingA ? <Spinner size="sm"/> : <Plus size={12}/>}
          </button>
        </div>
      </div>

      {/* Patologías */}
      <div>
        <label className="text-xs font-bold text-hav-primary uppercase tracking-wide block mb-2">Patologías / Enfermedades Crónicas</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selPatologias.map(p => (
            <span key={p.id} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {p.nombre}
              <button onClick={() => setSelPatologias(prev => prev.filter(x => x.id !== p.id))}><X size={10}/></button>
            </span>
          ))}
        </div>
        <select onChange={e => {
          const opt = catPatologias.find(p => p.id_patologia === Number(e.target.value));
          if (opt && !selPatologias.find(p => p.id === opt.id_patologia)) setSelPatologias(prev => [...prev, { id: opt.id_patologia, nombre: opt.nombre }]);
          e.target.value = '';
        }} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white mb-2 focus:ring-1 focus:ring-hav-primary">
          <option value="">— Seleccionar del catálogo —</option>
          {catPatologias.map(p => <option key={p.id_patologia} value={p.id_patologia}>{p.nombre}</option>)}
        </select>
        <div className="flex gap-2">
          <input value={newPatologia} onChange={e => setNewPatologia(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPatologia()}
            placeholder="Nueva patología..." className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-hav-primary" />
          <button onClick={handleAddPatologia} disabled={addingP} className="px-3 py-1.5 bg-hav-primary text-white text-xs font-bold rounded-lg">
            {addingP ? <Spinner size="sm"/> : <Plus size={12}/>}
          </button>
        </div>
      </div>

      {/* Cirugías */}
      <div>
        <label className="text-xs font-bold text-hav-primary uppercase tracking-wide block mb-1.5">Cirugías Previas</label>
        <textarea rows={2} value={cirugias} onChange={e => setCirugias(e.target.value)}
          placeholder="Ej: Apendicectomía (2019), Colecistectomía (2022)..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-hav-primary resize-none" />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-hav-text-main text-lg flex items-center gap-2">
          <Heart size={18} className="text-hav-primary" /> Historial Base
        </h3>
        {!editing ? (
          <button onClick={openEdit} className="flex items-center gap-1.5 text-xs font-semibold text-hav-primary bg-hav-primary/8 hover:bg-hav-primary/15 px-3 py-1.5 rounded-lg transition-colors">
            <Pencil size={13} /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-hav-primary hover:bg-hav-primary-dark disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors">
              {saving ? <Spinner size="sm"/> : <><Save size={13}/> Guardar</>}
            </button>
          </div>
        )}
      </div>
      {editing ? <EditMode /> : <ViewMode />}
    </div>
  );
}

// Sub-componentes que cargan los tags desde la BD en modo vista
function AlergiasTags({ historialId }) {
  const [tags, setTags] = useState([]);
  useEffect(() => {
    if (!historialId) return;
    supabase.from('historial_alergias').select('alergias(nombre)').eq('id_historial', historialId)
      .then(({ data }) => setTags((data || []).map(r => r.alergias?.nombre).filter(Boolean)));
  }, [historialId]);
  if (!historialId || tags.length === 0) return <span className="text-sm text-gray-400">Ninguna registrada</span>;
  return <div className="flex flex-wrap gap-1.5">{tags.map(t => <span key={t} className="bg-red-200 text-red-800 text-xs font-semibold px-2.5 py-1 rounded-full">{t}</span>)}</div>;
}

function PatologiasTags({ historialId }) {
  const [tags, setTags] = useState([]);
  useEffect(() => {
    if (!historialId) return;
    supabase.from('historial_patologias').select('patologias(nombre)').eq('id_historial', historialId)
      .then(({ data }) => setTags((data || []).map(r => r.patologias?.nombre).filter(Boolean)));
  }, [historialId]);
  if (!historialId || tags.length === 0) return <span className="text-sm text-gray-400">Ninguna registrada</span>;
  return <div className="flex flex-wrap gap-1.5">{tags.map(t => <span key={t} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">{t}</span>)}</div>;
}
