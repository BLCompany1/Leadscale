"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
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
  cliente?: string;
  gastoTotal?: number;
  leadsTotal?: number;
  cplTotal?: number;
  "reuniao agendada"?: number;
  "%ra"?: number;
  "reuniao realizada"?: number;
  "%rr"?: number;
  Semana?: string;
  "Custo por Reuniao Agendada"?: number;
  "Custo por Reuniao Realizada"?: number;
  [key: string]: any;
}

export default function Dashboard() {
  const [data, setData] = useState<ClienteData[]>([]);
  const [semanaAtiva, setSemanaAtiva] = useState('Todas');
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Buscando dados do Supabase...');
        const { data: clienteData, error: fetchError } = await supabase
          .from('meta_ads')
          .select('*')
          .order('Semana', { ascending: false });
        
        if (fetchError) {
          console.error('Erro ao buscar dados:', fetchError);
          setError(`Erro: ${fetchError.message}`);
        } else {
          console.log('Dados recebidos:', clienteData?.length || 0, 'registros');
          console.log('Amostra de dados:', clienteData?.[0]);
          setData(clienteData || []);
        }
      } catch (err: any) {
        console.error('Erro na requisição:', err);
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
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
          backgroundColor: '#000000', 
          border: '2px solid #7c3aed', 
          borderRadius: '16px',
          padding: '12px 16px'
        }}>
          <p style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
            {data.nome}
          </p>
          <p style={{ color: '#e5e5e5', fontSize: '11px', marginBottom: '4px' }}>
            Leads: <span style={{ fontWeight: 'bold', color: '#fff' }}>{data.leads}</span>
          </p>
          <p style={{ color: '#e5e5e5', fontSize: '11px', marginBottom: '4px' }}>
            CPL: <span style={{ fontWeight: 'bold', color: '#fff' }}>R$ {data.cpl}</span>
          </p>
          <p style={{ color: '#e5e5e5', fontSize: '11px', marginBottom: '4px' }}>
            Reuniões Agendadas: <span style={{ fontWeight: 'bold', color: '#a78bfa' }}>{data.reunioesAgendadas} ({data.percRA}%)</span>
          </p>
          <p style={{ color: '#e5e5e5', fontSize: '11px', marginBottom: '4px' }}>
            Reuniões Realizadas: <span style={{ fontWeight: 'bold', color: '#a78bfa' }}>{data.reunioesRealizadas} ({data.percRR}%)</span>
          </p>
          <p style={{ color: '#e5e5e5', fontSize: '11px' }}>
            Investimento: <span style={{ fontWeight: 'bold', color: '#fff' }}>R$ {data.gasto}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!isMounted) return null;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando dados...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="text-center bg-red-950/30 border-2 border-red-500 rounded-3xl p-8 max-w-md">
          <p className="text-red-400 text-lg font-bold mb-2">⚠️ Erro ao carregar dados</p>
          <p className="text-white text-sm mb-4">{error}</p>
          <p className="text-gray-400 text-xs mb-4">Verifique se as credenciais do Supabase estão configuradas corretamente</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-bold transition-all"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-12 bg-black text-white relative overflow-hidden font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9333ea; }
      `}</style>

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col gap-8 mb-12 border-b border-gray-800 pb-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-xl">L</span>
              </div>
              <h1 className="text-2xl font-black text-white">LEADSCALE</h1>
            </div>
            <select 
              className="appearance-none bg-white/10 backdrop-blur-md text-white font-bold py-3 px-8 rounded-full border-2 border-purple-600 text-xs uppercase outline-none cursor-pointer hover:bg-purple-600 transition-all min-w-[240px]" 
              value={semanaAtiva} 
              onChange={(e) => setSemanaAtiva(e.target.value)}
            >
              <option value="Todas" className="bg-black">TODAS AS SEMANAS</option>
              {opcoesSemanas.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border-2 border-gray-800 text-center hover:border-purple-600 transition-all">
                <p className="text-purple-400 text-[10px] font-black uppercase mb-2 tracking-widest">INVESTIMENTO</p>
                <p className="text-2xl font-black italic text-white">R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border-2 border-gray-800 text-center hover:border-purple-600 transition-all">
                <p className="text-purple-400 text-[10px] font-black uppercase mb-2 tracking-widest">LEADS</p>
                <p className="text-3xl font-black italic text-white">{totalLeads}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border-2 border-gray-800 text-center hover:border-purple-600 transition-all">
                <p className="text-purple-400 text-[10px] font-black uppercase mb-2 tracking-widest">REUNIÕES AGENDADAS</p>
                <p className="text-3xl font-black italic text-purple-400">{totalReunioesAgendadas}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border-2 border-gray-800 text-center hover:border-purple-600 transition-all">
                <p className="text-purple-400 text-[10px] font-black uppercase mb-2 tracking-widest">REUNIÕES REALIZADAS</p>
                <p className="text-3xl font-black italic text-purple-400">{totalReunioesRealizadas}</p>
              </div>
              <div className={`p-5 rounded-3xl border-2 backdrop-blur-xl text-center transition-all ${totalAlertas > 0 ? 'bg-red-950/20 border-red-500 hover:border-red-400' : 'bg-white/5 border-gray-800 hover:border-purple-600'}`}>
                <p className="text-red-400 text-[10px] font-black uppercase mb-2 tracking-widest">ALERTAS</p>
                <p className="text-3xl font-black italic text-red-500">{totalAlertas}</p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border-2 border-gray-800 h-[520px]">
              <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-6 flex items-center gap-2">
                📊 TOP 15 CLIENTES POR INVESTIMENTO
              </h3>
              {clientesGrafico.length === 0 ? (
                <div className="flex items-center justify-center h-[90%] text-gray-500">
                  <p>Nenhum dado disponível</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="90%">
                  <ComposedChart data={clientesGrafico} margin={{ bottom: 100, top: 20, left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333333" />
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
                    
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124, 58, 237, 0.1)' }} />
                    
                    <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#a78bfa" radius={[8, 8, 0, 0]} barSize={22}>
                      <LabelList dataKey="leads" position="top" fill="#a78bfa" fontSize={10} fontWeight="bold" />
                    </Bar>
                    
                    <Bar yAxisId="left" dataKey="cpl" name="CPL" radius={[8, 8, 0, 0]} barSize={22}>
                      {clientesGrafico.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.alertaCPL ? '#ef4444' : '#7c3aed'} />
                      ))}
                      <LabelList dataKey="cpl" position="top" fill="#fff" fontSize={9} formatter={(v: any) => `R$${v}`} fontWeight="bold" />
                    </Bar>

                    <Line yAxisId="right" type="monotone" dataKey="gasto" name="Investimento" stroke="#ffffff" strokeWidth={3} dot={{ r: 5, fill: '#ffffff', strokeWidth: 2, stroke: '#7c3aed' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-3xl border-2 border-gray-800 h-[750px] flex flex-col">
            <h2 className="text-xs font-black mb-6 uppercase tracking-widest text-purple-400 border-b-2 border-gray-800 pb-4 text-center">
               TODOS OS CLIENTES ({todosClientes.length})
            </h2>
            {todosClientes.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-gray-500">
                <p className="text-center">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
                {todosClientes.map((c, index) => (
                  <div key={c.nome} className={`p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] ${c.alertaCPL || c.alertaRA ? 'bg-red-950/30 border-red-500' : 'bg-black/40 border-gray-700 hover:border-purple-600'}`}>
                     <div className="flex items-start justify-between mb-3">
                       <p className="text-[11px] font-black uppercase text-white truncate flex-1">{index + 1}. {c.nome}</p>
                       {(c.alertaCPL || c.alertaRA) && <span className="text-red-500 text-sm ml-2">⚠️</span>}
                     </div>
                     <div className="space-y-2">
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] text-gray-400 font-bold">{c.leads} Leads</span>
                         <span className={`text-xs font-black ${c.alertaCPL ? 'text-red-400' : 'text-white'}`}>CPL: R$ {c.cpl.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] text-purple-300 font-bold">RA: {c.reunioesAgendadas}</span>
                         <span className={`text-[10px] font-black ${c.alertaRA ? 'text-red-400' : 'text-purple-300'}`}>{c.percRA.toFixed(1)}%</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] text-purple-300 font-bold">RR: {c.reunioesRealizadas}</span>
                         <span className="text-[10px] text-purple-300 font-black">{c.percRR.toFixed(1)}%</span>
                       </div>
                       <div className="text-[9px] text-gray-500 mt-2 pt-2 border-t border-gray-800">
                         Custo RA: R$ {c.custoRA.toFixed(2)} | RR: R$ {c.custoRR.toFixed(2)}
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}"use client";
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

