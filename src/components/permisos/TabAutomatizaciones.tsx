import { Plus, Trash2 } from 'lucide-react';
import type { AutomationRule, UsuarioEmpresa } from '../../types/permisos';

interface TabAutomatizacionesProps {
    automations: AutomationRule[];
    setAutomations: React.Dispatch<React.SetStateAction<AutomationRule[]>>;
    usuariosEmpresa: UsuarioEmpresa[];
    setDirty: (v: boolean) => void;
}

export function TabAutomatizaciones({ automations, setAutomations, usuariosEmpresa, setDirty }: TabAutomatizacionesProps) {

    const updateRule = (idx: number, patch: Partial<AutomationRule>) => {
        setAutomations(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
        setDirty(true);
    };

    const addRule = () => {
        setAutomations(prev => [...prev, {
            trigger: 'state_changed',
            value: 'sin_interes',
            action: 'assign_responsible',
            target: usuariosEmpresa[0]?.nombre || '',
        }]);
        setDirty(true);
    };

    const removeRule = (idx: number) => {
        setAutomations(prev => prev.filter((_, i) => i !== idx));
        setDirty(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>⚡ Reglas de Automatización Sin Código</h3>
                        <p className="muted" style={{ margin: 0, fontSize: '0.85rem', marginTop: '4px' }}>
                            Creá flujos automáticos inteligentes de tipo "Si pasa esto ➔ Hace esto" para ahorrar tiempo operativo.
                        </p>
                    </div>
                    <button type="button" className="btn-primario" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} onClick={addRule}>
                        <Plus size={16} /> Nueva Regla
                    </button>
                </div>

                {automations.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '12px' }}>
                        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                            No hay automatizaciones creadas todavía. ¡Hacé clic en "Nueva Regla" para empezar!
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {automations.map((rule, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto', gap: '16px', alignItems: 'center', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Si el cliente...</span>
                                    <select className="input premium-input" style={{ height: '38px', fontSize: '0.85rem' }} value={rule.trigger}
                                        onChange={e => updateRule(idx, { 
                                            trigger: e.target.value as AutomationRule['trigger'],
                                            value: e.target.value === 'interest_changed' ? '100' : 'sin_interes'
                                        })}>
                                        <option value="state_changed">Cambia de Estado</option>
                                        <option value="interest_changed">Cambia Nivel de Interés</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{rule.trigger === 'state_changed' ? 'Al estado...' : 'Al Valor...'}</span>
                                    {rule.trigger === 'state_changed' ? (
                                        <select className="input premium-input" style={{ height: '38px', fontSize: '0.85rem' }} value={rule.value}
                                            onChange={e => updateRule(idx, { value: e.target.value })}>
                                            <option value="nuevo">Nuevo</option>
                                            <option value="relevado">Relevado</option>
                                            <option value="en_proceso">En Proceso</option>
                                            <option value="sin_interes">Sin Interés</option>
                                            <option value="inactivo">Inactivo</option>
                                            <option value="activo">Activo</option>
                                        </select>
                                    ) : (
                                        <select className="input premium-input" style={{ height: '38px', fontSize: '0.85rem' }} value={rule.value}
                                            onChange={e => updateRule(idx, { value: e.target.value })}>
                                            <option value="0">0% (Nulo)</option>
                                            <option value="25">25% (Bajo)</option>
                                            <option value="50">50% (Medio)</option>
                                            <option value="75">75% (Alto)</option>
                                            <option value="100">100% (Muy Alto)</option>
                                        </select>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entonces hacer...</span>
                                    <select className="input premium-input" style={{ height: '38px', fontSize: '0.85rem' }} value={rule.action}
                                        onChange={e => {
                                            const act = e.target.value as AutomationRule['action'];
                                            let defTarget = '';
                                            if (act === 'change_situation') defTarget = 'sin_comunicacion';
                                            if (act === 'auto_schedule') defTarget = '7'; // default 7 days
                                            updateRule(idx, { action: act, target: defTarget });
                                        }}>
                                        <option value="assign_responsible">Asignar Responsable</option>
                                        <option value="change_situation">Cambiar Situación</option>
                                        <option value="auto_schedule">Agendar Visita Auto.</option>
                                        <option value="add_note">Agregar Nota Interna</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>A...</span>
                                    {rule.action === 'assign_responsible' ? (
                                        <select className="input premium-input" style={{ height: '38px', fontSize: '0.85rem' }} value={rule.target}
                                            onChange={e => updateRule(idx, { target: e.target.value })}>
                                            <option value="">-- Sin asignar --</option>
                                            {usuariosEmpresa.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                                        </select>
                                    ) : rule.action === 'change_situation' ? (
                                        <select className="input premium-input" style={{ height: '38px', fontSize: '0.85rem' }} value={rule.target}
                                            onChange={e => updateRule(idx, { target: e.target.value })}>
                                            <option value="sin_comunicacion">Sin Comunicación</option>
                                            <option value="en_proceso">En Proceso</option>
                                            <option value="funcionando">Funcionando</option>
                                        </select>
                                    ) : rule.action === 'auto_schedule' ? (
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" className="input premium-input" style={{ height: '38px', fontSize: '0.85rem', paddingRight: '35px' }} placeholder="Ej: 7" value={rule.target}
                                                onChange={e => updateRule(idx, { target: e.target.value })} />
                                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>días</span>
                                        </div>
                                    ) : (
                                        <input type="text" className="input premium-input" style={{ height: '38px', fontSize: '0.85rem' }} placeholder="Contenido de la nota..." value={rule.target}
                                            onChange={e => updateRule(idx, { target: e.target.value })} />
                                    )}
                                </div>

                                <button type="button" onClick={() => removeRule(idx)}
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '22px' }}
                                    onMouseOver={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                                    onMouseOut={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
