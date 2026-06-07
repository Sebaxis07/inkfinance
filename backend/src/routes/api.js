import express from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { createManualTransaction, createIaTransaction } from '../controllers/transactionController.js';
import { handleAdvisorChat } from '../controllers/chatController.js';
import { dbManager } from '../services/dbManager.js';
import { runSpendingAudit } from '../cron/alertsCron.js';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../services/auth.js';
import { emailService } from '../services/emailService.js';

const router = express.Router();

// Auth Middleware
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

    const payload = verifyToken(token);
    if (!payload) return res.status(403).json({ error: 'Token inválido o expirado' });

    req.user = payload;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

// Register Route
router.post('/auth/register', async (req, res) => {
  try {
    const { nombre, email, password, rol, ingreso_neto_mensual } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const existing = await dbManager.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = hashPassword(password);
    const newUser = await dbManager.createUser({
      nombre,
      email: email.toLowerCase(),
      password: hashedPassword,
      rol: rol || 'requester',
      ingreso_neto_mensual: Number(ingreso_neto_mensual) || 0
    });

    const token = generateToken(newUser);
    res.status(201).json({ 
      token, 
      user: { id: newUser._id, nombre: newUser.nombre, email: newUser.email, rol: newUser.rol } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario', details: err.message });
  }
});

// Login Route
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const user = await dbManager.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const valid = verifyPassword(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user);
    res.status(200).json({ 
      token, 
      user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión', details: err.message });
  }
});

// Auth: Forgot Password (Request Code)
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Falta email' });
    const emailLower = email.toLowerCase().trim();

    const user = await dbManager.getUserByEmail(emailLower);
    if (!user) return res.status(404).json({ error: 'No existe usuario registrado con ese email.' });

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.recoveryCode = code;
    user.recoveryExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    await user.save();

    try {
      await emailService.sendRecoveryCode(emailLower, user.nombre, code);
    } catch (mailErr) {
      console.error('Failed to send recovery email:', mailErr);
      return res.status(500).json({ 
        error: 'Error al despachar el correo electrónico real de recuperación. Por favor verifique la configuración SMTP del servidor en su archivo .env.',
        details: mailErr.message
      });
    }

    res.status(200).json({ 
      message: 'Código de recuperación enviado con éxito.',
      code: code
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en solicitud de recuperación', details: err.message });
  }
});

// Auth: Reset Password (Confirm Code)
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }
    const emailLower = email.toLowerCase().trim();

    const user = await dbManager.getUserByEmail(emailLower);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!user.recoveryCode || user.recoveryCode !== code) {
      return res.status(400).json({ error: 'Código de recuperación inválido o inexistente' });
    }

    if (new Date() > user.recoveryExpires) {
      return res.status(400).json({ error: 'El código de recuperación ha expirado' });
    }

    user.password = hashPassword(newPassword);
    user.recoveryCode = '';
    user.recoveryExpires = null;
    await user.save();

    res.status(200).json({ message: 'Contraseña reestablecida con éxito.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al reestablecer la contraseña', details: err.message });
  }
});

// Get Me Route
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbManager.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(200).json({ 
      id: user._id, 
      nombre: user.nombre, 
      email: user.email, 
      rol: user.rol, 
      ingreso_neto_mensual: user.ingreso_neto_mensual 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sesión de usuario' });
  }
});

// Supervisor: Lookup requester by email with permission checks
router.get('/supervisor/lookup', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'supervisor') {
      return res.status(403).json({ error: 'Acceso denegado. Debe ser supervisor.' });
    }
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Falta email del usuario a buscar' });

    const targetUser = await dbManager.getUserByEmail(email.toLowerCase().trim());
    if (!targetUser) return res.status(404).json({ error: 'No se encontró ningún usuario con ese email' });

    // Enforce authorization constraints
    const supervisorEmail = req.user.email.toLowerCase().trim();
    const isAuthorized = 
      (targetUser.supervisorEmail && targetUser.supervisorEmail.toLowerCase() === supervisorEmail) ||
      (targetUser.supervisores_autorizados && targetUser.supervisores_autorizados.map(s => s.toLowerCase()).includes(supervisorEmail));

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Acceso denegado. Este usuario no ha autorizado tu supervisión en sus ajustes.' });
    }

    res.status(200).json({
      id: targetUser._id,
      nombre: targetUser.nombre,
      email: targetUser.email,
      ingreso_neto_mensual: targetUser.ingreso_neto_mensual
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar usuario', details: err.message });
  }
});

// Supervisor: Get list of all clients authorized to be audited
router.get('/supervisor/clients', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'supervisor') {
      return res.status(403).json({ error: 'Acceso denegado. Debe ser supervisor.' });
    }
    const supervisorEmail = req.user.email.toLowerCase().trim();

    // Query for users who have this supervisor in their list
    const clients = await dbManager.getUsersBySupervisor(supervisorEmail);
    res.status(200).json(clients.map(c => ({
      id: c._id || c.id,
      nombre: c.nombre,
      email: c.email,
      ingreso_neto_mensual: c.ingreso_neto_mensual
    })));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes autorizados', details: err.message });
  }
});

// Supervisor: Send recommendation email to client
router.post('/supervisor/send-recommendation', authenticateToken, async (req, res) => {
  try {
    if (req.user.rol !== 'supervisor') {
      return res.status(403).json({ error: 'Acceso denegado. Debe ser supervisor.' });
    }
    const { clientEmail, recommendationText } = req.body;
    if (!clientEmail || !recommendationText) {
      return res.status(400).json({ error: 'Campos clientEmail y recommendationText son requeridos.' });
    }

    const clientUser = await dbManager.getUserByEmail(clientEmail);
    const clientName = clientUser ? clientUser.nombre : 'Usuario';

    try {
      await emailService.sendSupervisorRecommendation(clientEmail, clientName, req.user.nombre, recommendationText);
    } catch (mailErr) {
      console.error('Failed to send supervisor recommendation email:', mailErr);
      return res.status(500).json({
        error: 'Error al enviar el correo electrónico real al cliente. Verifique la configuración SMTP del servidor.',
        details: mailErr.message
      });
    }

    res.status(200).json({ 
      message: `Recomendación enviada con éxito a ${clientEmail}.`,
      log: `DISPATCHED_RECOMMENDATION: AUDIT-${Date.now()}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al despachar recomendación', details: err.message });
  }
});

// Settings: Reset Password
router.post('/settings/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }
    const user = await dbManager.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = verifyPassword(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    user.password = hashPassword(newPassword);
    await user.save();

    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar contraseña', details: err.message });
  }
});

// Settings: Create a new Supervisor account directly
router.post('/settings/create-supervisor', authenticateToken, async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }
    const emailLower = email.toLowerCase().trim();

    // Check if email already registered
    const existing = await dbManager.getUserByEmail(emailLower);
    if (existing) {
      return res.status(400).json({ error: 'El email del supervisor ya está registrado' });
    }

    // Hash and create supervisor
    const hashedPassword = hashPassword(password);
    const newSupervisor = await dbManager.createUser({
      nombre,
      email: emailLower,
      password: hashedPassword,
      rol: 'supervisor',
      ingreso_neto_mensual: 0
    });

    // Link it to the requester immediately
    const user = await dbManager.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!user.supervisores_autorizados) {
      user.supervisores_autorizados = [];
    }
    user.supervisores_autorizados.push(emailLower);
    await user.save();

    res.status(201).json({ 
      message: 'Cuenta de supervisor creada y autorizada con éxito.',
      supervisor: { nombre: newSupervisor.nombre, email: newSupervisor.email },
      list: user.supervisores_autorizados
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar el supervisor', details: err.message });
  }
});

// Settings: Get authorized supervisors list
router.get('/settings/supervisors', authenticateToken, async (req, res) => {
  try {
    const user = await dbManager.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(200).json(user.supervisores_autorizados || []);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener supervisores' });
  }
});

// Settings: Authorize supervisor (Add)
router.post('/settings/supervisors', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Falta email del supervisor' });
    const emailLower = email.toLowerCase().trim();

    // Verify if supervisor exists and has correct role
    const target = await dbManager.getUserByEmail(emailLower);
    if (!target) {
      return res.status(404).json({ error: 'El email no pertenece a ningún usuario registrado' });
    }
    if (target.rol !== 'supervisor') {
      return res.status(400).json({ error: 'El usuario especificado no posee el rol de Supervisor' });
    }

    const user = await dbManager.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!user.supervisores_autorizados) {
      user.supervisores_autorizados = [];
    }

    if (user.supervisores_autorizados.includes(emailLower)) {
      return res.status(400).json({ error: 'El supervisor ya está autorizado' });
    }

    user.supervisores_autorizados.push(emailLower);
    await user.save();

    res.status(200).json({ message: 'Supervisor autorizado con éxito', list: user.supervisores_autorizados });
  } catch (err) {
    res.status(500).json({ error: 'Error al autorizar supervisor', details: err.message });
  }
});

// Settings: Revoke supervisor authorization (Delete)
router.delete('/settings/supervisors', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Falta email del supervisor' });
    const emailLower = email.toLowerCase().trim();

    const user = await dbManager.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.supervisores_autorizados) {
      user.supervisores_autorizados = user.supervisores_autorizados.filter(s => s.toLowerCase() !== emailLower);
      await user.save();
    }

    res.status(200).json({ message: 'Autorización revocada con éxito', list: user.supervisores_autorizados || [] });
  } catch (err) {
    res.status(500).json({ error: 'Error al revocar supervisor', details: err.message });
  }
});

// Settings: Simulated Email dispatching
router.post('/settings/send-email', authenticateToken, async (req, res) => {
  try {
    const { toEmail } = req.body;
    if (!toEmail) return res.status(400).json({ error: 'Falta el email destinatario' });

    const transactions = await dbManager.getTransactions({ usuario_id: req.user.id });
    const goals = await dbManager.getGoals({ usuario_id: req.user.id });

    try {
      await emailService.sendFinancialReport(toEmail, req.user.nombre, transactions, goals);
    } catch (mailErr) {
      console.error('Failed to send financial report email:', mailErr);
      return res.status(500).json({
        error: 'Error al enviar el correo electrónico real del reporte. Verifique la configuración SMTP del servidor.',
        details: mailErr.message
      });
    }

    res.status(200).json({
      message: `Reporte de cuenta enviado con éxito a ${toEmail} a través del despachador de correos.`,
      log: `DISPATCHED_QUEUE: SF-${Date.now()}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al despachar el correo' });
  }
});

// Dashboard summary
router.get('/dashboard/summary', getDashboardSummary);

// Transactions
router.post('/transacciones/manual', createManualTransaction);
router.post('/transacciones/ia', createIaTransaction);

// Chatbot Advisor
router.post('/ia/chat', handleAdvisorChat);

// Notifications/Alerts
router.get('/notificaciones', async (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || '60c72b2f9b1d8a23d4f8e001';
    const alerts = await dbManager.getAlerts({ usuario_id: usuarioId });
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las alertas' });
  }
});

router.post('/notificaciones/clear', async (req, res) => {
  try {
    const usuarioId = req.body.usuario_id || '60c72b2f9b1d8a23d4f8e001';
    await dbManager.clearAlerts({ usuario_id: usuarioId });
    res.status(200).json({ message: 'Notificaciones limpiadas con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al limpiar notificaciones' });
  }
});

// Users (for UI profile switcher)
router.get('/usuarios', async (req, res) => {
  try {
    const users = await dbManager.getUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.post('/usuarios', async (req, res) => {
  try {
    const { nombre, email, ingreso_neto_mensual } = req.body;
    const newUser = await dbManager.createUser({
      nombre,
      email,
      ingreso_neto_mensual: Number(ingreso_neto_mensual)
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Savings Goals
router.post('/metas', async (req, res) => {
  try {
    const { usuario_id, nombre_meta, monto_objetivo, fecha_limite, cuota_mensual_sugerida, categoria, prioridad } = req.body;
    const newGoal = await dbManager.createGoal({
      usuario_id,
      nombre_meta,
      monto_objetivo: Number(monto_objetivo),
      fecha_limite: new Date(fecha_limite).toISOString(),
      cuota_mensual_sugerida: Number(cuota_mensual_sugerida) || 0,
      monto_actual: 0,
      categoria: categoria || 'General',
      prioridad: prioridad || 'Media'
    });
    res.status(201).json(newGoal);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear meta de ahorro' });
  }
});

router.put('/metas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { monto_actual } = req.body;
    const updatedGoal = await dbManager.updateGoal(id, {
      monto_actual: Number(monto_actual)
    });
    res.status(200).json(updatedGoal);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar meta de ahorro' });
  }
});

// Debug / Testing trigger for Cron Job
router.post('/alerts/trigger-cron', async (req, res) => {
  try {
    const forceTrigger = req.body.force === true;
    await runSpendingAudit(forceTrigger);
    res.status(200).json({ message: 'Spending audit run completed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error triggering audit', details: error.message });
  }
});

// Reset all database data
router.post('/admin/clear', async (req, res) => {
  try {
    await dbManager.clearAllData();
    res.status(200).json({ message: 'Base de datos reiniciada con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al reiniciar la base de datos', details: error.message });
  }
});

export default router;
