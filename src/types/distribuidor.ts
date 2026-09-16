export interface Distribuidor {
    id: number | string;
    empresa_id: string;
    nombre: string;
    direccion?: string;
    categorias_productos?: string;
    canal_comercializacion?: string;
    cartera_clientes?: string;
    cantidad_sku?: string;
    vendedores?: string;
    salones?: string;
    pedido_minimo?: string;
    tiempo_entrega?: string;
    zona_entrega?: string;
    medio_pago?: string;
    erp_sistema_gestion?: string;
    experiencia_digital?: string;
    ejecutivo_cuenta?: string;
    telefono?: string;
    email?: string;
    notas?: string;
    estado?: string;
    ultima_actividad?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ActividadDistribuidor {
    id: number | string;
    distribuidor_id: number | string;
    empresa_id: string;
    fecha: string;
    tipo?: string;
    descripcion: string;
    usuario?: string;
    created_at?: string;
}

export interface DistribuidorFiltersState {
    search: string;
    ejecutivo: string;
    zona: string;
    canal: string;
    erp: string;
    estado: string;
}
