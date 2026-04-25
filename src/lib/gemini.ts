import { GoogleGenerativeAI } from "@google/generative-ai";
import { PatientRecord } from "../types";
import { calcScore, isOverdue } from "./hrp-logic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.2, // Lower temperature for more factual analysis
    topP: 0.8,
    topK: 40,
  }
});

export type InsightType = 'summary' | 'risk' | 'pattern' | 'intervention';

export async function getDistrictInsights(patients: PatientRecord[], type: InsightType = 'summary') {
  const active = patients.filter(r => r.ds !== 'Delivered' && r.ds !== 'Abortion');
  const critical = active.filter(r => calcScore(r.r) >= 5);
  const high = active.filter(r => { const s = calcScore(r.r); return s >= 3 && s < 5; });
  const blocks = [...new Set(patients.map(p => p.b))].sort();
  
  const blockStats = blocks.map(bl => {
    const bp = active.filter(r => r.b === bl);
    const critCount = bp.filter(r => calcScore(r.r) >= 5).length;
    const odCount = bp.filter(r => isOverdue(r)).length;
    const avgAge = bp.length > 0 ? (bp.reduce((sum, r) => sum + (r.a || 0), 0) / bp.length).toFixed(1) : 'N/A';
    return `[${bl}: ${bp.length} ANC, ${critCount} Critical, ${odCount} Overdue, Avg Age ${avgAge}]`;
  }).join(' ');

  const topRisks = getTopRisks(active, 10);
  
  // Calculate age-wise risk
  const teensCount = active.filter(r => (r.a || 0) < 20).length;
  const advancedMaternalAge = active.filter(r => (r.a || 0) >= 35).length;

  const context = `
District: Mayiladuthurai, Tamil Nadu
Snapshot:
- Total Registered Mothers: ${patients.length}
- Current Active ANC: ${active.length}
- Critical Risk (Score 5+): ${critical.length} (${((critical.length/active.length)*100).toFixed(1)}%)
- High Risk (Score 3-4): ${high.length}
- Teenage ANC (<20): ${teensCount}
- Advanced Maternal Age (35+): ${advancedMaternalAge}
- Block-wise Metrics (ANC/Critical/Overdue): ${blockStats}
- Frequent Risk Flags: ${topRisks}
  `;

  const prompts: Record<InsightType, string> = {
    summary: `${context}
    You are a Senior Public Health Consultant. Provide a high-level executive summary for the District Collector.
    - Highlight the most alarming metric immediately.
    - Summarize the current maternal health burden.
    - Identify the top 2 blocks requiring administrative focus.
    - Keep it professional, data-driven, and under 5 bullet points. Use bolding for key figures.`,

    risk: `${context}
    You are a Medical Risk Analyst. Perform a deep-dive into the high-risk cohorts.
    - Correlate risk flags with block distribution.
    - Identify if specific blocks have localized clusters of specific risks (e.g., Anemia in one block, PIH in another).
    - Analyze the 'Overdue' follow-up trend and its potential impact on critical outcomes.
    - Use tables or structured lists if helpful. Focus on the 'why' behind the numbers.`,

    pattern: `${context}
    You are an Epidemiologist. Identify underlying maternal health patterns in Mayiladuthurai.
    - Analyze the intersection of age (teen/advanced) and clinical risk scores.
    - Look for geographical disparites in service delivery (Overdue rates vs Critical cases).
    - Identify emerging trends that might lead to maternal morbidity if unaddressed.
    - Suggest possible socio-economic or programmatic factors based on the data patterns.`,

    intervention: `${context}
    You are the District Health Programme Manager. Design a 7-day tactical intervention plan.
    - Provide 5 specific, measurable actions for the Field Health functionaries.
    - Target the 'Overdue' cases and 'Critical' cases with block-specific instructions.
    - Suggest administrative directives for the CMHO/BMOs.
    - Include a 'success metric' for each recommendation. Be tactical and precise.`
  };

  try {
    const result = await model.generateContent(prompts[type]);
    return result.response.text();
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "### ⚠️ Intelligence Link Interrupted\nUnable to generate insights at this time. Please check district connectivity or API configuration.";
  }
}

function getTopRisks(patients: PatientRecord[], count: number = 5): string {
    const counts: Record<string, number> = {};
    patients.flatMap(p => p.r || []).forEach(f => counts[f] = (counts[f] || 0) + 1);
    return Object.entries(counts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, count)
        .map(([f, n]) => `${f} (${n})`)
        .join(", ");
}
