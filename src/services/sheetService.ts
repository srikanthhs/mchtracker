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
 * Maps raw sheet data to the PatientRecord format.
 * Adjust this if the sheet column names differ from our schema.
 */
export function mapSheetToPatient(raw: any): Partial<PatientRecord> {
  return {
    id: String(raw.PICME || raw.id || ''),
    n: raw.MotherName || raw.n || 'Unknown',
    hu: raw.HusbandName || raw.hu || '',
    b: raw.Block || raw.b || '',
    p: raw.PHC || raw.p || '',
    h: raw.HSC || raw.h || '',
    e: raw.EDD || raw.e || '',
    a: Number(raw.Age || raw.a) || null,
    ph: String(raw.Phone || raw.ph || ''),
    g: String(raw.Gravida || raw.g || ''),
    pa: String(raw.Para || raw.pa || ''),
    r: Array.isArray(raw.RiskFlags) ? raw.RiskFlags : (typeof raw.r === 'string' ? raw.r.split(',').map((s: string) => s.trim()) : []),
    pp: raw.PlannedPlace || raw.pp || '',
    rm: raw.Remarks || raw.rm || '',
    ds: raw.DeliveryStatus || raw.ds || ''
  };
}
