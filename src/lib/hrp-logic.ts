import { PatientRecord, RiskCategory } from '../types';
import { RISK_WEIGHTS, RISK_CATS } from '../constants';
import { daysUntil } from './utils';

export function calcScore(flags: string[] | null | undefined): number {
  return (flags || []).reduce((s, f) => s + (RISK_WEIGHTS[f] || 0), 0);
}

export function getRiskCat(score: number): RiskCategory {
  for (const c of RISK_CATS) {
    if (score >= c.min) return c;
  }
  return RISK_CATS[RISK_CATS.length - 1];
}

export function getNextVisitDate(rec: PatientRecord): string | null {
  if (rec.lv) {
    const last = new Date(rec.lv);
    if (isNaN(last.getTime())) return null;
    const next = new Date(last.getTime() + 15 * 86400000);
    try {
      return next.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }
  return null;
}

export function isOverdue(rec: PatientRecord): boolean {
  if (rec.ds === 'Delivered' || rec.ds === 'Abortion') return false;
  const nv = getNextVisitDate(rec);
  if (!nv) return false;
  const d = daysUntil(nv);
  return d !== null && d < 0;
}

export function getVisitStatus(rec: PatientRecord) {
  if (rec.ds === 'Delivered' || rec.ds === 'Abortion') return null;
  const nv = getNextVisitDate(rec);
  if (!nv) return { label: 'Schedule', cls: 'bg-gray-100 text-gray-500' };
  const d = daysUntil(nv);
  if (d === null) return null;
  if (d < 0) return { label: `Overdue ${Math.abs(d)}d`, cls: 'bg-red-100 text-red-600' };
  if (d <= 7) return { label: `Due ${d}d`, cls: 'bg-orange-100 text-orange-600' };
  return { label: nv, cls: 'bg-green-100 text-green-600' };
}
