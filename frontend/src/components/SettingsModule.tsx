import React, { useState, useEffect } from 'react';

interface SettingsModuleProps {
  usuarioId: string;
  isSupervisor?: boolean;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ usuarioId, isSupervisor = false }) => {
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Supervisors CRUD states
  const [supervisors, setSupervisors] = useState<string[]>([]);
  const [newSupervisorEmail, setNewSupervisorEmail] = useState('');
  const [crudError, setCrudError] = useState<string | null>(null);
  const [crudSuccess, setCrudSuccess] = useState<string | null>(null);
  const [crudLoading, setCrudLoading] = useState(false);

  // Creator states for new supervisor account
  const [createSupNombre, setCreateSupNombre] = useState('');
  const [createSupEmail, setCreateSupEmail] = useState('');
  const [createSupPassword, setCreateSupPassword] = useState('');

  // Email dispatch states
  const [emailTo, setEmailTo] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    fetchSupervisors();
    if (usuarioId) {
      console.log(`Cargando panel de ajustes para usuario: ${usuarioId}`);
    }
  }, [usuarioId]);

  const fetchSupervisors = async () => {
    const token = localStorage.getItem('sf_token');
    try {
      const res = await fetch('http://localhost:5000/api/settings/supervisors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupervisors(data);
      }
    } catch (err) {
      console.error('Error al obtener supervisores:', err);
    }
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudError(null);
    setCrudSuccess(null);

    if (!createSupNombre.trim() || !createSupEmail.trim() || !createSupPassword.trim()) {
      setCrudError('Por favor completa todos los campos del nuevo supervisor.');
      return;
    }

    if (createSupPassword.length < 6) {
      setCrudError('La contraseña del supervisor debe tener al menos 6 caracteres.');
      return;
    }

    setCrudLoading(true);
    const token = localStorage.getItem('sf_token');
    try {
      const res = await fetch('http://localhost:5000/api/settings/create-supervisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: createSupNombre,
          email: createSupEmail,
          password: createSupPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear la cuenta de supervisor.');
      }

      setCrudSuccess(`SUPERVISOR "${data.supervisor.nombre}" CREADO Y VINCULADO CON EXITO.`);
      setSupervisors(data.list || []);
      setCreateSupNombre('');
      setCreateSupEmail('');
      setCreateSupPassword('');
    } catch (err: any) {
      setCrudError(err.message || 'Error al crear supervisor.');
    } finally {
      setCrudLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setPasswordLoading(true);
    const token = localStorage.getItem('sf_token');
    try {
      const res = await fetch('http://localhost:5000/api/settings/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña.');
      }

      setPasswordSuccess('CONTRASEÑA ACTUALIZADA CON EXITO.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Error en conexion.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAddSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudError(null);
    setCrudSuccess(null);

    if (!newSupervisorEmail.trim()) {
      setCrudError('Ingresa un correo electrónico.');
      return;
    }

    setCrudLoading(true);
    const token = localStorage.getItem('sf_token');
    try {
      const res = await fetch('http://localhost:5000/api/settings/supervisors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newSupervisorEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo agregar el supervisor.');
      }

      setCrudSuccess('SUPERVISOR AUTORIZADO CORRECTAMENTE.');
      setSupervisors(data.list || []);
      setNewSupervisorEmail('');
    } catch (err: any) {
      setCrudError(err.message || 'Error al agregar.');
    } finally {
      setCrudLoading(false);
    }
  };

  const handleRemoveSupervisor = async (emailToRemove: string) => {
    setCrudError(null);
    setCrudSuccess(null);

    setCrudLoading(true);
    const token = localStorage.getItem('sf_token');
    try {
      const res = await fetch('http://localhost:5000/api/settings/supervisors', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: emailToRemove })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo revocar la autorización.');
      }

      setCrudSuccess('AUTORIZACION REVOCADA CON EXITO.');
      setSupervisors(data.list || []);
    } catch (err: any) {
      setCrudError(err.message || 'Error al eliminar.');
    } finally {
      setCrudLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    if (!emailTo.trim()) {
      setEmailError('Ingresa un destinatario válido.');
      return;
    }

    setEmailLoading(true);
    const token = localStorage.getItem('sf_token');
    try {
      const res = await fetch('http://localhost:5000/api/settings/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ toEmail: emailTo })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al despachar el correo.');
      }

      setEmailSuccess('REPORTE DESPACHADO CORRECTAMENTE.');
      setEmailTo('');
    } catch (err: any) {
      setEmailError(err.message || 'Error en envío.');
    } finally {
      setEmailLoading(false);
    }
  };

  if (isSupervisor) {
    return (
      <div className="max-w-md mx-auto mono-card p-6 border border-zinc-850 space-y-6">
        <div className="border-b border-zinc-900 pb-3">
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
            RESTAURAR CONTRASEÑA
          </h4>
          <span className="text-[9px] text-zinc-550 font-mono uppercase">
            Actualizar contraseña de acceso de forma segura
          </span>
        </div>

        {passwordError && (
          <div className="p-3.5 bg-black border border-zinc-855 text-zinc-350 text-[10px] font-mono uppercase">
            FALLO: {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3.5 bg-white text-black rounded-xl text-xs font-extrabold uppercase">
            EXITO: {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
              CONTRASEÑA ACTUAL
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="******"
              className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
              NUEVA CONTRASEÑA
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="******"
              className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
              CONFIRMAR NUEVA CONTRASEÑA
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="******"
              className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-3 px-4 rounded-xl transition-all uppercase tracking-wider text-xs cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-650"
            >
              {passwordLoading ? 'PROCESANDO...' : 'RESTAURAR CONTRASEÑA'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      
      {/* LEFT COLUMN: Password & Email dispatch */}
      <div className="space-y-8 flex flex-col">
        
        {/* Change Password Block */}
        <div className="mono-card p-6 border border-zinc-850 flex-1 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                RESTAURAR CONTRASENAS
              </h4>
              <span className="text-[9px] text-zinc-550 font-mono uppercase">
                Actualizar contraseña de acceso de forma segura
              </span>
            </div>

            {passwordError && (
              <div className="p-3.5 bg-black border border-zinc-855 text-zinc-300 rounded-xl text-xs font-mono uppercase">
                FALLO: {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3.5 bg-white text-black rounded-xl text-xs font-extrabold uppercase">
                EXITO: {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  CONTRASEÑA ACTUAL
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  NUEVA CONTRASEÑA
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  CONFIRMAR NUEVA CONTRASEÑA
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-3 px-4 rounded-xl transition-all uppercase tracking-wider text-xs cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-650"
                >
                  {passwordLoading ? 'PROCESANDO...' : 'RESTAURAR CONTRASEÑA'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Email Dispatch Block */}
        <div className="mono-card p-6 border border-zinc-850">
          <div className="space-y-5">
            <div className="border-b border-zinc-900 pb-3">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                ENVIO DE AUDITORIAS POR CORREO
              </h4>
              <span className="text-[9px] text-zinc-550 font-mono uppercase">
                Enviar resumen consolidado de la cuenta
              </span>
            </div>

            {emailError && (
              <div className="p-3.5 bg-black border border-zinc-855 text-zinc-300 rounded-xl text-xs font-mono uppercase">
                FALLO: {emailError}
              </div>
            )}

            {emailSuccess && (
              <div className="p-3.5 bg-white text-black rounded-xl text-xs font-extrabold uppercase">
                EXITO: {emailSuccess}
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  CORREO DESTINATARIO
                </label>
                <input
                  type="email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {supervisors.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-mono">AUTORELLENAR:</span>
                  {supervisors.map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => setEmailTo(email)}
                      className="text-[8px] border border-zinc-850 hover:border-zinc-700 bg-zinc-950 px-2 py-1 rounded text-zinc-400 font-mono"
                    >
                      {email}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-extrabold py-3 px-4 rounded-xl transition-all uppercase tracking-wider text-xs cursor-pointer"
              >
                {emailLoading ? 'DESPACHANDO...' : 'ENVIAR REPORTE AL CORREO'}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Supervisors CRUD & Creator */}
      <div className="mono-card p-6 border border-zinc-850 flex flex-col justify-between shadow-2xl">
        
        <div className="space-y-6">
          <div className="border-b border-zinc-900 pb-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
              GESTIONAR SUPERVISORES AUTORIZADOS
            </h4>
            <span className="text-[9px] text-zinc-550 font-mono uppercase">
              Crea o vincula cuentas de supervisores autorizados para auditar tus finanzas
            </span>
          </div>

          {crudError && (
            <div className="p-3.5 bg-black border border-zinc-855 text-zinc-300 rounded-xl text-xs font-mono uppercase">
              ERROR: {crudError}
            </div>
          )}

          {crudSuccess && (
            <div className="p-3.5 bg-white text-black rounded-xl text-xs font-extrabold uppercase">
              SISTEMA: {crudSuccess}
            </div>
          )}

          {/* Form 1: Create a new Supervisor account directly */}
          <div className="space-y-3.5 border-b border-zinc-900/60 pb-5">
            <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
              OPCION A: CREAR Y AUTORIZAR NUEVO SUPERVISOR
            </span>
            <form onSubmit={handleCreateSupervisor} className="space-y-3">
              <div>
                <label className="block text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={createSupNombre}
                  onChange={(e) => setCreateSupNombre(e.target.value)}
                  placeholder="Nombre del auditor"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={createSupEmail}
                    onChange={(e) => setCreateSupEmail(e.target.value)}
                    placeholder="auditor@correo.com"
                    className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Contraseña Temporal</label>
                  <input
                    type="password"
                    required
                    value={createSupPassword}
                    onChange={(e) => setCreateSupPassword(e.target.value)}
                    placeholder="******"
                    className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={crudLoading}
                className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-2.5 px-4 rounded-xl transition-all uppercase tracking-wider text-xs cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-650"
              >
                {crudLoading ? 'CREANDO...' : 'REGISTRAR Y VINCULAR AUDITOR'}
              </button>
            </form>
          </div>

          {/* Form 2: Authorize an existing Supervisor */}
          <div className="space-y-3">
            <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
              OPCION B: VINCULAR SUPERVISOR YA REGISTRADO
            </span>
            <form onSubmit={handleAddSupervisor} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={newSupervisorEmail}
                  onChange={(e) => setNewSupervisorEmail(e.target.value)}
                  placeholder="correo-supervisor@correo.com"
                  className="flex-1 bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={crudLoading}
                  className="bg-white hover:bg-zinc-200 text-black font-extrabold px-5 rounded-xl uppercase tracking-wider text-xs transition-colors cursor-pointer"
                >
                  VINCULAR
                </button>
              </div>
            </form>
          </div>

          {/* Supervisors list */}
          <div className="space-y-3 pt-5 border-t border-zinc-900/60">
            <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
              AUDITORES ACTUALMENTE VINCULADOS
            </span>
            
            {supervisors.length === 0 ? (
              <div className="py-10 text-center text-zinc-600 font-mono text-[9px] uppercase tracking-widest border border-dashed border-zinc-900 rounded-xl">
                Ningún supervisor cuenta con acceso autorizado
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {supervisors.map((email) => (
                  <div 
                    key={email}
                    className="p-3 bg-black border border-zinc-850 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs text-white font-mono">{email}</span>
                      <span className="block text-[7px] text-zinc-550 uppercase tracking-widest font-mono mt-0.5">ESTADO: PERMITIDO</span>
                    </div>
                    <button
                      onClick={() => handleRemoveSupervisor(email)}
                      className="text-[8px] border border-zinc-800 hover:border-red-900 bg-zinc-950 text-zinc-500 hover:text-white px-3 py-1.5 rounded transition-all font-mono uppercase tracking-wider cursor-pointer"
                    >
                      REVOCAR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-xl text-[9px] text-zinc-500 leading-relaxed uppercase mt-6">
          INFORMACION: Los supervisores agregados podran realizar busquedas por tu correo electronico para visualizar tus balances y metas de ahorro de manera de solo lectura.
        </div>

      </div>

    </div>
  );
};
