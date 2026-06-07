import cron from 'node-cron';
import { dbManager } from '../services/dbManager.js';
import { queryLLM } from '../services/aiService.js';

// Perform spending evaluation and generate alerts if necessary
export async function runSpendingAudit(forceTrigger = false) {
  console.log('⏰ Running financial spending audit...');
  try {
    const users = await dbManager.getUsers();

    for (const user of users) {
      const usuarioId = user._id;
      // Get current month transactions
      const transactions = await dbManager.getTransactions({ usuario_id: usuarioId });
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();

      let deseosSpend = 0;
      let dynamicIncomes = 0;
      transactions.forEach(t => {
        const tDate = new Date(t.fecha);
        if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
          if (t.categoria === 'Deseos') {
            deseosSpend += Number(t.monto) || 0;
          }
          if (t.categoria === 'Ingreso') {
            dynamicIncomes += Number(t.monto) || 0;
          }
        }
      });

      const baseIngreso = Number(user.ingreso_neto_mensual) || 0;
      const ingreso = baseIngreso + dynamicIncomes;
      const presupuestoDeseos = ingreso * 0.3; // 30% of dynamic income is allocated to Deseos

      // Condition: Day of month >= 15 (half of the month) and spend > 70% of budget, OR forced trigger for testing
      const isPastMidMonth = currentDay >= 15;
      const pctSpent = presupuestoDeseos > 0 ? (deseosSpend / presupuestoDeseos) * 100 : 0;
      const isOverspent = pctSpent >= 70;

      if (forceTrigger || (isPastMidMonth && isOverspent)) {
        console.log(`⚠️ Alert condition met for user ${user.nombre}. Spend: $${deseosSpend} / $${presupuestoDeseos} (${pctSpent.toFixed(1)}%).`);

        // Check if an alert was already generated in the last 3 days to avoid duplication
        const existingAlerts = await dbManager.getAlerts({ usuario_id: usuarioId });
        const recentAlert = existingAlerts.find(a => {
          const diffMs = new Date() - new Date(a.fecha);
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays < 3 && a.categoria === 'Deseos';
        });

        if (recentAlert && !forceTrigger) {
          console.log(`⏭️ Alert already generated recently for user ${user.nombre}. Skipping.`);
          continue;
        }

        // Generate Alert message using AI
        const prompt = `Actúa como un asesor financiero experto y redactor de notificaciones.
El usuario ${user.nombre} tiene un presupuesto mensual de ocio/deseos de $${presupuestoDeseos}.
Al día de hoy, ha gastado $${deseosSpend} (${pctSpent.toFixed(1)}% de su presupuesto).
Redacta una alerta amigable pero firme que advierta al usuario sobre esta desviación. Debe ser muy directa, pragmática, concisa (máximo 2 frases) y no debe revelar identificadores técnicos. Explícale que podría comprometer sus metas de ahorro si sigue gastando a este ritmo.`;

        const messages = [
          { role: 'system', content: 'Eres un redactor de alertas financieras concisas y de alto impacto.' },
          { role: 'user', content: prompt }
        ];

        let alertMessage = `Alerta: Has consumido el ${pctSpent.toFixed(1)}% de tu presupuesto de ocio mensual. Intenta moderar tus gastos de Deseos.`;
        try {
          alertMessage = await queryLLM(messages, 0.6);
        } catch (aiError) {
          console.error('Failed to generate alert message using AI. Using fallback message.', aiError);
        }

        // Save alert to database
        await dbManager.createAlert({
          usuario_id: usuarioId,
          mensaje: alertMessage,
          tipo: 'advertencia',
          desviacion: parseFloat(pctSpent.toFixed(1)),
          categoria: 'Deseos',
          fecha: new Date().toISOString()
        });

        console.log(`✉️ Alert successfully created and saved for ${user.nombre}.`);
      } else {
        console.log(`✅ User ${user.nombre} spend is within limits: ${pctSpent.toFixed(1)}% of budget.`);
      }
    }
  } catch (error) {
    console.error('Error in runSpendingAudit:', error);
  }
}

// Setup the cron job (every 7 days: specifically on Sunday at midnight)
export function startCronJobs() {
  // Cron pattern for "At 00:00 on Sunday"
  cron.schedule('0 0 * * 0', async () => {
    await runSpendingAudit();
  });
  console.log('📅 Cron job scheduled: Runs every Sunday at midnight.');
}
