import toast from 'react-hot-toast';
import { ChevronDown, Edit2, Layers, Plus, X } from 'lucide-react';
import type { FormLayout } from '../../types/permisos';

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
  setDirty: (v: boolean) => void;
}

export function TabCampos({ localCustomFields, setLocalCustomFields, localFormLayout, setLocalFormLayout, setDirty }: TabCamposProps) {
  const addCustomField = (label: string) => {
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    if (localCustomFields.some(f => f.key === key)) { toast.error('Ya existe un campo similar.'); return false; }
    setLocalCustomFields(prev => [...prev, { key, label, type: 'text', placeholder: '' }]);
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
    const u = [...arr]; const t = u[idx]; u[idx] = u[idx + dir]; u[idx + dir] = t; setArr(u); setDirty(true);
  };

  return (
    <div className="custom-fields-management" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Campos Personalizados ── */}
      <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Edit2 size={18} /> Campos Personalizados de Clientes</h3>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Definí nuevos campos a nivel de empresa para los formularios y fichas de clientes.</p>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {localCustomFields.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }} className="muted">No hay campos personalizados creados. Agregá uno abajo.</div>
          ) : localCustomFields.map((cf, index) => (
            <div key={cf.key} className="glass-card custom-field-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Etiqueta del Campo</label>
                <input type="text" className="input premium-input" style={{ height: '38px', fontSize: '0.9rem' }} value={cf.label}
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
                    <input type="text" className="input premium-input" style={{ height: '38px', fontSize: '0.9rem' }} placeholder="Ej: Opción A, Opción B"
                      value={cf.options_raw !== undefined ? cf.options_raw : (cf.options ? cf.options.join(', ') : '')}
                      onChange={e => { const raw = e.target.value; const parsed = raw.split(',').map((s: string) => s.trim()).filter(Boolean); setLocalCustomFields(p => p.map((f, i) => i === index ? { ...f, options: parsed, options_raw: raw } : f)); setDirty(true); }}
                      onBlur={() => setLocalCustomFields(p => p.map((f, i) => i === index ? { ...f, options_raw: undefined } : f))} />
                  </>
                ) : (
                  <>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Marcador (Placeholder)</label>
                    <input type="text" className="input premium-input" style={{ height: '38px', fontSize: '0.9rem' }} placeholder="Ej: Completar..."
                      value={cf.placeholder || ''}
                      onChange={e => { const v = e.target.value; setLocalCustomFields(p => p.map((f, i) => i === index ? { ...f, placeholder: v } : f)); setDirty(true); }} />
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '18px' }}>
                <button className="btn-secundario" style={{ padding: '6px', minWidth: 'auto', height: '38px' }} disabled={index === 0} type="button" title="Mover arriba"
                  onClick={() => moveField(localCustomFields, setLocalCustomFields, index, -1)}>
                  <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button className="btn-secundario" style={{ padding: '6px', minWidth: 'auto', height: '38px' }} disabled={index === localCustomFields.length - 1} type="button" title="Mover abajo"
                  onClick={() => moveField(localCustomFields, setLocalCustomFields, index, 1)}>
                  <ChevronDown size={14} />
                </button>
                <button className="btn-secundario danger-hover" style={{ padding: '6px', minWidth: 'auto', height: '38px' }} type="button" title="Eliminar"
                  onClick={() => { if (confirm(`¿Eliminar el campo "${cf.label}"?`)) { setLocalCustomFields(p => p.filter((_, i) => i !== index)); setDirty(true); } }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', maxWidth: '500px' }}>
          <input type="text" id="new-field-label" className="input premium-input" placeholder="Nueva etiqueta (Ej: Volumen de Compra)..." style={{ flex: 1, height: '40px' }}
            onKeyDown={e => { if (e.key === 'Enter') { const v = e.currentTarget.value.trim(); if (addCustomField(v)) e.currentTarget.value = ''; } }} />
          <button className="btn-primario" style={{ height: '40px', padding: '0 16px' }} type="button"
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
            <button className="btn-secundario danger-hover" style={{ padding: '6px 12px', fontSize: '0.8rem', height: '32px' }} type="button"
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
            <button className="btn-primario" type="button" onClick={() => {
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
              localCustomFields.forEach(cf => base.steps[0].fields.push({ key: cf.key, label: cf.label, type: cf.type, options: cf.options, placeholder: cf.placeholder, isStandard: false } as any));
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
                    <input type="text" className="input premium-input" style={{ height: '36px', fontSize: '0.95rem', fontWeight: 600, maxWidth: '300px' }} value={step.title}
                      onChange={e => { const v = e.target.value; setLocalFormLayout(p => ({ ...p!, steps: p!.steps.map((s, i) => i === stepIdx ? { ...s, title: v } : s) })); setDirty(true); }} />
                  </div>
                  <button className="btn-secundario danger-hover" style={{ padding: '4px 10px', fontSize: '0.78rem', height: '28px' }} type="button"
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
                    const isEditing = false;
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
              <button className="btn-secundario" style={{ height: '36px', padding: '0 16px' }} type="button"
                onClick={() => { setLocalFormLayout(p => ({ ...p!, steps: [...p!.steps, { id: p!.steps.length + 1, title: `Paso ${p!.steps.length + 1}`, fields: [] }] })); setDirty(true); }}>
                <Plus size={14} style={{ marginRight: 6 }} /> Agregar Nueva Pantalla
              </button>
            </div>

            {(() => {
              const placed = new Set(localFormLayout.steps.flatMap(s => s.fields.map(f => f.key)));
              const avail = [...STANDARD_FIELDS, ...localCustomFields.map(f => ({ key: f.key, label: f.label, type: f.type, isStandard: false }))].filter(f => !placed.has(f.key));
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
    </div>
  );
}
