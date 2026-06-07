import crypto from 'crypto';

const ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';
const SECRET_KEY = process.env.JWT_SECRET || 'antigravity-super-secret-key-123456';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedValue) {
  if (!storedValue || !storedValue.includes(':')) return false;
  const [salt, hash] = storedValue.split(':');
  const checkHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return hash === checkHash;
}

export function generateToken(user) {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    rol: user.rol,
    nombre: user.nombre
  };
  const strPayload = JSON.stringify(payload);
  
  // Create simple signature using Hmac
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(strPayload);
  const signature = hmac.digest('hex');
  
  // Token format: base64(payload).signature
  const token = Buffer.from(strPayload).toString('base64') + '.' + signature;
  return token;
}

export function verifyToken(token) {
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;
    
    const strPayload = Buffer.from(base64Payload, 'base64').toString('utf8');
    
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(strPayload);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(strPayload);
  } catch (err) {
    return null;
  }
}
