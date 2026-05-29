import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, RefreshCw, BarChart3, FileSpreadsheet, Activity, Image } from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function EpidemiologiaReport({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [dataList, setDataList] = useState([]);
  const svgRef = useRef(null);

  const fetchEpidemiologia = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('consulta')
        .select('diagnostico');

      if (error) throw error;

      // Agrupar y consolidar diagnósticos clínicamente
      const counts = {};
      let totalConsultas = 0;

      (data || []).forEach(c => {
        if (!c.diagnostico) return;
        
        // Limpieza básica de texto
        let diag = c.diagnostico.trim();
        // Agrupar variaciones diagnósticas comunes en español
        const lower = diag.toLowerCase();
        if (lower.includes('hipertensión') || lower.includes('hta') || lower.includes('hipertension')) {
          diag = 'Hipertensión Arterial (HTA)';
        } else if (lower.includes('diabetes') || lower.includes('glicemia') || lower.includes('glicada')) {
          diag = 'Diabetes Mellitus';
        } else if (lower.includes('asma') || lower.includes('bronquitis') || lower.includes('respiratorio')) {
          diag = 'Afecciones Respiratorias';
        } else if (lower.includes('evaluación') || lower.includes('chequeo') || lower.includes('general') || lower.includes('sano')) {
          diag = 'Chequeo Clínico de Rutina';
        } else if (lower.includes('cefalea') || lower.includes('migraña') || lower.includes('dolor de cabeza')) {
          diag = 'Cefaleas / Migraña';
        } else if (lower.includes('lumbalgia') || lower.includes('muscular') || lower.includes('artritis') || lower.includes('espalda')) {
          diag = 'Patologías Osteomusculares';
        } else {
          // Capitalizar primera letra para uniformidad
          diag = diag.charAt(0).toUpperCase() + diag.slice(1);
        }

        counts[diag] = (counts[diag] || 0) + 1;
        totalConsultas++;
      });

      // Convertir a lista y ordenar por frecuencia descendente
      const list = Object.entries(counts).map(([name, count]) => {
        const percentage = totalConsultas > 0 ? (count / totalConsultas) * 100 : 0;
        return { name, count, percentage };
      }).sort((a, b) => b.count - a.count);

      setDataList(list);
    } catch (err) {
      console.error("Error al cargar perfil epidemiológico:", err);
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Error de Análisis',
          message: 'No se pudieron consolidar las estadísticas diagnósticas.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpidemiologia();
  }, []);

  // Exportar estadísticas a Excel
  const handleExportExcel = () => {
    if (dataList.length === 0) return;
    const headers = ['Patología / Diagnóstico', 'Frecuencia de Casos', 'Incidencia (%)'];
    const rows = dataList.map(item => [
      item.name,
      item.count,
      item.percentage.toFixed(2)
    ]);
    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Perfil_Epidemiologico_HAV.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Estadísticas descargadas con éxito.' });
  };

  // Exportar gráfico SVG a archivo vectorial .svg
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    
    // Serializar el elemento SVG
    const serializer = new XMLSerializer();
    let svgSource = serializer.serializeToString(svgRef.current);
    
    // Agregar namespace de SVG si no existe
    if (!svgSource.match(/^<svg[^>]+xmlns="http\/\/www\.w3\.org\/2000\/svg"/)) {
      svgSource = svgSource.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    svgSource = '<?xml version="1.0" standalone="no"?>\r\n' + svgSource;
    
    const blob = new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Grafico_Incidencia_Epidemiologica.svg');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (showToast) showToast({ type: 'success', title: 'Descarga Exitosa', message: 'Gráfico vectorial SVG guardado correctamente.' });
  };

  // Renderizado dinámico de barras SVG
  const renderSVGChart = () => {
    const chartData = dataList.slice(0, 6); // Mostrar las 6 patologías principales
    if (chartData.length === 0) return null;

    const width = 600;
    const barHeight = 40;
    const gap = 15;
    const paddingLeft = 180;
    const paddingRight = 60;
    const chartWidth = width - paddingLeft - paddingRight;
    const height = chartData.length * (barHeight + gap) + 40;

    const maxCount = Math.max(...chartData.map(d => d.count)) || 1;

    return (
      <svg 
        ref={svgRef} 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`} 
        className="bg-white rounded-xl"
        style={{ maxWidth: '100%' }}
      >
        {/* Definición de gradiente premium */}
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e4f5c" />
            <stop offset="100%" stopColor="#14859f" />
          </linearGradient>
        </defs>

        {/* Líneas de cuadrícula de fondo */}
        {[0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const x = paddingLeft + chartWidth * ratio;
          const gridVal = Math.round(maxCount * ratio);
          return (
            <g key={index}>
              <line 
                x1={x} 
                y1={10} 
                x2={x} 
                y2={height - 30} 
                stroke="#f1f5f9" 
                strokeWidth={1} 
                strokeDasharray="4 4"
              />
              <text 
                x={x} 
                y={height - 12} 
                fill="#94a3b8" 
                fontSize="9px" 
                fontWeight="600"
                textAnchor="middle"
              >
                {gridVal}
              </text>
            </g>
          );
        })}

        {/* Renderizado de barras */}
        {chartData.map((d, index) => {
          const y = index * (barHeight + gap) + 15;
          const currentBarWidth = (d.count / maxCount) * chartWidth;
          
          return (
            <g key={index} className="transition-all duration-300">
              {/* Etiqueta del diagnóstico (Texto truncado de forma segura) */}
              <text 
                x={paddingLeft - 15} 
                y={y + barHeight / 2 + 3} 
                fill="#334155" 
                fontSize="9.5px" 
                fontWeight="700" 
                textAnchor="end"
              >
                {d.name.length > 25 ? `${d.name.substring(0, 23)}...` : d.name}
              </text>

              {/* Barra de fondo para profundidad visual */}
              <rect 
                x={paddingLeft} 
                y={y} 
                width={chartWidth} 
                height={barHeight} 
                fill="#f8fafc" 
                rx={6}
              />

              {/* Barra de progreso activa con gradiente */}
              <rect 
                x={paddingLeft} 
                y={y} 
                width={currentBarWidth} 
                height={barHeight} 
                fill="url(#barGradient)" 
                rx={6}
              />

              {/* Cantidad/Casos indicados */}
              <text 
                x={paddingLeft + currentBarWidth + 10} 
                y={y + barHeight / 2 + 4} 
                fill="#0f172a" 
                fontSize="10px" 
                fontWeight="800"
              >
                {d.count} {d.count === 1 ? 'caso' : 'casos'}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      {/* Barra de Acciones */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-hav-text-muted">
          <Activity size={14} className="text-hav-primary" />
          Perfil epidemiológico calculado sobre el universo de diagnósticos clínicos guardados.
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEpidemiologia}
            className="p-2 text-gray-400 hover:text-hav-primary transition-colors bg-gray-50 rounded-xl border border-gray-100"
            title="Refrescar estadísticas"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportSVG}
            disabled={dataList.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-hav-text-main text-xs font-bold rounded-lg border border-gray-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <Image size={14} className="text-hav-primary" /> Descargar SVG
          </button>
          <button
            onClick={handleExportExcel}
            disabled={dataList.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e4f5c] hover:bg-[#12313a] text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet size={14} /> Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      ) : dataList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-100 rounded-2xl shadow-sm py-20">
          <BarChart3 size={44} className="opacity-20 mb-3 text-hav-primary" />
          <p className="text-sm font-semibold">No se registran diagnósticos clínicos en la base de datos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {/* Columna Izquierda: Gráfico vectorial SVG */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-hav-text-main text-sm mb-1 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-hav-primary" /> Frecuencia de Enfermedades Diagnosticadas
              </h3>
              <p className="text-[10px] text-hav-text-muted mb-6">Gráfico vectorial de incidencia en base a casos clínicos reales</p>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              {renderSVGChart()}
            </div>
          </div>

          {/* Columna Derecha: Tabla detallada de incidencia */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-bold text-hav-text-main text-sm">Distribución Epidemiológica</h3>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10 font-display">
                    <th className="px-6 py-3.5">Diagnóstico Consolidad</th>
                    <th className="px-6 py-3.5 text-center">Nº de Casos</th>
                    <th className="px-6 py-3.5 text-right">Porcentaje de Incidencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dataList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-hav-text-main">{item.name}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-full text-xs bg-hav-primary/10 text-hav-primary">
                          {item.count}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-emerald-700 font-extrabold">
                        {item.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
