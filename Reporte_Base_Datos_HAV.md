# Reporte del Estado de la Base de Datos (Supabase) - Portal HAV

Este reporte refleja el estado actual de la base de datos de producción `saludintegral_hav` para el proyecto Hospital Adventista de Venezuela.

**Fecha de Generación**: 19 de Abril de 2026
**Entorno**: Producción (Supabase)

---

## 1. Tablas y Arquitectura
Se ha verificado la integridad relacional basada en el modelo físico (MER) proyectado. Las siguientes **10 tablas maestras** se encuentran instanciadas con sus llaves foráneas y primary keys correspondientes:

- `Rol`: Roles jerárquicos (Super Admin, Recepción, Especialistas).
- `Usuario`: Credenciales de acceso encriptadas.
- `Especialista`: Directorio médico y especialidades.
- `Recepcion`: Personal administrativo en área de registro.
- `Pacientes`: Información demográfica principal.
- `Historial_Clinico`: Entidad clínica estructurada en 1:1 con Pacientes.
- `Cita`: Gestor de agendamientos médicos.
- `Consulta`: Registros de atención SOAP detallada (Notas médicas, diagnósticos).
- `Pago`: Pasarela de pagos por consultas o emergencias.
- `Interconsulta`: Referencias médicas cruzadas entre especialistas internos o externos.

---

## 2. Volumen de Datos Inicial (Fase Piloto)
Mediante consultas SQL seguras (RLS enabled), se extrajo la siguiente métrica operacional utilizada para los tests unitarios y validaciones de E2E:

| Entidad | Registros Activos | Observaciones |
| :--- | :--- | :--- |
| **Roles** | 3 | `admin`, `recepcion`, `especialista` |
| **Usuarios** | 3 | Credenciales seguras asignadas. |
| **Médicos** | 1 | Dr. Ricardo Pérez (Internista). |
| **Recepcionistas**| 1 | Personal de caja base. |
| **Pacientes** | 2 | Perfiles con datos demográficos listos. |
| **Citas** | 2 | Citas agendadas para Pruebas (Pendientes/Completadas). |
| **Consultas** | 1 | Práctica de Formato SOAP verificado exitosamente. |

---

## 3. Conformidad con Requisitos
1. **Sustitución Completada**: Se limpió todo el código dependiente de `mockData.js`, permitiendo consumo 100% cloud.
2. **Consultas con Supabase**: Los Dashboards principales (Médico y Recepción) implementan métodos seguros con `.select()` optimizados mediante uniones de tablas relacionales (`Cita -> Paciente -> Historial`).
3. **Escalabilidad Futura**: Listos para incorporar más campos o migrar Auth nativo si el cliente lo requiere próximamente.

**Resultado:** Base de datos madura y estable para dar paso a las siguientes fases de desarrollo como los módulos de enfermería o reportería PDF.
