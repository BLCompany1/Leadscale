"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Cell,
  LabelList 
} from 'recharts';

interface MetaData {
  gasto: any;
  leads: any;
  data_inicio: string;
  CLIENTE: string;
  Gestor: string;
  "meta cpl"?: number;
}

export default function Dashboard() {
  const [data, setData] = useState<MetaData[]>([]);
  const [gestorAtivo, setGestorAtivo] = useState('Todos');
  const [periodoRapido, setPeriodoRapido] = useState('7');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    async function fetchData() {
      const { data: metaData } = await supabase
        .from('meta_ads')
        .select('*')
        .order('data_inicio', { ascending: false })
        .limit(3000);
      if (metaData) setData(metaData as MetaData[]);
    }
    fetchData();
  }, []);

  const opcoesGestores = useMemo(() => {
    const gestores = data.map(i => i.Gestor?.trim()).filter(Boolean);
    return [...new Set(gestores)].sort();
  }, [data]);

  const dadosFiltrados = useMemo(() => {
    const hojeObj = new Date();
    const toStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return data.filter(item => {
      const dataItem = item.data_inicio;
      let atendeData = false;

      if (dataInicio || dataFim) {
        atendeData = (!dataInicio || dataItem >= dataInicio) && (!dataFim || dataItem <= dataFim);
      } else {
        const dias = parseInt(periodoRapido);
        const limite = new Date();
        limite.setDate(hojeObj.getDate() - dias);
        const ontem = new Date();
        ontem.setDate(hojeObj.getDate() - 1); 
        atendeData = dataItem >= toStr(limite) && dataItem <= toStr(ontem);
      }
      return (gestorAtivo === 'Todos' || item.Gestor?.trim() === gestorAtivo) && atendeData;
    });
  }, [data, gestorAtivo, dataInicio, dataFim, periodoRapido]);

  const todosClientes = useMemo(() => {
    const nomesUnicos = [...new Set(dadosFiltrados.map(i => i.CLIENTE?.trim()))].filter(Boolean);

    return nomesUnicos.map(nome => {
      const registros = dadosFiltrados.filter(d => d.CLIENTE?.trim() === nome);
      const metaCpl = data.find(d => d.CLIENTE?.trim() === nome)?.["meta cpl"] || 0;
      const gasto = registros.reduce((acc, curr) => acc + Number(curr.gasto || 0), 0);
      const leads = registros.reduce((acc, curr) => acc + Number(curr.leads || 0), 0);
      const cpl = leads > 0 ? gasto / leads : (gasto > 0 ? gasto : 0);
      return { 
        nome, 
        gasto: parseFloat(gasto.toFixed(2)), 
        leads, 
        cpl: parseFloat(cpl.toFixed(2)), 
        meta: metaCpl, 
        estourouMeta: metaCpl > 0 && cpl > metaCpl 
      };
    }).sort((a, b) => {
      if (a.estourouMeta && !b.estourouMeta) return -1;
      if (!a.estourouMeta && b.estourouMeta) return 1;
      return b.gasto - a.gasto;
    });
  }, [data, dadosFiltrados]);

  const clientesGrafico = useMemo(() => {
    if (gestorAtivo === 'Todos') {
      return todosClientes.filter(c => c.estourouMeta);
    }
    return todosClientes;
  }, [todosClientes, gestorAtivo]);

  const totalGasto = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.gasto || 0), 0);
  const totalLeads = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.leads || 0), 0);
  const totalSOS = todosClientes.filter(c => c.estourouMeta).length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ 
          backgroundColor: '#0a051a', 
          border: '1px solid #4b2a85', 
          borderRadius: '20px',
          padding: '12px 16px'
        }}>
          <p style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
            {data.nome}
          </p>
          <p style={{ color: '#ffffff', fontSize: '11px', marginBottom: '4px' }}>
            Leads: <span style={{ fontWeight: 'bold' }}>{data.leads}</span>
          </p>
          <p style={{ color: '#ffffff', fontSize: '11px', marginBottom: '4px' }}>
            CPL: <span style={{ fontWeight: 'bold' }}>R$ {data.cpl}</span>
          </p>
          <p style={{ color: '#ffffff', fontSize: '11px' }}>
            Investimento: <span style={{ fontWeight: 'bold' }}>R$ {data.gasto}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen p-6 md:p-12 bg-[#0a051a] text-purple-50 relative overflow-hidden font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b2a85; border-radius: 10px; }
      `}</style>

      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.08] flex items-center justify-center">
        <img src="/logo-empresa.png" alt="" className="w-[50%] max-w-[600px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col gap-8 mb-12 border-b border-purple-900/40 pb-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <img src="/logo-empresa.png" alt="Logo" className="h-12 w-auto" />
            <select 
              className="appearance-none bg-purple-900/40 backdrop-blur-md text-white font-bold py-2 px-8 rounded-full border border-purple-700/50 text-[10px] uppercase outline-none cursor-pointer hover:bg-purple-800 transition-all min-w-[200px]" 
              value={gestorAtivo} 
              onChange={(e) => setGestorAtivo(e.target.value)}
            >
              <option value="Todos">Visão Geral (Apenas S.O.S)</option>
              {opcoesGestores.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex bg-purple-900/30 p-1 rounded-full border border-purple-700/50">
              {['1', '7', '14'].map((d) => (
                <button 
                  key={d} 
                  onClick={() => { setPeriodoRapido(d); setDataInicio(''); setDataFim(''); }} 
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${periodoRapido === d && !dataInicio && !dataFim ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400 hover:text-purple-200'}`}
                >
                  {d}D
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-4 bg-purple-900/20 px-6 py-2 rounded-full border border-purple-700/30">
               <input 
                 type="date" 
                 value={dataInicio} 
                 onChange={(e) => { setDataInicio(e.target.value); setPeriodoRapido(''); }} 
                 className="bg-transparent text-white text-[10px] font-bold outline-none uppercase cursor-pointer" 
               />
               <div className="h-4 w-[1px] bg-purple-700/30"></div>
               <input 
                 type="date" 
                 value={dataFim} 
                 onChange={(e) => { setDataFim(e.target.value); setPeriodoRapido(''); }} 
                 className="bg-transparent text-white text-[10px] font-bold outline-none uppercase cursor-pointer" 
               />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-purple-900/10 backdrop-blur-xl p-6 rounded-[2rem] border border-purple-500/20 text-center">
                <p className="text-purple-400 text-[9px] font-black uppercase mb-2 tracking-widest">Investimento</p>
                <p className="text-3xl font-bold italic text-white">R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-purple-900/10 backdrop-blur-xl p-6 rounded-[2rem] border border-purple-500/20 text-center">
                <p className="text-purple-400 text-[9px] font-black uppercase mb-2 tracking-widest">Leads Gerados</p>
                <p className="text-4xl font-bold italic text-white">{totalLeads}</p>
              </div>
              <div className={`p-6 rounded-[2rem] border backdrop-blur-xl text-center ${totalSOS > 0 ? 'bg-red-900/20 border-red-500/40' : 'bg-purple-900/10 border-purple-500/20'}`}>
                <p className="text-red-400 text-[9px] font-black uppercase mb-2 tracking-widest">Clientes S.O.S</p>
                <p className="text-4xl font-bold italic text-red-500">{totalSOS}</p>
              </div>
            </div>

            <div className="bg-purple-900/5 backdrop-blur-md p-8 rounded-[3rem] border border-purple-500/10 h-[500px]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-6 flex items-center gap-2">
                {gestorAtivo === 'Todos' ? '🔴 Foco Crítico: Clientes que Estouraram o CPL' : `📊 Performance: ${gestorAtivo}`}
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={clientesGrafico} margin={{ bottom: 100, top: 20, left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1433" />
                  <XAxis 
                    dataKey="nome" 
                    stroke="#ffffff"
                    fontSize={10} 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end"
                    height={10}
                    tick={{ fill: '#ffffff' }}
                    tickMargin={25}
                  />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
                  
                  <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={25}>
                    <LabelList dataKey="leads" position="top" fill="#8b5cf6" fontSize={10} fontWeight="bold" />
                  </Bar>
                  
                  <Bar yAxisId="left" dataKey="cpl" name="CPL" radius={[6, 6, 0, 0]} barSize={25}>
                    {clientesGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.estourouMeta ? '#ef4444' : '#4b2a85'} />
                    ))}
                    <LabelList dataKey="cpl" position="top" fill="#fff" fontSize={9} formatter={(v: any) => `R$${v}`} />
                  </Bar>

                  <Line yAxisId="right" type="monotone" dataKey="gasto" name="gasto" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-purple-900/20 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-purple-500/30 h-[750px] flex flex-col">
            <h2 className="text-[10px] font-black mb-6 uppercase tracking-widest text-purple-300 border-b border-purple-500/20 pb-4 text-center">
               Todos os Clientes ({todosClientes.length})
            </h2>
            <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
              {todosClientes.map((c, index) => (
                <div key={c.nome} className={`p-4 rounded-2xl border ${c.estourouMeta ? 'bg-red-950/40 border-red-500/60' : 'bg-purple-950/40 border-purple-800/30'}`}>
                   <p className="text-[10px] font-black uppercase text-white truncate">{index + 1}. {c.nome}</p>
                   <div className="flex justify-between mt-2">
                     <span className="text-[9px] text-purple-400 font-bold">{c.leads} Leads</span>
                     <span className={`text-xs font-black ${c.estourouMeta ? 'text-red-500' : 'text-white'}`}>R$ {c.cpl.toFixed(2)}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}