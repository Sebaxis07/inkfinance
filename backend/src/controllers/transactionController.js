import { dbManager } from '../services/dbManager.js';
import { queryLLM, parseCleanJson } from '../services/aiService.js';

export async function createManualTransaction(req, res) {
  try {
    const { usuario_id, monto, descripcion, categoria, fecha } = req.body;

    if (!usuario_id || !monto || !descripcion || !categoria) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: usuario_id, monto, descripcion, categoria' });
    }

    if (!['Necesidades', 'Deseos', 'Ahorro', 'Ingreso'].includes(categoria)) {
      return res.status(400).json({ error: 'Categoría inválida. Debe ser Necesidades, Deseos, Ahorro o Ingreso' });
    }

    const tx = await dbManager.createTransaction({
      usuario_id,
      monto: Number(monto),
      descripcion,
      categoria,
      fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
      metodo_registro: 'Manual'
    });

    res.status(201).json(tx);
  } catch (error) {
    console.error('Error creating manual transaction:', error);
    res.status(500).json({ error: 'Error al registrar la transacción manualmente' });
  }
}

export async function createIaTransaction(req, res) {
  try {
    const { usuario_id, text } = req.body;

    if (!usuario_id || !text) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: usuario_id, text' });
    }

    const systemPrompt = `Actúa como un parser de datos estrictamente financiero. Procesa el texto del usuario y devuélvelo formateado única y exclusivamente como un objeto JSON válido, sin texto adicional, sin markdown, ni bloques de código.
Estructura: { "monto": number, "descripcion": string, "categoria": string }
Criterios de categoría:
- Si describe recibir dinero, cobrar un pago, ganar dinero, ventas, freelance, honorarios, sueldo o cualquier entrada de dinero, asigna 'Ingreso'.
- Si es un gasto vital (comida, arriendo, cuentas, salud, transporte básico) asigna 'Necesidades'.
- Si es un gasto de ocio (salidas, restaurantes, hobbies, regalos, vicios, compras no esenciales) asigna 'Deseos'.
- Si es inversión, ahorro o depósito en fondos asigna 'Ahorro'.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ];

    // Call OpenRouter
    const responseText = await queryLLM(messages, 0.1);

    let parsedResult;
    try {
      parsedResult = parseCleanJson(responseText);
    } catch (parseError) {
      console.error('AI raw response failed to parse:', responseText);
      return res.status(422).json({
        error: 'La IA no pudo formatear la transacción de manera estructurada. Por favor intenta de otra forma.',
        raw: responseText
      });
    }

    const { monto, descripcion, categoria } = parsedResult;

    if (monto === undefined || !descripcion || !categoria) {
      return res.status(422).json({
        error: 'El JSON devuelto por la IA no tiene la estructura requerida.',
        parsedResult
      });
    }

    const validCategories = ['Necesidades', 'Deseos', 'Ahorro', 'Ingreso'];
    const finalCategory = validCategories.includes(categoria) ? categoria : 'Necesidades';

    const tx = await dbManager.createTransaction({
      usuario_id,
      monto: Number(monto),
      descripcion,
      categoria: finalCategory,
      fecha: new Date().toISOString(),
      metodo_registro: 'IA_Text'
    });

    res.status(201).json(tx);
  } catch (error) {
    console.error('Error creating AI transaction:', error);
    res.status(500).json({ error: 'Error al procesar la transacción con Inteligencia Artificial' });
  }
}
