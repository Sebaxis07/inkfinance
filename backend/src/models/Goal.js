import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema({
  usuario_id: { type: String, required: true },
  nombre_meta: { type: String, required: true },
  monto_objetivo: { type: Number, required: true },
  monto_actual: { type: Number, required: true, default: 0 },
  fecha_limite: { type: Date, required: true },
  cuota_mensual_sugerida: { type: Number, default: 0 },
  categoria: { type: String, default: 'General' },
  prioridad: { type: String, default: 'Media' }
}, {
  bufferCommands: false
});

export const Goal = mongoose.model('Goal', GoalSchema);
