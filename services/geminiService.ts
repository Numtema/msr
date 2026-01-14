
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from "../constants";

export const callMSRAgent = async (input: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `[AUDIT FORENSIC ULTRA-DÉTAILLÉ ACTIVÉ]
SUJET : ${input}

MISSION : 
- Réaliser un audit à 360° du sujet. 
- Ne pas économiser sur les détails techniques (chiffres, mécanismes de pouvoir).
- Remplir chaque section du JSON avec une densité d'information maximale.
- FERME TOUTES LES STRUCTURES JSON (", }, ]).`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
        temperature: 0.7,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 4096 }, // Budget élevé pour une réflexion approfondie avant rédaction
        tools: [{ googleSearch: {} }] 
      }
    });

    let text = response.text || "";
    text = text.trim();
    
    // NETTOYEUR ET RÉPARATEUR JSON ROBUSTE
    const repairJSON = (str: string) => {
      let repaired = str;
      
      // 1. Détection de la dernière coupure
      // Si on finit par une virgule ou au milieu d'un champ
      const lastOpenBrace = repaired.lastIndexOf('{');
      const lastCloseBrace = repaired.lastIndexOf('}');
      
      if (lastOpenBrace > lastCloseBrace) {
          // On est dans un objet non fermé.
          // Si on est au milieu d'une chaîne de caractères (nombre impair de guillemets après la dernière accolade)
          const contentAfterLastBrace = repaired.substring(lastOpenBrace);
          const quoteCount = (contentAfterLastBrace.match(/"/g) || []).length;
          if (quoteCount % 2 !== 0) {
              repaired += '"'; // Ferme la chaîne
          }
      }

      // 2. Équilibrage des accolades et crochets
      let openBraces = (repaired.match(/\{/g) || []).length;
      let closeBraces = (repaired.match(/\}/g) || []).length;
      while (openBraces > closeBraces) {
          repaired += '}';
          closeBraces++;
      }
      
      let openBrackets = (repaired.match(/\[/g) || []).length;
      let closeBrackets = (repaired.match(/\]/g) || []).length;
      while (openBrackets > closeBrackets) {
          repaired += ']';
          closeBrackets++;
      }

      return repaired;
    };

    try {
      // Tentative initiale
      return JSON.parse(text);
    } catch (e) {
      console.warn("Échec parsing initial, tentative de réparation du flux...");
      const repaired = repairJSON(text);
      try {
        const parsed = JSON.parse(repaired);
        
        // Enrichissement avec sources si dispo
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources = groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || 'Source Auditée',
          uri: chunk.web?.uri
        })).filter((s: any) => s.uri) || [];

        if (parsed.artifacts) {
          parsed.artifacts = parsed.artifacts.map((a: any, i: number) => ({
            ...a,
            id: a.id || `msr-${Date.now()}-${i}`,
            groundingSources: sources 
          }));
        }
        return parsed;
      } catch (e2) {
        console.error("Échec critique de réparation JSON:", repaired);
        throw new Error("Le réel est trop dense pour être encapsulé. Essayez de restreindre l'angle d'audit.");
      }
    }
  } catch (error: any) {
    console.error("MSR Kernel Failure:", error);
    throw error;
  }
};
