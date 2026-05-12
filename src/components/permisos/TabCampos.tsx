import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, Edit2, Layers, Plus, X, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { FormLayout } from '../../types/permisos';

// Estilos locales forzados para asegurar legibilidad máxima y consistencia visual en todas las pantallas
const COMPONENT_STYLES = `
  .tab-campos-container input.premium-input {
    background: var(--bg-elevated) !important;
    color: var(--text) !important;
    border: 1px solid var(--border) !important;
    padding: 8px 12px !important;
    border-radius: 10px !important;
    font-size: 0.9rem !important;
    outline: none !important;
    width: 100%;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .tab-campos-container input.premium-input:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px var(--accent-alpha) !important;
  }
  .tab-campos-container input.premium-input::placeholder {
    color: var(--text-muted) !important;
    opacity: 0.6;
  }
  /* Resolver clases de peligro perdidas y asegurar colores base */
  .tab-campos-container .danger-hover:hover {
    background: rgba(239, 68, 68, 0.08) !important;
    color: #ef4444 !important;
    border-color: #ef4444 !important;
  }
  .tab-campos-container .danger-hover-text:hover {
    color: #ef4444 !important;
    opacity: 1 !important;
  }
  .tab-campos-container .btn-secundario {
    background: #ffffff !important;
    color: #111827 !important;
    border: 1px solid #d1d5db !important;
  }
  .tab-campos-container .btn-secundario:hover:not(:disabled) {
    background: #f9fafb !important;
    border-color: #9ca3af !important;
  }
`;

const STANDARD_FIELDS = [
  { key: 'nombre_local', label: 'Nombre del Local', type: 'text', isStandard: true },
  { key: 'direccion', label: 'Dirección', type: 'text', isStandard: true },
  { key: 'nombre', label: 'Nombre del Contacto', type: 'text', isStandard: true },
  { key: 'telefono', label: 'Teléfono', type: 'text', isStandard: true },
  { key: 'mail', label: 'Mail', type: 'email', isStandard: true },
  { key: 'cuit', label: 'CUIT', type: 'text', isStandard: true },
  { key: 'horarios_atencion', label: 'Horarios de Atención', type: 'text', isStandard: true },
  { key: 'estilo_contacto', label: 'Estilo de Contacto', type: 'select', isStandard: true },
  { key: 'tipo_contacto', label: 'Tipo de Contacto', type: 'select', isStandard: true },
  { key: 'responsable', label: 'Responsable', type: 'select', isStandard: true },
  { key: 'rubro', label: 'Rubro', type: 'select', isStandard: true },
  { key: 'estado', label: 'Estado', type: 'select', isStandard: true },
  { key: 'interes', label: 'Nivel de Interés', type: 'interes_bar', isStandard: true },
  { key: 'venta_digital', label: '¿Venta Digital?', type: 'venta_digital', isStandard: true },
  { key: 'grupos', label: 'Grupos / Etiquetas', type: 'grupos', isStandard: true },
  { key: 'situacion', label: 'Situación', type: 'situacion', isStandard: true },
  { key: 'fecha_proximo_contacto', label: 'Próxima Visita (Fecha)', type: 'agenda', isStandard: true },
  { key: 'notas', label: 'Notas', type: 'textarea', isStandard: true },
];

interface TabCamposProps {
  localCustomFields: any[];
  setLocalCustomFields: React.Dispatch<React.SetStateAction<any[]>>;
  localFormLayout: FormLayout | null;
  setLocalFormLayout: React.Dispatch<React.SetStateAction<FormLayout | null>>;
  localRubros: string[];
  setLocalRubros: React.Dispatch<React.SetStateAction<string[]>>;
  setDirty: (v: boolean) => void;
}

export function TabCampos({ 
  localCustomFields = [], setLocalCustomFields, localFormLayout, setLocalFormLayout, 
  localRubros = [], setLocalRubros, setDirty 
}: TabCamposProps) {
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  
  // Cargar rubros globales e inyectarlos automáticamente si el listado está vacío
  useEffect(() => {
    if (hasLoadedDefaults) return;
    
    const loadInitialData = async () => {
      // Si ya hay rubros de la empresa, no hacemos nada
      if (Array.isArray(localRubros) && localRubros.length > 0) {
        setHasLoadedDefaults(true);
        return;
      }

      // Si no hay rubros propios, cargamos los globales automáticamente como punto de partida
      try {
        const { data } = await (supabase as any)
          .from('rubros')
          .select('nombre')
          .order('nombre', { ascending: true });

        if (data && data.length > 0) {
          const defaultRubros = data.map((r: any) => r.nombre);
          setLocalRubros(defaultRubros);
          // Nota: No forzamos setDirty(true) acá para que no les pida guardar 
          // si solo entran a ver, pero ya los tienen cargados visualmente.
        }
      } catch (error) {
        console.error('Error cargando rubros iniciales:', error);
      } finally {
        setHasLoadedDefaults(true);
      }
    };

    loadInitialData();
  }, [localRubros, setLocalRubros, hasLoadedDefaults]);

  const addCustomField = (label: string) => {
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    const fields = Array.isArray(localCustomFields) ? localCustomFields : [];
    if (fields.some(f => f.key === key)) { toast.error('Ya existe un campo similar.'); return false; }
    setLocalCustomFields(prev => [...(Array.isArray(prev) ? prev : []), { key, label, type: 'text', placeholder: '' }]);
    setLocalFormLayout(prev => {
      if (!prev?.steps) return prev;
      const steps = [...prev.steps];
      if (!steps[0].fields.some(f => f.key === key)) steps[0].fields.push({ key, label, type: 'text', isStandard: false });
      return { ...prev, steps };
    });
    setDirty(true);
    return true;
  };

  const moveField = (arr: any[], setArr: Function, idx: number, dir: number) => {
    const safeArr = Array.isArray(arr) ? arr : [];
    const u = [...safeArr]; const t = u[idx]; u[idx] = u[idx + dir]; u[idx + dir] = t; setArr(u); setDirty(true);
  };

  const currentCustomFields = Array.isArray(localCustomFields) ? localCustomFields : [];
  const currentRubros = Array.isArray(localRubros) ? localRubros : [];

  return (
    <div className="custom-fields-management tab-campos-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{COMPONENT_STYLES}</style>
      {/* ── Campos Personalizados ── */}
      <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Edit2 size={18} /> Campos Personalizados de Clientes</h3>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Definí nuevos campos a nivel de empresa para los formularios y fichas de clientes.</p>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentCustomFields.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }} className="muted">No hay campos personalizados creados. Agregá uno abajo.</div>
          ) : currentCustomFields.map((cf, index) => (
            <div key={cf.key} className="glass-card custom-field-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Etiqueta del Campo</label>
                <input type="text" className="input premium-input" style={{ height: '38px', fontSize: '0.9rem', background: '#ffffff', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '10px' }} value={cf.label}
                  onChange={e => { const v = e.target.value; setLocalCustomFields(p => p.map((f, i) => i === index ? { ...f, label: v } : f)); setDirty(true); }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tipo</label>
                <select className="input premium-input" style={{ height: '38px', fontSize: '0.9rem', cursor: 'pointer' }} value={cf.type}
                  onChange={e => { const v = e.target.value; setLocalCustomFields(p => p.map((f, i) => i === index ? { ...f, type: v, options: v === 'select' ? (f.options || []) : undefined } : f)); setDirty(true); }}>
                  <option value="text">Texto Corto</option>
                  <option value="number">Número</option>
                  <option value="boolean">Verdadero/Falso (Check)</option>
                  <option value="select">Opciones de Selección</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {cf.type === 'select' ? (
                  <>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Opciones (separadas por coma)</label>
                    <input type="text" className="input premium-input" style={{ height: '38px', fontSize: '0.9rem', background: '#ffffff', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '10px' }} placeholder="Ej: Opción A, Opción B"
                      value={cf.options_raw !== undefined ? cf.options_raw : (cf.options ? cf.options.join(', ') : '')}
                      onChange={e => { const raw = e.target.value; const parsed = raw.split(',').map((s: string) => s.trim()).filter(Boolean); setLocalCustomFields(p => p.map((f, i) => i === index ? { ...f, options: parsed, options_raw: raw } : f)); setDirty(true); }}
                      onBlur={() => setLocalCustomFields(p => p.map((f, i) => i === index ? { ...f, options_raw: undefined } : f))} />
                  </>
                ) : (
                  <>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Marcador (Placeholder)</label>
                    <input type="text" className="input premium-input" style={{ height: '38px', fontSize: '0.9rem', background: '#ffffff', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '10px' }} placeholder="Ej: Completar..."
                      value={cf.placeholder || ''}
                      onChange={e => { const v = e.target.value; setLocalCustomFields(p => p.map((f, i) => i === index ? { ...f, placeholder: v } : f)); setDirty(true); }} />
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '18px' }}>
                <button className="btn-secundario" style={{ padding: '6px', minWidth: 'auto', width: 'auto', height: '38px' }} disabled={index === 0} type="button" title="Mover arriba"
                  onClick={() => moveField(currentCustomFields, setLocalCustomFields, index, -1)}>
                  <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button className="btn-secundario" style={{ padding: '6px', minWidth: 'auto', width: 'auto', height: '38px' }} disabled={index === currentCustomFields.length - 1} type="button" title="Mover abajo"
                  onClick={() => moveField(currentCustomFields, setLocalCustomFields, index, 1)}>
                  <ChevronDown size={14} />
                </button>
                <button className="btn-secundario danger-hover" style={{ padding: '6px', minWidth: 'auto', width: 'auto', height: '38px' }} type="button" title="Eliminar"
                  onClick={() => { if (confirm(`¿Eliminar el campo "${cf.label}"?`)) { setLocalCustomFields(p => p.filter((_, i) => i !== index)); setDirty(true); } }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', maxWidth: '500px' }}>
          <input type="text" id="new-field-label" className="input premium-input" placeholder="Nueva etiqueta (Ej: Volumen de Compra)..." style={{ flex: 1, height: '40px', background: '#ffffff', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '10px' }}
            onKeyDown={e => { if (e.key === 'Enter') { const v = e.currentTarget.value.trim(); if (addCustomField(v)) e.currentTarget.value = ''; } }} />
          <button className="btn-primario" style={{ height: '40px', padding: '0 16px', width: 'auto', minWidth: 'fit-content' }} type="button"
            onClick={() => { const inp = document.getElementById('new-field-label') as HTMLInputElement; if (inp && addCustomField(inp.value.trim())) inp.value = ''; }}>
            <Plus size={16} style={{ marginRight: 6 }} /> Agregar Campo
          </button>
        </div>
      </div>

      {/* ── Diseñador de Pasos (Wizard) ── */}
      <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={18} /> Diseñador de Pasos del Formulario (Wizard)</h3>
          {localFormLayout && (
            <button className="btn-secundario danger-hover" style={{ padding: '6px 12px', fontSize: '0.8rem', height: '32px', width: 'auto', minWidth: 'fit-content' }} type="button"
              onClick={() => { if (confirm('¿Restablecer la distribución por defecto?')) { setLocalFormLayout(null); setDirty(true); } }}>
              Restablecer por defecto
            </button>
          )}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem', marginBottom: '20px' }}>
          Configurá la cantidad de pantallas (pasos), la distribución de los campos y la obligatoriedad de los datos del cliente.
        </p>

        {!localFormLayout?.steps ? (
          <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }}>
            <p className="muted" style={{ marginBottom: '16px', fontSize: '0.95rem' }}>El formulario tiene actualmente la distribución de 3 pasos estándar por defecto.</p>
            <button className="btn-primario" style={{ width: 'auto', minWidth: 'fit-content', padding: '0 20px' }} type="button" onClick={() => {
              const base = { steps: [
                { id: 1, title: '1. Datos del Local y Contacto', fields: [
                  { key: 'nombre_local', label: 'Nombre del Local', type: 'text', isStandard: true, required: true },
                  { key: 'direccion', label: 'Dirección', type: 'text', isStandard: true, required: true },
                  { key: 'nombre', label: 'Nombre del Contacto', type: 'text', isStandard: true, required: true },
                  { key: 'telefono', label: 'Teléfono', type: 'text', isStandard: true, required: true },
                  { key: 'mail', label: 'Mail', type: 'email', isStandard: true },
                  { key: 'cuit', label: 'CUIT', type: 'text', isStandard: true },
                  { key: 'horarios_atencion', label: 'Horarios de Atención', type: 'text', isStandard: true },
                  { key: 'estilo_contacto', label: 'Estilo de Contacto', type: 'select', isStandard: true },
                  { key: 'tipo_contacto', label: 'Tipo de Contacto', type: 'select', isStandard: true },
                  { key: 'responsable', label: 'Responsable', type: 'select', isStandard: true },
                ]},
                { id: 2, title: '2. Clasificación del Cliente', fields: [
                  { key: 'rubro', label: 'Rubro', type: 'select', isStandard: true, required: true },
                  { key: 'estado', label: 'Estado', type: 'select', isStandard: true },
                  { key: 'interes', label: 'Nivel de Interés', type: 'interes_bar', isStandard: true },
                  { key: 'venta_digital', label: '¿Venta Digital?', type: 'venta_digital', isStandard: true },
                  { key: 'grupos', label: 'Grupos / Etiquetas', type: 'grupos', isStandard: true },
                  { key: 'situacion', label: 'Situación', type: 'situacion', isStandard: true },
                ]},
                { id: 3, title: '3. Agenda y Notas', fields: [
                  { key: 'fecha_proximo_contacto', label: 'Próxima Visita', type: 'agenda', isStandard: true },
                  { key: 'notas', label: 'Notas', type: 'textarea', isStandard: true },
                ]},
              ]};
              currentCustomFields.forEach(cf => base.steps[0].fields.push({ key: cf.key, label: cf.label, type: cf.type, options: cf.options, placeholder: cf.placeholder, isStandard: false } as any));
              setLocalFormLayout(base as FormLayout);
              setDirty(true);
            }}>
              <Plus size={16} style={{ marginRight: 6 }} /> Personalizar Distribución de Pantallas
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {localFormLayout.steps.map((step, stepIdx) => (
              <div key={stepIdx} className="glass-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, background: 'var(--accent)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stepIdx + 1}</span>
                    <input type="text" className="input premium-input" style={{ height: '38px', fontSize: '0.95rem', fontWeight: 600, maxWidth: '300px', width: '100%', background: '#ffffff', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '10px' }} value={step.title}
                      onChange={e => { const v = e.target.value; setLocalFormLayout(p => ({ ...p!, steps: p!.steps.map((s, i) => i === stepIdx ? { ...s, title: v } : s) })); setDirty(true); }} />
                  </div>
                  <button className="btn-secundario danger-hover" style={{ padding: '4px 10px', fontSize: '0.78rem', height: '28px', width: 'auto', minWidth: 'fit-content' }} type="button"
                    onClick={() => {
                      if (localFormLayout.steps.length <= 1) { toast.error('El formulario debe tener al menos una pantalla.'); return; }
                      if (confirm('¿Eliminar esta pantalla? Sus campos se moverán a la primera pantalla.')) {
                        const fieldsToMove = step.fields || [];
                        const updated = localFormLayout.steps.filter((_, i) => i !== stepIdx);
                        updated[0].fields = [...(updated[0].fields || []), ...fieldsToMove];
                        updated.forEach((s, i) => { s.id = i + 1; });
                        setLocalFormLayout({ steps: updated });
                        setDirty(true);
                      }
                    }}>Eliminar Pantalla</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(step.fields || []).length === 0 ? (
                    <p className="muted" style={{ margin: 0, fontSize: '0.8rem', padding: '12px', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center' }}>No hay campos en esta pantalla.</p>
                  ) : step.fields.map((cf, cfIdx) => {
                    return (
                      <div key={cf.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cf.label}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: cf.isStandard ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: cf.isStandard ? 'var(--accent)' : '#10b981' }}>
                              {cf.isStandard ? 'Estándar' : 'Personalizado'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none' }}>
                              <input type="checkbox" checked={Boolean(cf.required)} style={{ width: '15px', height: '15px', accentColor: 'var(--accent)' }}
                                onChange={e => { const v = e.target.checked; setLocalFormLayout(p => ({ ...p!, steps: p!.steps.map((s, si) => si === stepIdx ? { ...s, fields: s.fields.map((f, fi) => fi === cfIdx ? { ...f, required: v } : f) } : s) })); setDirty(true); }} />
                              Obligatorio
                            </label>
                            <select style={{ height: '28px', fontSize: '0.8rem', padding: '0 8px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}
                              value={stepIdx}
                              onChange={e => {
                                const ti = Number(e.target.value);
                                if (ti === stepIdx) return;
                                setLocalFormLayout(p => {
                                  const u = [...p!.steps];
                                  const [moved] = u[stepIdx].fields.splice(cfIdx, 1);
                                  u[ti].fields.push(moved);
                                  return { ...p!, steps: u };
                                });
                                setDirty(true);
                              }}>
                              {localFormLayout.steps.map((_, i) => <option key={i} value={i}>Mover a paso {i + 1}</option>)}
                            </select>
                            <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }} type="button"
                              onClick={() => { setLocalFormLayout(p => ({ ...p!, steps: p!.steps.map((s, si) => si === stepIdx ? { ...s, fields: s.fields.filter((_, fi) => fi !== cfIdx) } : s) })); setDirty(true); }}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secundario" style={{ height: '36px', padding: '0 16px', width: 'auto', minWidth: 'fit-content' }} type="button"
                onClick={() => { setLocalFormLayout(p => ({ ...p!, steps: [...p!.steps, { id: p!.steps.length + 1, title: `Paso ${p!.steps.length + 1}`, fields: [] }] })); setDirty(true); }}>
                <Plus size={14} style={{ marginRight: 6 }} /> Agregar Nueva Pantalla
              </button>
            </div>

            {(() => {
              const placed = new Set(localFormLayout.steps.flatMap(s => s.fields.map(f => f.key)));
              const avail = [...STANDARD_FIELDS, ...currentCustomFields.map(f => ({ key: f.key, label: f.label, type: f.type, isStandard: false }))].filter(f => !placed.has(f.key));
              if (!avail.length) return null;
              return (
                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(var(--accent-rgb), 0.03)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 700 }}>📥 Campos Disponibles No Asignados ({avail.length})</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {avail.map(cf => (
                      <div key={cf.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                        <span>{cf.label}</span>
                        <select style={{ height: '22px', fontSize: '0.75rem', padding: '0 4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                          value="" onChange={e => { const ti = Number(e.target.value); setLocalFormLayout(p => { const u = [...p!.steps]; u[ti].fields.push(cf as any); return { ...p!, steps: u }; }); setDirty(true); }}>
                          <option value="" disabled>Añadir a...</option>
                          {localFormLayout.steps.map((_, i) => <option key={i} value={i}>Paso {i + 1}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Listados Maestros (Rubros) ── */}
      <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Plus size={18} /> Listado de Rubros (Categorías de Negocio)</h3>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem', marginBottom: '20px' }}>
          Configurá los rubros que usa tu empresa. Podés renombrar, eliminar o agregar nuevas opciones directamente desde acá.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          {currentRubros.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', width: '100%' }} className="muted">
              No hay rubros cargados actualmente. Agregá tu primera categoría abajo.
            </div>
          ) : currentRubros.map((r, idx) => (
            <div key={`${r}-${idx}`} style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '8px 12px', borderRadius: '12px', 
              background: 'var(--bg)', border: '1px solid var(--border)', 
              fontSize: '0.9rem', fontWeight: 600 
            }}>
              <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border)', paddingLeft: '6px', marginLeft: '4px' }}>
                <button type="button" title="Renombrar" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  onClick={() => {
                    const newName = prompt(`Ingresá el nuevo nombre para "${r}":`, r);
                    if (newName && newName.trim() && newName.trim() !== r) {
                      const updated = [...currentRubros];
                      updated[idx] = newName.trim();
                      setLocalRubros(updated);
                      setDirty(true);
                    }
                  }}>
                  <Edit2 size={13} />
                </button>
                <button type="button" title="Eliminar" className="danger-hover-text" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  onClick={() => { 
                    if (confirm(`¿Seguro querés eliminar el rubro "${r}"?`)) {
                      setLocalRubros(prev => prev.filter((_, i) => i !== idx)); 
                      setDirty(true); 
                    }
                  }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', maxWidth: '500px', width: '100%', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input type="text" id="new-rubro-input" className="input premium-input" placeholder="Ej: Distribuidora, Kiosco..." style={{ height: '42px', width: '100%', background: '#ffffff', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '10px' }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = e.currentTarget.value.trim();
                  if (v && !currentRubros.includes(v)) { setLocalRubros(prev => [...prev, v]); e.currentTarget.value = ''; setDirty(true); }
                }
              }}
            />
          </div>
          <button className="btn-primario" style={{ height: '42px', padding: '0 16px', flexShrink: 0, width: 'auto', minWidth: 'fit-content' }} type="button"
            onClick={() => {
              const inp = document.getElementById('new-rubro-input') as HTMLInputElement;
              const v = inp?.value.trim();
              if (v && !currentRubros.includes(v)) { setLocalRubros(prev => [...prev, v]); inp.value = ''; setDirty(true); }
            }}>
            <Plus size={16} style={{ marginRight: 6 }} /> Agregar Rubro
          </button>
        </div>
      </div>
    </div>
  );
}
