import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientRecord } from "../types";
import { calcScore } from "./hrp-logic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export type InsightType = 'summary' | 'risk' | 'action' | 'pattern';

export async function getDistrictInsights(patients: PatientRecord[], type: InsightType = 'summary') {
  const active = patients.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion');
  const critical = active.filter(r => calcScore(r.r) >= 5);
  const blocks = [...new Set(patients.map(p => p.b))].sort();
  
  const blockStats = blocks.map(bl => {
    const bp = active.filter(r => r.b === bl);
    const odCount = bp.filter(r => isOverdue(r)).length;
    return `${bl}: ${bp.length} active, ${odCount} overdue`;
  }).join('; ');

  const topRisks = getTopRisks(patients, 8);

  const prompts: Record<InsightType, string> = {
    summary: `You are a public health analyst for Mayiladuthurai District, Tamil Nadu. Provide a concise district HRP status summary in 5-6 bullet points.

Data snapshot:
- Total registered: ${patients.length}
- Active pregnancies: ${active.length}
- Critical risk (score >= 5): ${critical.length}
- Block-wise: ${blockStats}
- Top risk conditions: ${topRisks}

Write bullet points in plain language suitable for a Collector's morning brief. Be direct and action-oriented.`,

    risk: `You are a maternal health analyst. Analyse these high-risk pregnancy patterns for Mayiladuthurai District.

Risk data:
- Total active: ${active.length}
- Critical (score >= 5): ${critical.length}
- High (score 3-4): ${active.filter(r => { const s = calcScore(r.r); return s >= 3 && s < 5; }).length}
- Top risk conditions: ${topRisks}
- Block-wise active: ${blockStats}

Provide: (1) Key risk patterns observed (2) Which blocks need immediate attention (3) Most common risk combinations to watch. Keep response structured and under 250 words.`,

    action: `You are a district health programme manager. Generate specific action points for the HRP programme.

Current Situation:
- Active cases: ${active.length}
- Critical risk cases: ${critical.length}
- Block-wise status: ${blockStats}

Generate 6-8 specific, numbered action points for the District Collector / CMHO to act on this week. Be specific about which blocks, timelines, and responsible officers where possible.`,

    pattern: `You are an epidemiologist analysing high-risk pregnancy patterns in Mayiladuthurai District.

- Total: ${patients.length} registered, ${active.length} active
- Top risk conditions: ${topRisks}
- Block distribution: ${blockStats}

Identify: (1) Emerging patterns or clusters (2) Blocks with disproportionate risk burden (3) Any seasonal or programmatic insights (4) Recommendations for programme strengthening. Keep response under 200 words.`
  };

  try {
    const result = await model.generateContent(prompts[type]);
    return result.response.text();
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "Unable to generate insights at this time. Please check district connectivity.";
  }
}

function getTopRisks(patients: PatientRecord[], count: number = 3): string {
    const counts: Record<string, number> = {};
    patients.flatMap(p => p.r).forEach(f => counts[f] = (counts[f] || 0) + 1);
    return Object.entries(counts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, count)
        .map(([f, n]) => `${f} (${n})`)
        .join(", ");
}
