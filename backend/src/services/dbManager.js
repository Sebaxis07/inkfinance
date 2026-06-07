import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMongoStatus } from '../config/db.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Goal } from '../models/Goal.js';
import { Alert } from '../models/Alert.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data', 'db_fallback');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  transactions: path.join(DATA_DIR, 'transactions.json'),
  goals: path.join(DATA_DIR, 'goals.json'),
  alerts: path.join(DATA_DIR, 'alerts.json')
};

// Seed Data
const SEED_USER_ID = '60c72b2f9b1d8a23d4f8e001';
const SEED_DATA = {
  users: [
    {
      _id: SEED_USER_ID,
      nombre: 'Sebastián',
      email: 'sebastian@example.com',
      ingreso_neto_mensual: 280000,
      createdAt: new Date().toISOString()
    }
  ],
  transactions: [
    {
      _id: '60c72b2f9b1d8a23d4f8e010',
      usuario_id: SEED_USER_ID,
      monto: 120000,
      descripcion: 'Arriendo departamento y cuentas básicas',
      categoria: 'Necesidades',
      fecha: new Date(new Date().setDate(5)).toISOString(), // 5th of current month
      metodo_registro: 'Manual'
    },
    {
      _id: '60c72b2f9b1d8a23d4f8e011',
      usuario_id: SEED_USER_ID,
      monto: 45000,
      descripcion: 'Cena sushi y salidas fin de semana',
      categoria: 'Deseos',
      fecha: new Date(new Date().setDate(10)).toISOString(),
      metodo_registro: 'IA_Text'
    },
    {
      _id: '60c72b2f9b1d8a23d4f8e012',
      usuario_id: SEED_USER_ID,
      monto: 108000,
      descripcion: 'Depósito a fondo mutuo de ahorro',
      categoria: 'Ahorro',
      fecha: new Date(new Date().setDate(1)).toISOString(),
      metodo_registro: 'Manual'
    }
  ],
  goals: [
    {
      _id: '60c72b2f9b1d8a23d4f8e020',
      usuario_id: SEED_USER_ID,
      nombre_meta: 'Pasaje a Canadá',
      monto_objetivo: 650000,
      monto_actual: 200000,
      fecha_limite: new Date(new Date().getFullYear(), 11, 31).toISOString(), // Dec 31st
      cuota_mensual_sugerida: 50000
    }
  ],
  alerts: []
};

// Initialize file database
function initFileDB() {
  for (const [key, filePath] of Object.entries(FILES)) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
  }
}
initFileDB();

// Read JSON file helper
function readJson(file) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Write JSON file helper
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Seeder for Mongo
export async function seedMongoIfEmpty() {
  // Disabled for real-world usage
}

function makeSaveableUser(user, filePath) {
  if (!user) return null;
  if (typeof user.save === 'function') return user;
  
  Object.defineProperty(user, 'save', {
    value: async function() {
      const users = readJson(filePath);
      const idx = users.findIndex(u => u._id === this._id || (u._id && this._id && u._id.toString() === this._id.toString()));
      if (idx !== -1) {
        const copy = { ...this };
        delete copy.save;
        users[idx] = copy;
        writeJson(filePath, users);
      }
      return this;
    },
    enumerable: false,
    writable: true,
    configurable: true
  });
  return user;
}

export const dbManager = {
  // Users
  async getUsers() {
    if (getMongoStatus()) {
      return await User.find();
    }
    const users = readJson(FILES.users);
    return users.map(u => makeSaveableUser(u, FILES.users));
  },

  async getUserById(id) {
    if (getMongoStatus()) {
      return await User.findById(id);
    }
    const users = readJson(FILES.users);
    const found = users.find(u => u._id === id || u._id.toString() === id.toString()) || users[0]; // fallback to first user
    return makeSaveableUser(found, FILES.users);
  },

  async getUserByEmail(email) {
    if (getMongoStatus()) {
      return await User.findOne({ email: email.toLowerCase() });
    }
    const users = readJson(FILES.users);
    const found = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()) || null;
    return makeSaveableUser(found, FILES.users);
  },

  async createUser(userData) {
    if (getMongoStatus()) {
      const newUser = new User(userData);
      return await newUser.save();
    }
    const users = readJson(FILES.users);
    const newUser = {
      _id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...userData
    };
    users.push(newUser);
    writeJson(FILES.users, users);
    return makeSaveableUser(newUser, FILES.users);
  },

  // Transactions
  async getTransactions(query = {}) {
    if (getMongoStatus()) {
      return await Transaction.find(query).sort({ fecha: -1 });
    }
    let transactions = readJson(FILES.transactions);
    if (query.usuario_id) {
      transactions = transactions.filter(t => t.usuario_id === query.usuario_id);
    }
    // Sort descending by date
    return transactions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  async createTransaction(transactionData) {
    if (getMongoStatus()) {
      const newTx = new Transaction(transactionData);
      return await newTx.save();
    }
    const transactions = readJson(FILES.transactions);
    const newTx = {
      _id: Date.now().toString(),
      fecha: new Date().toISOString(),
      metodo_registro: 'Manual',
      ...transactionData
    };
    transactions.push(newTx);
    writeJson(FILES.transactions, transactions);
    return newTx;
  },

  // Goals
  async getGoals(query = {}) {
    if (getMongoStatus()) {
      return await Goal.find(query);
    }
    let goals = readJson(FILES.goals);
    if (query.usuario_id) {
      goals = goals.filter(g => g.usuario_id === query.usuario_id);
    }
    return goals;
  },

  async createGoal(goalData) {
    if (getMongoStatus()) {
      const newGoal = new Goal(goalData);
      return await newGoal.save();
    }
    const goals = readJson(FILES.goals);
    const newGoal = {
      _id: Date.now().toString(),
      monto_actual: 0,
      ...goalData
    };
    goals.push(newGoal);
    writeJson(FILES.goals, goals);
    return newGoal;
  },

  async updateGoal(id, updateData) {
    if (getMongoStatus()) {
      return await Goal.findByIdAndUpdate(id, updateData, { new: true });
    }
    const goals = readJson(FILES.goals);
    const index = goals.findIndex(g => g._id === id || g._id.toString() === id.toString());
    if (index !== -1) {
      goals[index] = { ...goals[index], ...updateData };
      writeJson(FILES.goals, goals);
      return goals[index];
    }
    return null;
  },

  // Alerts
  async getAlerts(query = {}) {
    if (getMongoStatus()) {
      return await Alert.find(query).sort({ fecha: -1 });
    }
    let alerts = readJson(FILES.alerts);
    if (query.usuario_id) {
      alerts = alerts.filter(a => a.usuario_id === query.usuario_id);
    }
    return alerts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  async createAlert(alertData) {
    if (getMongoStatus()) {
      const newAlert = new Alert(alertData);
      return await newAlert.save();
    }
    const alerts = readJson(FILES.alerts);
    const newAlert = {
      _id: Date.now().toString(),
      fecha: new Date().toISOString(),
      leida: false,
      ...alertData
    };
    alerts.push(newAlert);
    writeJson(FILES.alerts, alerts);
    return newAlert;
  },

  async clearAlerts(query = {}) {
    if (getMongoStatus()) {
      return await Alert.deleteMany(query);
    }
    let alerts = readJson(FILES.alerts);
    if (query.usuario_id) {
      alerts = alerts.filter(a => a.usuario_id !== query.usuario_id);
    } else {
      alerts = [];
    }
    writeJson(FILES.alerts, alerts);
    return { deletedCount: alerts.length };
  },

  async clearAllData() {
    if (getMongoStatus()) {
      await User.deleteMany({});
      await Transaction.deleteMany({});
      await Goal.deleteMany({});
      await Alert.deleteMany({});
    }
    for (const filePath of Object.values(FILES)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
    return { success: true };
  },

  async getUsersBySupervisor(supervisorEmail) {
    if (getMongoStatus()) {
      return await User.find({ supervisores_autorizados: supervisorEmail.toLowerCase() });
    }
    const users = readJson(FILES.users);
    const filtered = users.filter(u => u.supervisores_autorizados && u.supervisores_autorizados.map(e => e.toLowerCase()).includes(supervisorEmail.toLowerCase()));
    return filtered.map(u => makeSaveableUser(u, FILES.users));
  }
};
export { SEED_USER_ID };
