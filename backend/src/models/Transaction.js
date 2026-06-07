import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  usuario_id: { type: String, required: true },
  monto: { type: Number, required: true },
  descripcion: { type: String, required: true },
  categoria: { type: String, enum: ['Necesidades', 'Deseos', 'Ahorro', 'Ingreso'], required: true },
  fecha: { type: Date, default: Date.now },
  metodo_registro: { type: String, enum: ['Manual', 'IA_Text'], default: 'Manual' }
}, {
  bufferCommands: false
});

export const Transaction = mongoose.model('Transaction', TransactionSchema);
