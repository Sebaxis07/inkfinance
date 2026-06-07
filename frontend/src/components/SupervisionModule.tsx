import React, { useState, useEffect } from 'react';

interface ClientPayload {
  id: string;
  nombre: string;
  email: string;
  ingreso_neto_mensual: number;
}

interface TransactionPayload {
  _id: string;
  monto: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  metodo_registro: string;
}

interface GoalPayload {
  _id: string;
  nombre_meta: string;
  monto_objetivo: number;
  monto_actual: number;
  fecha_limite: string;
  cuota_mensual_sugerida: number;
}

interface SupervisionModuleProps {
  token: string;
  onSelectClient: (client: ClientPayload | null) => void;
  selectedClient: ClientPayload | null;
  triggerRefresh: () => void;
}

export const SupervisionModule: React.FC<SupervisionModuleProps> = ({
  token,
  onSelectClient,
  selectedClient,
  triggerRefresh
}) => {
  const [clients, setClients] = useState<ClientPayload[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [errorClients, setErrorClients] = useState<string | null>(null);

  // Selected client detailed stats
  const [transactions, setTransactions] = useState<TransactionPayload[]>([]);
  const [goals, setGoals] = useState<GoalPayload[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Recommendations dispatch
  const [recommendation, setRecommendation] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [recSuccess, setRecSuccess] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  // Audit triggers
  const [scanLoading, setScanLoading] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, [token]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientDetails(selectedClient.id);
      setRecommendation('');
      setRecSuccess(null);
      setRecError(null);
      setScanSuccess(null);
    } else {
      setTransactions([]);
      setGoals([]);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    setLoadingClients(true);
    setErrorClients(null);
    try {
      const res = await fetch('http://localhost:5000/api/supervisor/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setClients(data);
      } else {
        setErrorClients(data.error || 'No se pudo cargar el listado de clientes.');
      }
    } catch (err) {
      setErrorClients('Error al conectar con el servidor.');
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchClientDetails = async (clientId: string) => {
    setLoadingDetails(true);
    try {
      // Fetch user transactions
      const txRes = await fetch(`http://localhost:5000/api/transacciones?usuario_id=${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const txData = await txRes.json();
      if (txRes.ok) {
        setTransactions(txData);
      }

      // Fetch user goals
      const goalsRes = await fetch(`http://localhost:5000/api/metas?usuario_id=${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const goalsData = await goalsRes.json();
      if (goalsRes.ok) {
        setGoals(goalsData);
      }
    } catch (err) {
      console.error('Error al cargar detalles de auditoria:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSendRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !recommendation.trim()) return;

    setRecLoading(true);
    setRecSuccess(null);
    setRecError(null);

    try {
      const res = await fetch('http://localhost:5000/api/supervisor/send-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientEmail: selectedClient.email,
          recommendationText: recommendation
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRecSuccess('CONSEJOS DESPACHADOS CORRECTAMENTE.');
        setRecommendation('');
      } else {
        setRecError(data.error || 'Error al despachar recomendación.');
      }
    } catch (err) {
      setRecError('Fallo en la red.');
    } finally {
      setRecLoading(false);
    }
  };

  const handleTriggerScan = async () => {
    if (!selectedClient) return;
    setScanLoading(true);
    setScanSuccess(null);
    try {
      const res = await fetch('http://localhost:5000/api/alerts/trigger-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ force: true, usuario_id: selectedClient.id })
      });
      if (res.ok) {
        setScanSuccess('ESCANEO DE RIESGOS COMPLETADO.');
        triggerRefresh();
        fetchClientDetails(selectedClient.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScanLoading(false);
    }
  };

  // Calculations
  const totalIncomes = transactions.filter(t => t.categoria === 'Ingreso').reduce((acc, curr) => acc + curr.monto, 0);
  const totalNeeds = transactions.filter(t => t.categoria === 'Necesidades').reduce((acc, curr) => acc + curr.monto, 0);
  const totalWants = transactions.filter(t => t.categoria === 'Deseos').reduce((acc, curr) => acc + curr.monto, 0);
  const totalSavings = transactions.filter(t => t.categoria === 'Ahorro').reduce((acc, curr) => acc + curr.monto, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      
      {/* 1. LEFT PANEL: CLIENT ROSTER */}
      <div className="lg:col-span-1 space-y-6">
        <div className="mono-card p-6 border border-zinc-850 space-y-6">
          <div className="border-b border-zinc-900 pb-3 flex justify-between items-center">
            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                CLIENTES VINCULADOS
              </h4>
              <span className="text-[9px] text-zinc-550 font-mono uppercase mt-0.5 block">
                Accesos concedidos de auditoría
              </span>
            </div>
            <span className="bg-zinc-900 border border-zinc-800 text-[8px] font-mono font-bold text-white px-2 py-1 rounded">
              {clients.length} ROSTER
            </span>
          </div>

          {errorClients && (
            <div className="p-3 bg-black border border-zinc-855 text-zinc-400 rounded-xl text-xs font-mono uppercase">
              ERROR: {errorClients}
            </div>
          )}

          {loadingClients ? (
            <div className="py-16 text-center text-zinc-650 font-mono text-[9px] uppercase tracking-widest">
              CARGANDO EXPEDIENTES...
            </div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 font-mono text-[9px] uppercase tracking-widest border border-dashed border-zinc-900 rounded-xl">
              SIN CLIENTES AUTORIZADOS
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => {
                const isSelected = selectedClient?.id === c.id;
                const initials = c.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <div
                    key={c.id}
                    className={`p-4 border transition-all rounded-xl flex items-center justify-between ${
                      isSelected ? 'bg-zinc-900 border-white' : 'bg-[#0b0b0d] border-zinc-850 hover:border-zinc-750'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs border ${
                        isSelected ? 'bg-white text-black border-white' : 'bg-black text-white border-zinc-800'
                      }`}>
                        {initials}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white uppercase tracking-wide block truncate max-w-[130px]">
                          {c.nombre}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span className="text-[9px] text-zinc-500 font-mono block truncate max-w-[110px]">
                            {c.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectClient(c)}
                      className={`text-[8px] font-extrabold px-3 py-2 rounded transition-all uppercase tracking-wider cursor-pointer border ${
                        isSelected 
                          ? 'bg-white text-black border-white' 
                          : 'bg-black border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                      }`}
                    >
                      {isSelected ? 'AUDITANDO' : 'AUDITAR'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. MIDDLE & RIGHT PANEL: AUDIT COCKPIT */}
      <div className="lg:col-span-2 space-y-6">
        
        {!selectedClient ? (
          <div className="mono-card p-12 border border-zinc-850 space-y-8 bg-[#09090b]">
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest block">MONITOR DE SUPERVISIÓN</span>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-tight mt-1">CENTRO DE CONTROL FINANCIERO</h3>
              <span className="text-[9px] text-zinc-500 font-mono uppercase mt-1 block">ESTADO: STANDBY // SELECCIONE CLIENTE PARA VINCULACIÓN</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-5 bg-[#0e0e11] border border-zinc-900 rounded-xl space-y-2">
                <span className="text-[9px] font-extrabold text-white uppercase tracking-wider block">1. MONITOREO DE REGLAS</span>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wide leading-relaxed">
                  Inspeccione de forma visual las proporciones de ingresos del cliente asignadas a Necesidades (50%), Deseos (30%) y Ahorro (20%).
                </p>
              </div>

              <div className="p-5 bg-[#0e0e11] border border-zinc-900 rounded-xl space-y-2">
                <span className="text-[9px] font-extrabold text-white uppercase tracking-wider block">2. EVALUACIÓN DE ALERTAS</span>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wide leading-relaxed">
                  Fuerce ejecuciones manuales del algoritmo de riesgo para procesar desvíos de presupuesto, alertas y excesos de consumo.
                </p>
              </div>

              <div className="p-5 bg-[#0e0e11] border border-zinc-900 rounded-xl space-y-2">
                <span className="text-[9px] font-extrabold text-white uppercase tracking-wider block">3. LOGS EN TIEMPO REAL</span>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wide leading-relaxed">
                  Acceda directamente al histórico de transacciones del cliente y a la tasa de cumplimiento de sus metas de ahorro activas.
                </p>
              </div>

              <div className="p-5 bg-[#0e0e11] border border-zinc-900 rounded-xl space-y-2">
                <span className="text-[9px] font-extrabold text-white uppercase tracking-wider block">4. RECOMENDACIÓN DIRECTA</span>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wide leading-relaxed">
                  Redacte notas y sugerencias personalizadas de presupuesto y envíelas de forma inmediata a la bandeja del cliente por correo.
                </p>
              </div>

            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header overview */}
            <div className="mono-card p-6 border border-zinc-850 bg-[#09090b]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-5">
                <div>
                  <span className="text-[7px] text-zinc-500 font-mono uppercase tracking-widest block">EXPEDIENTE BAJO AUDITORÍA:</span>
                  <h3 className="text-lg font-extrabold text-white uppercase tracking-tight mt-0.5">{selectedClient.nombre}</h3>
                  <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">{selectedClient.email}</span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[7px] text-zinc-500 font-mono uppercase tracking-widest block">INGRESO BASE REGISTRADO:</span>
                  <span className="text-2xl font-mono font-bold text-white block mt-0.5">${selectedClient.ingreso_neto_mensual.toLocaleString()}</span>
                </div>
              </div>

              {loadingDetails ? (
                <div className="py-24 text-center text-zinc-650 font-mono text-[9px] uppercase tracking-widest">
                  CARGANDO PROTOCOLOS DE AUDITORÍA...
                </div>
              ) : (
                <div className="space-y-8 mt-6">
                  
                  {/* Grid Metrics summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    
                    <div className="p-4 bg-black border border-zinc-900 rounded-xl space-y-1.5">
                      <span className="text-[7px] text-zinc-500 uppercase tracking-widest block font-extrabold">INGRESOS DECLARADOS</span>
                      <span className="text-base font-bold text-white font-mono block">${totalIncomes.toLocaleString()}</span>
                    </div>

                    <div className="p-4 bg-black border border-zinc-900 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest block font-extrabold">NECESIDADES (50%)</span>
                        <span className="text-[7px] text-zinc-550 font-mono">${(selectedClient.ingreso_neto_mensual * 0.5).toLocaleString()}</span>
                      </div>
                      <span className="text-base font-bold text-white font-mono block">${totalNeeds.toLocaleString()}</span>
                      <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden mt-2">
                        <div 
                          className="bg-white h-full" 
                          style={{ width: `${Math.min(100, (totalNeeds / (selectedClient.ingreso_neto_mensual * 0.5)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-black border border-zinc-900 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest block font-extrabold">DESEOS (30%)</span>
                        <span className="text-[7px] text-zinc-550 font-mono">${(selectedClient.ingreso_neto_mensual * 0.3).toLocaleString()}</span>
                      </div>
                      <span className="text-base font-bold text-white font-mono block">${totalWants.toLocaleString()}</span>
                      <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden mt-2">
                        <div 
                          className="bg-white h-full" 
                          style={{ width: `${Math.min(100, (totalWants / (selectedClient.ingreso_neto_mensual * 0.3)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-black border border-zinc-900 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest block font-extrabold">AHORRO (20%)</span>
                        <span className="text-[7px] text-zinc-550 font-mono">${(selectedClient.ingreso_neto_mensual * 0.2).toLocaleString()}</span>
                      </div>
                      <span className="text-base font-bold text-white font-mono block">${totalSavings.toLocaleString()}</span>
                      <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden mt-2">
                        <div 
                          className="bg-white h-full" 
                          style={{ width: `${Math.min(100, (totalSavings / (selectedClient.ingreso_neto_mensual * 0.2)) * 100)}%` }}
                        />
                      </div>
                    </div>

                  </div>

                  {/* Actions Console */}
                  <div className="border-t border-zinc-900/60 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Send Advice Simulation */}
                    <div className="space-y-4">
                      <div className="border-b border-zinc-900 pb-2">
                        <span className="block text-[8px] font-bold text-zinc-400 uppercase tracking-widest">PANEL DE COMUNICACIÓN</span>
                        <span className="block text-[7px] text-zinc-500 font-mono uppercase mt-0.5">Envia reportes o recomendaciones a la bandeja del cliente</span>
                      </div>
                      
                      {recError && (
                        <div className="p-3 bg-black border border-zinc-855 text-zinc-400 text-[9px] font-mono uppercase rounded-lg">
                          ERROR: {recError}
                        </div>
                      )}
                      {recSuccess && (
                        <div className="p-3 bg-white text-black text-[9px] font-bold uppercase rounded-lg">
                          SISTEMA: {recSuccess}
                        </div>
                      )}

                      <form onSubmit={handleSendRecommendation} className="space-y-3">
                        <textarea
                          required
                          rows={4}
                          value={recommendation}
                          onChange={(e) => setRecommendation(e.target.value)}
                          placeholder="Recomendaciones sugeridas (Ej: Ajustar el gasto en Deseos o incrementar la cuota mensual de ahorro)..."
                          className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors resize-none"
                        />
                        <button
                          type="submit"
                          disabled={recLoading}
                          className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-extrabold py-3 px-4 rounded-xl transition-all uppercase tracking-wider text-[10px] cursor-pointer"
                        >
                          {recLoading ? 'DESPACHANDO MENSAJE...' : 'ENVIAR RECOMENDACIONES POR CORREO'}
                        </button>
                      </form>
                    </div>

                    {/* Risk Audit Console Tools */}
                    <div className="space-y-4">
                      <div className="border-b border-zinc-900 pb-2">
                        <span className="block text-[8px] font-bold text-zinc-400 uppercase tracking-widest">EVALUADOR DE CONSUMO</span>
                        <span className="block text-[7px] text-zinc-550 font-mono uppercase mt-0.5">Dispare auditorias del motor de detección financiera</span>
                      </div>
                      
                      {scanSuccess && (
                        <div className="p-3 bg-white text-black text-[9px] font-bold uppercase rounded-lg">
                          SISTEMA: {scanSuccess}
                        </div>
                      )}

                      <div className="p-5 bg-black border border-zinc-900 rounded-xl space-y-4 flex flex-col justify-between h-[155px]">
                        <p className="text-[9px] text-zinc-500 uppercase font-mono leading-relaxed">
                          La ejecución forzada analizará las transacciones del mes en curso y emitirá notificaciones si detecta desvíos o violaciones sobre la regla 50/30/20 configurada.
                        </p>
                        <button
                          type="button"
                          onClick={handleTriggerScan}
                          disabled={scanLoading}
                          className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-3 px-4 rounded-xl transition-all uppercase tracking-wider text-[10px] cursor-pointer"
                        >
                          {scanLoading ? 'EJECUTANDO CÓDIGO...' : 'FORZAR ESCANEO DE ALERTA Y CRON'}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Ledger Logs / Lists */}
                  <div className="border-t border-zinc-900/60 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Transactions Log */}
                    <div className="space-y-4">
                      <div className="border-b border-zinc-900 pb-2 flex justify-between items-center">
                        <span className="block text-[8px] font-bold text-zinc-400 uppercase tracking-widest">TRANSACCIONES REGISTRADAS ({transactions.length})</span>
                        <span className="text-[7px] text-zinc-550 font-mono uppercase">LIBRO MAYOR</span>
                      </div>

                      {transactions.length === 0 ? (
                        <div className="py-12 text-center text-zinc-650 font-mono text-[8px] uppercase tracking-widest border border-dashed border-zinc-900 rounded-xl">
                          SIN ENTRADAS EN EL REGISTRO
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                          {transactions.map(tx => (
                            <div key={tx._id} className="p-3 bg-black border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center justify-between transition-colors">
                              <div className="space-y-1">
                                <span className="text-xs text-white block uppercase truncate max-w-[170px] font-bold">{tx.descripcion}</span>
                                <span className="text-[8px] text-zinc-550 font-mono uppercase">
                                  {new Date(tx.fecha).toLocaleDateString()} | REG: {tx.metodo_registro}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-white font-mono block font-bold">${tx.monto.toLocaleString()}</span>
                                <span className="text-[7px] text-zinc-500 uppercase tracking-wider font-bold block mt-0.5">{tx.categoria}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Goals status */}
                    <div className="space-y-4">
                      <div className="border-b border-zinc-900 pb-2 flex justify-between items-center">
                        <span className="block text-[8px] font-bold text-zinc-400 uppercase tracking-widest">METAS DE AHORRO AUDITADAS ({goals.length})</span>
                        <span className="text-[7px] text-zinc-550 font-mono uppercase">CUMPLIMIENTO</span>
                      </div>

                      {goals.length === 0 ? (
                        <div className="py-12 text-center text-zinc-650 font-mono text-[8px] uppercase tracking-widest border border-dashed border-zinc-900 rounded-xl">
                          SIN METAS CONFIGURADAS
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                          {goals.map(g => {
                            const progress = Math.min(100, Math.round((g.monto_actual / g.monto_objetivo) * 100));
                            return (
                              <div key={g._id} className="p-3 bg-black border border-zinc-900 rounded-xl space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-xs text-white block uppercase truncate max-w-[170px] font-bold">{g.nombre_meta}</span>
                                    <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-mono mt-0.5 block">
                                      CUOTA MENSUAL SUGERIDA: ${g.cuota_mensual_sugerida.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs text-white font-mono block font-bold">
                                      ${g.monto_actual.toLocaleString()} / ${g.monto_objetivo.toLocaleString()}
                                    </span>
                                    <span className="text-[8px] text-zinc-400 uppercase tracking-wide font-bold block mt-0.5">{progress}% DE AVANCE</span>
                                  </div>
                                </div>
                                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                                  <div className="bg-white h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
