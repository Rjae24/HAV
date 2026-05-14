import type { THEMES_VALUES } from "@/constants/theme.const";

export type TTheme = (typeof THEMES_VALUES)[number];

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cita: {
        Row: {
          estado: string | null
          fecha_pautada: string
          fecha_registro: string | null
          id_cita: number
          id_especialista: number | null
          id_paciente: number | null
          id_pago: number | null
          motivo_consulta: string | null
        }
        Insert: {
          estado?: string | null
          fecha_pautada: string
          fecha_registro?: string | null
          id_cita?: number
          id_especialista?: number | null
          id_paciente?: number | null
          id_pago?: number | null
          motivo_consulta?: string | null
        }
        Update: {
          estado?: string | null
          fecha_pautada?: string
          fecha_registro?: string | null
          id_cita?: number
          id_especialista?: number | null
          id_paciente?: number | null
          id_pago?: number | null
          motivo_consulta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cita_id_especialista_fkey"
            columns: ["id_especialista"]
            isOneToOne: false
            referencedRelation: "especialista"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "cita_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id_paciente"]
          },
          {
            foreignKeyName: "cita_id_pago_fkey"
            columns: ["id_pago"]
            isOneToOne: false
            referencedRelation: "pago"
            referencedColumns: ["id_pago"]
          },
        ]
      }
      consulta: {
        Row: {
          diagnostico: string | null
          fecha_realizada: string | null
          id_cita: number | null
          id_consulta: number
          notas_medicas: string | null
          tratamiento: string | null
        }
        Insert: {
          diagnostico?: string | null
          fecha_realizada?: string | null
          id_cita?: number | null
          id_consulta?: number
          notas_medicas?: string | null
          tratamiento?: string | null
        }
        Update: {
          diagnostico?: string | null
          fecha_realizada?: string | null
          id_cita?: number | null
          id_consulta?: number
          notas_medicas?: string | null
          tratamiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consulta_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "cita"
            referencedColumns: ["id_cita"]
          },
        ]
      }
      especialista: {
        Row: {
          cedula: string
          correo: string | null
          direccion: string | null
          especialidad: string
          id_usuario: number
          nombre_completo: string
          tlf: string | null
        }
        Insert: {
          cedula: string
          correo?: string | null
          direccion?: string | null
          especialidad: string
          id_usuario: number
          nombre_completo: string
          tlf?: string | null
        }
        Update: {
          cedula?: string
          correo?: string | null
          direccion?: string | null
          especialidad?: string
          id_usuario?: number
          nombre_completo?: string
          tlf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "especialista_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      historial_clinico: {
        Row: {
          alergias: string | null
          cirugias: string | null
          id_historial: number
          id_paciente: number | null
          patologias: string | null
          tipo_sangre: string | null
          ultima_actualizacion: string | null
        }
        Insert: {
          alergias?: string | null
          cirugias?: string | null
          id_historial?: number
          id_paciente?: number | null
          patologias?: string | null
          tipo_sangre?: string | null
          ultima_actualizacion?: string | null
        }
        Update: {
          alergias?: string | null
          cirugias?: string | null
          id_historial?: number
          id_paciente?: number | null
          patologias?: string | null
          tipo_sangre?: string | null
          ultima_actualizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_clinico_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: true
            referencedRelation: "pacientes"
            referencedColumns: ["id_paciente"]
          },
        ]
      }
      interconsulta: {
        Row: {
          id_consulta: number | null
          id_especialista_envia: number | null
          id_especialista_recibe: number | null
          id_interconsulta: number
          motivo_interconsulta: string | null
        }
        Insert: {
          id_consulta?: number | null
          id_especialista_envia?: number | null
          id_especialista_recibe?: number | null
          id_interconsulta?: number
          motivo_interconsulta?: string | null
        }
        Update: {
          id_consulta?: number | null
          id_especialista_envia?: number | null
          id_especialista_recibe?: number | null
          id_interconsulta?: number
          motivo_interconsulta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interconsulta_id_consulta_fkey"
            columns: ["id_consulta"]
            isOneToOne: false
            referencedRelation: "consulta"
            referencedColumns: ["id_consulta"]
          },
          {
            foreignKeyName: "interconsulta_id_especialista_envia_fkey"
            columns: ["id_especialista_envia"]
            isOneToOne: false
            referencedRelation: "especialista"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "interconsulta_id_especialista_recibe_fkey"
            columns: ["id_especialista_recibe"]
            isOneToOne: false
            referencedRelation: "especialista"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      pacientes: {
        Row: {
          apellidos: string
          cedula: string
          correo: string | null
          direccion: string | null
          fecha_registro: string | null
          id_paciente: number
          nombre: string
          nombre_contacto_emergencia: string | null
          telefono: string | null
          tlf_contacto_emergencia: string | null
        }
        Insert: {
          apellidos: string
          cedula: string
          correo?: string | null
          direccion?: string | null
          fecha_registro?: string | null
          id_paciente?: number
          nombre: string
          nombre_contacto_emergencia?: string | null
          telefono?: string | null
          tlf_contacto_emergencia?: string | null
        }
        Update: {
          apellidos?: string
          cedula?: string
          correo?: string | null
          direccion?: string | null
          fecha_registro?: string | null
          id_paciente?: number
          nombre?: string
          nombre_contacto_emergencia?: string | null
          telefono?: string | null
          tlf_contacto_emergencia?: string | null
        }
        Relationships: []
      }
      pago: {
        Row: {
          fecha_pago: string | null
          id_caja: number | null
          id_pago: number
          metodo_pago: string | null
          monto_usd: number
        }
        Insert: {
          fecha_pago?: string | null
          id_caja?: number | null
          id_pago?: number
          metodo_pago?: string | null
          monto_usd: number
        }
        Update: {
          fecha_pago?: string | null
          id_caja?: number | null
          id_pago?: number
          metodo_pago?: string | null
          monto_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "pago_id_caja_fkey"
            columns: ["id_caja"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      recepcion: {
        Row: {
          correo: string | null
          direccion: string | null
          id_usuario: number
          nombre_empleado: string
          telefono: string | null
        }
        Insert: {
          correo?: string | null
          direccion?: string | null
          id_usuario: number
          nombre_empleado: string
          telefono?: string | null
        }
        Update: {
          correo?: string | null
          direccion?: string | null
          id_usuario?: number
          nombre_empleado?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recepcion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      rol: {
        Row: {
          descripcion: string | null
          id_rol: number
          nombre_rol: string
        }
        Insert: {
          descripcion?: string | null
          id_rol?: number
          nombre_rol: string
        }
        Update: {
          descripcion?: string | null
          id_rol?: number
          nombre_rol?: string
        }
        Relationships: []
      }
      usuario: {
        Row: {
          estado_activo: boolean | null
          id_rol: number | null
          id_usuario: number
          password_hash: string
          username: string
        }
        Insert: {
          estado_activo?: boolean | null
          id_rol?: number | null
          id_usuario?: number
          password_hash: string
          username: string
        }
        Update: {
          estado_activo?: boolean | null
          id_rol?: number | null
          id_usuario?: number
          password_hash?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id_rol"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
