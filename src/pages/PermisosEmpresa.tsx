import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, ChevronDown, Layers, Users, Plus, Save, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '../hooks/useBranding';
import { useEmpresaPermisos } from '../hooks/useEmpresaPermisos';
import { TabModulos } from '../components/permisos/TabModulos';
import { TabUsuarios } from '../components/permisos/TabUsuarios';
import { TabCategorias } from '../components/permisos/TabCategorias';
import { TabCampos } from '../components/permisos/TabCampos';
import { TabMarcaBlanca } from '../components/permisos/TabMarcaBlanca';
import { TabAutomatizaciones } from '../components/permisos/TabAutomatizaciones';
import type { TabKey } from '../types/permisos';

const TABS: { key: TabKey; label: string; icon?: any }[] = [
  { key: 'modulos',          label: 'Permisos de Módulos', icon: Layers },
  { key: 'usuarios',         label: 'Roles y Usuarios',    icon: Users },
  { key: 'categorias',       label: 'Categorías Sidebar',  icon: Layers },
  { key: 'campos',           label: 'Campos de Clientes',  icon: Plus },
  { key: 'personalizacion',  label: '🎨 Marca Blanca / Estilos' },
  { key: 'automatizaciones', label: '⚡ Automatizaciones' },
];

export default function PermisosEmpresa() {
  const { role, empresaActiva, paginasPermitidas, isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('modulos');

  const { branding, updateBranding } = useBranding();

  const state = useEmpresaPermisos({ branding });

  // Load branding when empresa changes
  const { selectedEmpresa } = state;

  const isSuperAdmin = role === 'super-admin';
  const effectiveRole = isSuperAdmin ? 'super-admin' : (empresaActiva?.role_en_empresa?.toLowerCase() || role || '');
  const hasPermission = isSuperAdmin || (paginasPermitidas && paginasPermitidas['/permisos-empresa']?.includes(effectiveRole));

  if (!hasPermission) return null;

  const showSaveBar = state.dirty && activeTab !== 'usuarios';

  return (
    <div className="container" style={{ padding: '20px', paddingBottom: '90px' }}>
      <style>{`
        .permisos-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
        .custom-field-row { display: grid !important; grid-template-columns: 1fr !important; gap: 16px !important; align-items: end !important; padding: 16px !important; border-radius: 12px !important; border: 1px solid var(--border) !important; }
        @media (min-width: 768px) { .custom-field-row { grid-template-columns: 1fr 160px 1fr auto !important; } }
        .permiso-card { position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .permiso-card.disabled { opacity: 0.65; filter: grayscale(0.5); }
        .permiso-card:hover { border-color: var(--accent); box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
        .modern-switch { width: 40px; height: 22px; border-radius: 11px; background: var(--border); position: relative; transition: background 0.3s; }
        .modern-switch.active { background: var(--accent); }
        .modern-switch-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .modern-switch.active .modern-switch-knob { left: 20px; }
        .role-chip { border-radius: 16px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border); background: var(--bg); color: var(--text-muted); cursor: pointer; transition: all 0.2s; text-transform: capitalize; }
        .role-chip:hover:not(:disabled) { border-color: var(--chip-color); }
        .role-chip.selected { background: var(--chip-color); color: white; border-color: var(--chip-color); }
        .role-chip:disabled { opacity: 0.5; cursor: not-allowed; }
        .sticky-save-bar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 600px; z-index: 1000; }
        .danger-hover:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
        .table-container { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .tabs-bar::-webkit-scrollbar { height: 4px; }
        .tabs-bar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        @media (max-width: 768px) { .permisos-cards-grid { grid-template-columns: 1fr; } .sticky-save-bar { width: calc(100% - 32px); bottom: 16px; } .hide-mobile { display: none; } }
        @media (max-width: 600px) { .permisos-header { flex-direction: column !important; align-items: stretch !important; } .actions-section { align-items: stretch !important; } .select-empresa-wrapper { max-width: 100% !important; } }
      `}</style>

      {/* Header */}
      <div className="permisos-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        <div className="title-section" style={{ flex: '1 1 300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: 10, borderRadius: 12 }}>
              <Shield size={26} color="var(--accent)" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', lineHeight: 1 }}>Centro de Accesos</h1>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>Administrá roles dinámicos, usuarios y privilegios de pantallas.</p>
        </div>
        <div className="actions-section" style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 250px', alignItems: 'flex-end' }}>
          <div className="select-empresa-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <select className="input premium-input" style={{ width: '100%', paddingLeft: 40, cursor: 'pointer', appearance: 'none', height: '40px', fontSize: '0.9rem' }}
              value={selectedEmpresa?.id || ''} onChange={e => state.setSelectedEmpresa(state.empresas.find((c: any) => c.id === e.target.value))}>
              {state.empresas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <Building2 size={16} className="text-accent" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <ChevronDown size={14} className="muted" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tabs-bar" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px', overflowX: 'auto' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ background: 'transparent', border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent', padding: '12px 20px', color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)', fontWeight: activeTab === tab.key ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              {Icon && <Icon size={16} />} {tab.label}
            </button>
          );
        })}
      </div>

      {state.loading ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-elevated)', borderRadius: 20 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        </div>
      ) : (
        <>
          {activeTab === 'modulos' && (
            <TabModulos groupedPages={state.groupedPages} permisos={state.permisos} setPermisos={state.setPermisos}
              rolesDinamicos={state.rolesDinamicos} localSidebarGroups={state.localSidebarGroups}
              localPageGroups={state.localPageGroups} setLocalPageGroups={state.setLocalPageGroups} setDirty={state.setDirty} />
          )}
          {activeTab === 'usuarios' && (
            <TabUsuarios usuariosEmpresa={state.usuariosEmpresa} rolesDinamicos={state.rolesDinamicos} saving={state.saving}
              selectedUser={state.selectedUser} isUserModalOpen={state.isUserModalOpen} setIsUserModalOpen={state.setIsUserModalOpen}
              editUserForm={state.editUserForm} setEditUserForm={state.setEditUserForm}
              onEditUser={u => { state.setSelectedUser(u); state.setEditUserForm({ role: u.role || '', activo: u.activo !== false }); state.setIsUserModalOpen(true); }}
              handleSaveUser={e => state.handleSaveUser(e, isDemoMode)}
              isRoleModalOpen={state.isRoleModalOpen} setIsRoleModalOpen={state.setIsRoleModalOpen}
              newRoleForm={state.newRoleForm} setNewRoleForm={state.setNewRoleForm}
              handleCreateRole={e => state.handleCreateRole(e, isDemoMode)} />
          )}
          {activeTab === 'categorias' && (
            <TabCategorias localSidebarGroups={state.localSidebarGroups} setLocalSidebarGroups={state.setLocalSidebarGroups}
              setLocalPageGroups={state.setLocalPageGroups} setDirty={state.setDirty} />
          )}
          {activeTab === 'campos' && (
            <TabCampos 
              localCustomFields={state.localCustomFields} setLocalCustomFields={state.setLocalCustomFields}
              localFormLayout={state.localFormLayout} setLocalFormLayout={state.setLocalFormLayout} 
              localRubros={state.localRubros} setLocalRubros={state.setLocalRubros}
              setDirty={state.setDirty} 
            />
          )}
          {activeTab === 'personalizacion' && (
            <TabMarcaBlanca branding={branding} updateBranding={updateBranding} setDirty={state.setDirty} />
          )}
          {activeTab === 'automatizaciones' && (
            <TabAutomatizaciones automations={state.localAutomations} setAutomations={state.setLocalAutomations}
              usuariosEmpresa={state.usuariosEmpresa} setDirty={state.setDirty} />
          )}
        </>
      )}

      {/* Sticky Save Bar */}
      <AnimatePresence>
        {showSaveBar && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="sticky-save-bar">
            <div className="save-bar-content glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--accent)', boxShadow: '0 20px 40px rgba(124, 58, 237, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'var(--accent)', borderRadius: '50%', padding: 6, display: 'flex', color: 'white' }}><Save size={16} /></div>
                <div className="hide-mobile">
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>Cambios sin guardar</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secundario" onClick={() => state.fetchCoreData()} disabled={state.saving} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Deshacer</button>
                <button className="btn-primario" onClick={() => state.handleSavePermisos(isDemoMode)} disabled={state.saving} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                  {state.saving ? 'Aplicando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
