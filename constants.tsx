
import { Type } from '@google/genai';

export const SYSTEM_PROMPT = `
TU ES : “Le Metteur en scène du Réel” (MSR_v2) - Expert en autopsie sociale et narration cinématique.
TON RÔLE : Générer un dossier d'analyse (Artifact) structuré.

--- PERSONA V2 ---
1. CINÉMA : Focalise sur les détails visuels et sonores (ex: le grincement d'une chaise, un gros plan sur une pupille).
2. PHILOSOPHE DU BITUME : Analogies "Street-savant". Pas de morale, juste de la lucidité brute.
3. HUMOUR TACTIQUE : Ironie tranchante sur le système.

--- BASE "FRANCE-DIASPORA" ---
Focus : École, Colonialisme, Immigration. Analyse le moule républicain, l'orientation forcée, le dressage vs éducation.

--- STRUCTURE OBLIGATOIRE (JSON STRICT) ---
1. DOC PROD : Angle, Thèse, Pivot.
2. SCRIPT PODCAST : Narration immersive de 5 à 7 minutes (environ 800-1000 mots). Timecodes [00:00] + SFX.
3. AUTOPSIE RRLA : 7 Actes (Hook, Symboles, Script-Focus, Technique, Intérêts, Terrain, Verdict).
4. EXTRAS : Humour et Fact-Check.

SIGNATURE : "Et maintenant, gardez cette dernière image... Le décor s’éteint. Le réel continue."

IMPORTANT : Sois percutant et DENSE. Ferme impérativement ton JSON. Si le contenu est trop long, raccourcis les descriptions mais garde le SCRIPT complet.
`;

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    toneScores: {
      type: Type.OBJECT,
      properties: {
        targetPower: { type: Type.NUMBER },
        sufferingProximity: { type: Type.NUMBER },
        prIntensity: { type: Type.NUMBER },
        claimCertainty: { type: Type.NUMBER },
        tension: { type: Type.NUMBER },
        risk: { type: Type.NUMBER }
      },
      required: ["targetPower", "sufferingProximity", "prIntensity", "claimCertainty", "tension", "risk"]
    },
    artifacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          productionDoc: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              theme: { type: Type.STRING },
              angle: { type: Type.STRING },
              thesis: { type: Type.STRING },
              pivot: { type: Type.STRING },
              punchlines: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "theme", "angle", "thesis", "pivot", "punchlines"]
          },
          script: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timecode: { type: Type.STRING },
                segment: { type: Type.STRING },
                content: { type: Type.STRING },
                sfx: { type: Type.STRING }
              },
              required: ["timecode", "segment", "content"]
            }
          },
          acts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.NUMBER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                directorsNote: { type: Type.STRING },
                challenge: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ["id", "title", "description", "type"]
            }
          },
          tacticalHumor: {
            type: Type.OBJECT,
            properties: {
              punchlines: { type: Type.ARRAY, items: { type: Type.STRING } },
              context: { type: Type.STRING }
            },
            required: ["punchlines", "context"]
          },
          factCheckNotes: {
            type: Type.OBJECT,
            properties: {
              pointsToVerify: { type: Type.ARRAY, items: { type: Type.STRING } },
              sources: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["pointsToVerify", "sources"]
          },
          closingSignature: { type: Type.STRING }
        },
        required: ["role", "title", "summary", "productionDoc", "script", "acts", "tacticalHumor", "factCheckNotes", "closingSignature"]
      }
    }
  },
  required: ["toneScores", "artifacts"]
};
