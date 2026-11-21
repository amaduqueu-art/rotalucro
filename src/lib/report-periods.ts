/** Períodos de emissão de relatório. */
export type ReportPeriod =
  | 'diario'
  | 'semanal'
  | 'mensal'
  | 'trimestral'
  | 'semestral'
  | 'anual';

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  diario: 'Diário',
  semanal: 'Semanal',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

export interface DateRange {
  start: Date;
  end: Date;
}

/** Calcula o intervalo [início, fim] do período que contém a data de referência. */
export function getPeriodRange(period: ReportPeriod, ref: Date): DateRange {
  const d = new Date(ref);
  let start: Date;
  let end: Date;

  switch (period) {
    case 'diario': {
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      break;
    }
    case 'semanal': {
      const day = d.getDay(); // 0 = domingo
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start = new Date(d);
      start.setDate(d.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'mensal': {
      start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'trimestral': {
      const q = Math.floor(d.getMonth() / 3);
      start = new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0);
      end = new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
      break;
    }
    case 'semestral': {
      const h = d.getMonth() < 6 ? 0 : 6;
      start = new Date(d.getFullYear(), h, 1, 0, 0, 0, 0);
      end = new Date(d.getFullYear(), h + 6, 0, 23, 59, 59, 999);
      break;
    }
    case 'anual': {
      start = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(d.getFullYear(), 12, 0, 23, 59, 59, 999);
      break;
    }
  }

  return { start, end };
}

/** Rótulo legível do intervalo (ex.: "01/11/2026 a 30/11/2026"). */
export function formatRange(range: DateRange): string {
  const fmt = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}/${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}/${date.getFullYear()}`;
  return `${fmt(range.start)} a ${fmt(range.end)}`;
}
