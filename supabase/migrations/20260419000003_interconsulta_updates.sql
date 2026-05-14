-- Migración para actualizar la arquitectura de Interconsultas
-- Añade columnas de estado y respuesta para los perfiles de Especialistas

ALTER TABLE Interconsulta 
ADD COLUMN IF NOT EXISTS opinion_medica TEXT,
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS fecha_respuesta TIMESTAMP;

-- Opcional: Índice para búsquedas rápidas en Interconsultas enviadas/recibidas
CREATE INDEX IF NOT EXISTS idx_interconsulta_envia ON Interconsulta(id_especialista_envia);
CREATE INDEX IF NOT EXISTS idx_interconsulta_recibe ON Interconsulta(id_especialista_recibe);
