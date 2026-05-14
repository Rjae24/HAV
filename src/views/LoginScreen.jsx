import { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, Shield, HeartPulse } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';

export default function LoginScreen({ onLogin, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoUsers, setDemoUsers] = useState([]);

  useEffect(() => {
    async function fetchDemoUsers() {
      try {
        const { data, error } = await supabase
          .from('usuario')
          .select(`
            username,
            password_hash,
            rol (nombre_rol),
            especialista (nombre_completo),
            recepcion (nombre_empleado)
          `)
          .limit(20);

        if (!error && data) {
          const parsed = data.map(u => {
            let label = u.rol?.nombre_rol || 'Usuario';
            if (label === 'admin') label = 'Super Admin';
            else if (label === 'especialista') label = u.especialista?.nombre_completo || 'Médico';
            else if (label === 'caja' || label === 'recepcion') label = u.recepcion?.nombre_empleado || 'Recepción';
            return {
              label,
              email: u.username,
              pass: u.password_hash
            };
          });
          setDemoUsers(parsed);
        }
      } catch (err) {
        console.error("Error fetching demo users", err);
      }
    }
    fetchDemoUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data: userRecord, error: dbError } = await supabase
        .from('usuario')
        .select(`
          id_usuario,
          username,
          password_hash,
          estado_activo,
          rol (nombre_rol),
          especialista (nombre_completo),
          recepcion (nombre_empleado)
        `)
        .eq('username', email.trim())
        .single();

      if (dbError || !userRecord || userRecord.password_hash !== password) {
        setError('Credenciales incorrectas. Verifique su correo y contraseña.');
        showToast({ type: 'error', title: 'Acceso denegado', message: 'Credenciales inválidas' });
        setIsLoading(false);
        return;
      }

      if (!userRecord.estado_activo) {
        setError('Su cuenta está inactiva. Contacte al administrador.');
        setIsLoading(false);
        return;
      }

      // Map DB record to app user state
      const userRole = userRecord.rol.nombre_rol;
      let userName = 'Super Admin';
      let avatar = 'AD';
      let mappedRole = userRole;

      if (userRole === 'admin') {
        mappedRole = 'superadmin';
      } else if (userRole === 'especialista') {
        mappedRole = 'medico';
        if (userRecord.especialista) {
          userName = userRecord.especialista.nombre_completo;
          avatar = 'DR';
        }
      } else if (userRole === 'caja' || userRole === 'recepcion') {
        mappedRole = 'recepcion';
        if (userRecord.recepcion) {
          userName = userRecord.recepcion.nombre_empleado || 'Recepcionista';
          avatar = 'RE';
        }
      }

      const userProfile = {
        id: userRecord.id_usuario,
        email: userRecord.username,
        role: mappedRole,
        name: userName,
        avatar: avatar
      };

      showToast({ type: 'success', title: `Bienvenido, ${userName}`, message: 'Sesión iniciada correctamente' });
      onLogin(userProfile);
    } catch (err) {
      console.error("Login error:", err);
      setError('Error de conexión al servidor.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
         style={{ background: 'linear-gradient(145deg, #1e4f5c 0%, #367281 55%, #4a8fa0 100%)' }}>
      
      {/* Animated Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20 blur-[100px]" style={{ background: '#66AB1A', transform: 'translate(30%, -30%)' }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]" style={{ background: '#A1D95A', transform: 'translate(-40%, 40%)' }} />

      {/* Sidebar for Development */}
      <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 w-64 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/50 z-50">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
          <Shield size={18} className="text-hav-primary" />
          <h3 className="font-semibold text-hav-text-main text-sm">Entorno de Pruebas</h3>
        </div>
        <p className="text-xs text-hav-text-muted mb-4">
          Seleccione un perfil para autocompletar credenciales remotas.
        </p>
        <div className="flex flex-col gap-2">
          {demoUsers.length === 0 ? (
            <div className="py-2 text-center text-xs text-gray-400">
              Cargando usuarios desde BD...
            </div>
          ) : (
            demoUsers.map(({ label, email: e, pass }) => (
              <button
                key={e}
                type="button"
                onClick={() => { setEmail(e); setPassword(pass); }}
                className="flex flex-col items-start gap-0.5 px-3 py-2 bg-gray-50 hover:bg-hav-primary/10 border border-gray-100 hover:border-hav-primary/30 rounded-xl transition-all text-left group"
              >
                <span className="font-semibold text-gray-700 group-hover:text-hav-primary text-xs">{label}</span>
                <span className="text-[10px] text-gray-400 truncate w-full">{e}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        
        {/* Header Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-4 bg-[#1e4f5c]/40 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl shadow-xl">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
              <HeartPulse size={26} className="text-white drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-white font-display font-bold text-2xl leading-none tracking-tight">HAV</h1>
              <p className="text-white/80 text-xs font-medium mt-1 uppercase tracking-wider">Hospital Adventista de Venezuela</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10 border border-white/50 relative overflow-hidden">
          {/* Subtle top glare */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-hav-primary/0 via-hav-primary/30 to-hav-primary/0"></div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-hav-text-main">Acceso Personal</h2>
            <p className="text-hav-text-muted text-sm mt-2">Ingrese sus credenciales corporativas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-hav-text-main" htmlFor="login-email">
                Correo institucional
              </label>
              <div className="relative group">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@hav.edu.ve"
                  required
                  className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-hav-text-main placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-hav-primary/10 focus:border-hav-primary transition-all duration-300 hover:border-gray-300"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-hav-text-main" htmlFor="login-password">
                  Contraseña
                </label>
                <button type="button" className="text-xs text-hav-primary font-medium hover:text-hav-primary-dark transition-colors">
                  ¿Problemas con su cuenta?
                </button>
              </div>
              <div className="relative group">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-hav-text-main placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-hav-primary/10 focus:border-hav-primary transition-all duration-300 hover:border-gray-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-hav-primary transition-colors focus:outline-none"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50/80 backdrop-blur-md border border-red-200 rounded-xl p-4">
                <p className="text-hav-danger text-sm font-medium text-center">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#2a6270] to-[#367281] hover:from-[#1e4f5c] hover:to-[#2a6270] disabled:opacity-70 text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-[0_8px_20px_rgb(54,114,129,0.3)] hover:shadow-[0_12px_25px_rgb(54,114,129,0.4)] transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>


        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-8">
          © {new Date().getFullYear()} Hospital Adventista de Venezuela<br />
          Sistema exclusivo para personal autorizado
        </p>
      </div>
    </div>
  );
}
