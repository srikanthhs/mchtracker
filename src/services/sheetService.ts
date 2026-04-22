import { PatientRecord } from '../types';

const SHEET_URL = '/api/sheet-data';

export async function fetchSheetData(): Promise<any[]> {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

/**
 * Maps raw sheet data to the PatientRecord format using fuzzy key matching.
 * Handles common variations like "Mother Name", "mother_name", "MotherName", etc.
 */
export function mapSheetToPatient(raw: any): Partial<PatientRecord> {
  // Helper to find value from any potential key variant
  const getVal = (variants: string[]) => {
    for (const v of variants) {
      const lowerV = v.toLowerCase().replace(/[\s_]/g, '');
      for (const [key, val] of Object.entries(raw)) {
        const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '');
        if (normalizedKey === lowerV) return val;
      }
    }
    return undefined;
  };

  return {
    id: String(getVal(['PICME', 'PICMENo', 'id']) || ''),
    n: String(getVal(['MotherName', 'Mother Name', 'Name', 'n']) || 'Unknown'),
    hu: String(getVal(['HusbandName', 'Husband Name', 'hu']) || ''),
    b: String(getVal(['Block', 'b']) || ''),
    p: String(getVal(['PHC', 'p']) || ''),
    h: String(getVal(['HSC', 'h']) || ''),
    e: String(getVal(['EDD', 'EDDDate', 'e']) || ''),
    a: Number(getVal(['Age', 'a'])) || null,
    ph: String(getVal(['Phone', 'Contact', 'Mobile', 'ph']) || ''),
    g: String(getVal(['Gravida', 'g']) || ''),
    pa: String(getVal(['Para', 'pa']) || ''),
    r: Array.isArray(raw.RiskFlags || raw.RiskFactors || raw.r) 
      ? (raw.RiskFlags || raw.RiskFactors || raw.r)
      : (typeof (raw.r || raw.RiskFactors) === 'string' 
          ? (raw.r || raw.RiskFactors).split(',').map((s: string) => s.trim()) 
          : []),
    pp: String(getVal(['PlannedPlace', 'Planned Place', 'pp']) || ''),
    rm: String(getVal(['Remarks', 'Notes', 'rm']) || ''),
    ds: String(getVal(['DeliveryStatus', 'Status', 'ds']) || '')
  };
}
