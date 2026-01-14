
import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, Eye, Terminal as TerminalIcon, ShieldAlert, 
  ChevronRight, Download, Plus, Trash2, Send, Zap, 
  LayoutGrid, FileText, Scale, Ghost, Menu, X, Info,
  Target, AlertTriangle, Activity, Briefcase, Search,
  Clapperboard, Fingerprint, MapPin, Quote, ExternalLink,
  MessageSquare, FileCode, PlayCircle, Layers, Printer, FileDown,
  Laugh, CheckCircle2, Hash, Type as TypeIcon, AlertCircle, Loader2,
  RefreshCcw, Sparkles
} from 'lucide-react';
import { Session, Artifact, ToneScores, Act } from './types';
import { callMSRAgent } from './services/geminiService';

// --- UI Sub-components ---

const ToneGauges: React.FC<{ scores: ToneScores }> = ({ scores }) => (
  <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5">
    {[
      { label: 'Pouvoir', val: scores.targetPower, icon: Target, color: 'text-red-400' },
      { label: 'Douleur', val: scores.sufferingProximity, icon: AlertTriangle, color: 'text-amber-500' },
      { label: 'Image', val: scores.prIntensity, icon: Film, color: 'text-emerald-400' },
    ].map((g, i) => (
      <div key={i} className="flex flex-col items-center gap-1">
        <g.icon size={10} className={g.color} />
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full bg-current ${g.color} transition-all duration-1000`} style={{ width: `${Math.min(100, g.val * 100)}%` }} />
        </div>
        <span className="text-[7px] font-bold uppercase tracking-tighter text-white/20">{g.label}</span>
      </div>
    ))}
  </div>
);

const ActView: React.FC<{ act: Act }> = ({ act }) => (
  <div className="relative group/act mb-16 last:mb-0 animate-in fade-in slide-in-from-left duration-500">
    <div className="flex items-start gap-10">
      <div className="flex flex-col items-center gap-3 shrink-0 pt-1">
        <div className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center font-serif italic text-white/60 bg-[#0A0A0A] z-10 group-hover/act:border-emerald-500 transition-all shadow-xl group-hover/act:scale-110">
          {act.id}
        </div>
        <div className="w-[1px] h-full bg-gradient-to-b from-white/10 to-transparent flex-1" />
      </div>
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-500/60">{act.title}</h4>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>
        <div className={`text-xl md:text-2xl leading-relaxed whitespace-pre-wrap font-serif ${act.type === 'solemn' ? 'italic text-white underline decoration-emerald-500/20 underline-offset-8' : 'text-white/80'}`}>
          {act.description}
        </div>
        {act.challenge && (
          <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 flex gap-4 shadow-inner">
            <Sparkles size={16} className="text-emerald-500 shrink-0 mt-1 animate-pulse" />
            <p className="text-[12px] text-emerald-400/90 italic leading-relaxed">
              <span className="font-black uppercase not-italic mr-2 text-emerald-500 border-b border-emerald-500/30">Porte ton cerveau :</span>
              {act.challenge}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'prod' | 'script' | 'rrla' | 'extras'>('rrla');
  const [logs, setLogs] = useState<string[]>([]);
  
  const activeSession = sessions.find(s => s.id === activeId);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('msr_v2_final_v2');
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('msr_v2_final_v2', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-10), `> ${msg}`]);
  };

  const exportMarkdown = (artifact: Artifact) => {
    const md = `
# ${artifact.title}
**Role:** ${artifact.role}

## DOC PROD
- **Thème:** ${artifact.productionDoc.theme}
- **Angle:** ${artifact.productionDoc.angle}
- **Thèse:** ${artifact.productionDoc.thesis}
- **Pivot:** ${artifact.productionDoc.pivot}

## SCRIPT PODCAST
${artifact.script.map(s => `### [${s.timecode}] ${s.segment}\n${s.content}${s.sfx ? `\n*SFX: ${s.sfx}*` : ''}`).join('\n\n')}

## AUTOPSIE RRLA
${artifact.acts.map(a => `### ACTE ${a.id}: ${a.title}\n${a.description}${a.challenge ? `\n\n> **PORTE TON CERVEAU:** ${a.challenge}` : ''}`).join('\n\n')}

---
${artifact.closingSignature}
    `.trim();

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MSR_Autopsy_${artifact.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("Export Markdown réussi.");
  };

  const createAnalysis = async () => {
    if (!input.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setLogs([]);
    
    addLog("Initialisation du Noyau...");
    addLog("Persona V2 chargée.");
    
    const newId = Date.now().toString();
    const newSession: Session = {
      id: newId,
      title: input.slice(0, 40) + (input.length > 40 ? '...' : ''),
      rawInput: input,
      artifacts: [],
      status: 'running',
      timestamp: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveId(newId);

    try {
      addLog("Analyse en cours...");
      const result = await callMSRAgent(input);
      
      setSessions(prev => prev.map(s => s.id === newId ? {
        ...s,
        artifacts: result.artifacts || [],
        toneScores: result.toneScores,
        status: 'completed'
      } : s));
      addLog("Opération terminée.");
    } catch (err: any) {
      addLog("ÉCHEC DU NOYAU.");
      setError(err.message || "Erreur critique.");
      setSessions(prev => prev.map(s => s.id === newId ? { ...s, status: 'idle' } : s));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-[#F8FAFC] overflow-hidden selection:bg-emerald-500/30 font-sans">
      
      <aside className={`fixed md:static inset-y-0 left-0 w-80 bg-[#080808] border-r border-white/5 z-50 transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-5 mb-14">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-2xl">
              <Film size={24} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="font-serif italic text-2xl leading-none text-white">MSR <span className="text-amber-500 font-black">V2</span></h1>
              <p className="text-[7px] font-black uppercase tracking-[0.5em] text-white/20 mt-1 uppercase">Metteur en scène du réel</p>
            </div>
          </div>

          <button onClick={() => { setActiveId(null); setInput(''); setError(null); setIsSidebarOpen(false); setLogs([]); }} className="w-full py-4 mb-8 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-4 group">
            <Plus size={16} className="text-white/40 group-hover:text-emerald-400" />
            Nouvelle Autopsie
          </button>

          <div className="flex-1 overflow-y-auto scroll-hide space-y-4">
            {sessions.map(s => (
              <div key={s.id} onClick={() => { setActiveId(s.id); setError(null); }} className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${activeId === s.id ? 'bg-emerald-500/[0.04] border-emerald-500/20 shadow-inner' : 'border-transparent hover:bg-white/5'}`}>
                <div className="truncate pr-8">
                  <p className={`text-[12px] truncate font-bold ${activeId === s.id ? 'text-emerald-400' : 'text-white/40'}`}>{s.title}</p>
                </div>
                <button onClick={(e) => deleteSession(s.id, e)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 hover:text-red-400 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-[#050505]">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/40 backdrop-blur-2xl z-40">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-white/40 hover:text-white transition-colors"><Menu size={20} /></button>
            <div className="flex items-center gap-4 px-5 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
              {isAnalyzing ? <Loader2 size={12} className="text-emerald-500 animate-spin" /> : <Zap size={12} className="text-emerald-500" />}
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">Persona V2 Master Active</span>
            </div>
          </div>
          <Activity size={14} className="text-emerald-500/40" />
        </header>

        <div className="flex-1 overflow-y-auto scroll-hide p-8 md:p-20">
          {error && (
             <div className="max-w-4xl mx-auto mb-10 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-6 text-red-400">
               <AlertCircle size={28} className="shrink-0" />
               <div className="flex-1">
                  <p className="text-sm font-bold">Autopsie Interrompue (Dépassement de flux).</p>
                  <p className="text-xs opacity-60">Réessayez avec un sujet plus spécifique.</p>
               </div>
               <button onClick={createAnalysis} className="p-3 bg-red-500/20 rounded-xl hover:bg-red-500/30 transition-all"><RefreshCcw size={16} /></button>
             </div>
          )}

          {!activeId ? (
            <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto space-y-12 text-center">
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="inline-flex items-center gap-4 px-6 py-2 bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-[0.5em]">
                  <Ghost size={18} /> Le Metteur en scène du réel
                </div>
                <h2 className="text-5xl md:text-7xl font-serif italic text-white leading-[1.1] tracking-tight">
                  L'autopsie est la seule vérité.
                </h2>
              </div>

              <div className="w-full bg-[#0A0A0A] border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl relative group transition-all hover:border-emerald-500/20">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="L'école française, le colonialisme, l'exil..."
                  className="w-full h-48 bg-transparent border-none focus:ring-0 text-2xl font-serif italic text-white placeholder-white/5 resize-none scroll-hide"
                />
                <div className="flex items-center justify-between pt-10 mt-6 border-t border-white/5">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">RRLA Kernel v2.5.5</span>
                  <button 
                    onClick={createAnalysis}
                    disabled={!input.trim() || isAnalyzing}
                    className="px-12 py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center gap-4 shadow-2xl"
                  >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Démarrer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-[1300px] mx-auto grid grid-cols-12 gap-12">
              <div className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 sticky top-8 space-y-8 shadow-2xl">
                   <h3 className="font-serif italic text-3xl text-white leading-tight truncate">{activeSession?.title}</h3>
                   {activeSession?.toneScores && <ToneGauges scores={activeSession.toneScores} />}
                   <div className="bg-black/60 rounded-[24px] p-6 h-72 overflow-y-auto scroll-hide border border-white/5 shadow-inner" ref={logContainerRef}>
                     <div className="text-[11px] text-white/30 italic font-mono leading-relaxed space-y-2">
                       {logs.map((log, i) => <p key={i}>{log}</p>)}
                     </div>
                   </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-8 space-y-6">
                {activeSession?.artifacts.map(art => (
                  <div key={art.id} onClick={() => setSelectedArtifact(art)} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 hover:border-emerald-500/30 transition-all cursor-pointer group shadow-xl relative overflow-hidden">
                    <Fingerprint size={24} className="text-emerald-500 mb-6" />
                    <h4 className="text-2xl font-serif italic text-white mb-4">{art.title}</h4>
                    <p className="text-base text-white/40 line-clamp-2 italic leading-relaxed">{art.summary}</p>
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                       <span className="text-emerald-500/50 font-black text-[10px] uppercase tracking-widest group-hover:text-emerald-500">Dossier Master <ChevronRight size={14} className="inline" /></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedArtifact && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl" onClick={() => setSelectedArtifact(null)} />
          <div className="relative w-full max-w-6xl h-full bg-[#050505] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            
            <header className="p-10 border-b border-white/5 flex items-center justify-between bg-black/60">
               <div className="flex items-center gap-8 text-white">
                  <Briefcase size={28} className="text-emerald-500" />
                  <h3 className="text-3xl font-serif italic">{selectedArtifact.title}</h3>
               </div>
               <button onClick={() => setSelectedArtifact(null)} className="p-4 text-white/20 hover:text-white transition-all"><X size={32} /></button>
            </header>

            <nav className="flex px-10 pt-6 gap-2 border-b border-white/5 bg-black/40 overflow-x-auto scroll-hide">
               {[
                 { id: 'prod', label: 'DOC PROD', icon: Layers, color: 'text-amber-500' },
                 { id: 'script', label: 'SCRIPT PODCAST', icon: PlayCircle, color: 'text-emerald-500' },
                 { id: 'rrla', label: 'AUTOPSIE RRLA', icon: FileCode, color: 'text-white' },
                 { id: 'extras', label: 'EXTRAS', icon: Info, color: 'text-white/40' }
               ].map(tab => (
                 <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-6 pb-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 shrink-0 ${activeTab === tab.id ? `${tab.color} border-current opacity-100` : 'text-white/20 border-transparent opacity-50 hover:opacity-100'}`}
                 >
                   <tab.icon size={16} /> {tab.label}
                 </button>
               ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-10 md:p-24 scroll-hide">
              <div className="max-w-4xl mx-auto space-y-24">
                {activeTab === 'prod' && (
                  <div className="space-y-16 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 text-2xl font-serif">
                       <div className="space-y-4">
                          <span className="text-amber-500 block text-[11px] font-black uppercase tracking-[0.4em]">Angle Narratif</span> 
                          <p className="text-white/90">{selectedArtifact.productionDoc.angle}</p>
                       </div>
                       <div className="space-y-4">
                          <span className="text-amber-500 block text-[11px] font-black uppercase tracking-[0.4em]">Thèse</span> 
                          <p className="text-white/90">{selectedArtifact.productionDoc.thesis}</p>
                       </div>
                    </div>
                    <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[48px] text-4xl font-serif italic text-white/90 leading-relaxed shadow-inner">
                       "{selectedArtifact.productionDoc.pivot}"
                    </div>
                  </div>
                )}

                {activeTab === 'script' && (
                  <div className="space-y-12 animate-in fade-in">
                    {selectedArtifact.script.map((seg, i) => (
                      <div key={i} className="flex gap-12">
                        <span className="w-24 shrink-0 text-emerald-500/80 font-mono text-[13px] pt-1.5 font-bold tracking-tighter">[{seg.timecode}]</span>
                        <div className="flex-1 space-y-6 pb-12 border-b border-white/5">
                           <h5 className="text-[11px] font-black uppercase text-white/20 tracking-[0.3em]">{seg.segment}</h5>
                           <div className="text-xl md:text-3xl font-serif leading-[1.6] text-white/95 whitespace-pre-wrap">{seg.content}</div>
                           {seg.sfx && <div className="text-[10px] text-emerald-400 font-bold uppercase italic border border-emerald-500/10 px-4 py-1.5 rounded-xl inline-flex bg-emerald-500/5">SFX: {seg.sfx}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'rrla' && (
                  <div className="space-y-20 animate-in fade-in">
                    {selectedArtifact.acts.map(act => <ActView key={act.id} act={act} />)}
                  </div>
                )}

                {activeTab === 'extras' && (
                  <div className="space-y-16 animate-in fade-in">
                    <div className="p-12 bg-amber-500/5 border border-amber-500/10 rounded-[40px] space-y-8 shadow-2xl">
                      <h4 className="text-[13px] font-black uppercase text-amber-500 tracking-[0.4em] flex items-center gap-4"><Laugh size={20} /> Humour Tactique</h4>
                      <div className="space-y-8">
                        {selectedArtifact.tacticalHumor.punchlines.map((p, i) => (
                          <p key={i} className="text-2xl font-serif italic text-white/80 leading-relaxed border-l-2 border-amber-500/20 pl-8">"{p}"</p>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-12 bg-emerald-500/5 border border-emerald-500/10 rounded-[40px] space-y-8 shadow-2xl">
                      <h4 className="text-[13px] font-black uppercase text-emerald-500 tracking-[0.4em] flex items-center gap-4"><CheckCircle2 size={20} /> Fact-Check</h4>
                      <div className="space-y-6">
                        {selectedArtifact.factCheckNotes.pointsToVerify.map((p, i) => (
                          <p key={i} className="text-base text-white/70 flex gap-4 leading-relaxed"><Info size={18} className="text-emerald-500 shrink-0 mt-1" /> {p}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-32 pb-10 border-t border-white/10">
                   <p className="text-4xl md:text-5xl font-serif italic text-white/95 text-center leading-relaxed">{selectedArtifact.closingSignature}</p>
                </div>
              </div>
            </div>

            <footer className="p-10 border-t border-white/5 bg-black/60 flex gap-8 shrink-0">
               <button onClick={() => exportMarkdown(selectedArtifact)} className="flex-1 py-6 bg-white/5 rounded-[32px] text-[12px] font-black uppercase tracking-[0.5em] text-white/30 hover:text-white transition-all flex items-center justify-center gap-3">
                 <FileDown size={18} /> Exporter
               </button>
               <button className="flex-[2.5] py-6 bg-emerald-500 text-black rounded-[32px] text-[13px] font-black uppercase tracking-[0.6em] hover:bg-emerald-400 transition-all shadow-2xl flex items-center justify-center gap-4">
                 <Send size={20} /> PUBLIER LE RÉEL
               </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
