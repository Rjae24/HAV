import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, RefreshCw, BarChart3, FileSpreadsheet, Activity, Image } from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function EspecialidadesReport({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [dataList, setDataList] = useState([]);
  const svgRef = useRef(null);

  const fetchEspecialidadesDemanda = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener especialistas con sus especialidades estructuradas
      const { data: specs, error: errSpecs } = await supabase
        .from('especialista')
        .select('id_usuario, especialidad');

      if (errSpecs) throw errSpecs;

      // 2. Obtener todas las citas completadas
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select('id_especialista, estado')
        .eq('estado', 'completada');

      if (errCitas) throw errCitas;

      // 3. Consolidar citas por especialidad
      const counts = {};
      let totalCompletadas = 0;

      (citas || []).forEach(c => {
        const spec = (specs || []).find(s => s.id_usuario === c.id_especialista);
        if (!spec) return;

        const esp = spec.especialidad ? spec.especialidad.trim() : 'Medicina General';
        // Capitalizar para uniformidad estética
        const formattedEsp = esp.charAt(0).toUpperCase() + esp.slice(1);
        
        counts[formattedEsp] = (counts[formattedEsp] || 0) + 1;
        totalCompletadas++;
      });

      // Si no hay citas completadas, poblar con las especialidades registradas en 0
      (specs || []).forEach(s => {
        if (!s.especialidad) return;
        const formattedEsp = s.especialidad.trim().charAt(0).toUpperCase() + s.especialidad.trim().slice(1);
        if (!counts[formattedEsp]) {
          counts[formattedEsp] = 0;
        }
      });

      // Convertir a lista y ordenar por frecuencia descendente
      const list = Object.entries(counts).map(([name, count]) => {
        const percentage = totalCompletadas > 0 ? (count / totalCompletadas) * 100 : 0;
        return { name, count, percentage };
      }).sort((a, b) => b.count - a.count);

      setDataList(list);
    } catch (err) {
      console.error("Error al cargar perfil de especialidades:", err);
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Error de Análisis',
          message: 'No se pudieron consolidar las estadísticas por especialidad.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEspecialidadesDemanda();
  }, []);

  // Exportar estadísticas a Excel
  const handleExportExcel = () => {
    if (dataList.length === 0) return;
    const headers = ['Especialidad Médica', 'Consultas Atendidas', 'Porcentaje de Demanda (%)'];
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
    link.setAttribute('download', 'Demanda_Especialidades_HAV.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast({ type: 'success', title: 'Exportación Exitosa', message: 'Datos de especialidades descargados.' });
  };

  // Exportar gráfico SVG
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    
    const serializer = new XMLSerializer();
    let svgSource = serializer.serializeToString(svgRef.current);
    
    // Si no contiene el namespace de SVG, agregarlo de forma segura
    if (!svgSource.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgSource = svgSource.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    svgSource = '<?xml version="1.0" standalone="no"?>\r\n' + svgSource;
    
    const blob = new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Grafico_Demanda_Especialidades.svg');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (showToast) showToast({ type: 'success', title: 'Descarga Exitosa', message: 'Gráfico vectorial SVG guardado.' });
  };

  // Renderizado dinámico de barras SVG
  const renderSVGChart = () => {
    const chartData = dataList.slice(0, 6); // Mostrar las 6 especialidades principales
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
        <defs>
          <linearGradient id="specialtyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e4f5c" />
            <stop offset="100%" stopColor="#14859f" />
          </linearGradient>
        </defs>

        {/* Fondo blanco vectorial explícito para evitar transparencia y asegurar legibilidad */}
        <rect width={width} height={height} fill="#ffffff" rx={12} />

        {/* Líneas de cuadrícula */}
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
                {gridVal} {gridVal === 1 ? 'cita' : 'citas'}
              </text>
            </g>
          );
        })}

        {/* Barras */}
        {chartData.map((d, index) => {
          const y = index * (barHeight + gap) + 15;
          const currentBarWidth = maxCount > 0 ? (d.count / maxCount) * chartWidth : 0;
          
          return (
            <g key={index} className="transition-all duration-300">
              <text 
                x={paddingLeft - 15} 
                y={y + barHeight / 2 + 3} 
                fill="#334155" 
                fontSize="10px" 
                fontWeight="700" 
                textAnchor="end"
              >
                {d.name.length > 25 ? `${d.name.substring(0, 23)}...` : d.name}
              </text>

              <rect 
                x={paddingLeft} 
                y={y} 
                width={chartWidth} 
                height={barHeight} 
                fill="#f8fafc" 
                rx={6}
              />

              {currentBarWidth > 0 && (
                <rect 
                  x={paddingLeft} 
                  y={y} 
                  width={currentBarWidth} 
                  height={barHeight} 
                  fill="url(#specialtyGradient)" 
                  rx={6}
                />
              )}

              <text 
                x={paddingLeft + currentBarWidth + 10} 
                y={y + barHeight / 2 + 4} 
                fill="#0f172a" 
                fontSize="10px" 
                fontWeight="800"
              >
                {d.count} {d.count === 1 ? 'cita' : 'citas'}
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
          Análisis de demanda operativa por especialidad médica calculado sobre citas completadas.
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEspecialidadesDemanda}
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
          <p className="text-sm font-semibold">No se registran citas completadas para procesar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {/* Columna Izquierda: Gráfico SVG */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-hav-text-main text-sm mb-1 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-hav-primary" /> Demanda por Especialidad Médica
              </h3>
              <p className="text-[10px] text-hav-text-muted mb-6">Distribución visual de citas completadas en el hospital</p>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              {renderSVGChart()}
            </div>
          </div>

          {/* Columna Derecha: Tabla detallada */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-bold text-hav-text-main text-sm">Distribución de Consultas por Especialidad</h3>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider sticky top-0 bg-white z-10 font-display">
                    <th className="px-6 py-3.5">Especialidad</th>
                    <th className="px-6 py-3.5 text-center">Nº de Consultas Atendidas</th>
                    <th className="px-6 py-3.5 text-right">Porcentaje de Demanda</th>
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
