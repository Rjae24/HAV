# Reporte de Eventos Clínicos Simulados - Sistema HAV

Este documento certifica la correcta inserción y procesamiento de los eventos clínicos simulados dentro de la base de datos de producción (`saludintegral_hav`). La información refleja datos reales operando a través de las restricciones y llaves relacionales del Supabase.

---

## 📅 Evento 1: Paciente Nuevo y Consulta Completada

**Datos del Paciente**
- **Nombre:** Carlos Mendoza
- **Cédula:** V-27654321
- **Fecha de Nacimiento:** 15-06-1985
- **Contacto:** 0414-5551234 (carlos.m@example.com)

**Historial Clínico (Inicialización Automática)**
- **Tipo de Sangre:** O+
- **Alergias:** Ibuprofeno
- **Patologías Extras:** Hipertensión leve
- **Cirugías Previas:** Apendicectomía (2010)

**Evento Médico (Cita y Consulta SOAP)**
- **Médico Tratante:** Dr. Ricardo Pérez (Medicina Interna)
- **Motivo de Consulta:** Dolor en pecho (Revisión)
- **Estado de la Cita:** `completada`
- **Nota Médica (SOAP):**
  - **S:** Paciente refiere dolor esporádico.
  - **O:** TA 130/80, HR 85. Sin ruidos anormales.
  - **A (Diagnóstico):** Angina de pecho estable.
  - **P (Tratamiento):** Aspirina 81mg, remisión a cardiología.

---

## 📅 Evento 2: Registro Preventivo Pautado

**Datos del Paciente**
- **Nombre:** Ana Rodriguez
- **Cédula:** V-18765432
- **Fecha de Nacimiento:** 20-11-1990
- **Contacto:** 0412-1112233  (ana.rod@example.com)

**Historial Clínico**
*Paciente sano sin anomalías registradas.*
- **Tipo de Sangre:** A-
- **Alergias / Patologías:** Ninguna / Ninguna

**Evento Médico (Cita Futura)**
- **Médico Asignado:** Dr. Ricardo Pérez
- **Fecha Pautada:** En 2 días
- **Motivo:** Evaluación Preoperatoria
- **Estado Inicial:** `pendiente` (en espera de confirmación por la Recepcionista).

---

## 🛡️ Integridad de los Datos

*   ✅ Todas las entidades respetan el principio 1:1 entre `Pacientes` e `Historial_Clinico`.
*   ✅ La cita médica está vinculada al UUID del Médico Internista garantizando RLS (Row Level Security).
*   ✅ No hay dependencias huérfanas en la tabla de Consultas.
