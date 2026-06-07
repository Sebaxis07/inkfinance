import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

interface ChatAdvisorProps {
  usuarioId: string;
  refreshTrigger: number;
}

export const ChatAdvisor: React.FC<ChatAdvisorProps> = ({ usuarioId, refreshTrigger }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hola. Soy tu consultor financiero automatizado. He analizado tu balance, transacciones recientes y metas de ahorro. ¿En qué puedo asistirte hoy?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Settings
  const [aiTone, setAiTone] = useState<number>(80); // 20 (Conservative), 80 (Bold)
  const [aiFocus, setAiFocus] = useState<string>('balanceado'); // 'ahorro' | 'inversion' | 'balanceado'
  const [activeInsight, setActiveInsight] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      const systemAlert: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: 'assistant',
        text: 'SISTEMA: Datos financieros actualizados en tiempo real. Se ha recargado el contexto del análisis.'
      };
      setMessages(prev => [...prev, systemAlert]);
    }
  }, [refreshTrigger]);

  const handleSend = async (textToSend: string) => {
    const userMessageText = textToSend.trim();
    if (!userMessageText) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMessageText
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const token = localStorage.getItem('sf_token');
    try {
      const toneLabel = aiTone <= 30 ? 'Conservador' : 'Audaz';
      const enrichedMessage = `[Modo: ${toneLabel}, Enfoque: ${aiFocus}] ${userMessageText}`;

      const response = await fetch('http://localhost:5000/api/ia/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: usuarioId,
          message: enrichedMessage,
          chatHistory: messages
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor.');
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.response
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'ERROR: No se pudo obtener respuesta del asesor. Intente nuevamente.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: 'Historial de diagnóstico reiniciado. ¿Qué deseas analizar a continuación?'
      }
    ]);
    setActiveInsight(null);
  };

  const generateReport = () => {
    setLoading(true);
    setTimeout(() => {
      const reportText = `=== AUDITORIA DE CUENTA IA ===
Generado: ${new Date().toLocaleString()}
Configuracion: Tono ${aiTone <= 30 ? 'CONSERVADOR' : 'AUDAZ'}, Enfoque: ${aiFocus.toUpperCase()}

Analisis de Contexto:
1. Distribucion de Gastos: Desviacion del 8% en Necesidades.
2. Salud del Ahorro: Avance general positivo.
3. Recomendacion: Incrementar aportes en Fondo de Emergencia.
=============================`;

      setMessages(prev => [
        ...prev,
        {
          id: `report-${Date.now()}`,
          sender: 'assistant',
          text: reportText
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const staticInsights = [
    {
      id: 'ins-1',
      title: 'DESVIACION EN ALIMENTACION',
      desc: 'Gastos de supermercado superan el promedio movil en $14.200.',
      type: 'warning'
    },
    {
      id: 'ins-2',
      title: 'PROYECCION DE META DE AHORRO',
      desc: 'El plan Laptop alcanzara su objetivo 12 dias antes de lo previsto.',
      type: 'success'
    },
    {
      id: 'ins-3',
      title: 'OPTIMIZACION DE SUSCRIPCIONES',
      desc: 'Se detectan 2 pagos recurrentes similares. Considerar consolidar.',
      type: 'info'
    }
  ];

  return (
    <div className="mono-card shadow-2xl flex flex-col min-h-[620px] overflow-hidden border border-zinc-850">
      
      {/* 1. Horizontal Dashboard / Configuration Bar (Consolidated, No icons/emojis) */}
      <div className="bg-black/80 border-b border-zinc-900 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-white text-xs tracking-wider uppercase">
            SISTEMA DE ASESORIA CONVERSACIONAL IA
          </h3>
          <div className="flex flex-wrap gap-4 text-[9px] font-mono text-zinc-550 uppercase tracking-widest">
            <span>MOTOR: DEEPSEEK-MONO-v4</span>
            <span>LATENCIA: 120MS</span>
            <span className="text-white font-bold">STATUS: ONLINE</span>
          </div>
        </div>
        
        {/* Horizontal Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Tone Selector */}
          <div className="flex items-center gap-1 border border-zinc-850 px-2 py-1.5 rounded bg-black">
            <span className="text-[8px] text-zinc-500 font-mono uppercase mr-1">TONO:</span>
            <button 
              onClick={() => setAiTone(20)} 
              className={`text-[8px] px-2 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                aiTone <= 30 ? 'bg-white text-black font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              CONSERVADOR
            </button>
            <button 
              onClick={() => setAiTone(80)} 
              className={`text-[8px] px-2 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                aiTone > 30 ? 'bg-white text-black font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              AUDAZ
            </button>
          </div>

          {/* Focus Selector */}
          <div className="flex items-center gap-1 border border-zinc-850 px-2 py-1.5 rounded bg-black">
            <span className="text-[8px] text-zinc-500 font-mono uppercase mr-1">ENFOQUE:</span>
            {['ahorro', 'inversion', 'balanceado'].map((focus) => (
              <button
                key={focus}
                onClick={() => setAiFocus(focus)}
                className={`text-[8px] px-2 py-0.5 rounded font-mono uppercase cursor-pointer transition-colors ${
                  aiFocus === focus ? 'bg-white text-black font-extrabold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {focus}
              </button>
            ))}
          </div>

          {/* Quick PDF Report */}
          <button
            onClick={generateReport}
            className="text-[9px] bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-white font-bold px-3 py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer"
          >
            AUDITORIA GENERAL
          </button>
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[380px] bg-black/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] space-y-1.5 ${
              msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
              {msg.sender === 'user' ? '[USUARIO]' : '[ASESOR IA]'}
            </span>
            
            <div
              className={`rounded-xl px-4 py-3 text-xs md:text-sm whitespace-pre-line leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-white text-black font-bold rounded-tr-none'
                  : msg.text.startsWith('===')
                  ? 'bg-zinc-950 border border-zinc-850 text-zinc-300 font-mono rounded-tl-none p-4 shadow-inner w-full'
                  : 'bg-black border border-zinc-850 text-zinc-350 rounded-tl-none shadow'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start space-y-1.5 mr-auto max-w-[85%]">
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
              [ASESOR IA]
            </span>
            <div className="rounded-xl rounded-tl-none px-4 py-3 bg-black border border-zinc-850 text-zinc-500 font-mono text-xs tracking-wider">
              ANALIZANDO HISTORIAL Y GENERANDO RESPUESTA...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Account Insights (Clickable grid row, No icons/emojis) */}
      <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-900/80">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
            INSIGHTS DE AUDITORIA DE CUENTA (CLIC PARA ANALIZAR)
          </span>
          <button 
            onClick={clearChat}
            className="text-[8px] text-zinc-500 hover:text-white uppercase font-mono tracking-widest underline cursor-pointer"
          >
            REINICIAR DIALOGO
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {staticInsights.map((ins) => (
            <div
              key={ins.id}
              onClick={() => {
                setActiveInsight(ins.id);
                handleSend(`Analizar insight: ${ins.title} - ${ins.desc}`);
              }}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.01] ${
                activeInsight === ins.id
                  ? 'border-white bg-zinc-900'
                  : 'border-zinc-850 bg-black hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-center text-[9px] font-extrabold font-mono tracking-wider text-white">
                <span>{ins.title}</span>
                <span className="text-[7px] text-zinc-550">[{ins.type.toUpperCase()}]</span>
              </div>
              <p className="text-[10px] text-zinc-450 mt-1.5 leading-normal">
                {ins.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Chat Input Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        className="p-4 bg-black/80 border-t border-zinc-900 flex gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu consulta sobre tu cuenta (ej. analisis de gastos, planificacion de metas)..."
          className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-white hover:bg-zinc-200 text-black px-6 py-3.5 rounded-xl font-extrabold uppercase tracking-wider text-xs transition-colors cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed"
        >
          ENVIAR
        </button>
      </form>

    </div>
  );
};
