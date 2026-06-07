import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  usuario_id: { type: String, required: true },
  mensaje: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  tipo: { type: String, default: 'advertencia' },
  leida: { type: Boolean, default: false },
  desviacion: { type: Number },
  categoria: { type: String }
}, {
  bufferCommands: false
});

export const Alert = mongoose.model('Alert', AlertSchema);
