# Definición del Modelo de Datos (MER) - Salud Integral HAV

## Consideraciones Estratégicas
Esta estructura relacional es el núcleo del **Portal HAV**. Toda consulta desde el Frontend (usando Supabase JS) debe apegarse estrictamente a estas tablas y campos.

### 1. Gestión de Acceso
- **`Rol`**: Define los niveles jerárquicos (id_rol, nombre_rol, descripcion). *Posibles roles: admin, especialista, caja, recepcion.*
- **`Usuario`**: Entidad para la autenticación en Supabase Auth, enlazada a un id_rol y control de estado (estado_activo).

### 2. Entidades del Personal
Ambas entidades tienen como Foreign Key (`id_usuario`) la PK de la tabla `Usuario`.
- **`Especialista`**: Perfil de médicos (cedula, nombre_completo, especialidad, tlf, direccion, correo).
- **`Recepcion`**: Perfil del personal en mostrador/caja (nombre_empleado, telefono, direccion, correo).

### 3. Entidades del Paciente
- **`Pacientes`**: Información demográfica primaria e información de contacto de emergencia.
- **`Historial_Clinico`**: Existe una relación 1:1 con el paciente. Contiene las variables permanentes del estado de salud (tipo_sangre, alergias, patologias, cirugias). ***Aislado bajo estricto RLS.***

### 4. Flujo Médico (Core Operativo)
- **`Cita`**: Punto de convergencia. Une a un `Paciente` con un `Especialista`, asocia si está pagada (id_pago FK) y maneja el estado (pendiente, completada, cancelada).
- **`Consulta`**: Entidad derivada de una `Cita`. Contiene el Acto Médico en sí, modelado bajo técnica SOAP encubierta (diagnostico, tratamiento, notas_medicas).
- **`Interconsulta`**: Utilizada para derivaciones. (id_consulta FK, id_especialista que envía, id_especialista que recibe, motivo).
- **`Pago`**: Entidad administrativa transaccional (monto, metodo_pago, fecha y usuario en caja que la procesó).
