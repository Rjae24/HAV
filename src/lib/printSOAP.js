export function printSOAP({ patient, consulta, specialist }) {
  const win = window.open('', '_blank');
  if (!win) return;

  const fechaFmt = new Date(consulta.fecha_realizada || new Date()).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const vitalsText = [
    consulta.tension_arterial ? `T/A: ${consulta.tension_arterial} mmHg` : null,
    consulta.frecuencia_cardiaca ? `F.C.: ${consulta.frecuencia_cardiaca} lpm` : null,
    consulta.temperatura ? `Temp: ${consulta.temperatura} °C` : null,
    consulta.saturacion_oxigeno ? `SpO₂: ${consulta.saturacion_oxigeno}%` : null,
    consulta.peso ? `Peso: ${consulta.peso} kg` : null,
    consulta.imc ? `IMC: ${consulta.imc}` : null
  ].filter(Boolean).join('  |  ') || 'No registrados';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Nota SOAP y Receta - ${patient.nombre} ${patient.apellidos}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .half {
          height: 125mm;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 6mm;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .header {
          display: flex;
          justify-content: justify;
          align-items: center;
          border-bottom: 2px solid #1e4f5c;
          padding-bottom: 3mm;
          margin-bottom: 3mm;
        }

        .hospital-info h1 {
          font-size: 14pt;
          font-weight: 700;
          color: #1e4f5c;
          letter-spacing: 0.5px;
        }

        .hospital-info p {
          font-size: 8pt;
          color: #64748b;
          margin-top: 1px;
        }

        .document-title {
          text-align: right;
        }

        .document-title h2 {
          font-size: 11pt;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
        }

        .document-title p {
          font-size: 8pt;
          color: #64748b;
          margin-top: 1px;
        }

        .meta-grid {
          display: grid;
          grid-template-cols: 1.5fr 1fr;
          gap: 4mm;
          margin-bottom: 4mm;
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          padding: 3mm;
        }

        .meta-item p {
          font-size: 8.5pt;
          line-height: 1.4;
        }

        .meta-item strong {
          color: #0f172a;
          font-weight: 600;
        }

        .section-title {
          font-size: 9pt;
          font-weight: 700;
          color: #1e4f5c;
          text-transform: uppercase;
          margin-bottom: 2mm;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 1mm;
        }

        .vitals-box {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 2mm 3mm;
          font-size: 8pt;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 3mm;
          text-align: center;
        }

        .soap-content {
          font-size: 8.5pt;
          line-height: 1.5;
          color: #334155;
          margin-bottom: 3mm;
          flex-grow: 1;
          overflow: hidden;
        }

        .diag-box {
          background-color: #fffbeb;
          border: 1px dashed #fcd34d;
          border-radius: 6px;
          padding: 2.5mm 3.5mm;
          font-size: 9pt;
          font-weight: 700;
          color: #b45309;
        }

        .rx-content {
          font-size: 10pt;
          line-height: 1.6;
          color: #0f172a;
          background-color: #fafafa;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          padding: 4mm;
          flex-grow: 1;
          white-space: pre-wrap;
          font-weight: 500;
        }

        .footer-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 3mm;
          font-size: 8pt;
        }

        .signature-line {
          width: 55mm;
          border-top: 1px solid #94a3b8;
          text-align: center;
          padding-top: 1.5mm;
          color: #475569;
          font-weight: 500;
        }

        .divider {
          border-top: 2px dashed #cbd5e1;
          text-align: center;
          position: relative;
          margin: 6mm 0;
        }

        .divider span {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #ffffff;
          padding: 0 4mm;
          font-size: 8pt;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        @media print {
          body {
            background-color: #ffffff;
          }
          .page {
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100%;
          }
          .half {
            border: 1px solid #cbd5e1;
          }
          .divider span {
            display: inline-block;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- MITAD SUPERIOR: INFORME MÉDICO -->
        <div class="half">
          <div>
            <div class="header">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="https://hav.com.ve/wp-content/uploads/2025/08/Logo-HAV-Inicio-Web.png" alt="Logo HAV" style="height: 38px; width: auto; object-fit: contain;" />
                <div class="hospital-info">
                  <h1>HOSPITAL ADVENTISTA DE VENEZUELA</h1>
                  <p>Cuidado de la Salud Integral & Excelencia Médica</p>
                </div>
              </div>
              <div class="document-title">
                <h2>Informe Médico SOAP</h2>
                <p>Folio Ref: #CONS-${consulta.id_consulta}</p>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-item">
                <p><strong>Paciente:</strong> ${patient.nombre} ${patient.apellidos}</p>
                <p><strong>Cédula:</strong> C.I. ${patient.cedula}</p>
              </div>
              <div class="meta-item" style="text-align: right;">
                <p><strong>Especialista:</strong> Dr. ${specialist.nombre_completo}</p>
                <p><strong>Especialidad:</strong> ${specialist.especialidad}</p>
              </div>
            </div>

            <div class="vitals-box">
              Signos Vitales: ${vitalsText}
            </div>

            <h3 class="section-title">Anotaciones Clínicas (S / O)</h3>
            <div class="soap-content">
              <strong>Subjetivo:</strong> ${consulta.subjetivo || 'Sin anotación de síntomas'}<br/>
              <strong style="margin-top: 1mm; display: inline-block;">Objetivo:</strong> ${consulta.objetivo || 'Sin hallazgos clínicos registrados'}
            </div>
          </div>

          <div>
            <h3 class="section-title">Diagnóstico Emitido</h3>
            <div class="diag-box">
              ${consulta.diagnostico}
            </div>

            <div class="footer-signatures">
              <div>
                <p style="color: #64748b; font-size: 7.5pt;">Fecha de emisión: ${fechaFmt}</p>
              </div>
              <div class="signature-line">
                Dr. ${specialist.nombre_completo}<br/>
                <span style="font-size: 7pt; color: #64748b;">Firma y Sello del Especialista</span>
              </div>
            </div>
          </div>
        </div>

        <!-- DIVISOR DE RECORTE -->
        <div class="divider">
          <span>✂️ Recortar aquí para Receta / Tratamiento</span>
        </div>

        <!-- MITAD INFERIOR: RECETA MÉDICA -->
        <div class="half">
          <div>
            <div class="header">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="https://hav.com.ve/wp-content/uploads/2025/08/Logo-HAV-Inicio-Web.png" alt="Logo HAV" style="height: 38px; width: auto; object-fit: contain;" />
                <div class="hospital-info">
                  <h1>HOSPITAL ADVENTISTA DE VENEZUELA</h1>
                  <p>Cuidado de la Salud Integral & Excelencia Médica</p>
                </div>
              </div>
              <div class="document-title">
                <h2>Indicaciones y Receta</h2>
                <p>Ref Cita: #${consulta.id_cita}</p>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-item">
                <p><strong>Paciente:</strong> ${patient.nombre} ${patient.apellidos}</p>
                <p><strong>Cédula:</strong> C.I. ${patient.cedula}</p>
              </div>
              <div class="meta-item" style="text-align: right;">
                <p><strong>Médico Tratante:</strong> Dr. ${specialist.nombre_completo}</p>
                <p><strong>Especialidad:</strong> ${specialist.especialidad}</p>
              </div>
            </div>

            <h3 class="section-title">Tratamiento Farmacológico e Indicaciones</h3>
            <div class="rx-content">${consulta.tratamiento}</div>
          </div>

          <div class="footer-signatures" style="margin-top: auto;">
            <div>
              <p style="color: #64748b; font-size: 7.5pt;">Fecha: ${fechaFmt}</p>
              <p style="color: #ef4444; font-size: 7.5pt; font-weight: 600; margin-top: 1px;">Válido por 30 días</p>
            </div>
            <div class="signature-line">
              Dr. ${specialist.nombre_completo}<br/>
              <span style="font-size: 7pt; color: #64748b;">Firma y Sello del Especialista</span>
            </div>
          </div>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
