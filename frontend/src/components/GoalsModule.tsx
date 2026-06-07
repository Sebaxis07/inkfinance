import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  TrendingUp,
  Briefcase,
  Home,
  Car,
  Plane,
  Laptop,
  AlertTriangle,
  Award,
  Zap
} from 'lucide-react';

interface Goal {
  id: string;
  nombre: string;
  objetivo: number;
  actual: number;
  porcentaje: number;
  limite: string;
  cuota_mensual_sugerida?: number;
  categoria: string;
  prioridad: string;
}

interface GoalsModuleProps {
  usuarioId: string;
  goalsList: Goal[];
  onRefresh: () => void;
  readOnly?: boolean;
}

const CATEGORIES = [
  { id: 'General', label: 'General 🎯', icon: Target },
  { id: 'Viajes', label: 'Viajes ✈️', icon: Plane },
  { id: 'Vehiculo', label: 'Vehículo 🚗', icon: Car },
  { id: 'Hogar', label: 'Hogar / Vivienda 🏠', icon: Home },
  { id: 'Tecnologia', label: 'Tecnología 💻', icon: Laptop },
  { id: 'Emergencia', label: 'Fondo Emergencia 🚨', icon: AlertTriangle },
  { id: 'Inversion', label: 'Inversión 💼', icon: Briefcase }
];

export const GoalsModule: React.FC<GoalsModuleProps> = ({ usuarioId, goalsList, onRefresh, readOnly = false }) => {
  // Create goal form state
  const [nombreMeta, setNombreMeta] = useState('');
  const [montoObjetivo, setMontoObjetivo] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [categoria, setCategoria] = useState('General');
  const [prioridad, setPrioridad] = useState('Media');
  
  // Contribution state (per goal ID)
  const [contribValues, setContribValues] = useState<{ [key: string]: string }>({});

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Live Simulator calculations based on inputs
  const getSimDetails = () => {
    const objective = Number(montoObjetivo) || 0;
    if (objective <= 0 || !fechaLimite) return null;
    
    const limitDate = new Date(fechaLimite);
    const today = new Date();
    
    // Total days difference
    const diffMs = limitDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return { error: 'La fecha límite debe ser en el futuro.' };

    const diffMonths = Math.max(1, Math.round(diffDays / 30));
    const monthly = Math.round(objective / diffMonths);
    const weekly = Math.round(objective / (diffDays / 7));
    const daily = Math.round(objective / diffDays);

    return {
      monthly,
      weekly,
      daily,
      days: diffDays,
      months: diffMonths
    };
  };

  const sim = getSimDetails();

  const handleContribute = async (goalId: string, currentActual: number) => {
    setError(null);
    setSuccess(null);
    const amountStr = contribValues[goalId];
    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
      setError('Ingresa un monto de aporte válido.');
      return;
    }

    const contribution = Number(amountStr);
    const newActual = currentActual + contribution;
    const token = localStorage.getItem('sf_token');

    try {
      const res = await fetch(`http://localhost:5000/api/metas/${goalId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ monto_actual: newActual })
      });

      if (res.ok) {
        setSuccess(`¡Aporte registrado con éxito! Ahorraste ${formatCurrency(contribution)}.`);
        setContribValues(prev => ({ ...prev, [goalId]: '' }));
        onRefresh();
      } else {
        throw new Error('No se pudo guardar el aporte.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar.');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!nombreMeta || !montoObjetivo || !fechaLimite) {
      setError('Por favor completa todos los campos.');
      return;
    }

    const objective = Number(montoObjetivo);
    if (objective <= 0) {
      setError('El monto objetivo debe ser mayor a 0.');
      return;
    }

    if (sim && 'error' in sim) {
      setError(sim.error || 'Error al simular meta');
      return;
    }

    setLoading(true);
    const cuotaSugerida = sim ? sim.monthly : 0;
    const token = localStorage.getItem('sf_token');

    try {
      const res = await fetch('http://localhost:5000/api/metas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: usuarioId,
          nombre_meta: nombreMeta,
          monto_objetivo: objective,
          fecha_limite: fechaLimite,
          cuota_mensual_sugerida: cuotaSugerida,
          categoria,
          prioridad
        })
      });

      if (res.ok) {
        setSuccess(`Meta "${nombreMeta}" creada con éxito.`);
        setNombreMeta('');
        setMontoObjetivo('');
        setFechaLimite('');
        setCategoria('General');
        setPrioridad('Media');
        onRefresh();
      } else {
        throw new Error('Fallo al crear la meta.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (catId: string) => {
    const found = CATEGORIES.find(c => c.id === catId);
    if (found) {
      const IconComp = found.icon;
      return <IconComp className="h-4 w-4 text-white" />;
    }
    return <Target className="h-4 w-4 text-white" />;
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
          Objetivos de Ahorro
        </h2>
        <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Calcula, simula y aporta fondos para tus planes futuros</p>
      </div>

      {/* Global Messages */}
      {error && (
        <div className="p-3 bg-black border border-zinc-850 text-zinc-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-zinc-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-[#f4f4f5] text-black rounded-xl text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-black flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Active Goals list */}
        <div className={readOnly ? "lg:col-span-12 space-y-6" : "lg:col-span-7 space-y-6"}>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-3 flex items-center justify-between">
            <span>Metas Activas</span>
            <span className="font-mono text-[10px] text-zinc-500">{goalsList.length} en curso</span>
          </h3>

          <div className={readOnly ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
            {goalsList.map((g) => (
              <div key={g.id} className="mono-card p-5 shadow-lg space-y-4 flex flex-col justify-between border border-zinc-850 hover:border-zinc-750 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded">
                          {getCategoryIcon(g.categoria)}
                        </div>
                        <h4 className="font-bold text-white text-sm tracking-tight">{g.nombre}</h4>
                      </div>
                      <div className="flex gap-2 pt-0.5">
                        <span className="text-[8px] font-bold tracking-widest uppercase text-zinc-500 bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded">
                          Cat: {g.categoria}
                        </span>
                        <span className={`text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${
                          g.prioridad === 'Alta' 
                            ? 'text-white border-white bg-zinc-900'
                            : g.prioridad === 'Baja'
                            ? 'text-zinc-600 border-zinc-900 bg-black'
                            : 'text-zinc-400 border-zinc-800 bg-zinc-950'
                        }`}>
                          Prioridad: {g.prioridad}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
                        {g.porcentaje}%
                      </span>
                      <p className="text-[8px] text-zinc-600 font-mono mt-1">
                        Vence: {new Date(g.limite).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Custom Minimalist Progress Bar */}
                  <div className="w-full bg-black rounded-full h-2 p-0.5 border border-zinc-900">
                    <div
                      className="bg-white h-full rounded-full transition-all duration-500"
                      style={{ width: `${g.porcentaje}%` }}
                    />
                  </div>

                  {/* Summary amount cards */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-black/40 border border-zinc-900 p-2 rounded-lg">
                      <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Guardado</span>
                      <span className="font-bold text-white font-mono">{formatCurrency(g.actual)}</span>
                    </div>
                    <div className="bg-black/40 border border-zinc-900 p-2 rounded-lg">
                      <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Objetivo</span>
                      <span className="font-bold text-zinc-400 font-mono">{formatCurrency(g.objetivo)}</span>
                    </div>
                  </div>

                  {g.cuota_mensual_sugerida && g.cuota_mensual_sugerida > 0 ? (
                    <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-[9px] text-zinc-400 flex items-center justify-between">
                      <span className="uppercase tracking-wider flex items-center gap-1">
                        <Award className="h-3 w-3 text-zinc-500" /> Ahorro mensual sugerido:
                      </span>
                      <strong className="text-white font-mono">{formatCurrency(g.cuota_mensual_sugerida)}</strong>
                    </div>
                  ) : null}
                </div>

                {/* Contribution contribution bar */}
                {!readOnly && (
                  <div className="pt-3 border-t border-zinc-900/60 flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-650">
                        <DollarSign className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="number"
                        placeholder="Registrar nuevo aporte..."
                        value={contribValues[g.id] || ''}
                        onChange={(e) => setContribValues({ ...contribValues, [g.id]: e.target.value })}
                        className="w-full bg-black border border-zinc-850 rounded-lg py-1.5 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => handleContribute(g.id, g.actual)}
                      className="bg-[#f4f4f5] hover:bg-white text-black font-semibold text-[10px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Aportar
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Empty State */}
            {goalsList.length === 0 && (
              <div className="p-8 border border-dashed border-zinc-850 rounded-2xl bg-[#09090b] flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-zinc-950 border border-zinc-900 text-zinc-400 rounded-xl">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Aún no hay metas de ahorro</h4>
                  <p className="text-zinc-500 text-xs mt-1 max-w-xs leading-relaxed">
                    Crear objetivos de ahorro te permite estructurar tus ingresos variables de forma inteligente, apartando fondos específicos para cada plan.
                  </p>
                </div>
                {!readOnly && (
                  <div className="pt-2 text-left w-full max-w-xs space-y-2 border-t border-zinc-900">
                    <span className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Recomendaciones:</span>
                    <div className="flex items-start gap-2 text-[10px] text-zinc-500">
                      <Zap className="h-3.5 w-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                      <span>Empieza con un fondo de emergencias de 1 mes de gastos básicos.</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-zinc-500">
                      <Zap className="h-3.5 w-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                      <span>Separa tus metas en plazos razonables para mantener la motivación.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Goal Creator & live simulator */}
        {!readOnly && (
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-3 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Nueva Meta
            </h3>

            <div className="mono-card p-6 shadow-xl space-y-5">
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nombre de la Meta</label>
                  <input
                    type="text"
                    required
                    value={nombreMeta}
                    onChange={(e) => setNombreMeta(e.target.value)}
                    placeholder="Ej: Laptop para diseño"
                    className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Categoría</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Prioridad</label>
                    <select
                      value={prioridad}
                      onChange={(e) => setPrioridad(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
                    >
                      <option value="Baja">Baja 🟢</option>
                      <option value="Media">Media 🟡</option>
                      <option value="Alta">Alta 🔴</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Monto Objetivo</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-650">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <input
                        type="number"
                        required
                        value={montoObjetivo}
                        onChange={(e) => setMontoObjetivo(e.target.value)}
                        placeholder="500000"
                        className="w-full bg-black border border-zinc-800 rounded-xl py-2.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Fecha Límite</label>
                    <input
                      type="date"
                      required
                      value={fechaLimite}
                      onChange={(e) => setFechaLimite(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* Dynamic Live Simulator panel */}
                {sim && (
                  <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3 animate-fade-in">
                    <span className="block text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-zinc-400" /> Plan de Ahorro Sugerido
                    </span>
                    
                    {'error' in sim ? (
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{sim.error}</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500">Cuota Mensual:</span>
                          <strong className="text-white font-mono">{formatCurrency(sim.monthly)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500">Cuota Semanal:</span>
                          <strong className="text-zinc-400 font-mono">{formatCurrency(sim.weekly)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500">Ahorro Diario:</span>
                          <strong className="text-zinc-500 font-mono">{formatCurrency(sim.daily)}</strong>
                        </div>
                        <div className="pt-2 border-t border-zinc-900 text-[9px] text-zinc-500 flex justify-between">
                          <span>Horizonte: {sim.months} meses</span>
                          <span>({sim.days} días restantes)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#f4f4f5] hover:bg-white text-black font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider disabled:bg-zinc-855 disabled:text-zinc-655"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mx-auto"></div>
                  ) : (
                    "Agregar Meta de Ahorro"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
