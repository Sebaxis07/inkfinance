import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { ChatAdvisor } from './components/ChatAdvisor';
import { AlertBanner } from './components/AlertBanner';
import { GoalsModule } from './components/GoalsModule';
import { AuthScreen } from './components/AuthScreen';
import { SettingsModule } from './components/SettingsModule';
import { SupervisionModule } from './components/SupervisionModule';
import { 
  Shield, 
  Database, 
  Server, 
  LayoutDashboard, 
  PlusCircle, 
  Target, 
  Bot, 
  Menu, 
  X,
  UserCheck,
  LogOut,
  AlertTriangle,
  Settings
} from 'lucide-react';

type Tab = 'resumen' | 'registrar' | 'metas' | 'asesor' | 'alertas' | 'config';

interface UserPayload {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  ingreso_neto_mensual?: number;
}

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(localStorage.getItem('sf_token'));
  const [user, setUser] = useState<UserPayload | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Supervisor target state
  const [supervisorTarget, setSupervisorTarget] = useState<UserPayload | null>(null);

  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [cronLoading, setCronLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'MongoDB' | 'JSON Fallback'>('JSON Fallback');
  
  // Navigation
  const [currentTab, setCurrentTab] = useState<Tab>('resumen');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Validate session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Session validation failed:', err);
      } finally {
        setAuthChecking(false);
      }
    };
    checkSession();
  }, [token]);

  // Fetch db health status
  const fetchHealth = async () => {
    try {
      const res = await fetch('http://localhost:5000/health');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data.database === 'MongoDB' ? 'MongoDB' : 'JSON Fallback');
      }
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  // Resolve which user_id to query
  const getQueryUserId = () => {
    if (user?.rol === 'supervisor') {
      return supervisorTarget?.id || '';
    }
    return user?.id || '';
  };

  const fetchDashboardData = async () => {
    const queryId = getQueryUserId();
    if (!queryId || !token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/dashboard/summary?usuario_id=${queryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  };

  const fetchAlerts = async () => {
    const queryId = getQueryUserId();
    if (!queryId || !token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/notificaciones?usuario_id=${queryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  // Refresh data based on state updates
  useEffect(() => {
    if (user) {
      fetchHealth();
    }
  }, [user, refreshTrigger]);

  useEffect(() => {
    const queryId = getQueryUserId();
    if (queryId) {
      fetchDashboardData();
      fetchAlerts();
    } else {
      setSummary(null);
      setAlerts([]);
    }
  }, [user, supervisorTarget, refreshTrigger]);

  const handleAuthSuccess = (newToken: string, newUser: UserPayload) => {
    localStorage.setItem('sf_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setCurrentTab('resumen');
  };

  const handleLogout = () => {
    localStorage.removeItem('sf_token');
    setToken(null);
    setUser(null);
    setSupervisorTarget(null);
    setSummary(null);
    setAlerts([]);
  };

  // Supervisor lookup handled directly via roster in SupervisionModule

  const handleDismissAlert = async () => {
    const queryId = getQueryUserId();
    if (!queryId || !token) return;
    try {
      await fetch('http://localhost:5000/api/notificaciones/clear', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ usuario_id: queryId })
      });
      setAlerts([]);
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  };

  const handleTriggerCron = async () => {
    if (!token) return;
    setCronLoading(true);
    try {
      await fetch('http://localhost:5000/api/alerts/trigger-cron', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ force: true })
      });
      triggerRefresh();
    } catch (err) {
      console.error('Failed to run audit:', err);
    } finally {
      setCronLoading(false);
    }
  };

  // Auth loading state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-500 font-mono">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-800 border-t-white mb-4"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest">Validando Sesión...</p>
      </div>
    );
  }

  // Not authenticated screen
  if (!user || !token) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const isSupervisor = user.rol === 'supervisor';

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex font-sans selection:bg-[#f4f4f5] selection:text-[#09090b]">
      
      {/* 1. Sidebar Navigation (Desktops) */}
      <aside className="hidden lg:flex flex-col w-72 bg-black border-r border-zinc-900 p-6 flex-shrink-0 justify-between">
        <div className="space-y-8">
          
          {/* Logo Header */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-[#f4f4f5] text-black rounded-lg flex items-center justify-center font-bold text-lg">
              I
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-widest block leading-none">
                INKFINANCE
              </span>
              <span className="text-[8px] text-zinc-500 font-bold block uppercase tracking-widest mt-1">
                {isSupervisor ? 'SUPERVISOR PORTAL' : 'MONOCHROME SYSTEM'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            
            {isSupervisor ? (
              <>
                <button
                  onClick={() => setCurrentTab('resumen')}
                  className={`w-full flex items-center justify-start text-left gap-3.5 py-3 pl-4 pr-3 border-l-2 transition-all cursor-pointer text-xs uppercase tracking-widest font-bold ${
                    currentTab === 'resumen'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/40'
                  }`}
                >
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span>Supervisión Activa</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentTab('resumen')}
                  className={`w-full flex items-center justify-start text-left gap-3.5 py-3 pl-4 pr-3 border-l-2 transition-all cursor-pointer text-xs uppercase tracking-widest font-bold ${
                    currentTab === 'resumen'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/40'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                  <span>Resumen Cuenta</span>
                </button>

                <button
                  onClick={() => setCurrentTab('registrar')}
                  className={`w-full flex items-center justify-start text-left gap-3.5 py-3 pl-4 pr-3 border-l-2 transition-all cursor-pointer text-xs uppercase tracking-widest font-bold ${
                    currentTab === 'registrar'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/40'
                  }`}
                >
                  <PlusCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Registrar Movimiento</span>
                </button>

                <button
                  onClick={() => setCurrentTab('metas')}
                  className={`w-full flex items-center justify-start text-left gap-3.5 py-3 pl-4 pr-3 border-l-2 transition-all cursor-pointer text-xs uppercase tracking-widest font-bold ${
                    currentTab === 'metas'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/40'
                  }`}
                >
                  <Target className="h-4 w-4 flex-shrink-0" />
                  <span>Metas de Ahorro</span>
                </button>

                <button
                  onClick={() => setCurrentTab('asesor')}
                  className={`w-full flex items-center justify-start text-left gap-3.5 py-3 pl-4 pr-3 border-l-2 transition-all cursor-pointer text-xs uppercase tracking-widest font-bold ${
                    currentTab === 'asesor'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/40'
                  }`}
                >
                  <Bot className="h-4 w-4 flex-shrink-0" />
                  <span>Asesor Virtual</span>
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentTab('config')}
              className={`w-full flex items-center justify-start text-left gap-3.5 py-3 pl-4 pr-3 border-l-2 transition-all cursor-pointer text-xs uppercase tracking-widest font-bold ${
                currentTab === 'config'
                  ? 'bg-zinc-900 border-white text-white'
                  : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/40'
              }`}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Ajustes Cuenta</span>
            </button>

          </nav>
        </div>

        {/* User context quickinfo & logout */}
        <div className="space-y-4">
          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-zinc-400" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user.nombre}</p>
                <p className="text-[9px] text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-900/80 text-[10px] text-zinc-400 flex items-center justify-between">
              <span className="uppercase tracking-widest text-[8px] font-bold">ROL:</span>
              <span className="font-mono text-white font-semibold uppercase">{user.rol === 'supervisor' ? 'Supervisor' : 'Principal'}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 lg:hidden flex flex-col p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <span className="font-bold text-white uppercase tracking-widest text-sm">MENÚ</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 border border-zinc-800 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-4 flex-1">
            {isSupervisor ? (
              <>
                <button
                  onClick={() => { setCurrentTab('resumen'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold border ${
                    currentTab === 'resumen' ? 'bg-[#f4f4f5] text-black border-white' : 'border-zinc-855 text-zinc-400'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Supervisión Activa
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setCurrentTab('resumen'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold border ${
                    currentTab === 'resumen' ? 'bg-[#f4f4f5] text-black border-white' : 'border-zinc-850 text-zinc-400'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Resumen Cuenta
                </button>

                <button
                  onClick={() => { setCurrentTab('registrar'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold border ${
                    currentTab === 'registrar' ? 'bg-[#f4f4f5] text-black border-white' : 'border-zinc-850 text-zinc-400'
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  Registrar Movimiento
                </button>

                <button
                  onClick={() => { setCurrentTab('metas'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold border ${
                    currentTab === 'metas' ? 'bg-[#f4f4f5] text-black border-white' : 'border-zinc-850 text-zinc-400'
                  }`}
                >
                  <Target className="h-4 w-4" />
                  Metas de Ahorro
                </button>

                <button
                  onClick={() => { setCurrentTab('asesor'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold border ${
                    currentTab === 'asesor' ? 'bg-[#f4f4f5] text-black border-white' : 'border-zinc-850 text-zinc-400'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  Asesor Virtual
                </button>
              </>
            )}

            <button
              onClick={() => { setCurrentTab('config'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold border ${
                currentTab === 'config' ? 'bg-[#f4f4f5] text-black border-white' : 'border-zinc-850 text-zinc-400'
              }`}
            >
              <Settings className="h-4 w-4" />
              Ajustes Cuenta
            </button>

            <button
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold border border-red-950 text-red-500 mt-8"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </nav>
        </div>
      )}

      {/* 2. Main Area Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-black border-b border-zinc-900 py-4 px-6 flex items-center justify-between">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 border border-zinc-850 rounded">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-extrabold text-white text-sm tracking-widest">INKFINANCE</span>
          <div className="h-8 w-8 bg-zinc-900 border border-zinc-850 rounded flex items-center justify-center text-xs font-bold uppercase">
            {user.nombre.substring(0, 2)}
          </div>
        </header>

        {/* Secondary Subheader (System Status bar) */}
        <div className="bg-[#121214]/40 border-b border-zinc-950 px-6 py-3 text-[10px] text-zinc-500 flex items-center justify-between font-mono">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><Server className="h-3 w-3 text-white" /> API: ONLINE</span>
            <span className="flex items-center gap-1"><Database className="h-3 w-3 text-white" /> DB: {dbStatus}</span>
          </div>
          <div className="hidden sm:block">
            SISTEMA MONOCROMÁTICO VERSIÓN 3.0.0
          </div>
        </div>

        {/* Inner Content Area */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-10 w-full mx-auto ${isSupervisor ? 'max-w-7xl' : 'max-w-5xl'}`}>
            <div className="space-y-8">
              
              {/* Alert Banner (Only for clients) */}
              {!isSupervisor && (
                <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />
              )}

              {/* Dynamic Tab Views */}
              <div className="animate-fade-in">
                
                {/* 1. Resumen Tab */}
                {currentTab === 'resumen' && (
                  isSupervisor ? (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-tight font-mono">Consola de Supervisión</h2>
                        <p className="text-zinc-550 text-xs mt-1 uppercase tracking-widest font-mono">Monitoreo, análisis de riesgos y auditoría de cuentas vinculadas</p>
                      </div>
                      <SupervisionModule 
                        token={token} 
                        selectedClient={supervisorTarget as any} 
                        onSelectClient={setSupervisorTarget as any} 
                        triggerRefresh={triggerRefresh} 
                      />
                    </div>
                  ) : (
                    <Dashboard 
                      summary={summary} 
                      onTriggerCron={handleTriggerCron}
                      cronLoading={cronLoading}
                    />
                  )
                )}

                {/* 2. Transaction form Tab (Requester only) */}
                {currentTab === 'registrar' && !isSupervisor && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Registrar Movimientos</h2>
                      <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Agrega tus entradas y gastos en tiempo real</p>
                    </div>
                    <TransactionForm 
                      usuarioId={getQueryUserId()} 
                      onTransactionAdded={triggerRefresh}
                    />
                  </div>
                )}

                {/* 3. Goals Tab */}
                {currentTab === 'metas' && (
                  /* Note: If supervisor is logged in, we render the GoalsModule, but we wrap it/configure it. Since we pass goalsList, we can pass read-only config or the module displays contributions. Let's make sure it operates nicely */
                  <GoalsModule 
                    usuarioId={getQueryUserId()}
                    goalsList={summary?.metas_activas || []}
                    onRefresh={triggerRefresh}
                    readOnly={isSupervisor}
                  />
                )}

                {/* 4. Chat Advisor Tab (Requester only) */}
                {currentTab === 'asesor' && !isSupervisor && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Asesor Conversacional IA</h2>
                      <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Consultas contextualizadas sobre tu estado financiero actual</p>
                    </div>
                    <ChatAdvisor 
                      usuarioId={getQueryUserId()}
                      refreshTrigger={refreshTrigger}
                    />
                  </div>
                )}

                {/* 5. Alerts log tab (Supervisor only) */}
                {currentTab === 'alertas' && isSupervisor && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Log de Alertas y Auditorías</h2>
                      <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Eventos de anomalías de gasto detectados en la cuenta</p>
                    </div>
                    <div className="mono-card p-6 shadow-xl space-y-4">
                      {alerts.length === 0 ? (
                        <div className="py-12 text-center text-zinc-550 uppercase tracking-widest font-mono text-[10px]">
                          Sin registros de alertas de gastos sospechosos o desviaciones
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {alerts.map((al) => (
                            <div key={al._id} className="p-4 bg-black border border-zinc-850 rounded-xl flex gap-3 items-start">
                              <AlertTriangle className="h-4.5 w-4.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                              <div className="space-y-1">
                                <p className="text-xs text-white leading-relaxed">{al.mensaje}</p>
                                <span className="block text-[8px] text-zinc-500 font-mono">Generado el: {new Date(al.fecha).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. User Settings Tab */}
                {currentTab === 'config' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Ajustes de Usuario</h2>
                      <p className="text-zinc-550 text-xs mt-1 uppercase tracking-widest font-mono">Restauración de credenciales de acceso y preferencias del sistema</p>
                    </div>
                    <SettingsModule usuarioId={getQueryUserId()} isSupervisor={isSupervisor} />
                  </div>
                )}
              </div>

            </div>

         </div>
      </div>

    </div>
  );
}
