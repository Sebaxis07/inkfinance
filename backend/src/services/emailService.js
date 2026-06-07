import nodemailer from 'nodemailer';

const getTransporter = () => {
  // Read SMTP config from process.env
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('⚠️ SMTP credentials not set in environment. Nodemailer will fail to send real emails.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false
    }
  });
};

const getBaseHtml = (title, contentHtml) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #09090b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #f4f4f5;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #0c0c0e;
          border: 1px solid #27272a;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }
        .header {
          padding: 30px;
          border-bottom: 1px solid #18181b;
          background-color: #09090b;
          text-align: center;
        }
        .logo {
          display: inline-block;
          background-color: #ffffff;
          color: #000000;
          font-weight: 900;
          font-size: 20px;
          width: 40px;
          height: 40px;
          line-height: 40px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 10px;
        }
        .brand {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #ffffff;
          margin: 0;
        }
        .tagline {
          font-size: 9px;
          font-weight: bold;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin: 4px 0 0 0;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
          font-size: 14px;
          color: #d4d4d8;
        }
        .content h2 {
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid #27272a;
          padding-bottom: 8px;
        }
        .content h3 {
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 30px;
          margin-bottom: 15px;
          border-bottom: 1px solid #18181b;
          padding-bottom: 6px;
        }
        .btn-container {
          margin: 30px 0;
          text-align: center;
        }
        .btn {
          display: inline-block;
          background-color: #ffffff;
          color: #000000 !important;
          text-decoration: none;
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 12px 24px;
          border-radius: 8px;
          transition: background-color 0.2s;
        }
        .code-box {
          background-color: #09090b;
          border: 1px dashed #3f3f46;
          border-radius: 8px;
          padding: 20px;
          font-family: "Courier New", Courier, monospace;
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 5px;
          text-align: center;
          color: #ffffff;
          margin: 30px 0;
        }
        .footer {
          padding: 30px;
          background-color: #09090b;
          border-top: 1px solid #18181b;
          text-align: center;
          font-size: 10px;
          color: #52525b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .footer p {
          margin: 5px 0;
        }
        .metric-table {
          width: 100%;
          border-collapse: collapse;
          margin: 25px 0;
          font-size: 13px;
        }
        .metric-table th {
          border-bottom: 1px solid #27272a;
          color: #71717a;
          text-align: left;
          padding: 10px 8px;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .metric-table td {
          border-bottom: 1px solid #18181b;
          padding: 12px 8px;
          color: #e4e4e7;
        }
        .metric-table tr:last-child td {
          border-bottom: none;
        }
        .badge {
          background-color: #27272a;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .quote-box {
          border-left: 2px solid #ffffff;
          background-color: #09090b;
          padding: 15px 20px;
          margin: 25px 0;
          font-style: italic;
          color: #e4e4e7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">I</div>
          <h1 class="brand">InkFinance</h1>
          <p class="tagline">Sistema Monocromático de Control</p>
        </div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} InkFinance. Todos los derechos reservados.</p>
          <p>Esta es una notificación de seguridad del sistema.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const emailService = {
  async sendRecoveryCode(email, name, code) {
    const transporter = getTransporter();
    const subject = '🔐 Código de recuperación de contraseña - InkFinance';
    
    const html = getBaseHtml('Recuperación de Contraseña', `
      <h2>Recuperación de Acceso</h2>
      <p>Estimado/a <strong>${name}</strong>,</p>
      <p>Hemos recibido una solicitud para restablecer la contraseña de su cuenta asociada a este correo electrónico en la plataforma <strong>InkFinance</strong>.</p>
      <p>Utilice el siguiente código de autorización temporal para proceder con el cambio de clave. Este código tiene una validez exclusiva de 15 minutos:</p>
      
      <div class="code-box">${code}</div>
      
      <p>Si usted no ha iniciado esta solicitud, por favor ignore este mensaje y asegúrese de que su cuenta cuenta con credenciales seguras. No comparta este código con nadie.</p>
    `);

    const mailOptions = {
      from: process.env.SMTP_FROM || '"InkFinance" <no-reply@inkfinance.com>',
      to: email,
      subject,
      html
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Real Email Dispatched: Recovery code to ${email} (MessageID: ${info.messageId})`);
      return info;
    } catch (error) {
      console.error('❌ Error sending recovery email:', error);
      throw error;
    }
  },

  async sendSupervisorRecommendation(clientEmail, clientName, supervisorName, recommendationText) {
    const transporter = getTransporter();
    const subject = '📋 Nueva Recomendación de Auditoría Financiera - InkFinance';
    
    const html = getBaseHtml('Recomendación del Supervisor', `
      <h2>Recomendación de Auditoría</h2>
      <p>Estimado/a <strong>${clientName}</strong>,</p>
      <p>Su supervisor financiero autorizado, <strong>${supervisorName}</strong>, ha revisado el estado consolidado de sus cuentas y ha emitido la siguiente recomendación formal:</p>
      
      <div class="quote-box">
        "${recommendationText}"
      </div>
      
      <p>Le sugerimos revisar este consejo en su panel de control para ajustar sus gastos del mes en curso y no comprometer sus metas de ahorro activas.</p>
      
      <div class="btn-container">
        <a href="http://localhost:5173" class="btn" style="color: #000000;">Acceder a mi Dashboard</a>
      </div>
    `);

    const mailOptions = {
      from: process.env.SMTP_FROM || '"InkFinance" <no-reply@inkfinance.com>',
      to: clientEmail,
      subject,
      html
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Real Email Dispatched: Recommendation from ${supervisorName} to ${clientEmail} (MessageID: ${info.messageId})`);
      return info;
    } catch (error) {
      console.error('❌ Error sending recommendation email:', error);
      throw error;
    }
  },

  async sendFinancialReport(email, name, transactions, goals) {
    const transporter = getTransporter();
    const subject = '📊 Reporte Consolidado de Cuenta y Auditoría - InkFinance';

    // Calculate distributions
    let ingresos = 0;
    let necesidades = 0;
    let deseos = 0;
    let ahorro = 0;

    transactions.forEach(t => {
      const m = Number(t.monto) || 0;
      if (t.categoria === 'Ingreso') ingresos += m;
      else if (t.categoria === 'Necesidades') necesidades += m;
      else if (t.categoria === 'Deseos') deseos += m;
      else if (t.categoria === 'Ahorro') ahorro += m;
    });

    const gastosTotales = necesidades + deseos + ahorro;

    // Generate recent transaction list (up to 5)
    const recentTxRows = transactions.slice(0, 5).map(t => {
      return `
        <tr>
          <td>${t.descripcion}</td>
          <td><span class="badge">${t.categoria}</span></td>
          <td style="font-family: monospace; text-align: right;">$${Number(t.monto).toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    // Generate goals rows
    const goalRows = goals.map(g => {
      const pct = Math.min(100, Math.round((Number(g.monto_actual) / Number(g.monto_objetivo)) * 100)) || 0;
      return `
        <tr>
          <td><strong>${g.nombre_meta}</strong></td>
          <td>$${Number(g.monto_actual).toLocaleString()} / $${Number(g.monto_objetivo).toLocaleString()}</td>
          <td style="text-align: right; font-weight: bold;">${pct}%</td>
        </tr>
      `;
    }).join('');

    const html = getBaseHtml('Reporte Consolidado de Cuenta', `
      <h2>Reporte de Auditoría de Cuenta</h2>
      <p>Estimado/a <strong>${name}</strong>,</p>
      <p>A continuación se presenta el informe formal consolidado sobre su actividad financiera y el avance de sus objetivos presupuestarios correspondientes al período en curso:</p>
      
      <table class="metric-table">
        <thead>
          <tr>
            <th colspan="2" style="color: #ffffff; font-weight: bold;">Resumen General</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ingresos Extra del Período</td>
            <td style="font-family: monospace; text-align: right; font-weight: bold;">$${ingresos.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Gastos en Necesidades (50%)</td>
            <td style="font-family: monospace; text-align: right;">$${necesidades.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Gastos en Deseos (30%)</td>
            <td style="font-family: monospace; text-align: right;">$${deseos.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Ahorros Asignados (20%)</td>
            <td style="font-family: monospace; text-align: right;">$${ahorro.toLocaleString()}</td>
          </tr>
          <tr>
            <td><strong>Gastos Totales Registrados</strong></td>
            <td style="font-family: monospace; text-align: right; font-weight: bold; border-top: 1px solid #27272a;">$${gastosTotales.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      ${goals.length > 0 ? `
      <h3>Estado de Metas de Ahorro</h3>
      <table class="metric-table">
        <thead>
          <tr>
            <th style="color: #ffffff;">Meta</th>
            <th style="color: #ffffff;">Progreso de Fondos</th>
            <th style="text-align: right; color: #ffffff;">Avance</th>
          </tr>
        </thead>
        <tbody>
          ${goalRows}
        </tbody>
      </table>
      ` : ''}

      ${transactions.length > 0 ? `
      <h3>Últimas Transacciones Registradas</h3>
      <table class="metric-table">
        <thead>
          <tr>
            <th style="color: #ffffff;">Descripción</th>
            <th style="color: #ffffff;">Categoría</th>
            <th style="text-align: right; color: #ffffff;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${recentTxRows}
        </tbody>
      </table>
      ` : ''}

      <div class="btn-container">
        <a href="http://localhost:5173" class="btn" style="color: #000000;">Ir a mi Panel de Control</a>
      </div>
    `);

    const mailOptions = {
      from: process.env.SMTP_FROM || '"InkFinance" <no-reply@inkfinance.com>',
      to: email,
      subject,
      html
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Real Email Dispatched: Financial report to ${email} (MessageID: ${info.messageId})`);
      return info;
    } catch (error) {
      console.error('❌ Error sending report email:', error);
      throw error;
    }
  }
};
