
export type TonalMode = 'STRATEGE' | 'PROCUREUR' | 'POETE' | 'HUMOUR_ACIDE';

export type DisplayType = 'autopsy_dossier' | 'production_bible' | 'analysis_grid';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ProductionDoc {
  title: string;
  theme: string;
  angle: string;
  thesis: string;
  pivot: string;
  punchlines: string[];
  risks: string[];
}

export interface ScriptSegment {
  timecode: string;
  segment: string;
  content: string;
  sfx?: string;
}

export interface Act {
  id: number;
  title: string;
  description: string;
  directorsNote?: string;
  type: 'cinematic' | 'forensic' | 'raw' | 'solemn';
  challenge?: string; // "Porte ton cerveau"
}

export interface Artifact {
  id: string;
  role: string;
  title: string;
  summary: string;
  displayType: DisplayType;
  productionDoc: ProductionDoc; 
  script: ScriptSegment[];       
  acts: Act[];                   
  tacticalHumor: {
    punchlines: string[];
    context: string;
  };
  factCheckNotes: {
    pointsToVerify: string[];
    sources: string[];
  };
  seo: {
    hashtags: string[];
    altTitles: string[];
  };
  closingSignature: string;
  groundingSources?: GroundingSource[];
  metadata?: {
    vigilanceImpact: number;
    keyInterests: string[];
    technicalDepth?: string;
  };
}

export interface ToneScores {
  targetPower: number;
  sufferingProximity: number;
  prIntensity: number;
  claimCertainty: number;
  tension: number;
  risk: number;
}

export interface Session {
  id: string;
  title: string;
  rawInput: string;
  artifacts: Artifact[];
  status: 'idle' | 'running' | 'completed';
  timestamp: number;
  toneScores?: ToneScores;
}

export interface ReasoningLog {
  timestamp: string;
  agent: string;
  message: string;
  type: 'info' | 'warn' | 'success' | 'critical';
}
