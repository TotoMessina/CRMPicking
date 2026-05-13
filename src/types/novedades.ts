export type NovedadTipo = 'post' | 'historia';

export interface Novedad {
    id: string;
    empresa_id: string;
    creador_id: string;
    tipo: NovedadTipo;
    titulo: string | null;
    contenido: string | null;
    media_urls: string[];
    roles_permitidos: string[];
    fijado: boolean;
    created_at: string;
    // Agregados por relaciones / vistas
    creador?: {
        nombre?: string;
        avatar_emoji?: string;
    };
    likes_count?: number;
    comentarios_count?: number;
    vistas_count?: number;
    is_liked_by_me?: boolean;
    is_viewed_by_me?: boolean;
}

export interface NovedadComentario {
    id: string;
    novedad_id: string;
    usuario_id: string;
    comentario: string;
    created_at: string;
    usuario?: {
        nombre?: string;
        avatar_emoji?: string;
    };
}
