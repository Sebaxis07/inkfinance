import React, { useState } from 'react';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: { id: string; nombre: string; email: string; rol: string }) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ingreso, setIngreso] = useState('350000');
  
  // Recovery fields
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRecoverySuccessMessage(null);

    // Form validations
    if (authMode === 'login') {
      if (!email || !password) {
        setError('Por favor, completa todos los campos.');
        return;
      }
    } else if (authMode === 'register') {
      if (!nombre || !email || !password) {
        setError('Por favor, completa todos los campos.');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
    } else if (authMode === 'forgot') {
      if (!email) {
        setError('Por favor, ingresa tu correo.');
        return;
      }
    } else if (authMode === 'reset') {
      if (!email || !recoveryCode || !password || !confirmPassword) {
        setError('Por favor, completa todos los campos.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
    }

    setLoading(true);

    try {
      if (authMode === 'login' || authMode === 'register') {
        const url = authMode === 'login' 
          ? 'http://localhost:5000/api/auth/login' 
          : 'http://localhost:5000/api/auth/register';

        // Public registration defaults strictly to 'requester' role.
        const payload = authMode === 'login' 
          ? { email, password }
          : { nombre, email, password, rol: 'requester', ingreso_neto_mensual: Number(ingreso) };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al autenticar.');
        }

        onAuthSuccess(data.token, data.user);

      } else if (authMode === 'forgot') {
        const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al solicitar recuperación.');
        }

        // Simulating email dispatch
        setRecoverySuccessMessage(`CODIGO ENVIADO. REVISAR CONSOLA BACKEND.`);
        // Prefill recovery code input if returned (local convenience)
        if (data.code) {
          setRecoverySuccessMessage(`CODIGO SIMULADO: ${data.code} (COPIADO AL COCKPIT)`);
          setRecoveryCode(data.code);
        }
        setAuthMode('reset');

      } else if (authMode === 'reset') {
        const res = await fetch('http://localhost:5000/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: recoveryCode, newPassword: password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Código incorrecto o expirado.');
        }

        setRecoverySuccessMessage('CONTRASEÑA REESTABLECIDA CON EXITO. YA PUEDES INICIAR SESION.');
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
      }

    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 text-[#f4f4f5] font-mono">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Logo Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 bg-white text-black rounded-xl flex items-center justify-center font-black text-2xl shadow-lg">
            I
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-widest text-white uppercase leading-none">INKFINANCE</h1>
            <p className="text-[9px] text-zinc-550 font-bold uppercase tracking-widest mt-1">SISTEMA MONOCROMATICO DE CONTROL</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="mono-card p-6 shadow-2xl space-y-6 border border-zinc-850">
          
          {/* Tab buttons (Only for Login / Register view) */}
          {(authMode === 'login' || authMode === 'register') && (
            <div className="flex border-b border-zinc-900 pb-1">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); setRecoverySuccessMessage(null); }}
                className={`flex-1 pb-3 text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer ${
                  authMode === 'login' 
                    ? 'text-white border-b-2 border-white' 
                    : 'text-zinc-550 hover:text-zinc-300'
                }`}
              >
                INICIAR SESION
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(null); setRecoverySuccessMessage(null); }}
                className={`flex-1 pb-3 text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer ${
                  authMode === 'register' 
                    ? 'text-white border-b-2 border-white' 
                    : 'text-zinc-550 hover:text-zinc-300'
                }`}
              >
                REGISTRARSE
              </button>
            </div>
          )}

          {/* Recovery Headers */}
          {authMode === 'forgot' && (
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">RECUPERAR CUENTA</h2>
              <p className="text-[9px] text-zinc-550 uppercase mt-1">Solicita un código temporal para cambiar tu contraseña</p>
            </div>
          )}

          {authMode === 'reset' && (
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">REESTABLECER CREDENCIALES</h2>
              <p className="text-[9px] text-zinc-550 uppercase mt-1">Ingresa el código temporal enviado y tu nueva clave</p>
            </div>
          )}

          {/* Feedback logs */}
          {error && (
            <div className="p-3.5 bg-black border border-zinc-855 text-zinc-300 rounded-xl text-[10px] uppercase font-bold tracking-wide">
              FALLO: {error}
            </div>
          )}

          {recoverySuccessMessage && (
            <div className="p-3.5 bg-white text-black rounded-xl text-[10px] uppercase font-extrabold tracking-wide">
              SISTEMA: {recoverySuccessMessage}
            </div>
          )}

          {/* Dynamic Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Name input (register only) */}
            {authMode === 'register' && (
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">NOMBRE COMPLETO</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="EJ: SEBASTIAN VASQUEZ"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            {/* 2. Email input (login, register, forgot, reset) */}
            <div>
              <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">CORREO ELECTRONICO</label>
              <input
                type="email"
                required
                disabled={authMode === 'reset'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="EJEMPLO@CORREO.COM"
                className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors disabled:opacity-50"
              />
            </div>

            {/* 3. Recovery Code (reset mode only) */}
            {authMode === 'reset' && (
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">CODIGO DE RECUPERACION (6 DIGITOS)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="EJ: 489201"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors uppercase font-mono tracking-widest text-center"
                />
              </div>
            )}

            {/* 4. Password input (login, register, reset) */}
            {authMode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                    {authMode === 'reset' ? 'NUEVA CONTRASEÑA' : 'CONTRASEÑA'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[8px] text-zinc-500 hover:text-white uppercase font-bold tracking-widest cursor-pointer"
                  >
                    {showPassword ? '[OCULTAR]' : '[MOSTRAR]'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            {/* 5. Confirm Password (reset mode only) */}
            {authMode === 'reset' && (
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">CONFIRMAR NUEVA CONTRASEÑA</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            {/* 6. Net Income input (register only) */}
            {authMode === 'register' && (
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">INGRESO NETO MENSUAL ($ BASE)</label>
                <input
                  type="number"
                  required
                  value={ingreso}
                  onChange={(e) => setIngreso(e.target.value)}
                  placeholder="350000"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            {/* Forgot password link (login mode only) */}
            {authMode === 'login' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setError(null); setRecoverySuccessMessage(null); }}
                  className="text-[8px] text-zinc-550 hover:text-white uppercase font-bold tracking-widest cursor-pointer"
                >
                  ¿OLVIDASTE TU CONTRASEÑA?
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-3.5 px-4 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider disabled:bg-zinc-900 disabled:text-zinc-650 flex items-center justify-center"
              >
                {loading ? (
                  'PROCESANDO...'
                ) : (
                  authMode === 'login' ? 'ACCEDER AL COCKPIT' :
                  authMode === 'register' ? 'COMPLETAR REGISTRO' :
                  authMode === 'forgot' ? 'ENVIAR CODIGO DE SEGURIDAD' :
                  'REESTABLECER CREDENCIALES'
                )}
              </button>

              {/* Back to login (recovery views only) */}
              {(authMode === 'forgot' || authMode === 'reset') && (
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(null); setRecoverySuccessMessage(null); }}
                  className="w-full bg-transparent hover:bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  VOLVER AL INGRESO
                </button>
              )}
            </div>

          </form>
        </div>

        {/* Footer legal disclaimer */}
        <p className="text-[8px] text-zinc-600 text-center uppercase tracking-widest font-mono">
          © {new Date().getFullYear()} InkFinance. Stark Monochrome Edition.
        </p>

      </div>
    </div>
  );
};
