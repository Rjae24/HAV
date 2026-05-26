import { useState, useEffect, useMemo, useRef } from 'react';
import { DollarSign, Search, Calendar as CalendarIcon, Download, TrendingUp, BarChart3, Receipt, Activity, FileStack, Settings, ArrowRight, RefreshCw, CreditCard, Calendar, FileText, FileSpreadsheet, File as FileIcon, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export default function ReportsView({ showToast }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasaBase, setTasaBase] = useState(38.50); // Tasa por defecto
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPagos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pago')
        .select(`
          id_pago, monto_usd, metodo_pago, fecha_pago,
          usuario:id_caja ( username )
        `)
        .order('fecha_pago', { ascending: false });

      if (error) throw error;
      setPagos(data || []);
    } catch (err) {
      console.error(err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los pagos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagos();
  }, []);

  const totalUSD = pagos.reduce((acc, curr) => acc + parseFloat(curr.monto_usd), 0);
  const totalBs = totalUSD * tasaBase;

  const exportToCSV = () => {
    const headers = ["ID Trans.", "Fecha", "Método", "Cajero", "Monto (USD)", "Tasa (Bs/USD)", "Total (Bs)"];
    const rows = pagos.map(p => {
      const equiv = parseFloat(p.monto_usd) * tasaBase;
      return [
        `#${p.id_pago.toString().padStart(4, '0')}`,
        new Date(p.fecha_pago).toLocaleDateString('es-ES'),
        p.metodo_pago,
        p.usuario?.username || 'N/A',
        parseFloat(p.monto_usd).toFixed(2),
        tasaBase.toFixed(2),
        equiv.toFixed(2)
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_financiero_HAV_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text('Reporte Financiero HAV', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Tasa de cambio aplicada: ${tasaBase} Bs/USD`, 14, 33);

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Resumen General', 14, 45);
    doc.autoTable({
      startY: 48,
      head: [['Concepto', 'Monto']],
      body: [
        ['Ingresos Totales (USD)', `$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
        ['Ingresos Equivalentes (Bs)', `Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`],
        ['Total Operaciones', pagos.length.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 79, 92] }
    });

    // Transactions Table
    doc.text('Historial de Transacciones', 14, doc.lastAutoTable.finalY + 15);
    const tableData = pagos.map(p => [
      `#${p.id_pago.toString().padStart(4, '0')}`,
      new Date(p.fecha_pago).toLocaleDateString('es-ES'),
      p.metodo_pago,
      p.usuario?.username || 'N/A',
      `$${parseFloat(p.monto_usd).toFixed(2)}`,
      `Bs ${(parseFloat(p.monto_usd) * tasaBase).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [['ID', 'Fecha', 'Método', 'Cajero', 'USD', 'Bs']],
      body: tableData,
      headStyles: { fillColor: [30, 79, 92] },
      styles: { fontSize: 8 }
    });

    doc.save(`reporte_financiero_HAV_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const data = pagos.map(p => ({
      "ID Trans.": `#${p.id_pago.toString().padStart(4, '0')}`,
      "Fecha": new Date(p.fecha_pago).toLocaleDateString('es-ES'),
      "Método": p.metodo_pago,
      "Cajero": p.usuario?.username || 'N/A',
      "Monto (USD)": parseFloat(p.monto_usd),
      "Tasa (Bs/USD)": tasaBase,
      "Total (Bs)": parseFloat(p.monto_usd) * tasaBase
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pagos");

    // Summary sheet
    const summaryData = [
      { Concepto: "Ingresos Totales (USD)", Valor: totalUSD },
      { Concepto: "Ingresos Equivalentes (Bs)", Valor: totalBs },
      { Concepto: "Tasa de Cambio", Valor: tasaBase },
      { Concepto: "Total Operaciones", Valor: pagos.length }
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

    XLSX.writeFile(workbook, `reporte_financiero_HAV_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToWord = async () => {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "ID", style: "Header" })] }),
          new TableCell({ children: [new Paragraph({ text: "Fecha", style: "Header" })] }),
          new TableCell({ children: [new Paragraph({ text: "Método", style: "Header" })] }),
          new TableCell({ children: [new Paragraph({ text: "USD", style: "Header" })] }),
          new TableCell({ children: [new Paragraph({ text: "Bs", style: "Header" })] }),
        ],
      }),
      ...pagos.map(p => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(`#${p.id_pago.toString().padStart(4, '0')}`)] }),
          new TableCell({ children: [new Paragraph(new Date(p.fecha_pago).toLocaleDateString('es-ES'))] }),
          new TableCell({ children: [new Paragraph(p.metodo_pago)] }),
          new TableCell({ children: [new Paragraph(`$${parseFloat(p.monto_usd).toFixed(2)}`)] }),
          new TableCell({ children: [new Paragraph(`Bs ${(parseFloat(p.monto_usd) * tasaBase).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`)] }),
        ],
      })),
    ];

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "REPORTE FINANCIERO HAV",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Fecha de generación: ${new Date().toLocaleString()}`, break: 1 }),
              new TextRun({ text: `Tasa de cambio: ${tasaBase} Bs/USD`, break: 1 }),
            ],
          }),
          new Paragraph({ text: "Resumen Ejecutivo", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({ text: `Total Ingresos (USD): $${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, bold: true, break: 1 }),
              new TextRun({ text: `Total Ingresos (Bs): Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, bold: true, break: 1 }),
              new TextRun({ text: `Operaciones: ${pagos.length}`, break: 1 }),
            ],
          }),
          new Paragraph({ text: "Detalle de Transacciones", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `reporte_financiero_HAV_${new Date().toISOString().split('T')[0]}.docx`);
  };

  const handleExport = (format) => {
    if (pagos.length === 0) {
      if (showToast) showToast({ type: 'error', title: 'Sin datos', message: 'No hay transacciones para exportar.' });
      return;
    }

    try {
      switch (format) {
        case 'csv': exportToCSV(); break;
        case 'pdf': exportToPDF(); break;
        case 'excel': exportToExcel(); break;
        case 'word': exportToWord(); break;
        default: exportToCSV();
      }
      if (showToast) showToast({ type: 'success', title: 'Exportación exitosa', message: `El reporte en formato ${format.toUpperCase()} se ha descargado.` });
    } catch (err) {
      console.error(err);
      if (showToast) showToast({ type: 'error', title: 'Error', message: 'No se pudo completar la exportación.' });
    }
    setShowExportMenu(false);
  };

  return (
    <div className="p-6 space-y-6 view-enter h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">
            Reportes Financieros
          </h1>
          <p className="text-hav-text-muted text-sm mt-0.5">
            Analítica de flujos y conversión en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 md:pr-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 px-3 py-1 bg-green-50 border border-green-100 rounded-lg">
            <RefreshCw size={14} className="text-green-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-green-700 uppercase">Tasa de Cambio (Bs)</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={tasaBase}
                onChange={(e) => setTasaBase(parseFloat(e.target.value) || 0)}
                className="bg-transparent font-medium text-sm focus:outline-none w-20 text-hav-text-main"
              />
            </div>
          </div>

          <button onClick={fetchPagos} className="p-2 text-gray-400 hover:text-hav-primary transition-colors bg-gray-50 rounded-lg">
            <RefreshCw size={18} />
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-hav-primary text-white text-sm font-semibold rounded-lg hover:bg-hav-primary-dark transition-colors shadow-sm"
            >
              <Download size={16} />
              <span>Exportar</span>
              <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileSpreadsheet size={16} className="text-green-600" />
                  Exportar a Excel
                </button>
                <button
                  onClick={() => handleExport('word')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileIcon size={16} className="text-blue-600" />
                  Exportar a Word
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileStack size={16} className="text-gray-500" />
                  Exportar a CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-hav-primary/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-hav-text-muted">Ingresos Brutos (USD)</p>
                  <h2 className="text-4xl font-display font-bold text-hav-text-main mt-1">${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                </div>
                <div className="w-12 h-12 rounded-xl bg-hav-primary/10 text-hav-primary flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
              </div>
              <p className="text-sm text-green-600 flex items-center gap-1 font-medium mt-4">
                <TrendingUp size={16} /> Basado en {pagos.length} operaciones
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#1e4f5c] to-[#12313a] p-6 rounded-2xl shadow-md relative overflow-hidden border border-[#2a6675]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-hav-primary-light">Ingresos Equivalente (Bs)</p>
                  <h2 className="text-4xl font-display font-bold text-white mt-1">Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</h2>
                </div>
              </div>
              <p className="text-sm text-white/70 flex items-center gap-1 font-medium mt-4">
                Tasa Calculada: {tasaBase} Bs/USD
              </p>
            </div>
          </div>

          {/* Registros de Pago */}
          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-hav-text-main">Historial de Transacciones (Pago)</h3>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm text-hav-text-main">
                <thead className="text-xs uppercase bg-gray-50/80 text-hav-text-muted font-semibold">
                  <tr>
                    <th className="px-6 py-4">ID Trans.</th>
                    <th className="px-6 py-4">Fecha (UTC)</th>
                    <th className="px-6 py-4">Método</th>
                    <th className="px-6 py-4">Cajero</th>
                    <th className="px-6 py-4 text-right">Monto (USD)</th>
                    <th className="px-6 py-4 text-right bg-green-50/30">Equivalente (Bs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagos.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400">No hay pagos registrados.</td>
                    </tr>
                  )}
                  {pagos.map((p) => {
                    const equiv = parseFloat(p.monto_usd) * tasaBase;
                    return (
                      <tr key={p.id_pago} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-hav-primary">#{p.id_pago.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(p.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
                            <CreditCard size={12} /> {p.metodo_pago}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {p.usuario?.username || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold">
                          ${parseFloat(p.monto_usd).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-green-700 font-semibold bg-green-50/10 scale-105 origin-right">
                          Bs {equiv.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
