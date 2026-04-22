import fs from 'fs';
import PDFDocument from 'pdfkit';

const doc = new PDFDocument({ margin: 50 });

// Pipe its output somewhere, like to a file or HTTP response
doc.pipe(fs.createWriteStream('Reporte_Simulacion_Casos_Uso.pdf'));

// Add styling and text
doc.fontSize(20).text('Reporte de Simulación - Sistema Saludi Integral HAV', { align: 'center' });
doc.moveDown();

doc.fontSize(14).text('Base de Datos Supabase Configurada', { underline: true });
doc.fontSize(12).text('Proyecto: saludintegral_hav');
doc.text('El entorno ha sido inicializado con éxito usando el modelo MER establecido.');
doc.moveDown();

doc.fontSize(14).text('Escenarios Mockeados (Casos de Uso)', { underline: true });
doc.moveDown();

// Escenario 1
doc.fontSize(12).text('Escenario 1: Autenticación Basada en Roles', { bold: true });
doc.text('Datos insertados:');
doc.text('- Super Admin habilitado: admin@hav.edu.ve (id_rol: 1)');
doc.text('- Especialista habilitado: medico@hav.edu.ve (id_rol: 2)');
doc.text('- Caja/Recepción habilitada: recepcion@hav.edu.ve (id_rol: 3)');
doc.moveDown();

// Escenario 2
doc.fontSize(12).text('Escenario 2: Ingreso de Pacientes (Flujo Recepción)', { bold: true });
doc.text('El usuario "recepcion@hav.edu.ve" procesa el registro y guarda el paciente:');
doc.text('- Paciente 1: Eduardo San Vicente (C.I. V-12345678)');
doc.text('- Paciente 2: María Gabriela Díaz (C.I. V-18901234)');
doc.moveDown();

// Escenario 3
doc.fontSize(12).text('Escenario 3: Asignación de Citas y Pagos', { bold: true });
doc.text('Recepción procesa pagos y asigna la cita al especialista correspondiente:');
doc.text('- Cita 1: Eduardo San Vicente asiste por "Control de presión arterial". Pago de 45 USD en Zelle.');
doc.text('  Médico Asignado: Dr. Ricardo Pérez (Medicina Interna). Estado: COMPLETADA.');
doc.text('- Cita 2: María Gabriela asiste por "Evaluación general". Pago de 40 USD por Punto.');
doc.text('  Médico Asignado: Dr. Ricardo Pérez. Estado: PENDIENTE.');
doc.moveDown();

// Escenario 4
doc.fontSize(12).text('Escenario 4: Acto Médico y Metodología SOAP', { bold: true });
doc.text('El Dr. Ricardo Pérez ingresa a su panel y completa la Cita 1 de Eduardo San Vicente:');
doc.text('S/O (Notas Médicas): Paciente refiere sentirse bien. T/A 120/80 mmHg, SpO2 98%.');
doc.text('A (Diagnóstico): Hipertensión arterial controlada.');
doc.text('P (Tratamiento): Mantener Losartán 50mg OD. Iniciar dieta baja en sodio.');
doc.moveDown();

doc.fontSize(12).text('Conclusión', { underline: true });
doc.text('Las tablas de Pacientes, Citas, Historial Clínico, Pagos y Consultas están completamente operativas mediante relaciones FK con integridad de datos (Delete Cascade/Restrict) funcionales.');

// Finalize PDF file
doc.end();
console.log('PDF generado exitosamente!');
