import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Users, Coins } from 'lucide-react';

interface User {
  _id: string;
  nombre: string;
  email: string;
  ingreso_neto_mensual: number;
}

interface MockUserSelectorProps {
  currentUserId: string;
  onUserSelected: (id: string) => void;
  refreshTrigger: number;
}

export const MockUserSelector: React.FC<MockUserSelectorProps> = ({
  currentUserId,
  onUserSelected,
  refreshTrigger
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // New user form state
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [ingreso, setIngreso] = useState('280000');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email || !ingreso) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('http://localhost:5000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          ingreso_neto_mensual: Number(ingreso)
        })
      });

      if (!res.ok) {
        throw new Error('No se pudo guardar el nuevo perfil.');
      }

      const createdUser = await res.json();
      setNombre('');
      setEmail('');
      setIngreso('280000');
      setShowForm(false);
      
      onUserSelected(createdUser._id);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error al conectar.');
    } finally {
      setLoading(false);
    }
  };

  const currentUser = users.find(u => u._id === currentUserId);

  return (
    <div className="mono-card p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
          <UserCog className="h-4 w-4" />
          Perfiles
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] text-zinc-400 hover:text-white font-semibold flex items-center gap-1 transition-colors bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800"
        >
          <Plus className="h-3 w-3" /> Nuevo
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleAddUser} className="space-y-3 p-3 bg-black rounded-xl border border-zinc-850">
          {error && <p className="text-[10px] text-zinc-500 font-bold uppercase">{error}</p>}
          
          <div>
            <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nombre</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Sebastián"
              className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sebastian@correo.com"
              className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Ingreso Mensual ($)</label>
            <input
              type="number"
              required
              value={ingreso}
              onChange={(e) => setIngreso(e.target.value)}
              placeholder="280000"
              className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#f4f4f5] hover:bg-white text-black font-bold py-1.5 px-3 rounded text-[10px] uppercase cursor-pointer"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-bold py-1.5 px-3 rounded text-[10px] uppercase cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {currentUser && (
            <div className="p-3 bg-black border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-zinc-500" />
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">{currentUser.nombre}</h4>
                  <p className="text-[9px] text-zinc-500 font-mono mt-1">{currentUser.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-white block font-mono">
                  ${currentUser.ingreso_neto_mensual.toLocaleString()}
                </span>
                <span className="text-[8px] text-zinc-500 block uppercase font-bold tracking-widest">Ingreso</span>
              </div>
            </div>
          )}

          {/* User selection list */}
          <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 pt-2 border-t border-zinc-900">
            <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Users className="h-3 w-3" /> Seleccionar Perfil
            </span>
            {users.map(u => (
              <button
                key={u._id}
                onClick={() => onUserSelected(u._id)}
                className={`w-full p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between border ${
                  u._id === currentUserId
                    ? 'bg-[#f4f4f5] text-black font-bold border-white'
                    : 'bg-black/20 border-transparent hover:border-zinc-800 hover:bg-zinc-900/30 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>{u.nombre}</span>
                <span className="font-mono text-[10px] text-zinc-500">
                  ${u.ingreso_neto_mensual.toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          {/* Reset Database Action */}
          <div className="pt-4 border-t border-zinc-900 mt-2">
            <button
              onClick={async () => {
                if (!window.confirm('¿Estás seguro de que quieres borrar todos los perfiles, ingresos, gastos y metas? Esta acción no se puede deshacer.')) {
                  return;
                }
                try {
                  const res = await fetch('http://localhost:5000/api/admin/clear', { method: 'POST' });
                  if (res.ok) {
                    alert('Base de datos reiniciada con éxito.');
                    window.location.reload();
                  } else {
                    alert('Error al reiniciar la base de datos.');
                  }
                } catch (err) {
                  console.error('Failed to reset DB:', err);
                  alert('Error al conectar con el servidor.');
                }
              }}
              className="w-full bg-black hover:bg-zinc-900 border border-red-950 hover:border-red-900 text-red-500 hover:text-red-400 font-bold py-2 rounded-xl text-[9px] uppercase tracking-widest transition-colors cursor-pointer"
            >
              Reiniciar Todo (Borrar Simulación)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
