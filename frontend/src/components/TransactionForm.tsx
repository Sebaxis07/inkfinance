import React, { useState } from 'react';

interface TransactionFormProps {
  usuarioId: string;
  onTransactionAdded: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ usuarioId, onTransactionAdded }) => {
  // Manual Ingestion States
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Necesidades'); // 'Ingreso' | 'Necesidades' | 'Deseos' | 'Ahorro'
  
  // AI NLP Ingestion States
  const [iaText, setIaText] = useState('');
  
  // UX State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!monto || !descripcion || !categoria) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('sf_token');
    try {
      const res = await fetch('http://localhost:5000/api/transacciones/manual', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: usuarioId,
          monto: Number(monto),
          descripcion,
          categoria
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Fallo al registrar la transacción');
      }

      setSuccess('REGISTRO MANUAL COMPLETADO.');
      setMonto('');
      setDescripcion('');
      onTransactionAdded();
    } catch (err: any) {
      setError(err.message || 'Error en conexion manual.');
    } finally {
      setLoading(false);
    }
  };

  const handleIaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!iaText.trim()) {
      setError('Escribe una sentencia para parsear.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('sf_token');
    try {
      const res = await fetch('http://localhost:5000/api/transacciones/ia', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: usuarioId,
          text: iaText
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'La IA no pudo parsear el texto.');
      }

      const createdTx = await res.json();
      setSuccess(`REGISTRADO IA: "${createdTx.descripcion}" por $${createdTx.monto} [${createdTx.categoria}]`);
      setIaText('');
      onTransactionAdded();
    } catch (err: any) {
      setError(err.message || 'Error en parseo IA.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time NLP parsing engine for the Preview Console
  const getParsedPreview = () => {
    if (!iaText.trim()) {
      return { monto: '---', categoria: '---', descripcion: '---' };
    }
    
    // Extract numbers (supporting periods and commas)
    const cleanNumbers = iaText.replace(/\./g, '').match(/\d+/);
    const parsedMonto = cleanNumbers ? Number(cleanNumbers[0]).toLocaleString() : '---';
    
    // Simple category heuristics
    let parsedCat = '---';
    const lowerText = iaText.toLowerCase();
    if (
      lowerText.includes('recibi') || 
      lowerText.includes('pago') || 
      lowerText.includes('sueldo') || 
      lowerText.includes('freelance') || 
      lowerText.includes('ingreso') ||
      lowerText.includes('gane')
    ) {
      parsedCat = 'INGRESO';
    } else if (
      lowerText.includes('lider') || 
      lowerText.includes('supermercado') || 
      lowerText.includes('arriendo') || 
      lowerText.includes('arrendamiento') || 
      lowerText.includes('luz') || 
      lowerText.includes('agua') || 
      lowerText.includes('gasto') || 
      lowerText.includes('gas') ||
      lowerText.includes('cochera')
    ) {
      parsedCat = 'NECESIDADES';
    } else if (
      lowerText.includes('cine') || 
      lowerText.includes('cerveza') || 
      lowerText.includes('regalo') || 
      lowerText.includes('ocio') || 
      lowerText.includes('viaje') ||
      lowerText.includes('restaurant') ||
      lowerText.includes('comida')
    ) {
      parsedCat = 'DESEOS';
    } else if (
      lowerText.includes('ahorr') || 
      lowerText.includes('guardar') || 
      lowerText.includes('meta') ||
      lowerText.includes('inversion')
    ) {
      parsedCat = 'AHORRO';
    }
    
    // Description extraction
    let parsedDesc = iaText
      .replace(/\d+/g, '')
      .replace(/[\$\.,]/g, '')
      .replace(/(gasté|gaste|recibí|recibi|pagué|pague|de|por|en|un|una|el|la|los|las|mis)/gi, '')
      .trim();
    if (parsedDesc.length > 30) {
      parsedDesc = parsedDesc.substring(0, 30) + '...';
    }
    
    return { 
      monto: parsedMonto !== '---' ? `$${parsedMonto}` : '---', 
      categoria: parsedCat, 
      descripcion: parsedDesc.toUpperCase() || '---' 
    };
  };

  const preview = getParsedPreview();

  const quickTemplates = [
    "Recibí 150000 por diseño de logo freelance",
    "Me pagaron 80000 por una clase particular",
    "Gasté 12000 en el Líder en mercadería",
    "Pagué 45000 de arriendo de la cochera"
  ];

  return (
    <div className="space-y-6">
      
      {/* Dynamic Status / Feedback messages */}
      {(error || success) && (
        <div className="grid grid-cols-1 gap-2">
          {error && (
            <div className="p-4 bg-black border border-zinc-850 text-zinc-300 rounded-xl text-xs font-mono uppercase tracking-wider">
              FALLO: {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-white text-black rounded-xl text-xs font-extrabold uppercase tracking-wider">
              CONFIRMACION: {success}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* PANEL 1: Manual Structured Ingestion */}
        <div className="mono-card p-6 flex flex-col justify-between border border-zinc-850 shadow-2xl">
          
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                CONSOLA DE INGESTION MANUAL
              </h4>
              <span className="text-[9px] text-zinc-550 font-mono uppercase">
                Campos estructurados e insercion directa
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-5">
              
              {/* Description */}
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  DESCRIPCION DEL MOVIMIENTO
                </label>
                <input
                  type="text"
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: COMPRA SUPERMERCADO"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors uppercase"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  MONTO NETO ($)
                </label>
                <input
                  type="number"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="Ej: 25000"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Category selector (Custom button row, no native select) */}
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5">
                  CLASE DE CATEGORIA
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Ingreso', 'Necesidades', 'Deseos', 'Ahorro'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoria(cat)}
                      className={`text-[9px] py-2.5 rounded-lg border transition-all font-bold uppercase tracking-wider cursor-pointer text-center ${
                        categoria === cat 
                          ? 'bg-white text-black border-white' 
                          : 'bg-black border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-3.5 px-4 rounded-xl transition-all uppercase tracking-wider text-xs cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-650"
                >
                  {loading ? 'REGISTRANDO...' : 'EJECUTAR REGISTRO MANUAL'}
                </button>
              </div>

            </form>
          </div>

        </div>

        {/* PANEL 2: AI Assistant NLP Ingestion */}
        <div className="mono-card p-6 flex flex-col justify-between border border-zinc-850 shadow-2xl">
          
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                PROCESADOR DE LENGUAJE NATURAL IA
              </h4>
              <span className="text-[9px] text-zinc-550 font-mono uppercase">
                Parseo automatico y extraccion de variables
              </span>
            </div>

            <form onSubmit={handleIaSubmit} className="space-y-4">
              
              {/* Text Input area */}
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  ESCRIBE SENTENCIA EN TEXTO LIBRE
                </label>
                <textarea
                  value={iaText}
                  onChange={(e) => setIaText(e.target.value)}
                  placeholder="Ej: Gaste 12000 en el Lider en comida o Recibi 250000 de sueldo freelance"
                  className="w-full h-24 bg-black border border-zinc-800 rounded-xl p-4 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors resize-none"
                />
              </div>

              {/* Suggestions Grid */}
              <div>
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  PLANTILLAS CONTEXTUALES
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setIaText(template)}
                      className="text-left text-[9px] bg-black hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white px-3 py-2 rounded-lg transition-all font-mono leading-tight"
                    >
                      "{template}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Parser preview box */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-2.5">
                <span className="block text-[8px] font-bold text-zinc-550 uppercase tracking-widest font-mono">
                  CONSOLA DE DETECCION EN TIEMPO REAL
                </span>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono border-t border-zinc-900/40 pt-2 text-zinc-400">
                  <div>
                    <span className="block text-[7px] text-zinc-550 uppercase font-mono">MONTO EST.</span>
                    <span className="text-white font-bold">{preview.monto}</span>
                  </div>
                  <div>
                    <span className="block text-[7px] text-zinc-550 uppercase font-mono">CATEGORIA EST.</span>
                    <span className="text-white font-bold">{preview.categoria}</span>
                  </div>
                  <div>
                    <span className="block text-[7px] text-zinc-550 uppercase font-mono">DETALLE EST.</span>
                    <span className="text-white font-bold block truncate">{preview.descripcion}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !iaText.trim()}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-3.5 px-4 rounded-xl transition-all uppercase tracking-wider text-xs cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-650"
                >
                  {loading ? 'PROCESANDO IA...' : 'PARSEAR Y CONFIRMAR REGISTRO IA'}
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
