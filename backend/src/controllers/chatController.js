import { dbManager } from '../services/dbManager.js';
import { queryLLM } from '../services/aiService.js';

export async function handleAdvisorChat(req, res) {
  try {
    const { usuario_id, message, chatHistory } = req.body;

    if (!usuario_id || !message) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: usuario_id, message' });
    }

    // Compile financial context
    const user = await dbManager.getUserById(usuario_id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const transactions = await dbManager.getTransactions({ usuario_id });
    const goals = await dbManager.getGoals({ usuario_id });

    // Sum transactions for current calendar month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let necesidades = 0;
    let deseos = 0;
    let ahorro = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.fecha);
      if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
        const monto = Number(t.monto) || 0;
        if (t.categoria === 'Necesidades') necesidades += monto;
        if (t.categoria === 'Deseos') deseos += monto;
        if (t.categoria === 'Ahorro') ahorro += monto;
      }
    });

    // Anonymize the active goals: only send name, objective, actual, limit
    const metasActivas = goals.map(g => {
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const date = new Date(g.fecha_limite);
      const limitMonth = months[date.getMonth()] || 'Diciembre';
      return {
        nombre: g.nombre_meta,
        objetivo: g.monto_objetivo,
        actual: g.monto_actual,
        limite: limitMonth
      };
    });

    // Compile Anonymized Financial Context (No IDs, emails, or password fields)
    const contextPayload = {
      usuario: user.nombre,
      ingreso: user.ingreso_neto_mensual,
      gastos_mes_actual: {
        Necesidades: necesidades,
        Deseos: deseos,
        Ahorro: ahorro
      },
      metas_activas: metasActivas
    };

    const systemPrompt = `Eres un asesor financiero automatizado e inteligente. Tienes prohibido inventar datos. Te proporcionaré el contexto financiero real del usuario en formato JSON. Responde de forma concisa, directa y pragmática a sus dudas, analizando si sus acciones comprometen sus metas de ahorro obligatorias o sus límites de gastos mensuales.

Contexto financiero del usuario:
${JSON.stringify(contextPayload, null, 2)}

Recuerda:
- Habla directamente al usuario usando su nombre (${user.nombre}).
- Usa la regla 50/30/20 como referencia (50% Necesidades, 30% Deseos, 20% Ahorro).
- Mantén las respuestas amigables pero sumamente prácticas y orientadas al ahorro.
- No muestres IDs ni información privada.`;

    // Construct message history if provided, otherwise standard prompt
    const messages = [];
    messages.push({ role: 'system', content: systemPrompt });

    if (chatHistory && Array.isArray(chatHistory)) {
      // Add last few messages for chat memory, filtering to avoid token overhead
      const recentHistory = chatHistory.slice(-6).map(h => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.text
      }));
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    const response = await queryLLM(messages, 0.5);

    res.status(200).json({ response });
  } catch (error) {
    console.error('Error in handleAdvisorChat:', error);
    res.status(500).json({ error: 'Error al procesar la consulta del asesor de IA' });
  }
}
