import { useState, useRef } from 'react';
import { Edit2, Hexagon, Plus, X, UserPlus, FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import type { CrmRole, UsuarioEmpresa } from '../../types/permisos';

interface TabUsuariosProps {
    usuariosEmpresa: UsuarioEmpresa[];
    rolesDinamicos: CrmRole[];
    saving: boolean;
    selectedUser: UsuarioEmpresa | null;
    isUserModalOpen: boolean;
    setIsUserModalOpen: (v: boolean) => void;
    editUserForm: { role: string; activo: boolean };
    setEditUserForm: React.Dispatch<React.SetStateAction<{ role: string; activo: boolean }>>;
    onEditUser: (user: UsuarioEmpresa) => void;
    handleSaveUser: (e: React.FormEvent) => void;
    isRoleModalOpen: boolean;
    setIsRoleModalOpen: (v: boolean) => void;
    newRoleForm: { nombre: string; color_hex: string };
    setNewRoleForm: React.Dispatch<React.SetStateAction<{ nombre: string; color_hex: string }>>;
    handleCreateRole: (e: React.FormEvent) => void;
    isCreateUserModalOpen: boolean;
    setIsCreateUserModalOpen: (v: boolean) => void;
    createUserForm: { nombre: string; email: string; role: string; password?: string };
    setCreateUserForm: React.Dispatch<React.SetStateAction<{ nombre: string; email: string; role: string; password?: string }>>;
    handleCreateUser: (data: { nombre: string; email: string; role: string; password?: string }, isDemoMode: boolean) => Promise<{ id: string; password?: string }>;
    handleDeleteUser: (userEmail: string, isDemoMode: boolean) => Promise<void>;
    handleDeleteRole: (roleName: string, isDemoMode: boolean) => Promise<void>;
    fetchCoreData: () => void;
    isDemoMode?: boolean;
}

export function TabUsuarios({
    usuariosEmpresa, rolesDinamicos, saving,
    selectedUser, isUserModalOpen, setIsUserModalOpen, editUserForm, setEditUserForm, onEditUser, handleSaveUser,
    isRoleModalOpen, setIsRoleModalOpen, newRoleForm, setNewRoleForm, handleCreateRole,
    isCreateUserModalOpen, setIsCreateUserModalOpen, createUserForm, setCreateUserForm, handleCreateUser, handleDeleteUser, handleDeleteRole, fetchCoreData, isDemoMode,
}: TabUsuariosProps) {
    const { user: currentUser } = useAuth();
    const [activeMode, setActiveMode] = useState<'individual' | 'excel'>('individual');
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState({ total: 0, processed: 0, success: 0, errors: [] as string[] });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Opción A: Carga Individual Submit
    const handleIndividualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isDemoMode) {
            toast.error('Acción no permitida en modo demo.');
            return;
        }
        
        if (!createUserForm.role) {
            toast.error('Debe seleccionar un rol para el usuario.');
            return;
        }

        try {
            await handleCreateUser(createUserForm, isDemoMode || false);
            toast.success('¡Usuario creado y vinculado!', { icon: '👤' });
            setIsCreateUserModalOpen(false);
            setCreateUserForm({ nombre: '', email: '', role: '', password: '' });
            fetchCoreData();
        } catch (err: any) {
            console.error('Error creating user:', err);
            toast.error(err.message || 'Fallo al crear el usuario.');
        }
    };

    // Opción B: Carga Masiva desde Excel
    const processExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setBulkProcessing(true);
        setProcessedCount({ total: 0, processed: 0, success: 0, errors: [] });

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('El archivo Excel no tiene hojas.');
                }
                
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawRows = XLSX.utils.sheet_to_json(firstSheet) as any[];

                if (rawRows.length === 0) {
                    toast.error('El archivo está vacío o no tiene filas de datos.');
                    setBulkProcessing(false);
                    return;
                }

                // Limpiador e Intérprete Robusto de Columnas (case & accent insensitive)
                const findVal = (row: any, keys: string[]) => {
                    const foundKey = Object.keys(row).find(k => 
                        keys.some(cand => 
                            k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === cand
                        )
                    );
                    return foundKey ? String(row[foundKey]).trim() : '';
                };

                // Convertimos a un formato usable
                const usersToCreate = rawRows.map((r, idx) => {
                    const email = findVal(r, ['email', 'mail', 'correo']);
                    const nombre = findVal(r, ['nombre', 'name', 'usuario', 'colaborador']);
                    const role = findVal(r, ['rol', 'role', 'puesto', 'cargo']) || 'empleado';
                    const password = findVal(r, ['contrasena', 'contraseña', 'password', 'clave', 'pass']);

                    return { email, nombre, role, password, rowNum: idx + 2 };
                }).filter(u => u.email && u.nombre); // Exigir mínimo Email y Nombre

                if (usersToCreate.length === 0) {
                    toast.error('No se encontraron filas válidas con columnas "Email" y "Nombre".');
                    setBulkProcessing(false);
                    return;
                }

                setProcessedCount(p => ({ ...p, total: usersToCreate.length }));
                let success = 0;
                let errorsList: string[] = [];

                // Bucle secuencial para crear usuarios con feedback en vivo
                for (let i = 0; i < usersToCreate.length; i++) {
                    const u = usersToCreate[i];
                    try {
                        await handleCreateUser({
                            email: u.email,
                            nombre: u.nombre,
                            role: u.role,
                            password: u.password || undefined
                        }, isDemoMode || false);
                        
                        success++;
                    } catch (err: any) {
                        console.error(`Error creando fila ${u.rowNum} (${u.email}):`, err);
                        errorsList.push(`Fila ${u.rowNum} (${u.email || 'S/E'}): ${err.message || 'Fallo desconocido'}`);
                    }
                    setProcessedCount(p => ({ ...p, processed: i + 1, success }));
                }

                if (errorsList.length === 0) {
                    toast.success(`¡Excelente! Se crearon ${success} usuarios con éxito.`, { icon: '🎉' });
                } else {
                    toast.error(`Completado con errores. Exitosos: ${success}/${usersToCreate.length}`);
                }
                
                setProcessedCount(p => ({ ...p, errors: errorsList }));
                fetchCoreData();
            } catch (err: any) {
                console.error('Fatal Excel error:', err);
                toast.error('Fallo al parsear el Excel: ' + err.message);
            } finally {
                setBulkProcessing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        
        reader.onerror = () => {
            toast.error('Ocurrió un error físico al leer el archivo.');
            setBulkProcessing(false);
        };
        
        reader.readAsBinaryString(file);
    };

    // Descargar Plantilla Autogenerada
    const downloadExcelTemplate = () => {
        try {
            const headers = [['email', 'nombre', 'rol', 'contrasena']];
            const demoRows = [
                ['juan.perez@miempresa.com', 'Juan Pérez', 'empleado', 'InsideUp2026!'],
                ['maria.laura@miempresa.com', 'María Laura', 'admin', 'PassMaster123']
            ];
            const ws = XLSX.utils.aoa_to_sheet([...headers, ...demoRows]);
            
            // Anchos de columna estéticos
            ws['!cols'] = [
                { wch: 25 }, // email
                { wch: 20 }, // nombre
                { wch: 12 }, // rol
                { wch: 16 }, // contrasena
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Carga de Usuarios');
            XLSX.writeFile(wb, 'plantilla_usuarios_InsideUp.xlsx');
            toast.success('¡Plantilla de Excel descargada!');
        } catch (err) {
            toast.error('No se pudo generar el archivo de plantilla.');
        }
    };
    return (
        <>
            <div className="usuarios-roles-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Hexagon size={16} /> Usuarios y Roles</h3>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Administra tus colaboradores y define cargos institucionales.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn-secundario" onClick={() => setIsRoleModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                            <Plus size={16} /> Crear Rol
                        </button>
                        <button className="btn-primario" onClick={() => setIsCreateUserModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                            <UserPlus size={16} /> Agregar Usuario
                        </button>
                    </div>
                </div>
                
                {/* Grid de Roles Disponibles para Gestión */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Cargos / Roles Definidos</strong>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {rolesDinamicos.map(r => {
                            const isSystemRole = ['admin', 'supervisor', 'activador', 'empleado'].includes(r.nombre.toLowerCase());
                            const badgeColor = r.color_hex || '#7c3aed';
                            return (
                                <div key={r.nombre} style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: '8px', 
                                    background: `${badgeColor}15`, color: badgeColor, 
                                    padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', 
                                    fontWeight: 600, border: `1px solid ${badgeColor}30`,
                                    transition: 'transform 0.2s ease'
                                }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: badgeColor }} />
                                    <span>{r.nombre.toUpperCase()}</span>
                                    
                                    {r.nombre.toLowerCase() !== 'admin' && (
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteRole(r.nombre, isDemoMode || false)}
                                            style={{ 
                                                border: 'none', cursor: 'pointer', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: 2, borderRadius: '50%', background: `${badgeColor}20`,
                                                color: badgeColor, marginLeft: 2, transition: 'all 0.2s ease' 
                                            }}
                                            title={`Eliminar rol "${r.nombre}"`}
                                            onMouseOver={e => { e.currentTarget.style.background = badgeColor; e.currentTarget.style.color = 'white'; }}
                                            onMouseOut={e => { e.currentTarget.style.background = `${badgeColor}20`; e.currentTarget.style.color = badgeColor; }}
                                        >
                                            <X size={12} strokeWidth={2.5} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="table-container" style={{ borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto', background: 'var(--bg-card)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Usuario</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Email</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Rol Asignado</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosEmpresa.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center' }} className="muted">No se encontraron usuarios.</td></tr>
                            ) : (
                                usuariosEmpresa.map(u => {
                                    const assignedData = rolesDinamicos.find(r => r.nombre === u.role);
                                    const roleColor = assignedData?.color_hex || 'var(--text-muted)';
                                    return (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.avatar_emoji || '📍'} {u.nombre || '-'}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.email}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ background: `${roleColor}15`, color: roleColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, border: `1px solid ${roleColor}30` }}>
                                                    {u.role || 'Sin rol'}
                                                </span>
                                            </td>
                                             <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button className="btn-secundario" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }} onClick={() => onEditUser(u)}>
                                                        <Edit2 size={14} style={{ marginRight: 6 }} /> Modificar
                                                    </button>
                                                    {currentUser?.email !== u.email && (
                                                        <button 
                                                            className="btn-secundario" 
                                                            style={{ padding: '6px 10px', color: 'var(--danger, #ef4444)', borderColor: 'rgba(239, 68, 68, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 'auto' }} 
                                                            onClick={() => handleDeleteUser(u.email, isDemoMode || false)}
                                                            title="Desvincular usuario de la empresa"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {isUserModalOpen && selectedUser && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setIsUserModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Edit2 size={18} /> Asignar Rol</h3>
                                <button onClick={() => setIsUserModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>
                            <p className="muted" style={{ marginBottom: 20, fontSize: '0.9rem' }}>Actualizar credenciales para <strong>{selectedUser.nombre}</strong></p>
                            <form onSubmit={handleSaveUser}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Rol Dinámico</label>
                                    <select className="input premium-input" style={{ width: '100%', appearance: 'none' }} value={editUserForm.role} onChange={e => setEditUserForm(p => ({ ...p, role: e.target.value }))}>
                                        <option value="">Seleccionar rol...</option>
                                        {rolesDinamicos.map(r => (
                                            <option key={r.nombre} value={r.nombre}>{r.nombre.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                        <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} checked={editUserForm.activo} onChange={e => setEditUserForm(p => ({ ...p, activo: e.target.checked }))} />
                                        Acceso de Usuario Activo
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button type="button" className="btn-secundario" onClick={() => setIsUserModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn-primario" disabled={saving} style={{ flex: 1 }}>{saving ? 'Guardando...' : 'Confirmar'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isRoleModalOpen && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setIsRoleModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18} /> Crear Nuevo Rol</h3>
                                <button onClick={() => setIsRoleModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreateRole}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Identificador del Rol</label>
                                    <input required type="text" className="input premium-input" placeholder="Ej: analista_datos, repositor..." style={{ width: '100%' }} value={newRoleForm.nombre} onChange={e => setNewRoleForm(p => ({ ...p, nombre: e.target.value }))} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Se guardará en minúsculas.</span>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Etiqueta de Color</label>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <input type="color" style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }} value={newRoleForm.color_hex} onChange={e => setNewRoleForm(p => ({ ...p, color_hex: e.target.value }))} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{newRoleForm.color_hex}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button type="button" className="btn-secundario" onClick={() => setIsRoleModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn-primario" disabled={saving} style={{ flex: 1 }}>{saving ? 'Creando...' : 'Crear Rol'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCreateUserModalOpen && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => !bulkProcessing && setIsCreateUserModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass-card" style={{ width: '95%', maxWidth: '480px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            
                            {/* Encabezado Modal */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={18} /> Agregar Integrante</h3>
                                <button onClick={() => !bulkProcessing && setIsCreateUserModalOpen(false)} disabled={bulkProcessing} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>

                            {/* Selector de Modo (Individual / Excel) */}
                            {!bulkProcessing && processedCount.total === 0 && (
                                <div style={{ display: 'flex', background: 'var(--bg)', padding: '4px', borderRadius: '8px', gap: '4px', marginBottom: '20px' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setActiveMode('individual')}
                                        style={{ flex: 1, border: 'none', borderRadius: '6px', padding: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', background: activeMode === 'individual' ? 'var(--bg-elevated)' : 'transparent', color: activeMode === 'individual' ? 'var(--accent)' : 'var(--text-muted)', transition: 'all 0.2s' }}
                                    >
                                        Individual
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setActiveMode('excel')}
                                        style={{ flex: 1, border: 'none', borderRadius: '6px', padding: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', background: activeMode === 'excel' ? 'var(--bg-elevated)' : 'transparent', color: activeMode === 'excel' ? 'var(--accent)' : 'var(--text-muted)', transition: 'all 0.2s' }}
                                    >
                                        <FileSpreadsheet size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Carga Excel
                                    </button>
                                </div>
                            )}

                            {/* ============================================ */}
                            {/* MODO INDIVIDUAL                             */}
                            {/* ============================================ */}
                            {activeMode === 'individual' && (
                                <form onSubmit={handleIndividualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>Nombre Completo</label>
                                        <input required type="text" placeholder="Ej: Juan Pérez" className="input premium-input" style={{ width: '100%', height: '40px' }} value={createUserForm.nombre} onChange={e => setCreateUserForm(p => ({ ...p, nombre: e.target.value }))} />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>Correo Electrónico</label>
                                        <input required type="email" placeholder="juan.perez@ejemplo.com" className="input premium-input" style={{ width: '100%', height: '40px' }} value={createUserForm.email} onChange={e => setCreateUserForm(p => ({ ...p, email: e.target.value }))} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>Rol en Empresa</label>
                                            <select required className="input premium-input" style={{ width: '100%', height: '40px', paddingRight: '24px' }} value={createUserForm.role} onChange={e => setCreateUserForm(p => ({ ...p, role: e.target.value }))}>
                                                <option value="">Seleccionar...</option>
                                                {rolesDinamicos.map(r => (
                                                    <option key={r.nombre} value={r.nombre}>{r.nombre.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>Contraseña</label>
                                            <input required type="password" placeholder="Min. 6 carac." minLength={6} className="input premium-input" style={{ width: '100%', height: '40px' }} value={createUserForm.password || ''} onChange={e => setCreateUserForm(p => ({ ...p, password: e.target.value }))} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                                        <button type="button" className="btn-secundario" onClick={() => setIsCreateUserModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                                        <button type="submit" className="btn-primario" disabled={saving} style={{ flex: 1 }}>{saving ? 'Creando...' : 'Crear Acceso'}</button>
                                    </div>
                                </form>
                            )}

                            {/* ============================================ */}
                            {/* MODO EXCEL (ESTADO INICIAL)                  */}
                            {/* ============================================ */}
                            {activeMode === 'excel' && !bulkProcessing && processedCount.total === 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ background: 'rgba(124, 58, 237, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.2)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <Download size={28} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700 }}>Paso 1: Descarga la Plantilla</span>
                                            <p className="muted" style={{ margin: '4px 0 8px 0', fontSize: '0.78rem' }}>Utiliza nuestro formato de Excel oficial para evitar fallos de lectura.</p>
                                            <button onClick={downloadExcelTemplate} type="button" style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Download size={12} /> Descargar Plantilla .xlsx
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'var(--bg)' }}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={processExcelFile} />
                                        <Upload size={32} color="var(--text-muted)" />
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700 }}>Paso 2: Sube el Archivo</span>
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Haz clic aquí para buscar tu Excel completo.</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============================================ */}
                            {/* PROCESANDO LOTES DE EXCEL                    */}
                            {/* ============================================ */}
                            {activeMode === 'excel' && (bulkProcessing || processedCount.total > 0) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Barra de Progreso Visual */}
                                    <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                                            <span>{bulkProcessing ? 'Creando cuentas...' : 'Proceso Finalizado'}</span>
                                            <span style={{ color: 'var(--accent)' }}>{processedCount.processed} / {processedCount.total}</span>
                                        </div>
                                        
                                        {/* Riel de Progreso */}
                                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                                            <motion.div 
                                                style={{ height: '100%', background: 'var(--accent)', borderRadius: '4px' }} 
                                                animate={{ width: `${(processedCount.processed / processedCount.total) * 100}%` }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.75rem', fontWeight: 700 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981' }}><CheckCircle size={14} /> Exitosos: {processedCount.success}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: processedCount.errors.length > 0 ? '#ef4444' : 'var(--text-muted)' }}><AlertCircle size={14} /> Errores: {processedCount.errors.length}</span>
                                        </div>
                                    </div>

                                    {/* Listado de Errores */}
                                    {processedCount.errors.length > 0 && (
                                        <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px' }}>
                                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Log de Fallos:</span>
                                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
                                                {processedCount.errors.map((err, idx) => (
                                                    <li key={idx} style={{ color: 'var(--text-muted)' }}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Spinner Animado */}
                                    {bulkProcessing && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Procesando usuarios en base de datos...
                                        </div>
                                    )}

                                    {!bulkProcessing && (
                                        <button 
                                            type="button" 
                                            className="btn-primario" 
                                            style={{ width: '100%' }} 
                                            onClick={() => {
                                                setProcessedCount({ total: 0, processed: 0, success: 0, errors: [] });
                                                setIsCreateUserModalOpen(false);
                                            }}
                                        >
                                            Cerrar Panel
                                        </button>
                                    )}
                                </div>
                            )}

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
