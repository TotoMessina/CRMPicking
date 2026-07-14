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
          foto_url: string | null
          id: number
          user_id: string | null
          usuario: string | null
        }
        Insert: {
          cliente_id: number
          descripcion: string
          empresa_id?: string | null
          fecha?: string
          foto_url?: string | null
          id?: number
          user_id?: string | null
          usuario?: string | null
        }
        Update: {
          cliente_id?: number
          descripcion?: string
          empresa_id?: string | null
          fecha?: string
          foto_url?: string | null
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
      ai_unknown_queries: {
        Row: {
          created_at: string | null
          id: number
          keywords: string | null
          query: string | null
          response: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          keywords?: string | null
          query?: string | null
          response?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          keywords?: string | null
          query?: string | null
          response?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          changed_by: string | null
          created_at: string
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
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
          {
            foreignKeyName: "audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
      campanas: {
        Row: {
          alcance_estimado: number | null
          alcance_real: number | null
          calles: string | null
          cantidad_personas_alcanzadas: number | null
          clicks: number | null
          compartidos: number | null
          costo: number | null
          costo_por_resultado: number | null
          creado_por: string | null
          created_at: string | null
          cuentas_creadas: number | null
          descargas_obtenidas: number | null
          duracion_dias: number | null
          empresa_id: string
          etiquetas: string[] | null
          evento: string | null
          fecha_fin: string | null
          fecha_inicio: string
          horario_fin: string | null
          horario_inicio: string | null
          id: number
          justificacion: string | null
          likes: number | null
          lugar_evento: string | null
          materiales_usados: string | null
          nombre: string
          nombre_patrocinado: string | null
          notas_ai: string | null
          objetivo: string | null
          participantes: string | null
          percepcion_resultado: string | null
          plataformas: string[] | null
          regalo: string | null
          reproducciones: number | null
          tipo: string
          tipo_soporte: string | null
          ubicacion_soporte: string | null
          updated_at: string | null
          zona: string | null
        }
        Insert: {
          alcance_estimado?: number | null
          alcance_real?: number | null
          calles?: string | null
          cantidad_personas_alcanzadas?: number | null
          clicks?: number | null
          compartidos?: number | null
          costo?: number | null
          costo_por_resultado?: number | null
          creado_por?: string | null
          created_at?: string | null
          cuentas_creadas?: number | null
          descargas_obtenidas?: number | null
          duracion_dias?: number | null
          empresa_id: string
          etiquetas?: string[] | null
          evento?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          horario_fin?: string | null
          horario_inicio?: string | null
          id?: number
          justificacion?: string | null
          likes?: number | null
          lugar_evento?: string | null
          materiales_usados?: string | null
          nombre: string
          nombre_patrocinado?: string | null
          notas_ai?: string | null
          objetivo?: string | null
          participantes?: string | null
          percepcion_resultado?: string | null
          plataformas?: string[] | null
          regalo?: string | null
          reproducciones?: number | null
          tipo: string
          tipo_soporte?: string | null
          ubicacion_soporte?: string | null
          updated_at?: string | null
          zona?: string | null
        }
        Update: {
          alcance_estimado?: number | null
          alcance_real?: number | null
          calles?: string | null
          cantidad_personas_alcanzadas?: number | null
          clicks?: number | null
          compartidos?: number | null
          costo?: number | null
          costo_por_resultado?: number | null
          creado_por?: string | null
          created_at?: string | null
          cuentas_creadas?: number | null
          descargas_obtenidas?: number | null
          duracion_dias?: number | null
          empresa_id?: string
          etiquetas?: string[] | null
          evento?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          horario_fin?: string | null
          horario_inicio?: string | null
          id?: number
          justificacion?: string | null
          likes?: number | null
          lugar_evento?: string | null
          materiales_usados?: string | null
          nombre?: string
          nombre_patrocinado?: string | null
          notas_ai?: string | null
          objetivo?: string | null
          participantes?: string | null
          percepcion_resultado?: string | null
          plataformas?: string[] | null
          regalo?: string | null
          reproducciones?: number | null
          tipo?: string
          tipo_soporte?: string | null
          ubicacion_soporte?: string | null
          updated_at?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_grupos: {
        Row: {
          cliente_id: number
          empresa_id: string
          grupo_id: number
        }
        Insert: {
          cliente_id: number
          empresa_id: string
          grupo_id: number
        }
        Update: {
          cliente_id?: number
          empresa_id?: string
          grupo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cliente_grupos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_grupos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
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
          lat: number | null
          lng: number | null
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
          lat?: number | null
          lng?: number | null
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
          lat?: number | null
          lng?: number | null
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
      crm_roles: {
        Row: {
          color_hex: string | null
          created_at: string | null
          empresa_id: string | null
          id: string
          nombre: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nombre: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_roles_empresa_id_fkey"
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
      empresa_custom_widgets: {
        Row: {
          chart_type: string
          color: string | null
          created_at: string | null
          data_source: string
          empresa_id: string
          filter_field: string | null
          filter_value: string | null
          group_by: string | null
          icon: string | null
          id: string
          metric: string | null
          metric_field: string | null
          size: string | null
          sort_dir: string | null
          sort_order: number | null
          time_group: string | null
          title: string
          top_n: number | null
          updated_at: string | null
        }
        Insert: {
          chart_type: string
          color?: string | null
          created_at?: string | null
          data_source: string
          empresa_id: string
          filter_field?: string | null
          filter_value?: string | null
          group_by?: string | null
          icon?: string | null
          id?: string
          metric?: string | null
          metric_field?: string | null
          size?: string | null
          sort_dir?: string | null
          sort_order?: number | null
          time_group?: string | null
          title: string
          top_n?: number | null
          updated_at?: string | null
        }
        Update: {
          chart_type?: string
          color?: string | null
          created_at?: string | null
          data_source?: string
          empresa_id?: string
          filter_field?: string | null
          filter_value?: string | null
          group_by?: string | null
          icon?: string | null
          id?: string
          metric?: string | null
          metric_field?: string | null
          size?: string | null
          sort_dir?: string | null
          sort_order?: number | null
          time_group?: string | null
          title?: string
          top_n?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_custom_widgets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_dashboard_layout: {
        Row: {
          empresa_id: string
          id: string
          layout: Json
          updated_at: string | null
        }
        Insert: {
          empresa_id: string
          id?: string
          layout?: Json
          updated_at?: string | null
        }
        Update: {
          empresa_id?: string
          id?: string
          layout?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_dashboard_layout_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
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
      empresa_pipeline_estados: {
        Row: {
          color: string | null
          created_at: string | null
          empresa_id: string | null
          id: string
          is_default: boolean | null
          label: string
          orden: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          orden?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_pipeline_estados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_pipeline_situaciones: {
        Row: {
          color: string | null
          created_at: string | null
          empresa_id: string | null
          estados_visibles: string[] | null
          id: string
          is_default: boolean | null
          label: string
          orden: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          empresa_id?: string | null
          estados_visibles?: string[] | null
          id?: string
          is_default?: boolean | null
          label: string
          orden?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          empresa_id?: string | null
          estados_visibles?: string[] | null
          id?: string
          is_default?: boolean | null
          label?: string
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_pipeline_situaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_usuario: {
        Row: {
          activo: boolean | null
          created_at: string | null
          empresa_id: string | null
          id: string
          role: string
          usuario_email: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          role?: string
          usuario_email: string
        }
        Update: {
          activo?: boolean | null
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
          billing_currency: string | null
          billing_due_date: string | null
          billing_notes: string | null
          billing_plan: string | null
          billing_price: number | null
          billing_status: string | null
          config: Json | null
          created_at: string | null
          dia_reporte: number | null
          id: string
          logo_url: string | null
          nombre: string
        }
        Insert: {
          billing_currency?: string | null
          billing_due_date?: string | null
          billing_notes?: string | null
          billing_plan?: string | null
          billing_price?: number | null
          billing_status?: string | null
          config?: Json | null
          created_at?: string | null
          dia_reporte?: number | null
          id?: string
          logo_url?: string | null
          nombre: string
        }
        Update: {
          billing_currency?: string | null
          billing_due_date?: string | null
          billing_notes?: string | null
          billing_plan?: string | null
          billing_price?: number | null
          billing_status?: string | null
          config?: Json | null
          created_at?: string | null
          dia_reporte?: number | null
          id?: string
          logo_url?: string | null
          nombre?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component_stack: string | null
          created_at: string | null
          id: string
          level: string | null
          message: string
          metadata: Json | null
          stack: string | null
          url: string | null
          user_agent: string | null
          user_email: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          message: string
          metadata?: Json | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          message?: string
          metadata?: Json | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
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
          depende_de_nosotros: boolean | null
          descripcion: string | null
          empresa_id: string | null
          estado: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_real_cierre: string | null
          id: number
          orden: number | null
          prioridad: string | null
          proveedor_id: number | null
          seccion: string | null
          sprint_id: string | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          depende_de_nosotros?: boolean | null
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_real_cierre?: string | null
          id?: number
          orden?: number | null
          prioridad?: string | null
          proveedor_id?: number | null
          seccion?: string | null
          sprint_id?: string | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          color?: string | null
          created_at?: string
          depende_de_nosotros?: boolean | null
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_real_cierre?: string | null
          id?: number
          orden?: number | null
          prioridad?: string | null
          proveedor_id?: number | null
          seccion?: string | null
          sprint_id?: string | null
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
          {
            foreignKeyName: "eventos_proveedores_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "proveedor_sprints"
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
      grupos: {
        Row: {
          color: string | null
          created_at: string | null
          empresa_id: string
          id: number
          nombre: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          empresa_id: string
          id?: number
          nombre: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_ubicaciones: {
        Row: {
          empresa_id: string
          fecha: string
          id: string
          lat: number
          lng: number
          usuario_id: string
        }
        Insert: {
          empresa_id: string
          fecha?: string
          id?: string
          lat: number
          lng: number
          usuario_id: string
        }
        Update: {
          empresa_id?: string
          fecha?: string
          id?: string
          lat?: number
          lng?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_ubicaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_ubicaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      marketing_material: {
        Row: {
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          icon: string | null
          id: string
          nombre: string
          stock_actual: number | null
          stock_minimo: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          icon?: string | null
          id?: string
          nombre: string
          stock_actual?: number | null
          stock_minimo?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          icon?: string | null
          id?: string
          nombre?: string
          stock_actual?: number | null
          stock_minimo?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_material_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      material_entrega: {
        Row: {
          actividad_id: number | null
          cantidad: number
          cliente_id: number | null
          empresa_id: string
          fecha: string | null
          id: string
          material_id: string
          usuario_email: string
        }
        Insert: {
          actividad_id?: number | null
          cantidad?: number
          cliente_id?: number | null
          empresa_id: string
          fecha?: string | null
          id?: string
          material_id: string
          usuario_email: string
        }
        Update: {
          actividad_id?: number | null
          cantidad?: number
          cliente_id?: number | null
          empresa_id?: string
          fecha?: string | null
          id?: string
          material_id?: string
          usuario_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_entrega_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_entrega_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_entrega_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_entrega_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "marketing_material"
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
      novedades: {
        Row: {
          contenido: string | null
          creador_avatar: string | null
          creador_avatar_url: string | null
          creador_id: string
          creador_nombre: string | null
          created_at: string
          empresa_id: string
          encuesta: Json | null
          fijado: boolean | null
          id: string
          media_urls: Json | null
          roles_permitidos: Json | null
          tipo: string
          titulo: string | null
        }
        Insert: {
          contenido?: string | null
          creador_avatar?: string | null
          creador_avatar_url?: string | null
          creador_id: string
          creador_nombre?: string | null
          created_at?: string
          empresa_id: string
          encuesta?: Json | null
          fijado?: boolean | null
          id?: string
          media_urls?: Json | null
          roles_permitidos?: Json | null
          tipo?: string
          titulo?: string | null
        }
        Update: {
          contenido?: string | null
          creador_avatar?: string | null
          creador_avatar_url?: string | null
          creador_id?: string
          creador_nombre?: string | null
          created_at?: string
          empresa_id?: string
          encuesta?: Json | null
          fijado?: boolean | null
          id?: string
          media_urls?: Json | null
          roles_permitidos?: Json | null
          tipo?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "novedades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      novedades_comentarios: {
        Row: {
          comentario: string
          created_at: string
          id: string
          novedad_id: string
          reacciones: Json | null
          usuario_avatar: string | null
          usuario_avatar_url: string | null
          usuario_id: string
          usuario_nombre: string | null
        }
        Insert: {
          comentario: string
          created_at?: string
          id?: string
          novedad_id: string
          reacciones?: Json | null
          usuario_avatar?: string | null
          usuario_avatar_url?: string | null
          usuario_id: string
          usuario_nombre?: string | null
        }
        Update: {
          comentario?: string
          created_at?: string
          id?: string
          novedad_id?: string
          reacciones?: Json | null
          usuario_avatar?: string | null
          usuario_avatar_url?: string | null
          usuario_id?: string
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "novedades_comentarios_novedad_id_fkey"
            columns: ["novedad_id"]
            isOneToOne: false
            referencedRelation: "novedades"
            referencedColumns: ["id"]
          },
        ]
      }
      novedades_likes: {
        Row: {
          created_at: string
          id: string
          novedad_id: string
          reaccion: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          novedad_id: string
          reaccion?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          novedad_id?: string
          reaccion?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novedades_likes_novedad_id_fkey"
            columns: ["novedad_id"]
            isOneToOne: false
            referencedRelation: "novedades"
            referencedColumns: ["id"]
          },
        ]
      }
      novedades_vistas: {
        Row: {
          created_at: string
          id: string
          novedad_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          novedad_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          novedad_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novedades_vistas_novedad_id_fkey"
            columns: ["novedad_id"]
            isOneToOne: false
            referencedRelation: "novedades"
            referencedColumns: ["id"]
          },
        ]
      }
      novedades_votos: {
        Row: {
          created_at: string
          id: string
          novedad_id: string
          opcion_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          novedad_id: string
          opcion_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          novedad_id?: string
          opcion_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novedades_votos_novedad_id_fkey"
            columns: ["novedad_id"]
            isOneToOne: false
            referencedRelation: "novedades"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedor_sprints: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          nombre: string
          orden: number | null
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nombre: string
          orden?: number | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nombre?: string
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_sprints_empresa_id_fkey"
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
      report_recipients: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string
          empresa_id: string
          id: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email: string
          empresa_id: string
          id?: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_recipients_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rubros: {
        Row: {
          created_at: string
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          accion: string
          created_at: string | null
          detalles: Json | null
          empresa_id: string | null
          id: string
          ip_address: string | null
          nivel_riesgo: string | null
          user_agent: string | null
          usuario_email: string
        }
        Insert: {
          accion: string
          created_at?: string | null
          detalles?: Json | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          nivel_riesgo?: string | null
          user_agent?: string | null
          usuario_email: string
        }
        Update: {
          accion?: string
          created_at?: string | null
          detalles?: Json | null
          empresa_id?: string | null
          id?: string
          ip_address?: string | null
          nivel_riesgo?: string | null
          user_agent?: string | null
          usuario_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_empresa_id_fkey"
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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
          estado?: string | null
          id?: number
          mensaje?: string | null
          nombre?: string | null
          telefono?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      usuario_tracking: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          lat: number
          lng: number
          usuario_email: string
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          lat: number
          lng: number
          usuario_email: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          lat?: number
          lng?: number
          usuario_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_tracking_empresa_id_fkey"
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
          avatar_url: string | null
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
          avatar_url?: string | null
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
          avatar_url?: string | null
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
      visitas_diarias: {
        Row: {
          cliente_id: number
          comentarios_admin: string | null
          created_at: string | null
          empresa_id: string
          estado: string | null
          fecha_asignada: string
          id: string
          orden: number | null
          updated_at: string | null
          usuario_asignado_email: string
        }
        Insert: {
          cliente_id: number
          comentarios_admin?: string | null
          created_at?: string | null
          empresa_id: string
          estado?: string | null
          fecha_asignada: string
          id?: string
          orden?: number | null
          updated_at?: string | null
          usuario_asignado_email: string
        }
        Update: {
          cliente_id?: number
          comentarios_admin?: string | null
          created_at?: string | null
          empresa_id?: string
          estado?: string | null
          fecha_asignada?: string
          id?: string
          orden?: number | null
          updated_at?: string | null
          usuario_asignado_email?: string
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
      admin_confirm_and_link_user: {
        Args: { p_email: string; p_empresa_id: string; p_role: string }
        Returns: undefined
      }
      admin_create_user: {
        Args: {
          p_email: string
          p_empresa_id: string
          p_nombre: string
          p_password: string
          p_role: string
        }
        Returns: string
      }
      buscar_clientes_empresa: {
        Args: {
          p_contacto_desde?: string
          p_contacto_hasta?: string
          p_creado_desde?: string
          p_creado_hasta?: string
          p_creados_por?: string[]
          p_direccion?: string
          p_empresa_id: string
          p_estados?: string[]
          p_estilos?: string[]
          p_grupos?: number[]
          p_intereses?: string[]
          p_limit?: number
          p_missing_contact?: boolean
          p_missing_coords?: boolean
          p_missing_rubro?: boolean
          p_nombre?: string
          p_offset?: number
          p_responsables?: string[]
          p_rubros?: string[]
          p_situaciones?: string[]
          p_sort_by?: string
          p_telefono?: string
          p_tipos_contacto?: string[]
        }
        Returns: {
          activador_cierre: string
          c_created_at: string
          cliente_id: number
          creado_por: string
          cuit: string
          direccion: string
          ec_created_at: string
          ec_id: string
          ec_updated_at: string
          estado: string
          estilo_contacto: string
          fecha_proximo_contacto: string
          grupos: Json
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
          total_count: number
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
      check_user_belongs_to_company: {
        Args: { p_emp_id: string }
        Returns: boolean
      }
      crear_cliente_final: { Args: { datos: Json }; Returns: string }
      crear_cliente_v4_json: { Args: { p_payload: Json }; Returns: string }
      crear_cliente_v5_final: { Args: { p_payload: Json }; Returns: number }
      get_advanced_stats: {
        Args: {
          p_date_from: string
          p_date_to: string
          p_empresa_id: string
          p_filter_activator?: string
        }
        Returns: Json
      }
      get_chat_users: {
        Args: { empresa_id_param: string }
        Returns: {
          user_avatar_emoji: string
          user_avatar_url: string
          user_email: string
          user_nombre: string
          user_role: string
        }[]
      }
      get_company_statistics: {
        Args: {
          p_date_from: string
          p_date_to: string
          p_empresa_id: string
          p_filter_activators?: string[]
        }
        Returns: Json
      }
      get_company_usage_stats: { Args: { p_empresa_id: string }; Returns: Json }
      get_dba_diagnostics: { Args: never; Returns: Json }
      get_mis_empresas: {
        Args: never
        Returns: {
          emp_id: string
        }[]
      }
      get_super_admin_stats: { Args: never; Returns: Json }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_demo_user: { Args: never; Returns: boolean }
      is_user_active: { Args: { uid: string }; Returns: boolean }
      join_company_with_code: {
        Args: { lookup_code: string }
        Returns: boolean
      }
      limpiar_historial_ubicaciones_antiguo: { Args: never; Returns: undefined }
      update_dia_reporte: {
        Args: { p_dia: number; p_empresa_id: string }
        Returns: undefined
      }
      update_empresa_config: {
        Args: { p_config: Json; p_empresa_id: string }
        Returns: undefined
      }
      update_usuario_empresa_admin: {
        Args: {
          p_empresa_id: string
          p_new_activo: boolean
          p_new_emoji: string
          p_new_role: string
          p_target_email: string
          p_target_id: string
        }
        Returns: undefined
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
