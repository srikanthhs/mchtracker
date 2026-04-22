import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientRecord } from "../types";
import { calcScore } from "./hrp-logic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function getDistrictInsights(patients: PatientRecord[]) {
  const active = patients.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion');
  const critical = active.filter(r => calcScore(r.r) >= 5);
  const blocks = [...new Set(patients.map(p => p.b))];
  
  const prompt = `You are a public health analyst for Mayiladuthurai District, Tamil Nadu. 
  Analyse the following High Risk Pregnancy (HRP) data and provide 5-6 concise, action-oriented bullet points for health officers.

  DATA SUMMARY:
  Total Records: ${patients.length}
  Active Pregnancies: ${active.length}
  Critical Risk Cases (Score >= 5): ${critical.length}
  Blocks covered: ${blocks.join(", ")}
  
  Top 3 most common risk factors: ${getTopRisks(patients)}

  Please format with bold titles and focus on urgent resource allocation, visit adherence, and delivery planning.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "Unable to generate insights at this time. Please check district connectivity.";
  }
}

function getTopRisks(patients: PatientRecord[]): string {
    const counts: Record<string, number> = {};
    patients.flatMap(p => p.r).forEach(f => counts[f] = (counts[f] || 0) + 1);
    return Object.entries(counts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 3)
        .map(([f, n]) => `${f} (${n})`)
        .join(", ");
}
