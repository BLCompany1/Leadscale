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

interface ClienteData {
  cliente: string;
  gastoTotal: number;
  leadsTotal: number;
  cplTotal: number;
  "reuniao agendada": number;
  "%ra": number;
  "reuniao realizada": number;
  "%rr": number;
  Semana: string;
  "Custo por Reuniao Agendada": number;
  "Custo por Reuniao Realizada": number;
}

export default function Dashboard() {
  const [data, setData] = useState<ClienteData[]>([]);
  const [semanaAtiva, setSemanaAtiva] = useState('Todas');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    async function fetchData() {
      const { data: clienteData } = await supabase
        .from('meta_ads')
        .select('*')
        .order('Semana', { ascending: false });
      if (clienteData) setData(clienteData as ClienteData[]);
    }
    fetchData();
  }, []);

  const opcoesSemanas = useMemo(() => {
    const semanas = data.map(i => i.Semana?.trim()).filter(Boolean);
    return [...new Set(semanas)].sort().reverse();
  }, [data]);

  const dadosFiltrados = useMemo(() => {
    return data.filter(item => {
      return semanaAtiva === 'Todas' || item.Semana?.trim() === semanaAtiva;
    });
  }, [data, semanaAtiva]);

  const todosClientes = useMemo(() => {
    const nomesUnicos = [...new Set(dadosFiltrados.map(i => i.cliente?.trim()))].filter(Boolean);

    return nomesUnicos.map(nome => {
      const registros = dadosFiltrados.filter(d => d.cliente?.trim() === nome);
      const gasto = registros.reduce((acc, curr) => acc + Number(curr.gastoTotal || 0), 0);
      const leads = registros.reduce((acc, curr) => acc + Number(curr.leadsTotal || 0), 0);
      const reunioesAgendadas = registros.reduce((acc, curr) => acc + Number(curr["reuniao agendada"] || 0), 0);
      const reunioesRealizadas = registros.reduce((acc, curr) => acc + Number(curr["reuniao realizada"] || 0), 0);
      const cpl = leads > 0 ? gasto / leads : (gasto > 0 ? gasto : 0);
      const custoRA = reunioesAgendadas > 0 ? gasto / reunioesAgendadas : 0;
      const custoRR = reunioesRealizadas > 0 ? gasto / reunioesRealizadas : 0;
      const percRA = leads > 0 ? (reunioesAgendadas / leads) * 100 : 0;
      const percRR = leads > 0 ? (reunioesRealizadas / leads) * 100 : 0;

      return { 
        nome, 
        gasto: parseFloat(gasto.toFixed(2)), 
        leads, 
        cpl: parseFloat(cpl.toFixed(2)),
        reunioesAgendadas,
        reunioesRealizadas,
        percRA: parseFloat(percRA.toFixed(2)),
        percRR: parseFloat(percRR.toFixed(2)),
        custoRA: parseFloat(custoRA.toFixed(2)),
        custoRR: parseFloat(custoRR.toFixed(2)),
        alertaCPL: cpl > 100,
        alertaRA: percRA < 30
      };
    }).sort((a, b) => {
      if (a.alertaCPL && !b.alertaCPL) return -1;
      if (!a.alertaCPL && b.alertaCPL) return 1;
      return b.gasto - a.gasto;
    });
  }, [dadosFiltrados]);

  const clientesGrafico = useMemo(() => {
    return todosClientes.slice(0, 15);
  }, [todosClientes]);

  const totalGasto = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.gastoTotal || 0), 0);
  const totalLeads = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.leadsTotal || 0), 0);
  const totalReunioesAgendadas = dadosFiltrados.reduce((acc, curr) => acc + Number(curr["reuniao agendada"] || 0), 0);
  const totalReunioesRealizadas = dadosFiltrados.reduce((acc, curr) => acc + Number(curr["reuniao realizada"] || 0), 0);
  const totalAlertas = todosClientes.filter(c => c.alertaCPL || c.alertaRA).length;

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
          <p style={{ color: '#ffffff', fontSize: '11px', marginBottom: '4px' }}>
            Reuniões Agendadas: <span style={{ fontWeight: 'bold' }}>{data.reunioesAgendadas} ({data.percRA}%)</span>
          </p>
          <p style={{ color: '#ffffff', fontSize: '11px', marginBottom: '4px' }}>
            Reuniões Realizadas: <span style={{ fontWeight: 'bold' }}>{data.reunioesRealizadas} ({data.percRR}%)</span>
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
              value={semanaAtiva} 
              onChange={(e) => setSemanaAtiva(e.target.value)}
            >
              <option value="Todas">Todas as Semanas</option>
              {opcoesSemanas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-purple-900/10 backdrop-blur-xl p-4 rounded-[2rem] border border-purple-500/20 text-center">
                <p className="text-purple-400 text-[9px] font-black uppercase mb-2 tracking-widest">Investimento</p>
                <p className="text-2xl font-bold italic text-white">R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-purple-900/10 backdrop-blur-xl p-4 rounded-[2rem] border border-purple-500/20 text-center">
                <p className="text-purple-400 text-[9px] font-black uppercase mb-2 tracking-widest">Leads</p>
                <p className="text-2xl font-bold italic text-white">{totalLeads}</p>
              </div>
              <div className="bg-purple-900/10 backdrop-blur-xl p-4 rounded-[2rem] border border-purple-500/20 text-center">
                <p className="text-purple-400 text-[9px] font-black uppercase mb-2 tracking-widest">Reuniões Agendadas</p>
                <p className="text-2xl font-bold italic text-emerald-400">{totalReunioesAgendadas}</p>
              </div>
              <div className="bg-purple-900/10 backdrop-blur-xl p-4 rounded-[2rem] border border-purple-500/20 text-center">
                <p className="text-purple-400 text-[9px] font-black uppercase mb-2 tracking-widest">Reuniões Realizadas</p>
                <p className="text-2xl font-bold italic text-emerald-400">{totalReunioesRealizadas}</p>
              </div>
              <div className={`p-4 rounded-[2rem] border backdrop-blur-xl text-center ${totalAlertas > 0 ? 'bg-red-900/20 border-red-500/40' : 'bg-purple-900/10 border-purple-500/20'}`}>
                <p className="text-red-400 text-[9px] font-black uppercase mb-2 tracking-widest">Alertas</p>
                <p className="text-2xl font-bold italic text-red-500">{totalAlertas}</p>
              </div>
            </div>

            <div className="bg-purple-900/5 backdrop-blur-md p-8 rounded-[3rem] border border-purple-500/10 h-[500px]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-6 flex items-center gap-2">
                📊 Top 15 Clientes por Investimento
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
                  
                  <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={20}>
                    <LabelList dataKey="leads" position="top" fill="#8b5cf6" fontSize={9} fontWeight="bold" />
                  </Bar>
                  
                  <Bar yAxisId="left" dataKey="cpl" name="CPL" radius={[6, 6, 0, 0]} barSize={20}>
                    {clientesGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.alertaCPL ? '#ef4444' : '#4b2a85'} />
                    ))}
                    <LabelList dataKey="cpl" position="top" fill="#fff" fontSize={8} formatter={(v: any) => `R$${v}`} />
                  </Bar>

                  <Line yAxisId="right" type="monotone" dataKey="gasto" name="Investimento" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
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
                <div key={c.nome} className={`p-4 rounded-2xl border ${c.alertaCPL || c.alertaRA ? 'bg-red-950/40 border-red-500/60' : 'bg-purple-950/40 border-purple-800/30'}`}>
                   <div className="flex items-start justify-between mb-2">
                     <p className="text-[10px] font-black uppercase text-white truncate flex-1">{index + 1}. {c.nome}</p>
                     {(c.alertaCPL || c.alertaRA) && <span className="text-red-500 text-xs">⚠️</span>}
                   </div>
                   <div className="space-y-1">
                     <div className="flex justify-between">
                       <span className="text-[9px] text-purple-400 font-bold">{c.leads} Leads</span>
                       <span className={`text-xs font-black ${c.alertaCPL ? 'text-red-500' : 'text-white'}`}>CPL: R$ {c.cpl.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-[9px] text-emerald-400 font-bold">RA: {c.reunioesAgendadas}</span>
                       <span className={`text-[9px] font-bold ${c.alertaRA ? 'text-red-400' : 'text-emerald-300'}`}>{c.percRA.toFixed(1)}%</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-[9px] text-emerald-400 font-bold">RR: {c.reunioesRealizadas}</span>
                       <span className="text-[9px] text-emerald-300 font-bold">{c.percRR.toFixed(1)}%</span>
                     </div>
                     <div className="text-[8px] text-purple-300 mt-2 pt-2 border-t border-purple-800/30">
                       Custo RA: R$ {c.custoRA.toFixed(2)} | RR: R$ {c.custoRR.toFixed(2)}
                     </div>
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
