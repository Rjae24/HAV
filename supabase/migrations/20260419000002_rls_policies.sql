-- Políticas RLS (Row Level Security) para Portal Médico HAV
-- Nota: Estas políticas están diseñadas para funcionar cuando se integre Supabase Auth real.
-- En la fase de prototipo actual (usando anon key), deben mantenerse como referencia o activarse
-- solo después de migrar a tokens JWT.

-- Habilitar RLS en las tablas críticas
ALTER TABLE Historial_Clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE Consulta ENABLE ROW LEVEL SECURITY;
ALTER TABLE Pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE Cita ENABLE ROW LEVEL SECURITY;
ALTER TABLE Usuario ENABLE ROW LEVEL SECURITY;

-- 1. Historial Clínico: Abierto a Especialistas y Admin (God Mode autorizado).
CREATE POLICY "Especialistas y Admin pueden ver historiales" 
ON Historial_Clinico FOR SELECT 
-- asumiendo JWT payload tiene algo como (auth.jwt()->>'role_id')::int IN (1, 2)
USING ( true /* (auth.jwt()->>'role_id')::int IN (1, 2) */ );

CREATE POLICY "Especialistas y Admin pueden editar historiales" 
ON Historial_Clinico FOR UPDATE 
USING ( true /* (auth.jwt()->>'role_id')::int IN (1, 2) */ );

-- 2. Consulta: Accesible por admin y médico.
CREATE POLICY "Consultas protegidas por id de especialista o admin" 
ON Consulta FOR ALL 
USING ( true /* (auth.jwt()->>'role_id')::int IN (1, 2) */ );

-- 3. Pacientes: Admin puede ver/editar. Especialista puede ver/editar. Recepción puede ver/editar.
CREATE POLICY "Pacientes acceso general" 
ON Pacientes FOR ALL 
USING ( true /* (auth.jwt()->>'role_id')::int IN (1, 2, 3) */ );

-- 4. Citas: Todos pueden ver, pero la edición de pagos es caja, edición de status es médico/caja.
CREATE POLICY "Citas acceso general" 
ON Cita FOR ALL 
USING ( true /* (auth.jwt()->>'role_id')::int IN (1, 2, 3) */ );

-- 5. Personal / Usuarios: Solo el Admin puede manejar (crear/borrar usuarios y cambiar claves). 
-- Los doctores/caja solo pueden ver la lista (Select).
CREATE POLICY "Admin controla usuarios" 
ON Usuario FOR ALL 
USING ( true /* (auth.jwt()->>'role_id')::int = 1 */ );

CREATE POLICY "Personal puede ver usuarios activos" 
ON Usuario FOR SELECT 
USING ( true /* estado_activo = true AND (auth.jwt()->>'role_id')::int IN (2, 3) */ );

-- Nota Final:
-- Actualmente USING (true) está de placeholder para no romper el prototipo basado en ANON KEY.
-- Cuando se pase a producción real, reemplazar "true" por la verificación real del JWT de Supabase Auth.
