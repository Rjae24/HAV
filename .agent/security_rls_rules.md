# Reglas de Seguridad a Nivel de Fila (RLS) - Supabase

## El Principio del Secreto Médico
En el desarrollo de este proyecto, la seguridad de la información clínica no es negociable. **Supabase Row Level Security (RLS)** debe ser el guardián principal de estos datos, más allá del ruteo en React.

### Matriz de Acceso Esperada:

| Tabla / Recurso | Rol: Super Admin | Rol: Recepción / Caja | Rol: Especialista (Médico) |
| :--- | :--- | :--- | :--- |
| **Usuarios y Roles** | Lectura / Escritura | Denegado | Denegado |
| **Personal** | Lectura / Escritura | Lectura (Para asignar citas) | Lectura |
| **Pacientes** | Lectura / Escritura | Lectura / Escritura | Lectura / Escritura (Sus pacientes) |
| **Citas** | Lectura / Escritura | Lectura / Escritura | Lectura (Solo asignadas a su ID) |
| **Pagos** | Lectura | Lectura / Escritura | Denegado |
| **Historial Clínico** | Denegado (Por norma)** | Denegado | Lectura / Escritura |
| **Consultas (SOAP)** | Denegado (Por norma)** | Denegado | Lectura / Escritura |

**( ** )**: *Nota técnica: El Super Admin puede tener privilegios estructurales, pero a nivel de UI no se le deben habilitar vistas de historias clínicas para respetar la confidencialidad de la aplicación en el mundo real.*

### Instrucción de Implementación para el Agente (IA):
Cada vez que se redacte el script SQL de creación (DDL) para este proyecto o cada vez que se construya una consulta de cliente desde el Frontend, se debe asegurar que el token JWT del usuario contenga el `id_rol` correctamente referenciado en Supabase Auth.
