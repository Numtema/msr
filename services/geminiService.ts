
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from "../constants";

export const callMSRAgent = async (input: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `[ANALYSE MSR V2]
SUJET : ${input}

INSTRUCTIONS :
- Génère le DOC PROD, le SCRIPT PODCAST et l'AUTOPSIE RRLA.
- Le script doit être immersif mais concis pour tenir dans le flux JSON.
- FERME TOUTES LES GUILLEMETS ET LES ACCOLADES.`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
        temperature: 0.7,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 2048 },
        tools: [{ googleSearch: {} }] 
      }
    });

    let text = response.text || "";
    text = text.trim();
    
    // Tentative de réparation si le JSON est mal formé ou tronqué
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.warn("Premier échec de parsing, tentative de réparation...", parseError);
      
      // Si la chaîne n'est pas fermée
      if (text.lastIndexOf('"') > text.lastIndexOf(':') && !text.endsWith('"')) {
          text += '"';
      }
      
      // Fermeture brutale des structures
      let openBraces = (text.match(/\{/g) || []).length;
      let closeBraces = (text.match(/\}/g) || []).length;
      while (openBraces > closeBraces) {
          text += '}';
          closeBraces++;
      }
      
      let openBrackets = (text.match(/\[/g) || []).length;
      let closeBrackets = (text.match(/\]/g) || []).length;
      while (openBrackets > closeBrackets) {
          text += ']';
          closeBrackets++;
      }

      const parsed = JSON.parse(text);
      
      // Extraction des sources si dispo
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Source Vérifiée',
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
    }
  } catch (error: any) {
    console.error("MSR Kernel Failure:", error);
    throw new Error(error.message || "Le réel a brisé le flux. Relancez l'autopsie.");
  }
};
