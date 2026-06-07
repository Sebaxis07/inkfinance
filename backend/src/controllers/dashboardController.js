import { dbManager } from '../services/dbManager.js';

export async function getDashboardSummary(req, res) {
  try {
    const usuarioId = req.query.usuario_id || '60c72b2f9b1d8a23d4f8e001'; // Fallback to seeded user
    const user = await dbManager.getUserById(usuarioId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const transactions = await dbManager.getTransactions({ usuario_id: usuarioId });
    const goals = await dbManager.getGoals({ usuario_id: usuarioId });

    // Filter transactions for current calendar month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const currentMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    });

    // Calculate actual spend and dynamic income by category
    let necesidadesGasto = 0;
    let deseosGasto = 0;
    let ahorroGasto = 0;
    let dynamicIncomes = 0;

    currentMonthTransactions.forEach(t => {
      const monto = Number(t.monto) || 0;
      if (t.categoria === 'Necesidades') necesidadesGasto += monto;
      if (t.categoria === 'Deseos') deseosGasto += monto;
      if (t.categoria === 'Ahorro') ahorroGasto += monto;
      if (t.categoria === 'Ingreso') dynamicIncomes += monto;
    });

    const totalGastos = necesidadesGasto + deseosGasto + ahorroGasto;
    const baseIngreso = Number(user.ingreso_neto_mensual) || 0;
    const ingreso = baseIngreso + dynamicIncomes;
    const balance = ingreso - totalGastos;

    // Savings Rate (Tasa de Ahorro - TS)
    // Formula: TS = ((Ingresos - Gastos) / Ingresos) * 100
    const tasaAhorro = ingreso > 0 ? ((ingreso - totalGastos) / ingreso) * 100 : 0;

    // 50/30/20 limits based on user income
    const limites503020 = {
      Necesidades: ingreso * 0.5,
      Deseos: ingreso * 0.3,
      Ahorro: ingreso * 0.2
    };

    const real503020 = {
      Necesidades: necesidadesGasto,
      Deseos: deseosGasto,
      Ahorro: ahorroGasto
    };

    // Goals Progress
    const metasProgreso = goals.map(g => {
      const pct = g.monto_objetivo > 0 ? (g.monto_actual / g.monto_objetivo) * 100 : 0;
      return {
        id: g._id,
        nombre: g.nombre_meta,
        objetivo: g.monto_objetivo,
        actual: g.monto_actual,
        limite: g.fecha_limite,
        porcentaje: Math.min(100, Math.max(0, parseFloat(pct.toFixed(1)))),
        cuota_mensual_sugerida: g.cuota_mensual_sugerida,
        categoria: g.categoria || 'General',
        prioridad: g.prioridad || 'Media'
      };
    });

    res.status(200).json({
      usuario: user.nombre,
      ingreso,
      balance,
      tasaAhorro: parseFloat(tasaAhorro.toFixed(1)),
      gastosTotales: totalGastos,
      limites503020,
      real503020,
      metas_activas: metasProgreso,
      recentTransactions: transactions.slice(0, 10) // Send top 10 recent transactions
    });
  } catch (error) {
    console.error('Error in getDashboardSummary:', error);
    res.status(500).json({ error: 'Error al compilar el resumen financiero' });
  }
}
