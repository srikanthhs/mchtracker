import { PatientRecord } from '../types';

const SHEET_URL = '/api/sheet-data';

export async function fetchSheetData(customUrl?: string): Promise<any[]> {
  try {
    const url = customUrl ? `${SHEET_URL}?url=${encodeURIComponent(customUrl)}` : SHEET_URL;
    console.log(`[CLIENT] Fetching sheet data via proxy: ${url}`);
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    
    // Check for SPA fallback (if server returns index.html for a missing API route)
    if (contentType.includes('text/html')) {
       const text = await response.text();
       
       // Detect the app's own index page
       if (text.includes('id="root"') || text.includes('Vite + React')) {
         const error = new Error('API Route Not Found on Server');
         (error as any).details = 'The server is returning the application index instead of the data API. This usually means the server.ts proxy is not running correctly or the path is misspelled.';
         throw error;
       }

       if (!response.ok) {
         try {
           const errBody = JSON.parse(text);
           const error = new Error(errBody.error || `Server Error ${response.status}`);
           (error as any).details = errBody.details || errBody.snippet || 'No further details.';
           throw error;
         } catch {
           const error = new Error('Non-JSON Error Page Received');
           (error as any).details = text.substring(0, 200);
           throw error;
         }
       }
       
       const error = new Error('Unexpected Web Page Received');
       const isSignIn = text.includes('Sign in') || text.includes('ServiceLogin') || text.includes('google-signin');
       
       (error as any).details = isSignIn
         ? 'ACCESS DENIED: Google is asking to Sign In. You MUST set "Who has access" to "Anyone" when deploying your script.'
         : `received HTML instead of JSON. You might have pasted the "Editor" URL instead of the "Deployment" URL.`;
       throw error;
    }

    if (!response.ok) {
       const text = await response.text();
       const ct = response.headers.get('content-type') || 'unknown';
       console.error(`[CLIENT] Proxy Error ${response.status} (${ct}): ${text.substring(0, 100)}`);
       let errBody: any = {};
       try {
         errBody = JSON.parse(text);
       } catch (e) {
         errBody = { error: `HTTP ${response.status}`, details: text.substring(0, 200) };
       }
       
       const errorMsg = errBody.error || `Error ${response.status}`;
       const error = new Error(errorMsg);
       (error as any).details = errBody.details || `The server returned ${response.status}`;
       if (errBody.url) (error as any).url = errBody.url;
       throw error;
    }

    const data = await response.json();
    
    // Check for error property in the JSON itself (Google Script catch block)
    if (data && !Array.isArray(data) && data.error) {
      const error = new Error(data.error);
      (error as any).details = 'The Google Script encountered a internal code error.';
      throw error;
    }

    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

/**
 * Validates patient record fields according to clinical tracking requirements.
 */
export function validatePatientData(data: Partial<PatientRecord>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 1. Mother Name Validation
  const name = data.n || '';
  if (!name || name === 'Unknown' || name.trim() === '') {
    errors.push('Mother Name is required');
  }

  // 2. Age Validation
  const age = data.a;
  if (age !== undefined && age !== null) {
    if (isNaN(Number(age))) {
      errors.push('Age must be a valid number');
    } else if (age < 12 || age > 60) {
      errors.push('Age must be between 12 and 60');
    }
  }

  // 3. EDD Validation
  const edd = data.e || '';
  if (edd && edd.trim() !== '') {
    const d = new Date(edd);
    if (isNaN(d.getTime())) {
      errors.push('EDD must be a valid date (YYYY-MM-DD)');
    }
  }

  return { 
    isValid: errors.length === 0, 
    errors 
  };
}

/**
 * Maps raw sheet data to the PatientRecord format using fuzzy key matching.
 * Handles common variations like "Mother Name", "mother_name", "MotherName", etc.
 */
export function mapSheetToPatient(raw: any): Partial<PatientRecord> & { isValid: boolean; validationErrors: string[] } {
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

  const name = String(getVal(['MotherName', 'Mother Name', 'Name', 'n']) || 'Unknown');
  const ageRaw = getVal(['Age', 'a']);
  const age = (ageRaw !== undefined && ageRaw !== '' && ageRaw !== null) ? Number(ageRaw) : null;
  const edd = String(getVal(['EDD', 'EDDDate', 'e']) || '');

  const mapped: Partial<PatientRecord> = {
    id: String(getVal(['PICME', 'PICMENo', 'id']) || ''),
    n: name,
    hu: String(getVal(['HusbandName', 'Husband Name', 'hu']) || ''),
    b: String(getVal(['Block', 'b']) || ''),
    p: String(getVal(['PHC', 'p']) || ''),
    h: String(getVal(['HSC', 'h']) || ''),
    e: edd,
    a: age,
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

  const { isValid, errors } = validatePatientData(mapped);

  return {
    ...mapped,
    isValid,
    validationErrors: errors
  };
}
