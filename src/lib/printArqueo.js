export function printArqueo({ appointments, cashier, tasaBase, periodLabel }) {
  const win = window.open('', '_blank');
  if (!win) return;

  const todayStr = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

  // Agrupar totales por método de pago
  const breakdown = {
    'Efectivo': 0,
    'Pago Móvil': 0,
    'Zelle': 0,
    'Punto de Venta': 0
  };

  let totalUSD = 0;
  const transactions = [];

  appointments.forEach(appt => {
    if (appt.pago) {
      const amt = parseFloat(appt.pago.monto_usd || 0);
      totalUSD += amt;
      
      const method = appt.pago.metodo_pago || 'Otros';
      if (breakdown[method] !== undefined) {
        breakdown[method] += amt;
      } else {
        breakdown[method] = (breakdown[method] || 0) + amt;
      }

      transactions.push({
        id: appt.pago.id_pago,
        fecha: new Date(appt.pago.fecha_pago || appt.fecha_pautada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        paciente: appt.pacientes ? `${appt.pacientes.nombre} ${appt.pacientes.apellidos}` : 'N/A',
        cajero: cashier.name,
        metodo: method,
        monto: amt
      });
    }
  });

  const totalBs = totalUSD * tasaBase;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Arqueo de Caja Oficial - ${todayStr}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          padding: 10mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .header {
          display: flex;
          justify-content: justify;
          align-items: center;
          border-bottom: 2px solid #1e4f5c;
          padding-bottom: 4mm;
          margin-bottom: 6mm;
        }

        .hospital-info h1 {
          font-size: 16pt;
          font-weight: 700;
          color: #1e4f5c;
          letter-spacing: 0.5px;
        }

        .hospital-info p {
          font-size: 9pt;
          color: #64748b;
          margin-top: 2px;
        }

        .document-title {
          text-align: right;
        }

        .document-title h2 {
          font-size: 12pt;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
        }

        .document-title p {
          font-size: 9pt;
          color: #64748b;
          margin-top: 2px;
        }

        .meta-grid {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 6mm;
          margin-bottom: 6mm;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 4mm;
          font-size: 9.5pt;
        }

        .meta-item strong {
          color: #0f172a;
        }

        .section-title {
          font-size: 10.5pt;
          font-weight: 700;
          color: #1e4f5c;
          text-transform: uppercase;
          margin-bottom: 3.5mm;
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 1.5mm;
        }

        .consolidated-grid {
          display: grid;
          grid-template-cols: repeat(4, 1fr);
          gap: 4mm;
          margin-bottom: 6mm;
        }

        .consolidated-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 3mm;
          text-align: center;
        }

        .consolidated-card h4 {
          font-size: 8pt;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 1.5mm;
        }

        .consolidated-card p {
          font-size: 12.5pt;
          font-weight: 700;
          color: #0f172a;
        }

        .totals-card {
          grid-column: span 4;
          background-color: #1e4f5c;
          color: #ffffff;
          border-radius: 8px;
          padding: 4.5mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2mm;
        }

        .totals-card h3 {
          font-size: 10pt;
          font-weight: 600;
          color: #e2f1f4;
          text-transform: uppercase;
        }

        .totals-card p {
          font-size: 18pt;
          font-weight: 800;
        }

        .tx-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
          margin-bottom: 10mm;
        }

        .tx-table th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 600;
          text-transform: uppercase;
          padding: 2.5mm 3.5mm;
          border-bottom: 1.5px solid #cbd5e1;
          text-align: left;
        }

        .tx-table td {
          padding: 2.5mm 3.5mm;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
        }

        .tx-table tr:hover {
          background-color: #f8fafc;
        }

        .footer-signatures {
          display: flex;
          justify-content: space-around;
          margin-top: 15mm;
        }

        .signature-box {
          width: 65mm;
          text-align: center;
        }

        .signature-line {
          border-top: 1px solid #94a3b8;
          padding-top: 2mm;
          font-size: 9pt;
          font-weight: 600;
          color: #334155;
        }

        .signature-box p {
          font-size: 7.5pt;
          color: #64748b;
          margin-top: 1mm;
        }

        @media print {
          body {
            padding: 0;
            margin: 0;
          }
          .consolidated-card {
            border: 1px solid #cbd5e1;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hospital-info">
          <h1>HOSPITAL ADVENTISTA DE VENEZUELA</h1>
          <p>Cuidado de la Salud Integral & Excelencia Médica</p>
        </div>
        <div class="document-title">
          <h2>Arqueo de Caja Oficial</h2>
          <p>Cierre de Caja Contable</p>
        </div>
      </div>

      <div class="meta-grid">
        <div>
          <p><strong>Cajero Responsable:</strong> ${cashier.name}</p>
          <p><strong>Usuario del Sistema:</strong> ${cashier.email}</p>
          <p><strong>Período Auditado:</strong> ${periodLabel}</p>
        </div>
        <div style="text-align: right;">
          <p><strong>Fecha Emisión:</strong> ${todayStr}</p>
          <p><strong>Tasa de Cambio:</strong> ${tasaBase} Bs/USD</p>
          <p><strong>Estado Cierre:</strong> CONCILIADO ✅</p>
        </div>
      </div>

      <h3 class="section-title">Consolidado de Cobros por Método</h3>
      <div class="consolidated-grid">
        <div class="consolidated-card">
          <h4>Efectivo</h4>
          <p>$${breakdown['Efectivo'].toFixed(2)}</p>
        </div>
        <div class="consolidated-card">
          <h4>Zelle</h4>
          <p>$${breakdown['Zelle'].toFixed(2)}</p>
        </div>
        <div class="consolidated-card">
          <h4>Pago Móvil</h4>
          <p>$${breakdown['Pago Móvil'].toFixed(2)}</p>
        </div>
        <div class="consolidated-card">
          <h4>Punto de Venta</h4>
          <p>$${breakdown['Punto de Venta'].toFixed(2)}</p>
        </div>

        <div class="totals-card">
          <div>
            <h3>Recaudación Bruta Contable</h3>
            <p style="font-size: 11pt; color: #e2f1f4; margin-top: 1mm;">Equivalente en Bolívares: <strong>Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></p>
          </div>
          <div>
            <p>$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</p>
          </div>
        </div>
      </div>

      <h3 class="section-title">Desglose Detallado de Transacciones</h3>
      <table class="tx-table">
        <thead>
          <tr>
            <th>ID Pago</th>
            <th>Hora</th>
            <th>Paciente</th>
            <th>Cajero</th>
            <th>Método de Pago</th>
            <th style="text-align: right;">Monto (USD)</th>
            <th style="text-align: right;">Equivalente (Bs)</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.length === 0 ? `
            <tr>
              <td colSpan="7" style="text-align: center; padding: 10mm; color: #94a3b8;">No se registraron transacciones cobradas en este período.</td>
            </tr>
          ` : transactions.map(tx => `
            <tr>
              <td><strong>#${tx.id.toString().padStart(4, '0')}</strong></td>
              <td>${tx.fecha}</td>
              <td>${tx.paciente}</td>
              <td>${tx.cajero}</td>
              <td><span style="background-color: #f1f5f9; padding: 0.8mm 2mm; border-radius: 4px; font-weight: 600; color: #475569;">${tx.metodo}</span></td>
              <td style="text-align: right; font-weight: 700;">$${tx.monto.toFixed(2)}</td>
              <td style="text-align: right; font-weight: 600; color: #166534;">Bs ${(tx.monto * tasaBase).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer-signatures">
        <div class="signature-box">
          <div class="signature-line">Firma Cajera Responsable</div>
          <p>${cashier.name}</p>
        </div>
        <div class="signature-box">
          <div class="signature-line">Firma Auditor / Administrador</div>
          <p>Auditoría Interna HAV</p>
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
