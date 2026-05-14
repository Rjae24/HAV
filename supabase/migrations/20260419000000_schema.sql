-- 1. Tabla Roles
CREATE TABLE Rol (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

-- 2. Tabla Usuarios
CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INT REFERENCES Rol(id_rol) ON DELETE RESTRICT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    estado_activo BOOLEAN DEFAULT true
);

-- 3. Tabla Especialista
CREATE TABLE Especialista (
    id_usuario INT PRIMARY KEY REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    tlf VARCHAR(20),
    direccion TEXT,
    correo VARCHAR(100)
);

-- 4. Tabla Recepción
CREATE TABLE Recepcion (
    id_usuario INT PRIMARY KEY REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
    nombre_empleado VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    correo VARCHAR(100)
);

-- 5. Tabla Pacientes
CREATE TABLE Pacientes (
    id_paciente SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    correo VARCHAR(100),
    nombre_contacto_emergencia VARCHAR(150),
    tlf_contacto_emergencia VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla Historial Clínico
CREATE TABLE Historial_Clinico (
    id_historial SERIAL PRIMARY KEY,
    id_paciente INT REFERENCES Pacientes(id_paciente) ON DELETE CASCADE UNIQUE,
    tipo_sangre VARCHAR(5),
    alergias TEXT,
    patologias TEXT,
    cirugias TEXT,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla Pago
CREATE TABLE Pago (
    id_pago SERIAL PRIMARY KEY,
    id_caja INT REFERENCES Usuario(id_usuario),
    monto_usd DECIMAL(10, 2) NOT NULL,
    metodo_pago VARCHAR(50),
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla Cita
CREATE TABLE Cita (
    id_cita SERIAL PRIMARY KEY,
    id_paciente INT REFERENCES Pacientes(id_paciente) ON DELETE CASCADE,
    id_especialista INT REFERENCES Especialista(id_usuario),
    id_pago INT REFERENCES Pago(id_pago),
    motivo_consulta TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente',
    fecha_pautada TIMESTAMP NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabla Consulta
CREATE TABLE Consulta (
    id_consulta SERIAL PRIMARY KEY,
    id_cita INT REFERENCES Cita(id_cita) ON DELETE CASCADE,
    diagnostico TEXT,
    tratamiento TEXT,
    notas_medicas TEXT,
    fecha_realizada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabla Interconsulta
CREATE TABLE Interconsulta (
    id_interconsulta SERIAL PRIMARY KEY,
    motivo_interconsulta TEXT,
    id_consulta INT REFERENCES Consulta(id_consulta) ON DELETE CASCADE,
    id_especialista_envia INT REFERENCES Especialista(id_usuario),
    id_especialista_recibe INT REFERENCES Especialista(id_usuario)
);

-- INSERT DE ROLES INICIALES
INSERT INTO Rol (nombre_rol, descripcion) VALUES 
('admin', 'Super Administrador del sistema HAV'),
('especialista', 'Médico Especialista o Internista'),
('caja', 'Persona encargada de recepción e ingresos');

-- FUNCION Y TRIGGER PARA ACTUALIZAR FECHA DE HISTORIAL CLINICO
CREATE OR REPLACE FUNCTION update_historial_clinico_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.ultima_actualizacion = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_historial_timestamp
BEFORE UPDATE ON Historial_Clinico
FOR EACH ROW
EXECUTE FUNCTION update_historial_clinico_timestamp();

-- RLS (Row Level Security) - Nota: Dado que la Auth actual usa id_usuario mapeado a password_hash en vez de UUID de Supabase Auth
-- Para este prototipo, dejaremos las políticas como un marco base pero con RLS deshabilitado 
-- o permitiendo anon key para uso mediante mock queries, a menos que enlacemos auth.uid() en el futuro.
