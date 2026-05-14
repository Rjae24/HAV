import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Sigma, BarChart3, Target, Activity } from 'lucide-react';

const StatisticsView = ({ appointments: initialAppointments, patients: initialPatients }) => {
    const [appointments, setAppointments] = useState(initialAppointments || []);
    const [patients, setPatients] = useState(initialPatients || []);
    const [loading, setLoading] = useState(!initialAppointments || !initialPatients);

    useEffect(() => {
        async function fetchData() {
            if (initialAppointments && initialPatients) return;
            
            try {
                setLoading(true);
                const [{ data: appts }, { data: pats }] = await Promise.all([
                    supabase.from('cita').select('*'),
                    supabase.from('pacientes').select('*')
                ]);
                setAppointments(appts || []);
                setPatients(pats || []);
            } catch (err) {
                console.error("Error fetching statistics data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [initialAppointments, initialPatients]);

    const stats = useMemo(() => {
        if (!appointments.length || !patients.length) return null;

        // --- Cálculos Estadísticos ---
        
        // 1. Probabilidad P(A) de asistencia
        const total = appointments.length;
        const completed = appointments.filter(a => 
            ['completada', 'atendido', 'finalizada'].includes(a.estado?.toLowerCase())
        ).length;
        const probability = total > 0 ? (completed / total) : 0;

        // 2. Edad de pacientes (para descriptiva)
        const ages = patients.map(p => p.edad || 0).filter(age => age > 0);
        
        const mean = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
        
        const sortedAges = [...ages].sort((a, b) => a - b);
        const mid = Math.floor(sortedAges.length / 2);
        const median = sortedAges.length === 0 ? 0 : (sortedAges.length % 2 !== 0 ? sortedAges[mid] : (sortedAges[mid - 1] + sortedAges[mid]) / 2);
        
        const variance = ages.length > 0 ? ages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / ages.length : 0;
        const stdDev = Math.sqrt(variance);

        // 3. Datos para Correlación (Edad vs Nro Citas)
        const correlationData = patients.map(p => {
            const count = appointments.filter(a => a.id_paciente === p.id_paciente).length;
            return { 
                age: p.edad || 0, 
                appointments: count,
                name: p.nombre || 'Paciente'
            };
        }).filter(d => d.age > 0);

        // 4. Coeficiente de Correlación de Pearson (r)
        const calculatePearson = (data) => {
            const n = data.length;
            if (n < 2) return 0;
            
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
            data.forEach(d => {
                sumX += d.age;
                sumY += d.appointments;
                sumXY += (d.age * d.appointments);
                sumX2 += (d.age * d.age);
                sumY2 += (d.appointments * d.appointments);
            });
            
            const num = (n * sumXY) - (sumX * sumY);
            const den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
            
            return den === 0 ? 0 : num / den;
        };

        const r = calculatePearson(correlationData);

        return { 
            probability, 
            mean, 
            median, 
            stdDev, 
            correlationData, 
            r,
            totalAppointments: total,
            totalPatients: patients.length
        };
    }, [appointments, patients]);

    if (loading) return <div className="p-8 flex justify-center"><Spinner color="teal" /></div>;

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg">
                    <p className="font-bold text-hav-text-main">{data.name}</p>
                    <p className="text-sm text-hav-primary">Edad: {data.age} años</p>
                    <p className="text-sm text-hav-secondary">Citas: {data.appointments}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-6 space-y-6 view-enter pb-12">
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-hav-text-main flex items-center gap-3">
                    <BarChart3 className="text-hav-primary w-8 h-8" />
                    Análisis de Estadística Médica
                </h1>
                <p className="text-hav-text-muted text-sm mt-1">
                    Visualización de indicadores de tendencia central, probabilidad y correlación de datos clínicos.
                </p>
            </div>

            {/* Grid de Métricas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Probabilidad */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-hav-secondary/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-hav-secondary/10 rounded-lg text-hav-secondary">
                            <Target size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-hav-secondary uppercase tracking-wider">Probabilidad</span>
                    </div>
                    <div className="text-2xl font-display font-bold text-hav-text-main">
                        {stats ? (stats.probability * 100).toFixed(1) : 0}%
                    </div>
                    <p className="text-xs text-hav-text-muted mt-1">P(Asistencia Efectiva)</p>
                </div>

                {/* Media */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-hav-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-hav-primary/10 rounded-lg text-hav-primary">
                            <Sigma size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-hav-primary uppercase tracking-wider">Media</span>
                    </div>
                    <div className="text-2xl font-display font-bold text-hav-text-main">
                        {stats?.mean.toFixed(1) || 0} <span className="text-sm font-normal text-gray-400">años</span>
                    </div>
                    <p className="text-xs text-hav-text-muted mt-1">Promedio de Edad (x̄)</p>
                </div>

                {/* Mediana */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-hav-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-hav-primary/10 rounded-lg text-hav-primary">
                            <Activity size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-hav-primary uppercase tracking-wider">Mediana</span>
                    </div>
                    <div className="text-2xl font-display font-bold text-hav-text-main">
                        {stats?.median.toFixed(1) || 0} <span className="text-sm font-normal text-gray-400">años</span>
                    </div>
                    <p className="text-xs text-hav-text-muted mt-1">Valor Central (Me)</p>
                </div>

                {/* Desviación Estándar */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-hav-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-hav-primary/10 rounded-lg text-hav-primary">
                            <Sigma size={20} className="rotate-90" />
                        </div>
                        <span className="text-[10px] font-bold text-hav-primary uppercase tracking-wider">Dispersión</span>
                    </div>
                    <div className="text-2xl font-display font-bold text-hav-text-main">
                        {stats?.stdDev.toFixed(1) || 0}
                    </div>
                    <p className="text-xs text-hav-text-muted mt-1">Desviación Estándar (σ)</p>
                </div>
            </div>

            {/* Sección de Gráfico de Correlación */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h3 className="font-display font-bold text-hav-text-main text-xl">Correlación Lineal</h3>
                        <p className="text-hav-text-muted text-sm mt-1">Relación bivariada entre Edad del Paciente vs. Frecuencia de Consultas.</p>
                    </div>
                    <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${Math.abs(stats?.r || 0) > 0.5 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <div>
                                <p className="text-[10px] text-hav-text-muted uppercase font-bold">Coeficiente de Pearson (r)</p>
                                <p className="text-lg font-mono font-bold text-hav-primary">{stats?.r.toFixed(4) || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis 
                                type="number" 
                                dataKey="age" 
                                name="Edad" 
                                unit=" años" 
                                stroke="#94a3b8" 
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                type="number" 
                                dataKey="appointments" 
                                name="Citas" 
                                unit=" citas" 
                                stroke="#94a3b8" 
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <ZAxis type="number" range={[60, 400]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Pacientes" data={stats?.correlationData || []} fill="#0d9488">
                                {stats?.correlationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fillOpacity={0.6} strokeWidth={2} stroke="#0d9488" />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-6 p-4 bg-hav-primary/5 rounded-2xl border border-hav-primary/10 text-sm text-hav-text-main italic">
                    <strong>Interpretación:</strong> Un coeficiente de r = {stats?.r.toFixed(2)} indica una {Math.abs(stats?.r || 0) < 0.3 ? 'correlación débil' : (Math.abs(stats?.r || 0) < 0.7 ? 'correlación moderada' : 'correlación fuerte')} {stats?.r > 0 ? 'positiva' : 'negativa'} entre las variables analizadas.
                </div>
            </div>
        </div>
    );
};

export default StatisticsView;