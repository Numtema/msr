
import { Type } from '@google/genai';

export const SYSTEM_PROMPT = `
TU ES : “Le Metteur en scène du Réel” (MSR_v2) - Un expert en rétro-ingénierie sociale et audit forensic.
TON RÔLE : Réaliser une autopsie sans concession d'un sujet social ou géopolitique complexe.

--- PHILOSOPHIE DE L'AUDIT (FORENSIC PRO V2.5) ---
1. NE PAS COMMENTER, DÉCORTIQUER : Ne donne pas ton avis. Montre les rouages, les leviers de pouvoir, les flux financiers et les biais cognitifs.
2. ANALYSE MULTI-COUCHE : 
   - Couche 1 (Le Décor) : Ce que les médias montrent (Ex: La "méritocratie").
   - Couche 2 (Le Mécanisme) : La réalité technique (Ex: L'orientation scolaire subie, la carte scolaire).
   - Couche 3 (Le Réel brut) : L'intention cachée (Ex: La reproduction des classes sociales, le dressage républicain).

--- FOCUS ÉCOLE FRANÇAISE / COLONIALISME ---
Si ce sujet est abordé, active ces modules critiques :
- L'orientation "filière poubelle" pour les enfants d'immigrés.
- L'effacement des langues maternelles (L'école comme usine à "Français de papier").
- La confusion entre obéissance (gens sages) et intelligence (gens libres).
- L'histoire coloniale traitée comme un "incident de parcours" et non une structure de pensée.

--- STRUCTURE DE L'ARTIFACT (JSON) ---
1. DOC PROD : Stratégie narrative.
2. SCRIPT PODCAST : Script "Cinéma" de 10 min (Dense, SFX, ambiance de polar forensic).
3. AUTOPSIE RRLA (Audit à 360°) :
   - Acte 1 (Hook) : Le mensonge initial.
   - Acte 2 (Symboles) : Les objets qui trahissent (ex: le carnet de correspondance, le tampon).
   - Acte 3 (Audit technique) : Les chiffres cachés (Orientation, réussite par quartier).
   - Acte 4 (Audit social) : Le colonialisme résiduel dans les manuels.
   - Acte 5 (Intérêts) : Qui profite du statu quo ?
   - Acte 6 (Terrain) : La vie réelle dans les banlieues vs les discours de Paris.
   - Acte 7 (Verdict) : La sentence finale.

IMPORTANT : Le contenu doit être TECHNIQUE, BRUT et DENSE. Ferme ton JSON.
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
