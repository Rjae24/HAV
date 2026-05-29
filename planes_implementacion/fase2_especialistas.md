# Plan de Implementación: Fase 2 - Reportes de Especialistas

Este documento define la arquitectura, el alcance del código y la estrategia de control de calidad (QA) y pruebas automáticas para la **Fase 2: Módulo de Reportes de Especialistas**.

---

## 1. Objetivos de la Fase 2
* **Super Admin**: Tabla consolidada de rendimiento mensual de médicos (consultas atendidas, ingresos generados, citas canceladas) para auditoría financiera.
* **Recepción**: Panel visual de guardias y disponibilidad médica de la quincena o mes para facilitar el agendamiento.
* **Médico**: Reporte personal de facturación mensual en Excel para justificación de honorarios médicos.

---

## 2. Cambios y Archivos de Código

### A. Super Admin (Rendimiento Médico)
* **Archivo**: [src/views/superadmin/ReportsView.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/superadmin/ReportsView.jsx)
* **Cambios**:
  * Integrar una tercera pestaña: **"Rendimiento de Especialistas"**.
  * Realizar una consulta consolidada que agrupe todas las citas del período (mes en curso) por especialista (`id_especialista`).
  * Calcular dinámicamente:
    * Total de Citas Asignadas.
    * Citas Completadas (Consultas médicas).
    * Citas Canceladas.
    * **Recaudación Bruta (USD)**: Sumatoria de los montos de pago (`monto_usd` de la tabla `Pago`) asociados a las citas completadas de ese especialista.
  * Habilitar la exportación a Excel comparativa de los especialistas.

### B. Recepción (Disponibilidad y Guardias)
* **Archivo Nuevo**: `src/views/recepcion/RecepcionGuardiasReport.jsx`
  * Vista especializada de guardias activa en el menú de reportes.
  * Realiza una consulta a la tabla `horario_especialista` unida con `especialista`.
  * Muestra una cuadrícula de la quincena o del mes donde se indican qué días de la semana y en qué horarios está activo cada médico (Mañana/Tarde), y cuántas citas tiene agendadas de su límite diario.
* **Archivo Modificado**: [src/views/recepcion/RecepcionReportsView.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/recepcion/RecepcionReportsView.jsx)
  * Integrar el sub-menú de Guardias en la barra operativa de navegación.

### C. Médico (Facturación de Honorarios)
* **Archivo Modificado**: [src/views/medico/MedicoDashboard.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/medico/MedicoDashboard.jsx)
  * Agregar una pestaña de **"Mi Facturación Mensual"** en la cabecera del médico.
  * Consultar todas las consultas completadas por el médico en el mes calendario actual.
  * Muestra la tabla de: Fecha, Cédula Paciente, Nombre Paciente, Diagnóstico Primario y Monto cobrado por la consulta en caja.
  * Botón para exportar su listado de honorarios en Excel para que el médico lo envíe directamente a la administración para su pago.

---

## 3. Instrucciones de Testing y QA (Para el Agente de Control de Calidad)

El agente de QA debe simular los tres roles y verificar los siguientes puntos críticos:

### Lista de Verificación (Checklist de QA)

#### 1. Verificación del Super Admin (Rendimiento)
* [ ] Iniciar sesión como Super Admin (`admin@hav.edu.ve`).
* [ ] Ir a **Reportes** y verificar la sub-pestaña **Rendimiento de Especialistas**.
* [ ] Confirmar que los cálculos matemáticos cuadren (ej. si el Dr. Ricardo Pérez tiene 2 citas de 40 USD completadas, su recaudación debe ser estrictamente 80.00 USD).
* [ ] Exportar a Excel y verificar que el archivo contenga a todos los médicos cargados en la base de datos de Supabase.

#### 2. Verificación de Recepción (Guardias y Cupos)
* [ ] Iniciar sesión como Recepcionista (`recepcion1@hav.edu.ve`).
* [ ] Ir a **Reportes > Guardias y Disponibilidad**.
* [ ] Verificar que se listen correctamente los horarios parametrizados en `horario_especialista`.
* [ ] Comprobar que los cupos diarios ocupados se actualicen en tiempo real al agendar una nueva cita de prueba.

#### 3. Verificación del Médico (Honorarios en Excel)
* [ ] Iniciar sesión como Médico (`internista1@hav.edu.ve`).
* [ ] Navegar a **Mi Facturación Mensual**.
* [ ] Confirmar que solo se listen sus propias consultas del mes (no puede ver ingresos de otros médicos).
* [ ] Hacer clic en **"Exportar Honorarios"** y certificar que la descarga del archivo `.csv` contenga exactamente los montos recaudados en caja por sus servicios.
