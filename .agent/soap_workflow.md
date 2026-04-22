# Flujo de Trabajo Médico (Modelo SOAP)

## Estructura Esperada en Frontend
La aplicación fue solicitada con un flujo de llenado clínico utilizando el formato **SOAP**. En el frontend (ej. `Citas de Hoy` o `Detalles de Historia Clínica`), los inputs existirán de esta manera:

1. **(S) Subjetivo:** Motivo de consulta y síntomas referidos por el paciente.
2. **(O) Objetivo:** Examen físico y signos vitales (T/A, FC, SpO2, Peso, IMC).
3. **(A) Análisis / Diagnóstico:** Impresión diagnóstica.
4. **(P) Plan:** Tratamiento o medicación.

## Integración con Backend (Tabla: `Consulta`)
Según el Modelo Entidad Relación proveido, la tabla de `Consulta` agrupa estos campos bajo los siguientes identificadores para simplificar la persistencia:

*   **`diagnostico`**: Deberá absorber la parte de *Análisis (A)*.
*   **`tratamiento`**: Deberá absorber la parte del *Plan (P)*.
*   **`notas_medicas`**: Deberá absorber -normalmente en formato estructurado JSON o texto largo- tanto el aspecto *Subjetivo (S)* como los signos vitales *Objetivos (O)*.

### Instrucción de Implementación para el Agente (IA):
Al crear el componente react para guardar el historial, mapea el payload de envío uniendo y formateando estos valores para que encajen estrictamente en las tres columnas disponibles de la tabla `Consulta` (`diagnostico`, `tratamiento`, `notas_medicas`), sin tener que alterar el MER.
