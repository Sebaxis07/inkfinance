# InkFinance - Sistema Monocromático de Gestión Financiera Personal con IA

InkFinance es una plataforma inteligente y minimalista diseñada en un estilo monocromático para la administración, control y auditoría de finanzas personales. Utiliza algoritmos de Inteligencia Artificial para el procesamiento de transacciones con lenguaje natural y un chatbot de asesoría financiera, además de contar con un módulo especializado para la supervisión y auditoría de terceros.

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

1. **frontend/**: Aplicación del cliente desarrollada con React, TypeScript y Vite. La interfaz de usuario está estilizada con Tailwind CSS en una paleta monocromática oscura (escala de grises, negro y blanco).
2. **backend/**: API REST construida con Node.js, Express y Mongoose. Dispone de un sistema de persistencia híbrido que utiliza MongoDB como base de datos primaria y archivos JSON locales como respaldo automático.

---

## Funcionalidades y Casos de Uso

### Rol: Cliente Principal (Requester)
* **Ingreso Inteligente con IA (NLP)**: Registro de gastos e ingresos escribiendo texto libre (ejemplo: "Gaste 15000 en el supermercado"). Un parser en el backend extrae el monto, el concepto y asigna la categoría correspondiente.
* **Control de Presupuesto 50/30/20**: Visualización y límites automáticos calculados en tiempo real para las categorías de Necesidades (50%), Deseos (30%) y Ahorro (20%).
* **Metas de Ahorro**: Creación de objetivos con cálculo automático de la cuota mensual sugerida en función del plazo límite establecido.
* **Asesor Virtual IA**: Consola de chat interactiva donde una Inteligencia Artificial analiza el contexto financiero actual del usuario y responde preguntas o sugiere planes de ahorro.
* **Seguridad y Privacidad**: Modificación de claves de acceso, recuperación de cuenta con código de verificación enviado por correo y autorización/revocación de supervisores.

### Rol: Supervisor (Auditor)
* **Consola de Auditoría**: Listado de todos los clientes vinculados que han otorgado permisos de supervisión.
* **Inspección de Cuentas**: Visualización en tiempo real de balances, histórico de transacciones, cumplimiento de metas de ahorro y distribución presupuestaria 50/30/20 del cliente.
* **Gatillo de Escaneo de Alertas**: Ejecución forzada de auditorías automáticas de riesgo financiero que analizan posibles desvíos.
* **Recomendaciones Directas**: Envío de notas y sugerencias formales redactadas por el supervisor directamente a la bandeja de correo del cliente.

---

## Configuración y Requisitos

### Requisitos Previos
* Node.js (versión 18 o superior)
* npm (administrador de paquetes)
* Cuenta de MongoDB Atlas (opcional, el sistema puede operar de manera local con archivos JSON)

### Configuración del Backend

1. Ingrese a la carpeta del servidor:
   ```bash
   cd backend
   ```

2. Instale las dependencias necesarias:
   ```bash
   npm install
   ```

3. Cree y configure el archivo `.env` en la raíz de la carpeta `backend` con las siguientes variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://loiryoxd_db_user:5fCOA9TG4pzfV6HK@inkdb.prnwk92.mongodb.net/inkfinance?retryWrites=true&w=majority
   OPENROUTER_API_KEY=su_api_key_de_openrouter
   OPENROUTER_MODEL=google/gemini-2.5-flash

   # Configuración para el Envío Real de Correos (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=su_correo@gmail.com
   SMTP_PASS=su_contrasena_de_aplicacion
   SMTP_FROM="InkFinance" <su_correo@gmail.com>
   ```

4. Inicie el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Configuración del Frontend

1. Ingrese a la carpeta de la interfaz:
   ```bash
   cd ../frontend
   ```

2. Instale las dependencias necesarias:
   ```bash
   npm install
   ```

3. Inicie el servidor de desarrollo del cliente:
   ```bash
   npm run dev
   ```

4. Abra la dirección local provista (usualmente `http://localhost:5173`) en su navegador para interactuar con la aplicación.

---

## Detalle del Diseño e Iconografía
* **Favicon**: Para usar un icono personalizado, coloque su archivo `icon.png` en la ruta `frontend/public/icon/icon.png`.
* **Tema Visual**: La interfaz utiliza una gama visual inspirada en "Stark Monochrome" con fondos oscuros, bordes definidos de color zinc y tipografía estilizada tipo consola/dashboard de grado técnico.
