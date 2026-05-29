import { useState, useEffect } from 'react';
import { DollarSign, Download, RefreshCw, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function FinanzasReport({ showToast }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasaBase, setTasaBase] = useState(38.50); // Tasa por defecto

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
      console.error("Error al cargar pagos:", err);
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

  const handleExportFinanzas = () => {
    if (pagos.length === 0) return;
    const headers = ['ID Transacción', 'Fecha', 'Método Pago', 'Cajero', 'Monto (USD)', 'Equivalente (Bs)'];
    const rows = pagos.map(p => [
      `#${p.id_pago.toString().padStart(4, '0')}`,
      new Date(p.fecha_pago).toLocaleDateString('es-ES'),
      p.metodo_pago,
      p.usuario?.username || 'N/A',
      parseFloat(p.monto_usd).toFixed(2),
      (parseFloat(p.monto_usd) * tasaBase).toFixed(2)
    ]);
    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Reporte_Financiero_HAV.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Se descargó el reporte financiero.' });
  };

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-3 py-1 bg-green-50 border border-green-100 rounded-lg">
            <RefreshCw size={14} className="text-green-600 animate-spin" style={{ animationPlayState: loading ? 'running' : 'paused' }} />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-green-700 uppercase">Tasa de Cambio (Bs)</span>
              <input 
                type="number"
                step="0.01"
                min="1"
                value={tasaBase}
                onChange={(e) => setTasaBase(parseFloat(e.target.value) || 0)}
                className="bg-transparent font-semibold text-sm focus:outline-none w-20 text-hav-text-main"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchPagos} 
            className="p-2 text-gray-400 hover:text-hav-primary transition-colors bg-gray-50 rounded-xl border border-gray-100"
            title="Refrescar transacciones"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleExportFinanzas}
            disabled={pagos.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-hav-primary text-white text-xs font-semibold rounded-xl hover:bg-hav-primary-dark transition-colors shadow-sm disabled:opacity-50"
          >
            <Download size={14} /> Exportar Finanzas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : (
        <>
          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-hav-primary/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-hav-text-muted">Ingresos Brutos (USD)</p>
                  <h2 className="text-4xl font-display font-bold text-hav-text-main mt-1">
                    ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className="w-12 h-12 rounded-xl bg-hav-primary/10 text-hav-primary flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
              </div>
              <p className="text-sm text-green-600 flex items-center gap-1 font-medium mt-4">
                Listado de {pagos.length} transacciones registradas
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#1e4f5c] to-[#12313a] p-6 rounded-2xl shadow-md relative overflow-hidden border border-[#2a6675]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-hav-primary-light">Ingresos Equivalente (Bs)</p>
                  <h2 className="text-4xl font-display font-bold text-white mt-1">
                    Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </h2>
                </div>
              </div>
              <p className="text-sm text-white/70 flex items-center gap-1 font-medium mt-4">
                Tasa Calculada: {tasaBase} Bs/USD
              </p>
            </div>
          </div>

          {/* Tabla de historial de transacciones */}
          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-semibold text-hav-text-main text-sm">Historial de Transacciones (Pago)</h3>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-hav-text-main">
                <thead className="text-xs uppercase bg-gray-50/80 text-hav-text-muted font-semibold sticky top-0 bg-white z-10">
                  <tr>
                    <th className="px-6 py-4">ID Trans.</th>
                    <th className="px-6 py-4">Fecha</th>
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
                        <td className="px-6 py-4 text-gray-500">
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
