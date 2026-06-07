import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['requester', 'supervisor'], default: 'requester' },
  supervisorEmail: { type: String, default: '' },
  supervisores_autorizados: { type: [String], default: [] },
  recoveryCode: { type: String, default: '' },
  recoveryExpires: { type: Date },
  ingreso_neto_mensual: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, {
  bufferCommands: false
});

export const User = mongoose.model('User', UserSchema);
