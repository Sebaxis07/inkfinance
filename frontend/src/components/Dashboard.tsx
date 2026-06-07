import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  Wallet, 
  PiggyBank, 
  Target, 
  TrendingUp, 
  BrainCircuit, 
  CalendarDays
} from 'lucide-react';

interface Transaction {
  _id: string;
  monto: number;
  descripcion: string;
  categoria: 'Necesidades' | 'Deseos' | 'Ahorro' | 'Ingreso';
  fecha: string;
  metodo_registro: 'Manual' | 'IA_Text';
}

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

interface DashboardSummary {
  usuario: string;
  ingreso: number;
  balance: number;
  tasaAhorro: number;
  gastosTotales: number;
  limites503020: {
    Necesidades: number;
    Deseos: number;
    Ahorro: number;
  };
  real503020: {
    Necesidades: number;
    Deseos: number;
    Ahorro: number;
  };
  metas_activas: Goal[];
  recentTransactions: Transaction[];
}

interface DashboardProps {
  summary: DashboardSummary | null;
  onTriggerCron: () => void;
  cronLoading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, onTriggerCron, cronLoading }) => {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-zinc-500">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-800 border-t-white mb-4"></div>
        <p className="text-xs font-semibold uppercase tracking-widest font-mono">Cargando balance...</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Monochromatic Pie Chart colors for spending categories
  const pieData = [
    { name: 'Necesidades', value: summary.real503020.Necesidades, color: '#ffffff' }, // Stark White
    { name: 'Deseos', value: summary.real503020.Deseos, color: '#71717a' },       // Mid Zinc 500
    { name: 'Ahorro', value: summary.real503020.Ahorro, color: '#27272a' }        // Dark Zinc 800
  ].filter(item => item.value > 0);

  const hasExpenses = summary.gastosTotales > 0;

  // Progress percentage calculations for budget categories
  const getBudgetPercent = (spent: number, limit: number) => {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((spent / limit) * 100));
  };

  const pctNecesidades = getBudgetPercent(summary.real503020.Necesidades, summary.limites503020.Necesidades);
  const pctDeseos = getBudgetPercent(summary.real503020.Deseos, summary.limites503020.Deseos);
  const pctAhorro = getBudgetPercent(summary.real503020.Ahorro, summary.limites503020.Ahorro);

  return (
    <div className="space-y-8">
      
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">
            Balance General: {summary.usuario}
          </h2>
          <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <CalendarDays className="h-3.5 w-3.5" /> MES ACTUAL
          </p>
        </div>
        <button
          onClick={onTriggerCron}
          disabled={cronLoading}
          className="flex items-center justify-center gap-2 bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider"
        >
          {cronLoading ? (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-zinc-500 border-t-transparent"></div>
          ) : (
            <BrainCircuit className="h-3.5 w-3.5 text-zinc-400" />
          )}
          Forzar Auditoría Semanal IA
        </button>
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card: Monthly Net Balance */}
        <div className={`mono-card p-6 shadow-xl border-l-4 ${summary.balance >= 0 ? 'border-l-white' : 'border-l-zinc-755'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Balance Disponible</span>
            <Wallet className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tighter font-mono">
              {formatCurrency(summary.balance)}
            </h3>
            <div className="flex items-center gap-2 pt-2 text-[10px] text-zinc-500 font-mono">
              <span className="text-white font-bold">In: {formatCurrency(summary.ingreso)}</span>
              <span>•</span>
              <span>Out: {formatCurrency(summary.gastosTotales)}</span>
            </div>
          </div>
        </div>

        {/* Card: Savings Rate */}
        <div className="mono-card p-6 shadow-xl border-l-4 border-l-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Tasa de Ahorro Neto</span>
            <PiggyBank className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tighter font-mono">
                {summary.tasaAhorro}%
              </h3>
              <span className="text-[9px] text-zinc-500 uppercase font-bold font-mono">del ingreso</span>
            </div>
            
            {/* Visual Micro-Indicator of savings quality */}
            <div className="w-full bg-black rounded-full h-1 border border-zinc-900">
              <div 
                className="bg-white h-full rounded-full transition-all" 
                style={{ width: `${Math.min(100, summary.tasaAhorro)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Card: Summary of Expenses */}
        <div className="mono-card p-6 shadow-xl border-l-4 border-l-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Gastos Totales</span>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-4 space-y-2">
            <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tighter font-mono">
              {formatCurrency(summary.gastosTotales)}
            </h3>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider flex items-center gap-1 font-bold">
              {summary.ingreso > 0 ? (
                <>Consumido: {Math.round((summary.gastosTotales / summary.ingreso) * 100)}% del capital</>
              ) : (
                <>Sin capital registrado</>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Charts & Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: 50/30/20 Budgets (7 cols) */}
        <div className="lg:col-span-7 mono-card p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-xs uppercase tracking-widest">Distribución del Presupuesto</h3>
            <p className="text-zinc-500 text-[9px] mt-1 uppercase tracking-widest font-mono">Monitoreo de la regla 50/30/20</p>
          </div>
          
          <div className="h-[210px] my-6 flex items-center justify-center relative">
            {hasExpenses ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="#121214"
                    strokeWidth={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: '#000000', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              /* High-End Architectural blueprint empty state */
              <div className="relative w-36 h-36 border border-dashed border-zinc-800 rounded-full flex flex-col items-center justify-center text-center">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                  Sin Consumo
                </span>
                {/* Visual architectural crosshairs */}
                <div className="absolute top-0 bottom-0 left-1/2 border-l border-zinc-900 border-dashed"></div>
                <div className="absolute left-0 right-0 top-1/2 border-t border-zinc-900 border-dashed"></div>
              </div>
            )}
          </div>

          {/* Progress Limits Bars */}
          <div className="space-y-4 border-t border-zinc-900 pt-5">
            
            {/* Needs */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-zinc-400">Necesidades (50% Vital)</span>
                <span className="font-mono text-zinc-300">
                  {formatCurrency(summary.real503020.Necesidades)} / {formatCurrency(summary.limites503020.Necesidades)}
                </span>
              </div>
              <div className="w-full bg-black h-2 rounded-full p-0.5 border border-zinc-900 relative">
                <div 
                  className={`h-full rounded-full transition-all ${pctNecesidades >= 100 ? 'bg-white' : 'bg-zinc-500'}`} 
                  style={{ width: `${pctNecesidades}%` }} 
                />
                {pctNecesidades >= 100 && (
                  <span className="absolute -top-1 right-0 text-[8px] bg-white text-black font-extrabold px-1 rounded uppercase tracking-wider">LÍMITE ALCANZADO</span>
                )}
              </div>
            </div>

            {/* Wants */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-zinc-400">Deseos (30% Ocio)</span>
                <span className="font-mono text-zinc-300">
                  {formatCurrency(summary.real503020.Deseos)} / {formatCurrency(summary.limites503020.Deseos)}
                </span>
              </div>
              <div className="w-full bg-black h-2 rounded-full p-0.5 border border-zinc-900 relative">
                <div 
                  className={`h-full rounded-full transition-all ${pctDeseos >= 100 ? 'bg-white' : 'bg-zinc-650'}`} 
                  style={{ width: `${pctDeseos}%` }} 
                />
                {pctDeseos >= 100 && (
                  <span className="absolute -top-1 right-0 text-[8px] bg-white text-black font-extrabold px-1 rounded uppercase tracking-wider">EXCEDIDO</span>
                )}
              </div>
            </div>

            {/* Savings */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-zinc-400">Ahorro Objetivo (20%)</span>
                <span className="font-mono text-zinc-300">
                  {formatCurrency(summary.real503020.Ahorro)} / {formatCurrency(summary.limites503020.Ahorro)}
                </span>
              </div>
              <div className="w-full bg-black h-2 rounded-full p-0.5 border border-zinc-900">
                <div 
                  className="bg-zinc-800 h-full rounded-full transition-all" 
                  style={{ width: `${pctAhorro}%` }} 
                />
              </div>
            </div>

          </div>
        </div>

        {/* Right: Goals Summary list (5 cols) */}
        <div className="lg:col-span-5 mono-card p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-xs uppercase tracking-widest flex items-center gap-2">
              Metas de Ahorro
            </h3>
            <p className="text-zinc-500 text-[9px] mt-1 uppercase tracking-widest font-mono">Progreso general hacia metas fijadas</p>
          </div>

          <div className="my-6 space-y-5 flex-1 overflow-y-auto max-h-[240px] pr-2">
            {summary.metas_activas.map(g => (
              <div key={g.id} className="space-y-2 p-2 border border-zinc-900/60 rounded-xl hover:border-zinc-850 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{g.nombre}</span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">{g.categoria}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono font-bold">
                    {g.porcentaje}%
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-black rounded-full h-2 p-0.5 border border-zinc-900">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-500"
                    style={{ width: `${g.porcentaje}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[8px] text-zinc-500 uppercase tracking-wider">
                  <span>Vence: {new Date(g.limite).toLocaleDateString()}</span>
                  <span>Mensual: <strong className="text-zinc-300 font-mono">{formatCurrency(g.cuota_mensual_sugerida || 0)}</strong></span>
                </div>
              </div>
            ))}
            {summary.metas_activas.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-zinc-600">
                <Target className="h-6 w-6 text-zinc-700 mb-2" />
                <span className="uppercase text-[10px] font-bold tracking-widest">Sin metas de ahorro registradas</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Recent Transactions List (Ledger style) */}
      <div className="mono-card p-6 shadow-xl">
        <div className="border-b border-zinc-900 pb-4 mb-4">
          <h3 className="font-bold text-white text-xs uppercase tracking-widest">Libro Diario</h3>
          <p className="text-zinc-500 text-[9px] mt-1 uppercase tracking-widest font-mono">Últimos 10 movimientos registrados en la cuenta</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Categorización</th>
                <th className="py-3 px-4">Registro</th>
                <th className="py-3 px-4 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60 text-xs text-zinc-300">
              {summary.recentTransactions.map((tx) => {
                const isIncome = tx.categoria === 'Ingreso';
                
                const categoryStyle = 
                  isIncome 
                    ? 'border-white bg-white text-black font-extrabold'
                    : tx.categoria === 'Necesidades' 
                    ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300'
                    : tx.categoria === 'Deseos'
                    ? 'border-zinc-850 bg-zinc-900/80 text-zinc-400 font-bold'
                    : 'border-zinc-750 bg-zinc-950 text-zinc-200 font-medium';

                return (
                  <tr key={tx._id} className="hover:bg-zinc-950/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{tx.descripcion}</td>
                    <td className={`py-3.5 px-4 font-mono font-bold text-sm ${isIncome ? 'text-white' : 'text-zinc-400'}`}>
                      {isIncome ? '+' : '-'} {formatCurrency(tx.monto)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-widest font-bold ${categoryStyle}`}>
                        {tx.categoria}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[9px] uppercase text-zinc-500">
                      {tx.metodo_registro === 'IA_Text' ? 'Asistente IA' : 'Manual'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[10px] text-zinc-500 font-mono">
                      {new Date(tx.fecha).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {summary.recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-600 uppercase tracking-widest font-mono text-[10px]">
                    Sin movimientos registrados en este período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
