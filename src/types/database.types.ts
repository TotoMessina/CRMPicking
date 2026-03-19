export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      actividades: {
        Row: {
          cliente_id: number
          descripcion: string
          empresa_id: string | null
          fecha: string
          id: number
          user_id: string | null
          usuario: string | null
        }
        Insert: {
          cliente_id: number
          descripcion: string
          empresa_id?: string | null
          fecha?: string
          id?: number
          user_id?: string | null
          usuario?: string | null
        }
        Update: {
          cliente_id?: number
          descripcion?: string
          empresa_id?: string | null
          fecha?: string
          id?: number
          user_id?: string | null
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      actividades_consumidores: {
        Row: {
          consumidor_id: number
          descripcion: string
          empresa_id: string | null
          fecha: string
          id: number
          user_id: string | null
          usuario: string | null
        }
        Insert: {
          consumidor_id: number
          descripcion: string
          empresa_id?: string | null
          fecha?: string
          id?: number
          user_id?: string | null
          usuario?: string | null
        }
        Update: {
          consumidor_id?: number
          descripcion?: string
          empresa_id?: string | null
          fecha?: string
          id?: number
          user_id?: string | null
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividades_consumidores_consumidor_id_fkey"
            columns: ["consumidor_id"]
            isOneToOne: false
            referencedRelation: "consumidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_consumidores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      actividades_repartidores: {
        Row: {
          created_at: string | null
          detalle: string | null
          empresa_id: string
          fecha_accion: string | null
          id: number
          repartidor_id: number | null
          tipo: string | null
          usuario: string | null
        }
        Insert: {
          created_at?: string | null
          detalle?: string | null
          empresa_id: string
          fecha_accion?: string | null
          id?: number
          repartidor_id?: number | null
          tipo?: string | null
          usuario?: string | null
        }
        Update: {
          created_at?: string | null
          detalle?: string | null
          empresa_id?: string
          fecha_accion?: string | null
          id?: number
          repartidor_id?: number | null
          tipo?: string | null
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividades_repartidores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_repartidores_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "repartidores"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      calificaciones: {
        Row: {
          aspecto: string | null
          atendido_por: string | null
          cliente_id: number | null
          comentario: string | null
          created_at: string
          created_by: string | null
          estado: string | null
          id: number
          nombre_local: string | null
          puntaje: number | null
        }
        Insert: {
          aspecto?: string | null
          atendido_por?: string | null
          cliente_id?: number | null
          comentario?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string | null
          id?: number
          nombre_local?: string | null
          puntaje?: number | null
        }
        Update: {
          aspecto?: string | null
          atendido_por?: string | null
          cliente_id?: number | null
          comentario?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string | null
          id?: number
          nombre_local?: string | null
          puntaje?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activador_cierre: string | null
          activo: boolean
          apellido: string | null
          creado_por: string | null
          created_at: string
          cuit: string | null
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_cliente"]
          estilo_contacto: string | null
          fecha_contacto: string | null
          fecha_proximo_contacto: string | null
          hora_proximo_contacto: string | null
          horarios_atencion: string | null
          id: number
          interes: string | null
          lat: number | null
          lng: number | null
          mail: string | null
          nombre: string
          nombre_local: string | null
          notas: string | null
          responsable: string | null
          responsable_id: string | null
          rubro: string
          situacion: string | null
          status_date: string | null
          status_history: Json | null
          telefono: string | null
          tipo_contacto: string | null
          ultima_actividad: string | null
          updated_at: string
          venta_digital: boolean | null
          venta_digital_cual: string | null
          visitas: number | null
        }
        Insert: {
          activador_cierre?: string | null
          activo?: boolean
          apellido?: string | null
          creado_por?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_cliente"]
          estilo_contacto?: string | null
          fecha_contacto?: string | null
          fecha_proximo_contacto?: string | null
          hora_proximo_contacto?: string | null
          horarios_atencion?: string | null
          id?: number
          interes?: string | null
          lat?: number | null
          lng?: number | null
          mail?: string | null
          nombre: string
          nombre_local?: string | null
          notas?: string | null
          responsable?: string | null
          responsable_id?: string | null
          rubro?: string
          situacion?: string | null
          status_date?: string | null
          status_history?: Json | null
          telefono?: string | null
          tipo_contacto?: string | null
          ultima_actividad?: string | null
          updated_at?: string
          venta_digital?: boolean | null
          venta_digital_cual?: string | null
          visitas?: number | null
        }
        Update: {
          activador_cierre?: string | null
          activo?: boolean
          apellido?: string | null
          creado_por?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_cliente"]
          estilo_contacto?: string | null
          fecha_contacto?: string | null
          fecha_proximo_contacto?: string | null
          hora_proximo_contacto?: string | null
          horarios_atencion?: string | null
          id?: number
          interes?: string | null
          lat?: number | null
          lng?: number | null
          mail?: string | null
          nombre?: string
          nombre_local?: string | null
          notas?: string | null
          responsable?: string | null
          responsable_id?: string | null
          rubro?: string
          situacion?: string | null
          status_date?: string | null
          status_history?: Json | null
          telefono?: string | null
          tipo_contacto?: string | null
          ultima_actividad?: string | null
          updated_at?: string
          venta_digital?: boolean | null
          venta_digital_cual?: string | null
          visitas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      consumidores: {
        Row: {
          activo: boolean
          barrio: string | null
          created_at: string
          edad: number | null
          empresa_id: string | null
          estado: string
          fecha_proximo_contacto: string | null
          genero: string | null
          hora_proximo_contacto: string | null
          id: number
          localidad: string | null
          mail: string | null
          nombre: string
          notas: string | null
          responsable: string | null
          telefono: string | null
          ultima_actividad: string | null
        }
        Insert: {
          activo?: boolean
          barrio?: string | null
          created_at?: string
          edad?: number | null
          empresa_id?: string | null
          estado?: string
          fecha_proximo_contacto?: string | null
          genero?: string | null
          hora_proximo_contacto?: string | null
          id?: number
          localidad?: string | null
          mail?: string | null
          nombre: string
          notas?: string | null
          responsable?: string | null
          telefono?: string | null
          ultima_actividad?: string | null
        }
        Update: {
          activo?: boolean
          barrio?: string | null
          created_at?: string
          edad?: number | null
          empresa_id?: string | null
          estado?: string
          fecha_proximo_contacto?: string | null
          genero?: string | null
          hora_proximo_contacto?: string | null
          id?: number
          localidad?: string | null
          mail?: string | null
          nombre?: string
          notas?: string | null
          responsable?: string | null
          telefono?: string | null
          ultima_actividad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumidores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_cliente: {
        Row: {
          activador_cierre: string | null
          activo: boolean | null
          cliente_id: number | null
          creado_por: string | null
          created_at: string | null
          empresa_id: string | null
          estado: string | null
          estilo_contacto: string | null
          fecha_proximo_contacto: string | null
          hora_proximo_contacto: string | null
          id: string
          interes: string | null
          notas: string | null
          responsable: string | null
          rubro: string | null
          situacion: string | null
          status_history: Json | null
          tipo_contacto: string | null
          ultima_actividad: string | null
          updated_at: string | null
          venta_digital: boolean | null
          venta_digital_cual: string | null
          visitas: number | null
        }
        Insert: {
          activador_cierre?: string | null
          activo?: boolean | null
          cliente_id?: number | null
          creado_por?: string | null
          created_at?: string | null
          empresa_id?: string | null
          estado?: string | null
          estilo_contacto?: string | null
          fecha_proximo_contacto?: string | null
          hora_proximo_contacto?: string | null
          id?: string
          interes?: string | null
          notas?: string | null
          responsable?: string | null
          rubro?: string | null
          situacion?: string | null
          status_history?: Json | null
          tipo_contacto?: string | null
          ultima_actividad?: string | null
          updated_at?: string | null
          venta_digital?: boolean | null
          venta_digital_cual?: string | null
          visitas?: number | null
        }
        Update: {
          activador_cierre?: string | null
          activo?: boolean | null
          cliente_id?: number | null
          creado_por?: string | null
          created_at?: string | null
          empresa_id?: string | null
          estado?: string | null
          estilo_contacto?: string | null
          fecha_proximo_contacto?: string | null
          hora_proximo_contacto?: string | null
          id?: string
          interes?: string | null
          notas?: string | null
          responsable?: string | null
          rubro?: string | null
          situacion?: string | null
          status_history?: Json | null
          tipo_contacto?: string | null
          ultima_actividad?: string | null
          updated_at?: string | null
          venta_digital?: boolean | null
          venta_digital_cual?: string | null
          visitas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_permisos_pagina: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          habilitada: boolean | null
          id: string
          pagina: string
          roles_permitidos: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          habilitada?: boolean | null
          id?: string
          pagina: string
          roles_permitidos?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          habilitada?: boolean | null
          id?: string
          pagina?: string
          roles_permitidos?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_permisos_pagina_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_usuario: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          role: string
          usuario_email: string
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          role?: string
          usuario_email: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          role?: string
          usuario_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_usuario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_empresa_usuario_usuarios"
            columns: ["usuario_email"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["email"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          nombre: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nombre: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nombre?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          all_day: boolean
          cliente_id: number | null
          color: string | null
          creado_por: string | null
          created_at: string
          descripcion: string | null
          empresa_id: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: number
          responsable: string | null
          tipo: string
          titulo: string
          usuario: string | null
        }
        Insert: {
          all_day?: boolean
          cliente_id?: number | null
          color?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: number
          responsable?: string | null
          tipo?: string
          titulo: string
          usuario?: string | null
        }
        Update: {
          all_day?: boolean
          cliente_id?: number | null
          color?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: number
          responsable?: string | null
          tipo?: string
          titulo?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_historial: {
        Row: {
          comentario: string
          created_at: string | null
          empresa_id: string | null
          evento_id: number
          id: number
          usuario_email: string | null
        }
        Insert: {
          comentario: string
          created_at?: string | null
          empresa_id?: string | null
          evento_id: number
          id?: never
          usuario_email?: string | null
        }
        Update: {
          comentario?: string
          created_at?: string | null
          empresa_id?: string | null
          evento_id?: number
          id?: never
          usuario_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_historial_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_historial_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_proveedores: {
        Row: {
          color: string | null
          created_at: string
          descripcion: string | null
          empresa_id: string | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_real_cierre: string | null
          id: number
          proveedor_id: number | null
          seccion: string | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_real_cierre?: string | null
          id?: number
          proveedor_id?: number | null
          seccion?: string | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          color?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_real_cierre?: string | null
          id?: number
          proveedor_id?: number | null
          seccion?: string | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_proveedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_proveedores_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_usuarios: {
        Row: {
          created_at: string
          evento_id: number
          usuario: string
        }
        Insert: {
          created_at?: string
          evento_id: number
          usuario: string
        }
        Update: {
          created_at?: string
          evento_id?: number
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_usuarios_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string | null
          empresa_id: string | null
          id: number
          is_active: boolean | null
          label: string | null
          role: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          empresa_id?: string | null
          id?: number
          is_active?: boolean | null
          label?: string | null
          role?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          empresa_id?: string | null
          id?: number
          is_active?: boolean | null
          label?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_chat: {
        Row: {
          created_at: string
          de_usuario: string
          empresa_id: string
          id: string
          leido: boolean | null
          mensaje: string
          para_usuario: string
        }
        Insert: {
          created_at?: string
          de_usuario: string
          empresa_id: string
          id?: string
          leido?: boolean | null
          mensaje: string
          para_usuario: string
        }
        Update: {
          created_at?: string
          de_usuario?: string
          empresa_id?: string
          id?: string
          leido?: boolean | null
          mensaje?: string
          para_usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_mensajes_chat_de_usuario"
            columns: ["de_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "fk_mensajes_chat_para_usuario"
            columns: ["para_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "mensajes_chat_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean | null
          contacto: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          id: number
          nombre: string
          notas: string | null
          rubro: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          contacto?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: number
          nombre: string
          notas?: string | null
          rubro?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          contacto?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: number
          nombre?: string
          notas?: string | null
          rubro?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: number
          subscription: Json
          user_email: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          subscription: Json
          user_email: string
        }
        Update: {
          created_at?: string | null
          id?: number
          subscription?: Json
          user_email?: string
        }
        Relationships: []
      }
      repartidores: {
        Row: {
          created_at: string | null
          direccion: string | null
          email: string | null
          empresa_id: string
          estado: string | null
          id: number
          lat: number | null
          lng: number | null
          localidad: string | null
          nombre: string
          notas: string | null
          responsable: string | null
          telefono: string | null
          telefono_norm: string | null
        }
        Insert: {
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa_id: string
          estado?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          localidad?: string | null
          nombre: string
          notas?: string | null
          responsable?: string | null
          telefono?: string | null
          telefono_norm?: string | null
        }
        Update: {
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa_id?: string
          estado?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          localidad?: string | null
          nombre?: string
          notas?: string | null
          responsable?: string | null
          telefono?: string | null
          telefono_norm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repartidores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_tablero: {
        Row: {
          asignado_a: string | null
          checklist: Json | null
          created_at: string
          descripcion: string | null
          empresa_id: string | null
          estado: string | null
          fecha_vencimiento: string | null
          id: string
          orden: number | null
          titulo: string
        }
        Insert: {
          asignado_a?: string | null
          checklist?: Json | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_vencimiento?: string | null
          id?: string
          orden?: number | null
          titulo: string
        }
        Update: {
          asignado_a?: string | null
          checklist?: Json | null
          created_at?: string
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_vencimiento?: string | null
          id?: string
          orden?: number | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_tablero_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          asunto: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: number
          mensaje: string | null
          nombre: string | null
          telefono: string | null
          tipo: string | null
        }
        Insert: {
          asunto?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: number
          mensaje?: string | null
          nombre?: string | null
          telefono?: string | null
          tipo?: string | null
        }
        Update: {
          asunto?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: number
          mensaje?: string | null
          nombre?: string | null
          telefono?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      turnos: {
        Row: {
          creado_por: string | null
          created_at: string
          empresa_id: string | null
          end_time: string
          id: number
          notas: string | null
          start_time: string
          tipo: string
          usuario_email: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          empresa_id?: string | null
          end_time: string
          id?: number
          notas?: string | null
          start_time: string
          tipo: string
          usuario_email: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          empresa_id?: string | null
          end_time?: string
          id?: number
          notas?: string | null
          start_time?: string
          tipo?: string
          usuario_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_turnos_usuarios_email"
            columns: ["usuario_email"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "turnos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          avatar_emoji: string | null
          email: string | null
          id: string
          last_seen: string | null
          lat: number | null
          lng: number | null
          nombre: string
          role: string
        }
        Insert: {
          activo?: boolean
          avatar_emoji?: string | null
          email?: string | null
          id: string
          last_seen?: string | null
          lat?: number | null
          lng?: number | null
          nombre: string
          role?: string
        }
        Update: {
          activo?: boolean
          avatar_emoji?: string | null
          email?: string | null
          id?: string
          last_seen?: string | null
          lat?: number | null
          lng?: number | null
          nombre?: string
          role?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          color: string | null
          coordinates: Json
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: number
          is_deleted: boolean | null
          label: string | null
          scope: string | null
        }
        Insert: {
          color?: string | null
          coordinates: Json
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: number
          is_deleted?: boolean | null
          label?: string | null
          scope?: string | null
        }
        Update: {
          color?: string | null
          coordinates?: Json
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: number
          is_deleted?: boolean | null
          label?: string | null
          scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_clientes_empresa: {
        Args: {
          p_creado_desde?: string
          p_creado_hasta?: string
          p_direccion?: string
          p_empresa_id: string
          p_estado?: string
          p_estilo?: string
          p_interes?: string
          p_limit?: number
          p_nombre?: string
          p_offset?: number
          p_responsable?: string
          p_rubro?: string
          p_situacion?: string
          p_sort_by?: string
          p_telefono?: string
          p_tipo_contacto?: string
        }
        Returns: {
          activador_cierre: string
          activo: boolean
          c_created_at: string
          cliente_id: number
          creado_por: string
          cuit: string
          direccion: string
          ec_created_at: string
          ec_id: string
          ec_updated_at: string
          empresa_id: string
          estado: string
          estilo_contacto: string
          fecha_proximo_contacto: string
          hora_proximo_contacto: string
          interes: string
          lat: number
          lng: number
          mail: string
          nombre: string
          nombre_local: string
          notas: string
          responsable: string
          rubro: string
          situacion: string
          telefono: string
          tipo_contacto: string
          ultima_actividad: string
          venta_digital: boolean
          venta_digital_cual: string
          visitas: number
        }[]
      }
      check_invite_code: {
        Args: { lookup_code: string }
        Returns: {
          empresa_nombre: string
          is_valid: boolean
        }[]
      }
      crear_cliente_final: { Args: { datos: Json }; Returns: string }
      crear_cliente_v4_json: { Args: { p_payload: Json }; Returns: string }
      crear_cliente_v5_final: { Args: { p_payload: Json }; Returns: number }
      get_mis_empresas: {
        Args: never
        Returns: {
          emp_id: string
        }[]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_user_active: { Args: { uid: string }; Returns: boolean }
      join_company_with_code: {
        Args: { lookup_code: string }
        Returns: boolean
      }
      verify_user_identity: {
        Args: { check_email: string; check_name: string }
        Returns: boolean
      }
    }
    Enums: {
      estado_cliente:
        | "Nuevo"
        | "En seguimiento"
        | "Ganado"
        | "Perdido"
        | "1 - Cliente relevado"
        | "2 - Local Visitado No Activo"
        | "3 - Primer Ingreso"
        | "4 - Local Creado"
        | "5 - Local Visitado Activo"
        | "6 - Local No Interesado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_cliente: [
        "Nuevo",
        "En seguimiento",
        "Ganado",
        "Perdido",
        "1 - Cliente relevado",
        "2 - Local Visitado No Activo",
        "3 - Primer Ingreso",
        "4 - Local Creado",
        "5 - Local Visitado Activo",
        "6 - Local No Interesado",
      ],
    },
  },
} as const
