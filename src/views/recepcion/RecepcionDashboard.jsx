import { useState, useEffect } from 'react';
import { 
  CalendarDays, Users, Clock, CheckCircle, AlertCircle, Plus, 
  DollarSign, CreditCard, Search, RefreshCw, LogIn, CheckSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function RecepcionDashboard({ user, onNavigate, showToast }) {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    totalToday: 0,
    waitingRoom: 0,
    completedToday: 0,
    revenueToday: 0,
    dbPatients: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterToday, setFilterToday] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal de Pago
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingCita, setPayingCita] = useState(null);
  const [payAmount, setPayAmount] = useState('40.00');
  const [payMethod, setPayMethod] = useState('Efectivo');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const dateStr = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  // Cargar datos
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener Citas con datos de Paciente, Especialista y Pago
      const { data: citas, error: errCitas } = await supabase
        .from('cita')
        .select(`
          id_cita,
          estado,
          fecha_pautada,
          motivo_consulta,
          id_pago,
          pacientes ( id_paciente, cedula, nombre, apellidos, telefono ),
          especialista ( id_usuario, nombre_completo, especialidad ),
          pago ( id_pago, monto_usd, metodo_pago )
        `)
        .order('fecha_pautada', { ascending: true });

      if (errCitas) throw errCitas;

      const allCitas = citas || [];
      setAppointments(allCitas);

      // 2. Calcular estadísticas diarias
      const todayStr = new Date().toISOString().split('T')[0];
      
      const todayAppts = allCitas.filter(c => {
        const cDate = new Date(c.fecha_pautada).toISOString().split('T')[0];
        return cDate === todayStr;
      });

      const waiting = todayAppts.filter(c => c.estado === 'en_espera').length;
      const completed = todayAppts.filter(c => c.estado === 'completada').length;

      // 3. Obtener recaudación diaria real de la tabla de pagos
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const { data: pagosHoy, error: errPagos } = await supabase
        .from('pago')
        .select('monto_usd')
        .gte('fecha_pago', startOfToday.toISOString());

      const totalRevenue = errPagos ? 0 : (pagosHoy || []).reduce((acc, p) => acc + parseFloat(p.monto_usd || 0), 0);

      // 4. Cantidad total de pacientes en base de datos
      const { count: patientsCount, error: errCount } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalToday: todayAppts.length,
        waitingRoom: waiting,
        completedToday: completed,
        revenueToday: totalRevenue,
        dbPatients: errCount ? 0 : patientsCount
      });

    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast({ 
          type: 'error', 
          title: 'Error de carga', 
          message: 'No se pudieron sincronizar los datos de recepción.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Marcar Check-in directo (si ya está pagado)
  const handleCheckIn = async (citaId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('cita')
        .update({ estado: 'en_espera' })
        .eq('id_cita', citaId);

      if (error) throw error;

      if (showToast) {
        showToast({ 
          type: 'success', 
          title: 'Paciente en espera', 
          message: 'Se ha registrado la llegada del paciente a la sala de espera.' 
        });
      }
      fetchData();
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast({ type: 'error', title: 'Error', message: 'Fallo al procesar el check-in.' });
      }
      setLoading(false);
    }
  };

  // Registrar cobro e ingresar a Sala de Espera
  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!payingCita) return;

    setSubmittingPayment(true);
    try {
      // 1. Insertar el pago
      const { data: newPago, error: errPago } = await supabase
        .from('pago')
        .insert({
          id_caja: user.id || null,
          monto_usd: parseFloat(payAmount),
          metodo_pago: payMethod,
          fecha_pago: new Date().toISOString()
        })
        .select('id_pago')
        .single();

      if (errPago) throw errPago;

      // 2. Asociar pago a la cita y transicionar su estado a 'en_espera' (Check-in automático)
      const { error: errCita } = await supabase
        .from('cita')
        .update({
          id_pago: newPago.id_pago,
          estado: 'en_espera'
        })
        .eq('id_cita', payingCita.id_cita);

      if (errCita) throw errCita;

      if (showToast) {
        showToast({ 
          type: 'success', 
          title: 'Cobro y Check-in exitoso', 
          message: `Se registró el pago de ${payAmount} USD (${payMethod}) y el paciente pasó a Sala de Espera.` 
        });
      }

      setShowPayModal(false);
      setPayingCita(null);
      fetchData();
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast({ type: 'error', title: 'Error', message: 'No se pudo procesar la transacción.' });
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Filtrado de citas
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredAppointments = appointments.filter(appt => {
    // Filtro por fecha
    if (filterToday) {
      const apptDate = new Date(appt.fecha_pautada).toISOString().split('T')[0];
      if (apptDate !== todayStr) return false;
    }

    // Filtro por búsqueda de texto (Nombre, Apellido o Cédula)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const p = appt.pacientes;
      const matchName = `${p?.nombre} ${p?.apellidos}`.toLowerCase().includes(query);
      const matchCedula = p?.cedula?.toLowerCase().includes(query);
      const matchSpec = appt.especialista?.nombre_completo?.toLowerCase().includes(query);
      return matchName || matchCedula || matchSpec;
    }

    return true;
  });

  return (
    <div className="p-6 space-y-6 view-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-hav-text-main">
            Panel de Recepción y Caja
          </h1>
          <p className="text-hav-text-muted text-sm mt-0.5">
            {formattedDate} · Encargado(a): <span className="font-semibold text-hav-primary">{user.name}</span>
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={fetchData}
            className="p-2.5 text-hav-text-muted hover:text-hav-primary transition-all bg-white hover:bg-gray-50 border border-gray-100 rounded-xl shadow-sm"
            title="Sincronizar Datos"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => onNavigate('appointments')}
            className="flex items-center gap-2 bg-hav-primary hover:bg-hav-primary-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-hav-primary/20"
          >
            <Plus size={16} /> Agendar Cita
          </button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Citas Hoy', 
            value: stats.totalToday, 
            icon: CalendarDays, 
            color: 'bg-hav-primary text-white shadow-hav-primary/20',
            bg: 'bg-white' 
          },
          { 
            label: 'En Sala de Espera', 
            value: stats.waitingRoom, 
            icon: Clock, 
            color: 'bg-amber-500 text-white shadow-amber-500/20',
            bg: 'bg-white' 
          },
          { 
            label: 'Caja Hoy (USD)', 
            value: `$${stats.revenueToday.toFixed(2)}`, 
            icon: DollarSign, 
            color: 'bg-emerald-500 text-white shadow-emerald-500/20',
            bg: 'bg-emerald-50/10 border-emerald-100/50' 
          },
          { 
            label: 'Pacientes en BD', 
            value: stats.dbPatients, 
            icon: Users, 
            color: 'bg-indigo-500 text-white shadow-indigo-500/20',
            bg: 'bg-white' 
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 shadow-sm border border-gray-100/50 flex items-center gap-4 transition-all hover:shadow-md ${bg}`}>
            <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-hav-text-main leading-tight">{value}</p>
              <p className="text-xs font-medium text-hav-text-muted mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sección Operacional Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/60 overflow-hidden">
        {/* Controles de la Tabla */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-hav-text-main text-base">Citas Registradas</h3>
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
              <button 
                onClick={() => setFilterToday(true)}
                className={`px-3 py-1.5 rounded-md transition-all ${filterToday ? 'bg-white text-hav-primary shadow-sm' : 'text-hav-text-muted hover:text-hav-primary'}`}
              >
                Citas de Hoy
              </button>
              <button 
                onClick={() => setFilterToday(false)}
                className={`px-3 py-1.5 rounded-md transition-all ${!filterToday ? 'bg-white text-hav-primary shadow-sm' : 'text-hav-text-muted hover:text-hav-primary'}`}
              >
                Todas las Citas
              </button>
            </div>
          </div>

          {/* Barra de Búsqueda */}
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por paciente, cédula o especialista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hav-primary/20 focus:border-hav-primary bg-white transition-all"
            />
          </div>
        </div>

        {/* Listado de Citas */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex justify-center"><Spinner /></div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-16 text-gray-400 flex flex-col items-center">
              <CalendarDays size={44} className="opacity-20 mb-3 text-hav-primary" />
              <p className="text-sm font-semibold">No se encontraron citas en este criterio</p>
              <p className="text-xs text-gray-400 mt-1">Intenta ajustar tu búsqueda o crea una nueva cita.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-hav-text-muted text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Paciente</th>
                  <th className="px-6 py-3.5">Fecha y Hora</th>
                  <th className="px-6 py-3.5">Especialista</th>
                  <th className="px-6 py-3.5">Motivo</th>
                  <th className="px-6 py-3.5">Estado Cita</th>
                  <th className="px-6 py-3.5">Estado Pago</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredAppointments.map((appt) => {
                  const p = appt.pacientes;
                  const spec = appt.especialista;
                  const pago = appt.pago;
                  
                  const apptDateObj = new Date(appt.fecha_pautada);
                  const isToday = apptDateObj.toISOString().split('T')[0] === todayStr;
                  const timeStr = apptDateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                  const dateShort = apptDateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

                  // Clases de badge para estado
                  const statusColors = {
                    pendiente: 'bg-amber-50 text-amber-700 border-amber-100',
                    confirmada: 'bg-sky-50 text-sky-700 border-sky-100',
                    en_espera: 'bg-emerald-50 text-emerald-700 border-emerald-100 font-bold',
                    en_consulta: 'bg-purple-50 text-purple-700 border-purple-100',
                    completada: 'bg-gray-100 text-gray-600 border-gray-200'
                  };
                  const statusLabel = {
                    pendiente: 'Pendiente',
                    confirmada: 'Confirmada',
                    en_espera: 'En Espera',
                    en_consulta: 'En Consulta',
                    completada: 'Atendido'
                  };

                  return (
                    <tr key={appt.id_cita} className="hover:bg-gray-50/50 transition-colors">
                      {/* Paciente */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-hav-primary/10 text-hav-primary font-bold text-xs flex items-center justify-center">
                            {p?.nombre?.[0] || 'P'}
                          </div>
                          <div>
                            <p className="font-semibold text-hav-text-main leading-none">
                              {p?.nombre} {p?.apellidos}
                            </p>
                            <p className="text-[11px] text-hav-text-muted mt-1">
                              C.I. {p?.cedula} · Tlf: {p?.telefono || 'Sin Tlf'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Fecha y Hora */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-hav-text-main">{timeStr}</p>
                          <p className="text-[11px] text-hav-text-muted mt-0.5 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                            {isToday ? 'Hoy' : dateShort}
                          </p>
                        </div>
                      </td>

                      {/* Especialista */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-hav-text-main">Dr. {spec?.nombre_completo}</p>
                          <p className="text-[11px] text-hav-primary font-medium mt-0.5">{spec?.especialidad}</p>
                        </div>
                      </td>

                      {/* Motivo */}
                      <td className="px-6 py-4">
                        <p className="text-xs text-hav-text-muted max-w-[150px] truncate" title={appt.motivo_consulta}>
                          {appt.motivo_consulta || 'Sin especificar'}
                        </p>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusColors[appt.estado] || 'bg-gray-50'}`}>
                          {statusLabel[appt.estado] || appt.estado}
                        </span>
                      </td>

                      {/* Pago */}
                      <td className="px-6 py-4">
                        {pago ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md w-max">
                              <CheckCircle size={10} /> Pagado
                            </span>
                            <span className="text-[10px] text-hav-text-muted mt-0.5">
                              ${pago.monto_usd} · {pago.metodo_pago}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                            <AlertCircle size={10} /> Por Cobrar
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón de Pago si no tiene pago registrado */}
                          {!pago && appt.estado !== 'completada' && (
                            <button
                              onClick={() => {
                                setPayingCita(appt);
                                setPayAmount('40.00'); // Precio base de consulta interna
                                setPayMethod('Efectivo');
                                setShowPayModal(true);
                              }}
                              className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              <DollarSign size={12} /> Cobrar
                            </button>
                          )}

                          {/* Botón de Check-in si ya está pagado pero sigue en 'pendiente' o 'confirmada' */}
                          {pago && (appt.estado === 'pendiente' || appt.estado === 'confirmada') && (
                            <button
                              onClick={() => handleCheckIn(appt.id_cita)}
                              className="flex items-center gap-1 text-xs bg-hav-primary hover:bg-hav-primary-dark text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              <LogIn size={12} /> Check-in
                            </button>
                          )}

                          {/* Indicadores pasivos para estados avanzados */}
                          {appt.estado === 'en_espera' && (
                            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                              En Espera 🛋️
                            </span>
                          )}

                          {appt.estado === 'en_consulta' && (
                            <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2.5 py-1.5 rounded-lg animate-pulse">
                              En Consulta 🩺
                            </span>
                          )}

                          {appt.estado === 'completada' && (
                            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                              <CheckSquare size={12} /> Finalizado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Cobro y Registro de Pago */}
      {showPayModal && payingCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
              <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                <DollarSign size={18} /> Registrar Cobro de Consulta
              </h3>
              <button 
                onClick={() => { setShowPayModal(false); setPayingCita(null); }}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-5 space-y-4">
              {/* Resumen del Paciente */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <p className="text-xs font-bold text-hav-text-muted uppercase tracking-wider">Paciente</p>
                <p className="text-sm font-bold text-hav-text-main mt-0.5">
                  {payingCita.pacientes?.nombre} {payingCita.pacientes?.apellidos}
                </p>
                <p className="text-xs text-hav-text-muted mt-0.5">C.I. {payingCita.pacientes?.cedula}</p>
                <div className="mt-2.5 pt-2.5 border-t border-gray-200/50 flex justify-between text-xs">
                  <span className="text-hav-text-muted">Médico:</span>
                  <span className="font-semibold text-hav-text-main">Dr. {payingCita.especialista?.nombre_completo}</span>
                </div>
              </div>

              {/* Monto del Cobro */}
              <div>
                <label className="text-xs font-bold text-hav-text-main block mb-1">Monto en USD ($)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold bg-white"
                  />
                </div>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="text-xs font-bold text-hav-text-main block mb-1">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Efectivo', 'Pago Móvil', 'Zelle', 'Punto de Venta'].map((method) => {
                    const isSelected = payMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPayMethod(method)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm shadow-emerald-500/5' 
                            : 'bg-white border-gray-200 text-hav-text-muted hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard size={12} /> {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón de confirmación */}
              <div className="pt-2 flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setShowPayModal(false); setPayingCita(null); }}
                  className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submittingPayment}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  {submittingPayment ? <Spinner size="sm" /> : 'Confirmar y Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
