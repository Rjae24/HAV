# Plan de Implementación: Fase 1 - Reportes de Pacientes

Este documento define la arquitectura, el alcance del código y la estrategia de control de calidad (QA) y pruebas automáticas para la **Fase 1: Módulo de Reportes de Pacientes**.

---

## 1. Objetivos de la Fase 1
* **Super Admin**: Censo general de pacientes con contador de visitas completadas y exportación a Excel.
* **Recepción**: Directorio semanal de recordatorio y llamadas telefónicas con exportación a Excel.
* **Médico**: Exportación formal de la Ficha Clínica estructurada del paciente a PDF para impresión.

---

## 2. Cambios y Archivos de Código

### A. Super Admin (Censo Maestro)
* **Archivo**: [src/views/superadmin/ReportsView.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/superadmin/ReportsView.jsx)
* **Cambios**:
  * Integrar una pestaña de navegación en la cabecera: **"Finanzas"** (actual) y **"Censo de Pacientes"** (nueva).
  * En la pestaña de Censo, realizar una consulta a Supabase para traer todos los pacientes.
  * Mapear cada paciente y contar cuántas citas tiene asociadas en la tabla `cita` con `estado = 'completada'`.
  * Diseñar una tabla con columnas: ID, Nombre, Apellidos, Cédula, Fecha de Registro y Consultas Realizadas.
  * Programar la exportación del censo a Excel (delimitador `;` y BOM UTF-8 `\uFEFF`).

### B. Recepción (Directorio de Seguimiento)
* **Archivo**: [src/views/recepcion/RecepcionReportsView.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/recepcion/RecepcionReportsView.jsx)
* **Cambios**:
  * Integrar sub-pestañas en la cabecera de reportes: **"Ingresos de Caja"** (actual) y **"Llamadas Semanales"** (nueva).
  * En la sección de Llamadas Semanales, consultar todas las citas agendadas dentro del rango de la **Semana Actual** (Lunes a Domingo).
  * Mostrar en una tabla: Cédula, Paciente, Teléfono, Correo, Especialista Asignado, Hora de la Cita y un indicador de **"Estado de Datos"** (Verde si tiene teléfono y contacto de emergencia; Rojo si le faltan datos críticos).
  * Programar la exportación del listado de llamadas de la semana a Excel para facilitar la llamada telefónica de confirmación.

### C. Médico (Ficha Clínica PDF)
* **Archivo Nuevo**: `src/lib/printFicha.js`
  * Helper que recibe el objeto `paciente` y su `historial_clinico` y abre una ventana de impresión limpia (`window.open` con hoja membretada y estilos CSS específicos `@media print`).
* **Archivo Modificado**: [src/views/medico/MedicoDashboard.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/medico/MedicoDashboard.jsx)
  * Importar el helper y agregar un botón de **"Exportar Ficha (PDF)"** en la barra de detalles del paciente seleccionado (junto a sus datos de alergias y patologías).

---

## 3. Instrucciones de Testing y QA (Para el Agente de Control de Calidad)

El agente de QA debe simular los tres roles y verificar los siguientes puntos críticos:

### Lista de Verificación (Checklist de QA)

#### 1. Verificación del Super Admin (Censo)
* [ ] Iniciar sesión como Super Admin (`admin@hav.edu.ve`).
* [ ] Ir a **Reportes** y verificar que exista la nueva sub-pestaña **Censo de Pacientes**.
* [ ] Confirmar que los pacientes listados muestren el número real de consultas completadas.
* [ ] Hacer clic en **"Exportar a Excel"** en la pestaña de censo y verificar la descarga de `Reporte_Censo_Pacientes.csv`.
* [ ] Abrir el archivo en Excel y verificar que las eñes y acentos latinos se vean correctamente.

#### 2. Verificación de Recepción (Llamadas de la Semana)
* [ ] Iniciar sesión como Recepcionista (`recepcion1@hav.edu.ve`).
* [ ] Ir a **Reportes** y verificar la presencia de la pestaña **Llamadas Semanales**.
* [ ] Verificar que solo se listen las citas agendadas en la semana en curso.
* [ ] Comprobar que el "Estado de Datos" funcione (Rojo si no tiene teléfono o contacto de emergencia en su ficha).
* [ ] Exportar a Excel y verificar que el archivo contenga las columnas de contacto correctas.

#### 3. Verificación del Médico (Ficha Clínica PDF)
* [ ] Iniciar sesión como Médico (`internista1@hav.edu.ve`).
* [ ] Seleccionar a un paciente de la cola.
* [ ] Verificar que aparezca el botón **"Exportar Ficha (PDF)"** de manera estética.
* [ ] Hacer clic en el botón y verificar que se abra la ventana de impresión limpia con el diseño membretado institucional del hospital.
