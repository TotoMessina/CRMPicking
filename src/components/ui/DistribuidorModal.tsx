import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, MapPin, Package, Users, Truck, DollarSign, Cpu, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Distribuidor } from '../../types/distribuidor';

interface DistribuidorModalProps {
    isOpen: boolean;
    onClose: () => void;
    distribuidorId: number | string | null;
    onSaved: () => void;
}

const INITIAL_FORM: Partial<Distribuidor> = {
    nombre: '',
    direccion: '',
    categorias_productos: '',
    canal_comercializacion: '',
    cartera_clientes: '',
    cantidad_sku: '',
    vendedores: '',
    salones: '',
    pedido_minimo: '',
    tiempo_entrega: '',
    zona_entrega: '',
    medio_pago: '',
    erp_sistema_gestion: '',
    experiencia_digital: '',
    ejecutivo_cuenta: '',
    telefono: '',
    email: '',
    notas: '',
    estado: 'Activo'
};

export const DistribuidorModal: React.FC<DistribuidorModalProps> = ({
    isOpen,
    onClose,
    distribuidorId,
    onSaved
}) => {
    const { empresaActiva } = useAuth();
    const [formData, setFormData] = useState<Partial<Distribuidor>>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [nombreError, setNombreError] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setNombreError(false);
        if (distribuidorId) {
            setFetching(true);
            supabase
                .from('distribuidores')
                .select('*')
                .eq('id', distribuidorId)
                .single()
                .then(({ data, error }) => {
                    setFetching(false);
                    if (error) {
                        toast.error('Error al cargar datos del distribuidor');
                        onClose();
                    } else if (data) {
                        setFormData(data);
                    }
                });
        } else {
            setFormData(INITIAL_FORM);
        }
    }, [isOpen, distribuidorId]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'nombre' && value.trim()) {
            setNombreError(false);
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // El ÚNICO campo obligatorio es el nombre
        if (!formData.nombre || !formData.nombre.trim()) {
            setNombreError(true);
            toast.error('El Nombre del Distribuidor es el único campo obligatorio');
            return;
        }

        if (!empresaActiva?.id) {
            toast.error('No se detectó empresa activa');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                nombre: formData.nombre.trim(),
                direccion: formData.direccion?.trim() || null,
                categorias_productos: formData.categorias_productos?.trim() || null,
                canal_comercializacion: formData.canal_comercializacion?.trim() || null,
                cartera_clientes: formData.cartera_clientes?.trim() || null,
                cantidad_sku: formData.cantidad_sku?.trim() || null,
                vendedores: formData.vendedores?.trim() || null,
                salones: formData.salones?.trim() || null,
                pedido_minimo: formData.pedido_minimo?.trim() || null,
                tiempo_entrega: formData.tiempo_entrega?.trim() || null,
                zona_entrega: formData.zona_entrega?.trim() || null,
                medio_pago: formData.medio_pago?.trim() || null,
                erp_sistema_gestion: formData.erp_sistema_gestion?.trim() || null,
                experiencia_digital: formData.experiencia_digital?.trim() || null,
                ejecutivo_cuenta: formData.ejecutivo_cuenta?.trim() || null,
                telefono: formData.telefono?.trim() || null,
                email: formData.email?.trim() || null,
                notas: formData.notas?.trim() || null,
                estado: formData.estado || 'Activo',
                empresa_id: empresaActiva.id
            };

            if (distribuidorId) {
                const { error } = await supabase
                    .from('distribuidores')
                    .update(payload)
                    .eq('id', distribuidorId);
                if (error) throw error;
                toast.success('Distribuidor actualizado exitosamente');
            } else {
                const { error } = await supabase
                    .from('distribuidores')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Distribuidor creado exitosamente');
            }

            onSaved();
            onClose();
        } catch (err: any) {
            console.error('Error al guardar distribuidor:', err);
            toast.error(err.message || 'Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="modal is-open" onClick={onClose} style={{ zIndex: 9999 }}>
            <div 
                className="modal-content" 
                onClick={e => e.stopPropagation()} 
                style={{ 
                    maxWidth: '840px', 
                    width: '95%', 
                    maxHeight: '90vh', 
                    overflowY: 'auto',
                    padding: '28px',
                    borderRadius: '20px'
                }}
            >
                {/* Cabecera */}
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-light, rgba(230,230,230,0.5))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={24} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
                                {distribuidorId ? 'Editar Distribuidor' : 'Nuevo Distribuidor'}
                            </h3>
                            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                                Solo el <strong>Nombre</strong> es obligatorio. Todos los demás datos son opcionales.
                            </p>
                        </div>
                    </div>
                    <button className="modal-close" type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={22} />
                    </button>
                </div>

                {fetching ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="skeleton-line medium" style={{ margin: '0 auto 12px auto', width: '60%' }}></div>
                        <div className="skeleton-line short" style={{ margin: '0 auto', width: '40%' }}></div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* 1. SECCIÓN PRINCIPAL: IDENTIFICACIÓN */}
                        <div style={{ background: 'var(--bg-elevated)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Building2 size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Identificación y Contacto</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                                        Nombre del Distribuidor <span style={{ color: '#ef4444' }}>* (Obligatorio)</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Distribuidora Central SRL"
                                        className="input"
                                        style={{ 
                                            width: '100%', 
                                            borderColor: nombreError ? '#ef4444' : undefined,
                                            boxShadow: nombreError ? '0 0 0 2px rgba(239,68,68,0.2)' : undefined 
                                        }}
                                        autoFocus
                                    />
                                    {nombreError && (
                                        <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                                            Este campo es el único obligatorio.
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={formData.direccion || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Av. Rivadavia 4500, Munro"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Ejecutivo de Cuenta / Responsable
                                    </label>
                                    <input
                                        type="text"
                                        name="ejecutivo_cuenta"
                                        value={formData.ejecutivo_cuenta || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Juan Pérez"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Teléfono / WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        name="telefono"
                                        value={formData.telefono || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 11-2345-6789"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: contacto@distribuidora.com"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Estado
                                    </label>
                                    <select
                                        name="estado"
                                        value={formData.estado || 'Activo'}
                                        onChange={handleChange}
                                        className="input"
                                        style={{ width: '100%' }}
                                    >
                                        <option value="Activo">Activo</option>
                                        <option value="Prospecto">Prospecto / En Relevamiento</option>
                                        <option value="En negociación">En negociación</option>
                                        <option value="Inactivo">Inactivo / Pausado</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. SECCIÓN COMERCIAL & CLIENTELA */}
                        <div style={{ background: 'var(--bg-elevated)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Package size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Perfil Comercial y Catálogo</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Categorías de Productos
                                    </label>
                                    <input
                                        type="text"
                                        name="categorias_productos"
                                        value={formData.categorias_productos || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Lácteos, Fiambres, Secos, Bebidas"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Canal de Comercialización
                                    </label>
                                    <input
                                        type="text"
                                        name="canal_comercializacion"
                                        value={formData.canal_comercializacion || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Autoservicios, Kioscos, Mayorista, Horeca"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Cartera de Clientes
                                    </label>
                                    <input
                                        type="text"
                                        name="cartera_clientes"
                                        value={formData.cartera_clientes || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 350 comercios activos"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Cantidad de SKU
                                    </label>
                                    <input
                                        type="text"
                                        name="cantidad_sku"
                                        value={formData.cantidad_sku || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 500 artículos"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Vendedores (Fuerza de Venta)
                                    </label>
                                    <input
                                        type="text"
                                        name="vendedores"
                                        value={formData.vendedores || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 5 preventistas en calle"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Salones de Venta
                                    </label>
                                    <input
                                        type="text"
                                        name="salones"
                                        value={formData.salones || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 2 salones mayoristas"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. SECCIÓN LOGÍSTICA & CONDICIONES */}
                        <div style={{ background: 'var(--bg-elevated)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Truck size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Logística y Condiciones Comerciales</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Pedido Mínimo
                                    </label>
                                    <input
                                        type="text"
                                        name="pedido_minimo"
                                        value={formData.pedido_minimo || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: $150.000 / 15 bultos"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Tiempo de Entrega
                                    </label>
                                    <input
                                        type="text"
                                        name="tiempo_entrega"
                                        value={formData.tiempo_entrega || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 24 a 48 hs"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Zona de Entrega
                                    </label>
                                    <input
                                        type="text"
                                        name="zona_entrega"
                                        value={formData.zona_entrega || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: GBA Oeste, CABA, La Plata"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Medio de Pago
                                    </label>
                                    <input
                                        type="text"
                                        name="medio_pago"
                                        value={formData.medio_pago || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Transferencia, Cheque 30d, Efectivo"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. SECCIÓN TECNOLOGÍA & NOTAS */}
                        <div style={{ background: 'var(--bg-elevated)', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Cpu size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Sistemas, Digitalización y Notas</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        ERP / Sistema de Gestión
                                    </label>
                                    <input
                                        type="text"
                                        name="erp_sistema_gestion"
                                        value={formData.erp_sistema_gestion || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: SAP, Tango, Bejerman, Propio"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Experiencia Digital
                                    </label>
                                    <input
                                        type="text"
                                        name="experiencia_digital"
                                        value={formData.experiencia_digital || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: App B2B, Pedidos WhatsApp, Catálogo Web"
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Notas Adicionales
                                    </label>
                                    <textarea
                                        name="notas"
                                        rows={3}
                                        value={formData.notas || ''}
                                        onChange={handleChange}
                                        placeholder="Observaciones generales sobre el distribuidor, contactos clave o acuerdos previos..."
                                        className="input"
                                        style={{ width: '100%', resize: 'vertical' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit" disabled={loading} style={{ minWidth: '160px' }}>
                                {loading ? 'Guardando...' : (distribuidorId ? 'Actualizar Distribuidor' : 'Crear Distribuidor')}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};
