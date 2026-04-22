import { useState, useEffect } from 'react';
import { Activity, Shield, Key, Database, RefreshCw, AlertTriangle, Play, Circle, Save, Settings, Server, Power, Bell, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/Spinner';

export default function SettingsView({ showToast }) {
  const [maintenance, setMaintenance] = useState(false);
  const [dbStatus, setDbStatus] = useState('Verificando...');

  useEffect(() => {
    // Ping the database to check if we're connected
    const checkDb = async () => {
      try {
        const { error } = await supabase.from('rol').select('id_rol').limit(1);
        if (error) throw error;
        setDbStatus('Conectado y Estable');
      } catch (err) {
        setDbStatus('Conexión Fallida');
      }
    };
    checkDb();
  }, []);

  const handleToggleMaintenance = () => {
    setMaintenance(!maintenance);
    if (!maintenance) {
      if (showToast) showToast({ type: 'error', title: 'Advertencia Crítica', message: 'El sitio entrará en modo mantenimiento para todos los doctores y pacientes.' });
    } else {
      if (showToast) showToast({ type: 'success', title: 'Servicios Restaurados', message: 'El hospital opera con normalidad.' });
    }
  };

  return (
    <div className="p-6 space-y-6 view-enter h-[calc(100vh-80px)] overflow-y-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-hav-text-main">
          Configuración Global
        </h1>
        <p className="text-hav-text-muted text-sm mt-0.5">
          Ajustes críticos y monitorización del clúster
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - System Toggles */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center gap-3">
              <Shield className="text-hav-primary" size={20} />
              <h2 className="font-semibold text-hav-text-main">Seguridad y Acceso</h2>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl">
                <div>
                  <h3 className="font-semibold text-red-900 flex items-center gap-2">
                    <Power size={16} /> Modo Mantenimiento
                  </h3>
                  <p className="text-sm text-red-700/80 mt-1">Cierra el acceso a todo el personal (excepto Super Admin).</p>
                </div>
                <button 
                  onClick={handleToggleMaintenance}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${maintenance ? 'bg-red-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${maintenance ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                <div>
                  <h3 className="font-semibold text-hav-text-main flex items-center gap-2">
                    <Lock size={16} className="text-gray-400" /> Autenticación de Dos Pasos (2FA)
                  </h3>
                  <p className="text-sm text-hav-text-muted mt-1">Forzar a los doctores a usar Google Authenticator.</p>
                  <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">EN DESARROLLO (FASE 2)</span>
                </div>
                <button disabled className="relative inline-flex h-7 w-12 items-center rounded-full bg-gray-200 cursor-not-allowed opacity-50">
                  <span className="inline-block h-5 w-5 transform translate-x-1 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center gap-3">
              <Bell className="text-hav-primary" size={20} />
              <h2 className="font-semibold text-hav-text-main">Notificaciones Globales</h2>
            </div>
            
            <div className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-hav-text-main mb-1">Anuncio en la pantalla inicial</label>
                  <textarea 
                    rows={3}
                    placeholder="Ejemplo: El sistema estará en mantenimiento este viernes..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-hav-primary focus:border-hav-primary focus:outline-none"
                  ></textarea>
                </div>
                <button className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                  Publicar Anuncio Global
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Status */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center gap-3">
              <Server className="text-hav-primary" size={20} />
              <h2 className="font-semibold text-hav-text-main">Salud del Clúster</h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-50">
                <span className="text-hav-text-muted flex items-center gap-2"><Database size={14}/> Base de Datos (Supabase)</span>
                <span className={`font-semibold ${dbStatus.includes('Estable') ? 'text-green-600' : 'text-red-500'}`}>
                  {dbStatus}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-50">
                <span className="text-hav-text-muted">Servidor Frontend (Vite)</span>
                <span className="font-semibold text-green-600">Conectado IPv4</span>
              </div>
              <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-50">
                <span className="text-hav-text-muted">Políticas RLS</span>
                <span className="font-semibold text-yellow-600">Parciales</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-hav-text-muted">Región Clúster</span>
                <span className="font-semibold text-gray-700">us-east-1</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl text-white shadow-md">
            <h3 className="font-semibold mb-2">Hospital Adventista v1.0</h3>
            <p className="text-sm text-gray-400 mb-4">La plataforma médica se encuentra licenciada y operando bajo el marco de desarrollo de la Fase 1.</p>
            <div className="text-xs bg-black/30 p-3 rounded-lg border border-white/10 font-mono text-gray-300">
               <p>SUPABASE_URL: Oculto</p>
               <p>NODE_ENV: Development</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
