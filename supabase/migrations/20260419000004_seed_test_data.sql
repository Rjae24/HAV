-- 1. Agregar fecha_nacimiento que faltaba en el esquema original y es requerida
ALTER TABLE Pacientes ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- 2. Limpieza de base de datos
TRUNCATE TABLE Usuario CASCADE;
TRUNCATE TABLE Pacientes CASCADE;

-- 3. Insertar Usuarios
INSERT INTO Usuario (id_usuario, id_rol, username, password_hash) VALUES
(1, 1, 'admin@hav.edu.ve', 'admin123'),
(2, 3, 'recepcion1@hav.edu.ve', 'recepcion2026'),
(3, 3, 'recepcion2@hav.edu.ve', 'recepcion2026'),
(4, 2, 'internista1@hav.edu.ve', 'internista123'),
(5, 2, 'internista2@hav.edu.ve', 'internista123'),
(6, 2, 'trauma1@hav.edu.ve', 'trauma123'),
(7, 2, 'trauma2@hav.edu.ve', 'trauma123'),
(8, 2, 'cardio1@hav.edu.ve', 'cardio123'),
(9, 2, 'cardio2@hav.edu.ve', 'cardio123');
SELECT setval('Usuario_id_usuario_seq', (SELECT MAX(id_usuario) FROM Usuario));

-- 4. Insertar Recepción
INSERT INTO Recepcion (id_usuario, nombre_empleado) VALUES
(2, 'Ana Gómez'),
(3, 'Carlos Ruiz');

-- 5. Insertar Especialistas
INSERT INTO Especialista (id_usuario, cedula, nombre_completo, especialidad) VALUES
(4, 'V-10000001', 'Dra. María Pérez', 'Internista'),
(5, 'V-10000002', 'Dr. Juan Díaz', 'Internista'),
(6, 'V-10000003', 'Dr. Roberto Mendoza', 'Traumatología'),
(7, 'V-10000004', 'Dra. Lucia Silva', 'Traumatología'),
(8, 'V-10000005', 'Dr. Ernesto Fuentes', 'Cardiología'),
(9, 'V-10000006', 'Dra. Sofía López', 'Cardiología');

-- 6. Insertar Pacientes
INSERT INTO Pacientes (id_paciente, cedula, nombre, apellidos, telefono, direccion, correo, fecha_nacimiento) VALUES
(1, 'V-20000001', 'Laura', 'González', '0414-1111111', 'Caracas', 'laura.g@mail.com', '1990-05-14'),
(2, 'V-20000002', 'Fernando', 'Suárez', '0414-2222222', 'Maracay', 'fernando.s@mail.com', '1985-08-22'),
(3, 'V-20000003', 'Carmen', 'Pérez', '0414-3333333', 'Valencia', 'carmen.p@mail.com', '1970-12-05'),
(4, 'V-20000004', 'Miguel', 'García', '0414-4444444', 'Barquisimeto', 'miguel.g@mail.com', '2001-03-30'),
(5, 'V-20000005', 'Diana', 'Romero', '0414-5555555', 'Los Teques', 'diana.r@mail.com', '1995-11-18');
SELECT setval('Pacientes_id_paciente_seq', (SELECT MAX(id_paciente) FROM Pacientes));

-- 7. Insertar Historial Clínico
INSERT INTO Historial_Clinico (id_paciente, tipo_sangre, alergias, patologias, cirugias) VALUES
(1, 'O+', 'Ninguna', 'Ninguna', 'Apendicectomía (2015)'),
(2, 'A+', 'Penicilina', 'Hipertensión', 'Ninguna'),
(3, 'B+', 'Ninguna', 'Diabetes Tipo II', 'Retiro de Hernia'),
(4, 'O-', 'Ibuprofeno', 'Asma', 'Ninguna'),
(5, 'AB+', 'Ninguna', 'Ninguna', 'Ninguna');

-- 8. Insertar Pagos
INSERT INTO Pago (id_pago, id_caja, monto_usd, metodo_pago) VALUES
(1, 2, 45.00, 'Zelle'),
(2, 2, 50.00, 'Efectivo USD'),
(3, 3, 60.00, 'Debito Bs'),
(4, 3, 45.00, 'Zelle'),
(5, 2, 70.00, 'Efectivo USD');
SELECT setval('Pago_id_pago_seq', (SELECT MAX(id_pago) FROM Pago));

-- 9. Insertar Citas (distribuir entre internistas, traumas y cardios)
INSERT INTO Cita (id_cita, id_paciente, id_especialista, id_pago, motivo_consulta, estado, fecha_pautada) VALUES
(1, 1, 4, 1, 'Chequeo general anual', 'completada', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(2, 2, 6, 2, 'Dolor fuerte en rodilla derecha', 'completada', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 3, 8, 3, 'Palpitaciones irregulares, fatiga', 'completada', CURRENT_TIMESTAMP - INTERVAL '1 days'),
(4, 4, 5, 4, 'Fiebre y tos seca continua', 'pendiente', CURRENT_TIMESTAMP + INTERVAL '1 days'),
(5, 5, 9, 5, 'Evaluación de riesgo cardíaco pre-operatorio', 'pendiente', CURRENT_TIMESTAMP + INTERVAL '2 days');
SELECT setval('Cita_id_cita_seq', (SELECT MAX(id_cita) FROM Cita));

-- 10. Insertar Consultas (sólo para las completadas: 1, 2, 3)
INSERT INTO Consulta (id_consulta, id_cita, diagnostico, tratamiento, notas_medicas) VALUES
(1, 1, 'Paciente sana. Laboratorios dentro de norma', 'Vitaminas generales', 'S: Sin dolencias\nO: PA 110/70 FC 75'),
(2, 2, 'Posible desgarro de menisco o ligamento cruzado', 'Reposo absoluto, inmovilizador y resonancia magnética urgente', 'S: Dolor agudo post trauma deportivo\nO: Edema severo en articulación, Test de cajón positivo'),
(3, 3, 'Arritmia supraventricular a evaluar en holter', 'Bisoprolol 2.5mg OD, aspirina', 'S: Refiere palpitaciones y mareos esporádicos\nO: Ritmo irregular en EKG en consultorio');
SELECT setval('Consulta_id_consulta_seq', (SELECT MAX(id_consulta) FROM Consulta));

-- 11. Insertar Interconsultas
-- Trauma (doc 6) solicita a Cardio (doc 8)
INSERT INTO Interconsulta (id_consulta, id_especialista_envia, id_especialista_recibe, motivo_interconsulta, estado) VALUES
(2, 6, 8, 'Desgarro en rodilla candidato a cirugía inminente. Solicito valoración de riesgo quirúrgico cardiovascular del paciente de 39 años hipertenso.', 'pendiente');
