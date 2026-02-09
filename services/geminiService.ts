
import { GoogleGenAI, Type } from "@google/genai";
import { Dish, Order, AIAnalysisResult, AIMonthlyReport, Table } from "../types";

/**
 * Inteligência de Menu: Sugere o par perfeito para o prato selecionado.
 */
export const getChefRecommendation = async (currentItems: string[], menu: Dish[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Você é o Chef de um restaurante angolano de luxo. 
  O cliente já escolheu: ${currentItems.join(', ')}.
  Baseado no menu: ${menu.map(d => d.name).join(', ')}.
  Sugira UMA harmonização perfeita (bebida ou sobremesa). Seja conciso e use gíria angolana elegante. 
  Máximo 15 palavras.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.8 }
    });
    return response.text || "Uma Cuca bem gelada para acompanhar, mambo fixe!";
  } catch (error) {
    return "O Chef recomenda o nosso Pudim de Leite especial!";
  }
};

/**
 * Recomendação de Garçom IA: Sugere pratos e bebidas com base na consulta do usuário.
 */
export const getAIWaiterRecommendation = async (query: string, menu: Dish[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Você é um garçom virtual especializado na culinária de Angola.
  Menu disponível: ${menu.map(d => d.name).join(', ')}.
  Pergunta do cliente: ${query}.
  Responda de forma curta, prestativa e com um toque de hospitalidade angolana. 
  Máximo 20 palavras.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "Recomendo o nosso peixe grelhado!";
  } catch (e) {
    return "O Chef recomenda a nossa especialidade do dia!";
  }
};

/**
 * Assistente de Mesa IA: Analisa fluxo e urgência.
 */
export const analyzeTableUrgency = async (tables: Table[], orders: Order[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise a ocupação: ${JSON.stringify(tables)}. Pedidos: ${JSON.stringify(orders)}. 
  Diga em uma frase curta qual área (Interior/Exterior) precisa de mais atenção agora.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "Fluxo estável em todas as zonas.";
  } catch (e) {
    return "Operação normal.";
  }
};

/**
 * Análise de Performance de Negócio: Gera insights táticos e tendências baseados em dados de vendas.
 */
export const analyzeBusinessPerformance = async (orders: Order[], menu: Dish[]): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise o desempenho deste restaurante angolano. 
  Pedidos recentes: ${JSON.stringify(orders.slice(-20))}. 
  Menu: ${JSON.stringify(menu)}.
  Forneça um resumo tático, uma recomendação e a tendência (up ou down). 
  Responda estritamente em JSON conforme o esquema definido.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            trend: { type: Type.STRING, enum: ['up', 'down'] }
          },
          required: ['summary', 'recommendation', 'trend']
        }
      }
    });
    const text = response.text || "{}";
    return JSON.parse(text.trim());
  } catch (e) {
    return { summary: "Análise suspensa temporariamente.", recommendation: "Monitorize o fluxo de caixa manualmente.", trend: 'up' };
  }
};

/**
 * Geração de Relatório Mensal: Consolida insights e projeções estatísticas.
 */
export const generateMonthlyReport = async (orders: Order[], month: number, year: number): Promise<AIMonthlyReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Gere um relatório gerencial para o mês ${month + 1} de ${year}. 
  Histórico de pedidos: ${JSON.stringify(orders.slice(-50))}.
  Forneça uma lista de insights e uma projeção estratégica para o próximo mês. 
  Responda estritamente em JSON conforme o esquema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            projections: { type: Type.STRING }
          },
          required: ['insights', 'projections']
        }
      }
    });
    const text = response.text || "{}";
    return JSON.parse(text.trim());
  } catch (e) {
    return { insights: ["Dados insuficientes para análise profunda."], projections: "Estabilidade esperada no faturamento." };
  }
};
