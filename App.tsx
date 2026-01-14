
import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, Eye, Terminal as TerminalIcon, ShieldAlert, 
  ChevronRight, Download, Plus, Trash2, Send, Zap, 
  LayoutGrid, FileText, Scale, Ghost, Menu, X, Info,
  Target, AlertTriangle, Activity, Briefcase, Search,
  Clapperboard, Fingerprint, MapPin, Quote, ExternalLink,
  MessageSquare, FileCode, PlayCircle, Layers, Printer, FileDown,
  Laugh, CheckCircle2, Hash, Type as TypeIcon, AlertCircle, Loader2,
  RefreshCcw, Sparkles, Microscope
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
              <span className="font-black uppercase not-italic mr-2 text-emerald-500 border-b border-emerald-500/30">PORTE TON CERVEAU :</span>
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
    const saved = localStorage.getItem('msr_v2_final_v3');
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('msr_v2_final_v3', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-15), `> ${msg}`]);
  };

  const exportMarkdown = (artifact: Artifact) => {
    const md = `
# AUDIT MSR : ${artifact.title}
**Analyste :** Metteur en scène du Réel (MSR_v2)

## DOC PROD (Stratégie)
- **Angle :** ${artifact.productionDoc.angle}
- **Thèse :** ${artifact.productionDoc.thesis}
- **Pivot :** ${artifact.productionDoc.pivot}

## SCRIPT PODCAST (Cinéma Social)
${artifact.script.map(s => `### [${s.timecode}] ${s.segment}\n${s.content}${s.sfx ? `\n*SFX: ${s.sfx}*` : ''}`).join('\n\n')}

## AUTOPSIE RRLA (Audit Forensic)
${artifact.acts.map(a => `### ACTE ${a.id}: ${a.title}\n${a.description}${a.challenge ? `\n\n> **PORTE TON CERVEAU:** ${a.challenge}` : ''}`).join('\n\n')}

---
${artifact.closingSignature}
    `.trim();

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MSR_Audit_${artifact.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("Rapport d'audit exporté.");
  };

  const createAnalysis = async () => {
    if (!input.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setLogs([]);
    
    addLog("Initialisation du Noyau Forensic...");
    addLog("Scan des vecteurs de pouvoir...");
    
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
      addLog("Interrogation des bases de données réelles...");
      const result = await callMSRAgent(input);
      addLog("Audit technique complété.");
      addLog("Génération des artifacts RRLA...");
      
      setSessions(prev => prev.map(s => s.id === newId ? {
        ...s,
        artifacts: result.artifacts || [],
        toneScores: result.toneScores,
        status: 'completed'
      } : s));
      addLog("Autopsie finalisée. Dossier disponible.");
    } catch (err: any) {
      addLog("ALERTE : Rupture de flux lors de l'audit.");
      setError(err.message || "Erreur critique de décodage.");
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
              <Microscope size={24} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="font-serif italic text-2xl leading-none text-white">MSR <span className="text-amber-500 font-black">V2</span></h1>
              <p className="text-[7px] font-black uppercase tracking-[0.5em] text-white/20 mt-1 uppercase">Audit Forensic du Réel</p>
            </div>
          </div>

          <button onClick={() => { setActiveId(null); setInput(''); setError(null); setIsSidebarOpen(false); setLogs([]); }} className="w-full py-4 mb-8 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-4 group shadow-lg">
            <Plus size={16} className="text-white/40 group-hover:text-emerald-400" />
            Nouvel Audit
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
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">Noyau Forensic // Audit Actif</span>
            </div>
          </div>
          <Activity size={14} className="text-emerald-500/40" />
        </header>

        <div className="flex-1 overflow-y-auto scroll-hide p-8 md:p-20">
          {error && (
             <div className="max-w-4xl mx-auto mb-10 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-6 text-red-400 animate-in bounce-in">
               <AlertCircle size={28} className="shrink-0" />
               <div className="flex-1">
                  <p className="text-sm font-bold">Audit Interrompu (Dépassement de flux).</p>
                  <p className="text-xs opacity-60">Le réel est trop dense. Essayez d'isoler un mécanisme précis.</p>
               </div>
               <button onClick={createAnalysis} className="p-3 bg-red-500/20 rounded-xl hover:bg-red-500/30 transition-all"><RefreshCcw size={16} /></button>
             </div>
          )}

          {!activeId ? (
            <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto space-y-12 text-center">
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="inline-flex items-center gap-4 px-6 py-2 bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-[0.5em]">
                  <Ghost size={18} /> Audit Master V2.5
                </div>
                <h2 className="text-5xl md:text-7xl font-serif italic text-white leading-[1.1] tracking-tight">
                  L'autopsie à vif.<br/><span className="text-white/10 not-italic uppercase font-black text-4xl block mt-4 tracking-tighter">Pas de morale, juste le réel.</span>
                </h2>
              </div>

              <div className="w-full bg-[#0A0A0A] border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl relative group transition-all hover:border-emerald-500/20">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="École française, Colonialisme, Diaspora... Auditez le mécanisme."
                  className="w-full h-48 bg-transparent border-none focus:ring-0 text-2xl font-serif italic text-white placeholder-white/5 resize-none scroll-hide"
                />
                <div className="flex items-center justify-between pt-10 mt-6 border-t border-white/5">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Forensic Engine // High Precision</span>
                  <button 
                    onClick={createAnalysis}
                    disabled={!input.trim() || isAnalyzing}
                    className="px-12 py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center gap-4 shadow-2xl"
                  >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Auditer à fond
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-[1300px] mx-auto grid grid-cols-12 gap-12 animate-in fade-in">
              <div className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 sticky top-8 space-y-8 shadow-2xl border-l-4 border-l-emerald-500/40">
                   <h3 className="font-serif italic text-3xl text-white leading-tight truncate">{activeSession?.title}</h3>
                   {activeSession?.toneScores && <ToneGauges scores={activeSession.toneScores} />}
                   <div className="bg-black/60 rounded-[24px] p-6 h-80 overflow-y-auto scroll-hide border border-white/5 shadow-inner" ref={logContainerRef}>
                     <div className="text-[11px] text-emerald-500/40 font-mono leading-relaxed space-y-2">
                       {logs.map((log, i) => <p key={i} className="animate-in slide-in-from-left duration-200">{log}</p>)}
                     </div>
                   </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-8 space-y-6">
                {activeSession?.artifacts.map(art => (
                  <div key={art.id} onClick={() => setSelectedArtifact(art)} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-10 hover:border-emerald-500/30 transition-all cursor-pointer group shadow-xl relative overflow-hidden border-l-2 border-l-white/5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Fingerprint size={24} className="text-emerald-500 mb-8" />
                    <h4 className="text-3xl font-serif italic text-white mb-6 group-hover:text-emerald-400 transition-colors">{art.title}</h4>
                    <p className="text-lg text-white/40 line-clamp-3 italic leading-relaxed">{art.summary}</p>
                    <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center">
                       <span className="text-emerald-500/50 font-black text-[12px] uppercase tracking-[0.4em] group-hover:text-emerald-500 transition-all">Accéder à l'Audit Complet <ChevronRight size={16} className="inline ml-2" /></span>
                    </div>
                  </div>
                ))}
                {isAnalyzing && (
                  <div className="bg-[#0A0A0A] border-2 border-dashed border-white/5 rounded-3xl p-24 flex flex-col items-center justify-center gap-8 animate-pulse">
                     <Microscope size={56} className="text-emerald-500 animate-spin" />
                     <div className="text-center space-y-3">
                        <p className="font-serif italic text-white/30 text-3xl">Autopsie en cours...</p>
                        <p className="text-[10px] font-black text-emerald-500/20 uppercase tracking-[0.6em]">Moteur Forensic v2.5.5</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedArtifact && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl animate-in fade-in" onClick={() => setSelectedArtifact(null)} />
          <div className="relative w-full max-w-6xl h-full bg-[#050505] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            
            <header className="p-12 border-b border-white/5 flex items-center justify-between bg-black/80">
               <div className="flex items-center gap-10 text-white">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-inner">
                    <Briefcase size={32} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-serif italic">{selectedArtifact.title}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 mt-2">Dossier Audit Forensic // Confidential</p>
                  </div>
               </div>
               <button onClick={() => setSelectedArtifact(null)} className="p-4 text-white/20 hover:text-white transition-all hover:bg-white/5 rounded-full"><X size={40} /></button>
            </header>

            <nav className="flex px-12 pt-8 gap-4 border-b border-white/5 bg-black/40 overflow-x-auto scroll-hide">
               {[
                 { id: 'prod', label: 'DOC PROD', icon: Layers, color: 'text-amber-500' },
                 { id: 'script', label: 'SCRIPT PODCAST', icon: PlayCircle, color: 'text-emerald-500' },
                 { id: 'rrla', label: 'AUTOPSIE RRLA', icon: FileCode, color: 'text-white' },
                 { id: 'extras', label: 'AUDIT EXTRAS', icon: Info, color: 'text-white/40' }
               ].map(tab => (
                 <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-4 px-8 pb-8 text-[12px] font-black uppercase tracking-[0.3em] transition-all border-b-2 shrink-0 ${activeTab === tab.id ? `${tab.color} border-current opacity-100` : 'text-white/20 border-transparent opacity-50 hover:opacity-100'}`}
                 >
                   <tab.icon size={18} /> {tab.label}
                 </button>
               ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-12 md:p-32 scroll-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              <div className="max-w-4xl mx-auto space-y-32">
                {activeTab === 'prod' && (
                  <div className="space-y-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20 text-2xl font-serif">
                       <div className="space-y-6">
                          <span className="text-amber-500 block text-[12px] font-black uppercase tracking-[0.5em] border-b border-amber-500/20 pb-2">Angle Narrative</span> 
                          <p className="text-white/90 leading-relaxed italic">{selectedArtifact.productionDoc.angle}</p>
                       </div>
                       <div className="space-y-6">
                          <span className="text-amber-500 block text-[12px] font-black uppercase tracking-[0.5em] border-b border-amber-500/20 pb-2">Thèse du Réel</span> 
                          <p className="text-white/90 leading-relaxed">{selectedArtifact.productionDoc.thesis}</p>
                       </div>
                    </div>
                    <div className="p-16 bg-white/[0.03] border border-white/5 rounded-[60px] text-4xl md:text-5xl font-serif italic text-white/95 leading-[1.4] shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 left-0 w-2 h-full bg-amber-500/40" />
                       "{selectedArtifact.productionDoc.pivot}"
                    </div>
                  </div>
                )}

                {activeTab === 'script' && (
                  <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    {selectedArtifact.script.map((seg, i) => (
                      <div key={i} className="flex gap-16 group/script">
                        <span className="w-32 shrink-0 text-emerald-500/60 font-mono text-[15px] pt-2 font-black tracking-tighter">[{seg.timecode}]</span>
                        <div className="flex-1 space-y-8 pb-16 border-b border-white/5">
                           <h5 className="text-[12px] font-black uppercase text-white/20 tracking-[0.4em] group-hover/script:text-emerald-500 transition-colors">{seg.segment}</h5>
                           <div className="text-2xl md:text-3xl font-serif leading-[1.6] text-white/95 whitespace-pre-wrap selection:bg-emerald-500/30">{seg.content}</div>
                           {seg.sfx && <div className="text-[11px] text-emerald-400 font-black uppercase italic border border-emerald-500/20 px-6 py-2 rounded-2xl inline-flex bg-emerald-500/10 shadow-inner">SFX: {seg.sfx}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'rrla' && (
                  <div className="space-y-24 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    {selectedArtifact.acts.map(act => <ActView key={act.id} act={act} />)}
                  </div>
                )}

                {activeTab === 'extras' && (
                  <div className="space-y-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <div className="p-16 bg-amber-500/[0.03] border border-amber-500/10 rounded-[48px] space-y-10 shadow-2xl border-l-8 border-l-amber-500/40">
                      <h4 className="text-[15px] font-black uppercase text-amber-500 tracking-[0.5em] flex items-center gap-6"><Laugh size={24} /> Humour Tactique // Lucidité</h4>
                      <div className="space-y-12">
                        {selectedArtifact.tacticalHumor.punchlines.map((p, i) => (
                          <p key={i} className="text-3xl font-serif italic text-white/80 leading-relaxed border-l-2 border-amber-500/10 pl-10">"{p}"</p>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-16 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-[48px] space-y-10 shadow-2xl border-l-8 border-l-emerald-500/40">
                      <h4 className="text-[15px] font-black uppercase text-emerald-500 tracking-[0.5em] flex items-center gap-6"><CheckCircle2 size={24} /> Preuves & Fact-Check</h4>
                      <div className="space-y-8">
                        {selectedArtifact.factCheckNotes.pointsToVerify.map((p, i) => (
                          <p key={i} className="text-lg text-white/70 flex gap-6 leading-relaxed"><Info size={24} className="text-emerald-500 shrink-0 mt-1" /> {p}</p>
                        ))}
                      </div>
                      <div className="pt-10 flex flex-wrap gap-4 border-t border-white/5">
                        {selectedArtifact.factCheckNotes.sources.map((s, i) => (
                          <span key={i} className="px-6 py-2 bg-emerald-500/10 rounded-full text-[11px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/20">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-40 pb-20 border-t border-white/10">
                   <p className="text-5xl md:text-6xl font-serif italic text-white/95 text-center leading-[1.4] selection:bg-amber-500/30">{selectedArtifact.closingSignature}</p>
                </div>

                {selectedArtifact.groundingSources && selectedArtifact.groundingSources.length > 0 && (
                  <div className="pt-20 space-y-10 pb-20">
                     <h4 className="text-[14px] font-black uppercase text-emerald-500 flex items-center gap-6 tracking-[0.5em]">
                       <Search size={24} /> Grounding : Preuves du Réel (2024-2025)
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {selectedArtifact.groundingSources.map((s, i) => (
                         <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="p-8 bg-white/[0.02] rounded-[32px] flex justify-between items-center hover:bg-emerald-500/10 transition-all group border border-white/5 hover:border-emerald-500/30">
                           <span className="text-sm text-white/50 truncate pr-8 group-hover:text-emerald-400 transition-colors font-bold uppercase tracking-widest">{s.title}</span>
                           <ExternalLink size={20} className="text-white/10 shrink-0 group-hover:text-emerald-400 group-hover:scale-110 transition-all" />
                         </a>
                       ))}
                     </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="p-12 border-t border-white/5 bg-black/80 backdrop-blur-3xl flex gap-10 shrink-0">
               <button onClick={() => exportMarkdown(selectedArtifact)} className="flex-1 py-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[40px] text-[13px] font-black uppercase tracking-[0.6em] text-white/30 hover:text-white transition-all flex items-center justify-center gap-4 shadow-xl">
                 <FileDown size={20} /> Exporter Rapport
               </button>
               <button className="flex-[3] py-8 bg-emerald-500 text-black rounded-[40px] text-[14px] font-black uppercase tracking-[0.8em] hover:bg-emerald-400 transition-all shadow-2xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-6">
                 <Send size={24} /> DIFFUSER LE RÉEL
               </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
