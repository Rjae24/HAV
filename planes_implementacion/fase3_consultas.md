# Plan de Implementación: Fase 3 - Reportes de Consultas (SOAP) y Cierres de Caja

Este documento define la arquitectura, el alcance del código y la estrategia de control de calidad (QA) y pruebas automáticas para la **Fase 3: Módulo de Reportes de Consultas (SOAP) y Cierres de Caja**.

---

## 1. Objetivos de la Fase 3
* **Super Admin**: Reporte de analítica epidemiológica consolidada (distribución de diagnósticos clínicos emitidos en la clínica para compras de inventario farmacéutico).
* **Recepción**: Reporte oficial de arqueo de caja de cobros diario (por quincena/semana/día) en PDF y Excel para cuadrar el dinero físico.
* **Médico**: Exportador formal a PDF de la Nota SOAP firmada del paciente (Receta e indicaciones del tratamiento) para entrega física al finalizar la consulta.

---

## 2. Cambios y Archivos de Código

### A. Super Admin (Perfil Epidemiológico)
* **Archivo**: [src/views/superadmin/ReportsView.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/superadmin/ReportsView.jsx)
* **Cambios**:
  * Integrar una cuarta pestaña: **"Perfil Epidemiológico (Enfermedades)"**.
  * Consultar todas las filas en la tabla `consulta` y extraer los diagnósticos.
  * Agrupar por diagnósticos comunes (ej. "Hipertensión", "Diabetes", "Evaluación General") y contar la frecuencia.
  * Renderizar un gráfico SVG dinámico de torta o barra mostrando la distribución de las enfermedades más diagnosticadas.
  * Permitir exportar este análisis estadístico tanto en SVG como en Excel.

### B. Recepción (Arqueo de Caja Oficial)
* **Archivo**: [src/views/recepcion/RecepcionReportsView.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/recepcion/RecepcionReportsView.jsx)
* **Cambios**:
  * En la pestaña de Ingresos, agregar un botón secundario: **"Imprimir Arqueo de Caja (PDF)"**.
  * Al hacer clic, generar una hoja de cuadre de caja consolidada que desglose:
    * Total recaudado hoy.
    * Totales acumulados por método de pago (Efectivo, Pago Móvil, Zelle, Punto de Venta).
    * Listado detallado de transacciones enumeradas con su ID de pago, hora, paciente y cajero responsable.
  * Generar un formato PDF membretado súper profesional y compacto, listo para imprimir y firmar físicamente por la cajera y el auditor.

### C. Médico (Receta e Informe SOAP Imprimible)
* **Archivo Nuevo**: `src/lib/printSOAP.js`
  * Helper que toma los datos de la cita, del paciente, los signos vitales y la consulta SOAP (diagnóstico y tratamiento).
  * Renderiza una plantilla de informe médico e indicaciones/receta en formato HTML optimizado para impresora (hoja partida a la mitad de forma estética: Informe Médico en la parte superior, Receta/Tratamiento en la parte inferior).
* **Archivo Modificado**: [src/views/medico/MedicoDashboard.jsx](file:///c:/Users/EL_TITII/Desktop/HAV/src/views/medico/MedicoDashboard.jsx)
  * Integrar el botón de **"Imprimir Receta / SOAP (PDF)"** en el historial del paciente tras guardar la consulta o en consultas anteriores.

---

## 3. Instrucciones de Testing y QA (Para el Agente de Control de Calidad)

El agente de QA debe simular los tres roles y verificar los siguientes puntos críticos:

### Lista de Verificación (Checklist de QA)

#### 1. Verificación del Super Admin (Epidemiología)
* [ ] Iniciar sesión como Super Admin (`admin@hav.edu.ve`).
* [ ] Ir a **Reportes > Perfil Epidemiológico**.
* [ ] Confirmar que el gráfico de distribución visualice correctamente las estadísticas de diagnósticos.
* [ ] Exportar en SVG y verificar la visualización correcta de la imagen de alta definición.
* [ ] Exportar a Excel y verificar que las agrupaciones contengan la frecuencia de casos correctos.

#### 2. Verificación de Recepción (Arqueo de Caja PDF)
* [ ] Iniciar sesión como Recepcionista (`recepcion1@hav.edu.ve`).
* [ ] Ir a **Reportes > Ingresos de Caja**.
* [ ] Generar e imprimir el **Arqueo de Caja (PDF)**.
* [ ] Confirmar que los totales desglosados de cobro coincidan exactamente con la sumatoria física registrada en Supabase.
* [ ] Certificar que el diseño del documento cuente con los campos de "Firma Cajero" y "Firma Auditor/Gerencia" al pie de página.

#### 3. Verificación del Médico (Nota SOAP y Receta en PDF)
* [ ] Iniciar sesión como Médico (`internista1@hav.edu.ve`).
* [ ] Ir a su historial clínico personal de consultas.
* [ ] Hacer clic en **"Imprimir Receta / SOAP"** sobre una consulta previa.
* [ ] Validar que la plantilla se divida correctamente (receta separada de las notas internas subjetivas/objetivas).
* [ ] Certificar que el informe clínico incluya la firma digitalizada o el espacio físico para el sello húmedo y firma del especialista.
