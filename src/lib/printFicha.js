/**
 * Helper para renderizar e imprimir la Ficha Clínica del Paciente
 * en un formato membretado institucional del Hospital Adventista de Venezuela.
 * 
 * @param {Object} patient - Datos demográficos del paciente
 * @param {Object} history - Antecedentes clínicos (alergias, patologías, cirugías, etc.)
 */
export function printFicha(patient, history) {
  if (!patient) return;

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  
  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const bloodGroup = history?.tipo_sangre || 'No registrado';
  const allergies = history?.alergias || 'Ninguna registrada';
  const pathologies = history?.patologias || 'Ninguna registrada';
  const surgeries = history?.cirugias || 'Ninguna registrada';

  printWindow.document.write(`
    <html>
      <head>
        <title>Ficha Clinica - ${patient.nombre} ${patient.apellidos}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
          }

          /* Membrete */
          .header-container {
            border-bottom: 3px solid #1e4f5c;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .hospital-brand {
            text-align: left;
          }
          .hospital-title {
            font-size: 20px;
            font-weight: 800;
            color: #1e4f5c;
            margin: 0;
            letter-spacing: 0.5px;
          }
          .hospital-sub {
            font-size: 10px;
            color: #64748b;
            margin: 4px 0 0 0;
            font-weight: 600;
            text-transform: uppercase;
          }
          .document-title {
            text-align: right;
          }
          .doc-name {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
          }
          .doc-date {
            font-size: 11px;
            color: #64748b;
            margin: 4px 0 0 0;
          }

          /* Ficha de datos personales */
          .section-title {
            font-size: 12px;
            font-weight: 700;
            color: #1e4f5c;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            border-left: 4px solid #1e4f5c;
            padding-left: 8px;
          }
          .data-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 15px 30px;
            margin-bottom: 35px;
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .data-item {
            font-size: 13px;
          }
          .data-label {
            font-weight: 600;
            color: #475569;
            margin-bottom: 4px;
          }
          .data-value {
            font-weight: 700;
            color: #0f172a;
          }

          /* Historial clínico */
          .history-box {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 40px;
            background-color: #ffffff;
          }
          .history-row {
            display: grid;
            grid-template-cols: 150px 1fr;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
          }
          .history-row:last-child {
            border-bottom: none;
          }
          .history-label {
            font-weight: 700;
            color: #475569;
          }
          .history-content {
            color: #0f172a;
            line-height: 1.5;
            font-weight: 500;
          }
          .badge-blood {
            background-color: #ef4444;
            color: #ffffff;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 11px;
            display: inline-block;
          }

          /* Firmas y sellos */
          .footer-sign {
            margin-top: 60px;
            display: grid;
            grid-template-cols: 1fr;
            justify-items: center;
            text-align: center;
          }
          .sign-line {
            width: 200px;
            border-top: 1px solid #94a3b8;
            margin-bottom: 8px;
          }
          .sign-title {
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }
          .sign-desc {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 2px;
          }

          /* Ocultar botones en impresión */
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <!-- Encabezado Membretado -->
        <div class="header-container">
          <div style="display: flex; align-items: center; gap: 15px;">
            <img src="https://hav.com.ve/wp-content/uploads/2025/08/Logo-HAV-Inicio-Web.png" alt="Logo HAV" style="height: 52px; width: auto; object-fit: contain;" />
            <div class="hospital-brand">
              <h1 class="hospital-title">Hospital Adventista de Venezuela</h1>
              <p class="hospital-sub">Portal Clínico HAV · Departamento de Historias Médicas</p>
            </div>
          </div>
          <div class="document-title">
            <p class="doc-name">Ficha Clínica de Antecedentes</p>
            <p class="doc-date">Emitido: ${todayStr}</p>
          </div>
        </div>

        <!-- Sección Datos Personales -->
        <h3 class="section-title">Datos Demográficos</h3>
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">Paciente</div>
            <div class="data-value">${patient.nombre} ${patient.apellidos}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Cédula de Identidad</div>
            <div class="data-value">C.I. ${patient.cedula}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Teléfono de Contacto</div>
            <div class="data-value">${patient.telefono || 'No registrado'}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Correo Electrónico</div>
            <div class="data-value">${patient.correo || 'No registrado'}</div>
          </div>
        </div>

        <!-- Sección Antecedentes Clínicos -->
        <h3 class="section-title">Expediente de Antecedentes</h3>
        <div class="history-box">
          <div class="history-row">
            <div class="history-label">Tipo de Sangre</div>
            <div class="history-content">
              <span class="${history?.tipo_sangre ? 'badge-blood' : ''}">
                ${bloodGroup}
              </span>
            </div>
          </div>
          <div class="history-row">
            <div class="history-label">Alergias</div>
            <div class="history-content">${allergies}</div>
          </div>
          <div class="history-row">
            <div class="history-label">Patologías</div>
            <div class="history-content">${pathologies}</div>
          </div>
          <div class="history-row">
            <div class="history-label">Cirugías Previas</div>
            <div class="history-content">${surgeries}</div>
          </div>
        </div>

        <!-- Espacio de Sello y Firma -->
        <div class="footer-sign">
          <div class="sign-line"></div>
          <div class="sign-title">Dirección de Historias Médicas</div>
          <div class="sign-desc">Sello Húmedo y Firma Autorizada</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            // Cerrar pestaña opcionalmente después de imprimir
            // window.close();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
