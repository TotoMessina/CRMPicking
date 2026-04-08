export interface Client {
    id: string;
    nombre?: string;
    nombre_local?: string;
    telefono?: string;
    mail?: string;
    direccion?: string;
    tipo_contacto?: string;
    fecha_proximo_contacto?: string | null;
    hora_proximo_contacto?: string | null;
    estado?: string;
    situacion?: string;
    rubro?: string;
    interes?: string;
    responsable?: string;
    notas?: string;
    created_at?: string;
    updated_at?: string;
    clientes?: {
        created_at: string;
    };
}

export interface ClientActivity {
    id: string;
    descripcion: string;
    fecha: string;
    usuario: string;
    foto_url?: string;
}
