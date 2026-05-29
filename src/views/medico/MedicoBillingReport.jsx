import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Download, Calendar, RefreshCw, X, FileSpreadsheet, Activity } from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function MedicoBillingReport({ user, isOpen, onClose, showToast }) {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      // 1. Obtener citas completadas del especialista
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select(`
          id_cita, fecha_pautada, estado, id_pago,
          pacientes ( cedula, nombre, apellidos )
        `)
        .eq('id_especialista', user.id)
        .eq('estado', 'completada')
        .order('fecha_pautada', { ascending: false });

      if (errCitas) throw errCitas;

      // 2. Obtener consultas para extraer el diagnóstico
      const { data: consultas, error: errCons } = await supabase
        .from('consulta')
        .select('id_cita, diagnostico');
      
      if (errCons) throw errCons;

      // 3. Obtener todos los pagos registrados
      const { data: pagos, error: errPagos } = await supabase
        .from('pago')
        .select('id_pago, monto_usd, metodo_pago');
      
      if (errPagos) throw errPagos;

      // Filtrar por el mes calendario en curso
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      const mapped = (citas || [])
        .filter(c => {
          const apptDate = new Date(c.fecha_pautada);
          return apptDate.getFullYear() === currentYear && apptDate.getMonth() === currentMonth;
        })
        .map(c => {
          const diag = (consultas || []).find(cons => cons.id_cita === c.id_cita)?.diagnostico || 'Sin diagnóstico';
          const p = (pagos || []).find(pay => pay.id_pago === c.id_pago);
          
          return {
            id_cita: c.id_cita,
            fecha: new Date(c.fecha_pautada).toLocaleDateString('es-ES'),
            paciente: c.pacientes ? `${c.pacientes.nombre} ${c.pacientes.apellidos}` : 'N/A',
            cedula: c.pacientes?.cedula || 'N/A',
            diagnostico: diag,
            metodoPago: p?.metodo_pago || 'Cortesía / Pendiente',
            monto: parseFloat(p?.monto_usd || 0)
          };
        });

      setBillingData(mapped);
      const total = mapped.reduce((acc, curr) => acc + curr.monto, 0);
      setTotalRevenue(total);

    } catch (err) {
      console.error("Error al generar facturación del médico:", err);
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Error de Facturación',
          message: 'No se pudo estructurar el reporte de honorarios.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBilling();
    }
  }, [isOpen]);

  const handleExportExcel = () => {
    if (billingData.length === 0) return;

    const headers = [
      'Fecha', 'Cédula Paciente', 'Paciente', 'Diagnóstico Primario', 'Método Pago', 'Monto Cobrado (USD)'
    ];

    const rows = billingData.map(b => [
      b.fecha,
      b.cedula,
      b.paciente,
      b.diagnostico.replace(/[\n\r;]/g, ' '),
      b.metodoPago,
      b.monto.toFixed(2)
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = user.name.replace(/\s+/g, '_');
    link.setAttribute('download', `Honorarios_Medicos_${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) {
      showToast({
        type: 'success',
        title: 'Reporte Generado',
        message: 'Se descargó el reporte de honorarios en Excel.'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
            <DollarSign size={18} className="text-hav-primary" /> Facturación de Honorarios Personales (Mes en Curso)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30 flex flex-col min-h-0 space-y-6">
          {loading ? (
            <div className="flex-1 flex justify-center items-center py-20"><Spinner /></div>
          ) : (
            <>
              {/* Tarjetas de Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/50 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-hav-primary/10 text-hav-primary flex items-center justify-center">
                    <Activity size={22} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-hav-text-main leading-tight">{billingData.length}</p>
                    <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Consultas Realizadas este Mes</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/50 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-hav-text-main leading-tight">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs font-semibold text-hav-text-muted mt-0.5">Total Recaudado (USD)</p>
                  </div>
                </div>
              </div>

              {/* Botones de acción dentro del modal */}
              <div className="flex justify-between items-center flex-shrink-0">
                <p className="text-xs text-hav-text-muted">
                  * Este reporte detalla únicamente tus honorarios personales cobrados a través de la caja del hospital.
                </p>
                <div className="flex gap-2.5">
                  <button
                    onClick={fetchBilling}
                    className="p-2 text-gray-400 hover:text-hav-primary transition-colors bg-white hover:bg-gray-50 border border-gray-100 rounded-lg"
                    title="Actualizar datos"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={billingData.length === 0}
                    className="flex items-center gap-2 bg-[#1e4f5c] hover:bg-[#12313a] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md disabled:opacity-50"
                  >
                    <FileSpreadsheet size={14} /> Exportar Honorarios
                  </button>
                </div>
              </div>

              {/* Tabla de Honorarios */}
              <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-auto custom-scrollbar">
                  {billingData.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                      <Calendar size={44} className="opacity-20 mb-3 text-hav-primary" />
                      <p className="text-sm font-semibold">No se registran consultas cobradas en el mes</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10 font-display">
                          <th className="px-6 py-3.5">Fecha</th>
                          <th className="px-6 py-3.5">Cédula</th>
                          <th className="px-6 py-3.5">Paciente</th>
                          <th className="px-6 py-3.5">Diagnóstico Primario</th>
                          <th className="px-6 py-3.5">Método de Pago</th>
                          <th className="px-6 py-3.5 text-right">Monto (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {billingData.map((b, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-3.5 text-gray-500">{b.fecha}</td>
                            <td className="px-6 py-3.5 font-mono font-semibold text-gray-700">C.I. {b.cedula}</td>
                            <td className="px-6 py-3.5 font-semibold text-hav-text-main">{b.paciente}</td>
                            <td className="px-6 py-3.5">
                              <p className="text-xs text-hav-text-muted max-w-[200px] truncate" title={b.diagnostico}>
                                {b.diagnostico}
                              </p>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                {b.metodoPago}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-hav-text-main">
                              ${b.monto.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
