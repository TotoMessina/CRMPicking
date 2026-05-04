import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, ChevronDown, Megaphone, Video, Radio, MapPin, Users, Award } from 'lucide-react';

const TIPOS = [
  { key: 'Campañas Redes Sociales', icon: Megaphone, color: '#8b5cf6' },
  { key: 'Marketing de video',       icon: Video,     color: '#ef4444' },
  { key: 'Medios masivos',           icon: Radio,     color: '#f59e0b' },
  { key: 'Publicidad exterior',      icon: MapPin,    color: '#10b981' },
  { key: 'Campañas presenciales',    icon: Users,     color: '#3b82f6' },
  { key: 'Patrocinio',               icon: Award,     color: '#ec4899' },
];

const PERCEPCIONES = ['Muy buena', 'Buena', 'Regular', 'Mala', 'Muy mala'];

const CAMPOS_COMUNES = [
  { key: 'nombre',       label: 'Nombre de la campaña', type: 'text', required: true },
  { key: 'objetivo',     label: 'Objetivo',             type: 'textarea' },
  { key: 'fecha_inicio', label: 'Fecha de inicio',      type: 'date', required: true },
  { key: 'fecha_fin',    label: 'Fecha de fin',         type: 'date' },
  { key: 'horario_inicio', label: 'Horario inicio',     type: 'time' },
  { key: 'horario_fin',  label: 'Horario fin',          type: 'time' },
  { key: 'participantes',label: 'Participantes',        type: 'text' },
  { key: 'zona',         label: 'Zona',                 type: 'text' },
  { key: 'calles',       label: 'Calles / Área',        type: 'text' },
  { key: 'costo',        label: 'Costo (USD)',           type: 'number' },
  { key: 'regalo',       label: 'Regalo / Incentivo',   type: 'text' },
  { key: 'descargas_obtenidas', label: 'Descargas obtenidas', type: 'number' },
  { key: 'cuentas_creadas',     label: 'Cuentas creadas',     type: 'number' },
  { key: 'justificacion',       label: 'Justificación / Aprendizaje', type: 'textarea' },
];

const CAMPOS_POR_TIPO: Record<string, { key: string; label: string; type: string }[]> = {
  'Campañas Redes Sociales': [
    { key: 'plataformas',         label: 'Plataformas (separadas por coma)', type: 'text' },
    { key: 'alcance_estimado',    label: 'Alcance estimado (impresiones)',   type: 'number' },
    { key: 'alcance_real',        label: 'Alcance real (impresiones)',       type: 'number' },
    { key: 'clicks',              label: 'Clicks',                           type: 'number' },
    { key: 'likes',               label: 'Likes',                            type: 'number' },
    { key: 'compartidos',         label: 'Compartidos',                      type: 'number' },
    { key: 'costo_por_resultado', label: 'Costo por resultado (CPR)',        type: 'number' },
  ],
  'Marketing de video': [
    { key: 'plataformas',      label: 'Plataformas (YouTube, TikTok…)', type: 'text' },
    { key: 'reproducciones',   label: 'Reproducciones',                  type: 'number' },
    { key: 'alcance_real',     label: 'Alcance real',                    type: 'number' },
    { key: 'likes',            label: 'Likes',                           type: 'number' },
    { key: 'compartidos',      label: 'Compartidos',                     type: 'number' },
    { key: 'costo_por_resultado', label: 'Costo por reproducción',       type: 'number' },
  ],
  'Medios masivos': [
    { key: 'plataformas',      label: 'Medio (TV, Radio, Diario…)',     type: 'text' },
    { key: 'alcance_estimado', label: 'Audiencia estimada',              type: 'number' },
    { key: 'alcance_real',     label: 'Audiencia real (post)',           type: 'number' },
    { key: 'duracion_dias',    label: 'Duración en días',                type: 'number' },
  ],
  'Publicidad exterior': [
    { key: 'tipo_soporte',      label: 'Tipo de soporte (cartel, pantalla…)', type: 'text' },
    { key: 'ubicacion_soporte', label: 'Ubicación del soporte',               type: 'text' },
    { key: 'duracion_dias',     label: 'Días de exposición',                  type: 'number' },
    { key: 'alcance_estimado',  label: 'Personas estimadas impactadas',       type: 'number' },
  ],
  'Campañas presenciales': [
    { key: 'evento',                      label: 'Nombre del evento',           type: 'text' },
    { key: 'lugar_evento',                label: 'Lugar del evento',            type: 'text' },
    { key: 'cantidad_personas_alcanzadas',label: 'Personas alcanzadas',         type: 'number' },
    { key: 'materiales_usados',           label: 'Materiales usados (flyers…)', type: 'text' },
  ],
  'Patrocinio': [
    { key: 'nombre_patrocinado',          label: 'Nombre patrocinado (persona/evento)', type: 'text' },
    { key: 'evento',                      label: 'Evento o actividad',                  type: 'text' },
    { key: 'lugar_evento',                label: 'Lugar',                               type: 'text' },
    { key: 'cantidad_personas_alcanzadas',label: 'Personas impactadas',                 type: 'number' },
    { key: 'alcance_estimado',            label: 'Alcance en medios estimado',          type: 'number' },
  ],
};

const EMPTY_FORM: Record<string, any> = {
  tipo: '', nombre: '', objetivo: '', fecha_inicio: '', fecha_fin: '',
  horario_inicio: '', horario_fin: '', participantes: '', zona: '', calles: '',
  costo: '', regalo: '', descargas_obtenidas: '', cuentas_creadas: '',
  justificacion: '', percepcion_resultado: '',
  plataformas: '', alcance_estimado: '', alcance_real: '', clicks: '',
  likes: '', compartidos: '', costo_por_resultado: '', reproducciones: '',
  duracion_dias: '', tipo_soporte: '', ubicacion_soporte: '', evento: '',
  lugar_evento: '', cantidad_personas_alcanzadas: '', materiales_usados: '',
  nombre_patrocinado: '', etiquetas: '',
};

export default function Campanas() {
  const { empresaActiva } = useAuth();
  const [campanas, setCampanas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [filterTipo, setFilterTipo] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchCampanas = async () => {
    if (!empresaActiva?.id) return;
    setLoading(true);
    const q = supabase.from('campanas' as any).select('*').eq('empresa_id', empresaActiva.id).order('fecha_inicio', { ascending: false });
    const { data, error } = await (filterTipo ? q.eq('tipo', filterTipo) : q);
    if (!error) setCampanas(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCampanas(); }, [empresaActiva, filterTipo]);

  const handleChange = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaActiva?.id) return;
    setSaving(true);
    const payload: any = { ...form, empresa_id: empresaActiva.id };
    // Limpiar campos vacíos
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    // Arrays
    if (payload.plataformas) payload.plataformas = payload.plataformas.split(',').map((s: string) => s.trim());
    if (payload.etiquetas)   payload.etiquetas   = payload.etiquetas.split(',').map((s: string) => s.trim());

    const { error } = await (supabase.from('campanas' as any) as any).insert(payload);
    if (error) { toast.error('Error al guardar: ' + error.message); }
    else { toast.success('¡Campaña guardada!'); setShowForm(false); setForm({ ...EMPTY_FORM }); fetchCampanas(); }
    setSaving(false);
  };

  const tipoConfig = TIPOS.find(t => t.key === form.tipo);
  const camposEspecificos = form.tipo ? (CAMPOS_POR_TIPO[form.tipo] || []) : [];

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>📣 Campañas de Promoción</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.6, fontSize: '0.9rem' }}>Registrá cada acción de marketing para que la IA aprenda de los resultados.</p>
        </div>
        <button
          id="btn-nueva-campana"
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-primary, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
        >
          <Plus size={18} /> Nueva Campaña
        </button>
      </div>

      {/* Filtro por tipo */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <button onClick={() => setFilterTipo('')} style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', borderColor: filterTipo === '' ? '#8b5cf6' : 'var(--border-color, #e2e8f0)', background: filterTipo === '' ? '#8b5cf620' : 'transparent', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
          Todas
        </button>
        {TIPOS.map(t => (
          <button key={t.key} onClick={() => setFilterTipo(t.key)} style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', borderColor: filterTipo === t.key ? t.color : 'var(--border-color, #e2e8f0)', background: filterTipo === t.key ? t.color + '20' : 'transparent', color: filterTipo === t.key ? t.color : 'inherit', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
            {t.key}
          </button>
        ))}
      </div>

      {/* Lista de campañas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>Cargando campañas...</div>
      ) : campanas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>
          <Megaphone size={48} style={{ marginBottom: 12 }} />
          <p>No hay campañas registradas aún. ¡Creá la primera!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campanas.map(c => {
            const tc = TIPOS.find(t => t.key === c.tipo);
            const Icon = tc?.icon || Megaphone;
            const isOpen = expandedId === c.id;
            return (
              <div key={c.id} style={{ border: '1.5px solid', borderColor: tc?.color + '44' || '#e2e8f0', borderRadius: 12, overflow: 'hidden', background: 'var(--card-bg, #fff)' }}>
                <button
                  onClick={() => setExpandedId(isOpen ? null : c.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: tc?.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={tc?.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.nombre}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{c.tipo} · {c.fecha_inicio}{c.fecha_fin ? ` → ${c.fecha_fin}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                    {c.percepcion_resultado && (
                      <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 20, background: c.percepcion_resultado.includes('buena') || c.percepcion_resultado === 'Buena' ? '#10b98120' : c.percepcion_resultado === 'Regular' ? '#f59e0b20' : '#ef444420', color: c.percepcion_resultado.includes('buena') || c.percepcion_resultado === 'Buena' ? '#10b981' : c.percepcion_resultado === 'Regular' ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                        {c.percepcion_resultado}
                      </span>
                    )}
                    {c.costo && <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>${Number(c.costo).toLocaleString()}</span>}
                    <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5 }} />
                  </div>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 18px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 20px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                    {[
                      { label: 'Objetivo', val: c.objetivo },
                      { label: 'Zona / Calles', val: [c.zona, c.calles].filter(Boolean).join(' — ') },
                      { label: 'Horario', val: [c.horario_inicio, c.horario_fin].filter(Boolean).join(' → ') },
                      { label: 'Participantes', val: c.participantes },
                      { label: 'Regalo', val: c.regalo },
                      { label: 'Descargas', val: c.descargas_obtenidas },
                      { label: 'Cuentas creadas', val: c.cuentas_creadas },
                      { label: 'Plataformas', val: Array.isArray(c.plataformas) ? c.plataformas.join(', ') : c.plataformas },
                      { label: 'Alcance estimado', val: c.alcance_estimado },
                      { label: 'Alcance real', val: c.alcance_real },
                      { label: 'Clicks', val: c.clicks },
                      { label: 'Reproducciones', val: c.reproducciones },
                      { label: 'Likes', val: c.likes },
                      { label: 'Compartidos', val: c.compartidos },
                      { label: 'CPR', val: c.costo_por_resultado ? `$${c.costo_por_resultado}` : null },
                      { label: 'Tipo soporte', val: c.tipo_soporte },
                      { label: 'Ubicación soporte', val: c.ubicacion_soporte },
                      { label: 'Días exposición', val: c.duracion_dias },
                      { label: 'Evento', val: c.evento },
                      { label: 'Lugar evento', val: c.lugar_evento },
                      { label: 'Personas alcanzadas', val: c.cantidad_personas_alcanzadas },
                      { label: 'Materiales', val: c.materiales_usados },
                      { label: 'Patrocinado', val: c.nombre_patrocinado },
                      { label: 'Etiquetas', val: Array.isArray(c.etiquetas) ? c.etiquetas.join(', ') : c.etiquetas },
                      { label: 'Justificación', val: c.justificacion },
                    ].filter(f => f.val !== null && f.val !== undefined && f.val !== '').map(f => (
                      <div key={f.label} style={{ paddingTop: 10 }}>
                        <div style={{ fontSize: '0.73rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                        <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{String(f.val)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000080', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, width: '100%', maxWidth: 700, padding: 28, position: 'relative', marginTop: 20 }}>
            <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={22} /></button>
            <h2 style={{ margin: '0 0 20px', fontWeight: 800 }}>Nueva Campaña</h2>

            <form onSubmit={handleSubmit}>
              {/* Selector de tipo */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, opacity: 0.6, display: 'block', marginBottom: 8 }}>TIPO DE CAMPAÑA *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                  {TIPOS.map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => handleChange('tipo', t.key)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', border: '2px solid', borderColor: form.tipo === t.key ? t.color : 'var(--border-color, #e2e8f0)', borderRadius: 10, background: form.tipo === t.key ? t.color + '15' : 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: form.tipo === t.key ? t.color : 'inherit', transition: 'all 0.15s' }}
                      >
                        <Icon size={22} color={form.tipo === t.key ? t.color : 'currentColor'} />
                        <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{t.key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.tipo && (
                <>
                  {/* Campos comunes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 12 }}>
                    {CAMPOS_COMUNES.map(campo => (
                      <div key={campo.key} style={{ gridColumn: campo.type === 'textarea' ? '1 / -1' : 'auto' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.6, display: 'block', marginBottom: 4 }}>
                          {campo.label.toUpperCase()}{campo.required ? ' *' : ''}
                        </label>
                        {campo.type === 'textarea' ? (
                          <textarea
                            value={form[campo.key] || ''}
                            onChange={e => handleChange(campo.key, e.target.value)}
                            required={campo.required}
                            rows={3}
                            style={{ width: '100%', borderRadius: 8, border: '1.5px solid var(--border-color, #e2e8f0)', padding: '8px 12px', fontSize: '0.9rem', background: 'var(--input-bg, #f8fafc)', resize: 'vertical', boxSizing: 'border-box' }}
                          />
                        ) : (
                          <input
                            type={campo.type}
                            value={form[campo.key] || ''}
                            onChange={e => handleChange(campo.key, e.target.value)}
                            required={campo.required}
                            style={{ width: '100%', borderRadius: 8, border: '1.5px solid var(--border-color, #e2e8f0)', padding: '8px 12px', fontSize: '0.9rem', background: 'var(--input-bg, #f8fafc)', boxSizing: 'border-box' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Percepción de resultado */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.6, display: 'block', marginBottom: 6 }}>PERCEPCIÓN DE RESULTADO</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {PERCEPCIONES.map(p => (
                        <button key={p} type="button" onClick={() => handleChange('percepcion_resultado', p)}
                          style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', borderColor: form.percepcion_resultado === p ? '#8b5cf6' : 'var(--border-color, #e2e8f0)', background: form.percepcion_resultado === p ? '#8b5cf620' : 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: form.percepcion_resultado === p ? '#8b5cf6' : 'inherit' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campos específicos del tipo */}
                  {camposEspecificos.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingTop: 10, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                        Datos específicos — {form.tipo}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                        {camposEspecificos.map(campo => (
                          <div key={campo.key}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.6, display: 'block', marginBottom: 4 }}>{campo.label.toUpperCase()}</label>
                            <input
                              type={campo.type}
                              value={form[campo.key] || ''}
                              onChange={e => handleChange(campo.key, e.target.value)}
                              style={{ width: '100%', borderRadius: 8, border: '1.5px solid var(--border-color, #e2e8f0)', padding: '8px 12px', fontSize: '0.9rem', background: 'var(--input-bg, #f8fafc)', boxSizing: 'border-box' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Etiquetas IA */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.6, display: 'block', marginBottom: 4 }}>🤖 ETIQUETAS PARA LA IA (separadas por coma)</label>
                    <input
                      type="text"
                      value={form.etiquetas || ''}
                      onChange={e => handleChange('etiquetas', e.target.value)}
                      placeholder="ej: verano, zona-sur, flyers, descuento"
                      style={{ width: '100%', borderRadius: 8, border: '1.5px solid var(--border-color, #e2e8f0)', padding: '8px 12px', fontSize: '0.9rem', background: 'var(--input-bg, #f8fafc)', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    style={{ width: '100%', padding: '12px', background: tipoConfig?.color || '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? 'Guardando...' : '✓ Guardar Campaña'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
