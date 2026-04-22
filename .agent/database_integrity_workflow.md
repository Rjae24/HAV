# Protocolo de Integridad de Base de Datos - Portal HAV

Este documento define el flujo estándar y las reglas de diseño arquitectónico para operar la base de datos `saludintegral_hav` con estricta integridad relacional y bajo las mejores prácticas, sin romper las restricciones de llaves foráneas definidas.

## 1. Patrón de Creación Múltiple (Staff Onboarding)
La inserción de un nuevo miembro del personal médico o administrativo requiere operaciones vinculadas (Transacciones). Como no podemos agruparlas nativamente desde el cliente genérico sin un Edge Function, el Frontend debe gestionar las promesas secuencialmente o en paralelo minimizando fallos a nivel lógico:

**Secuencia de Creación de Perfil de Staff:**
1. Crear el usuario del empleado en la tabla abstracta `Usuario` con el rol seleccionado.
2. Obtener el `id_usuario` retornado de la inserción exitosa.
3. Crear el documento correspondiente insertando en `Especialista` (si rol=especialista) o en `Recepcion` (si rol=recepcion/caja), utilizando este `id_usuario` como llave foránea.

## 2. Inserción de Citas y Consistencia de Historial
Las dependencias de las especialidades médicas exigen que no se cree información repetida.
**Restricciones de Citas:**
- Al agendar, verificar que la tabla en cascada esté presente: `Paciente -> Cita -> Médico (Especialista)`.
- Si el paciente es *nuevo*, se debe insertar primero en la tabla `Pacientes`.
- Inmediatamente, para mantener el principio relacional 1:1, inicializar la tabla `Historial_Clinico` en blanco vinculando al `id_paciente` generado.

## 3. Prevención de Eliminaciones Ficticias
El borrado físico (DELETE CASCADE) en tablas como `Pacientes` o `Especialista` comprometería la base de datos por los historiales que dependen del identificador de esas entidades. 
*Acción sugerida para Frontend:* Implementar siempre borrados lógicos estableciendo actualizaciones a la tabla (`Usuario` -> `estado_activo = FALSE`) o aislando la vista del registro.

## 4. Tipado de Datos Fuertemente Estricto
Al manipular la estructura de las variables, mantener concordancia con `src/types.ts`:
- Fechas siempre deben ser parseadas e incrustadas como un formato tipo `YYYY-MM-DD HH:MM:SS` (ISO String).
- Variables Monetarias (`Pago`) siempre van en numérico estricto y no Strings formateados.
