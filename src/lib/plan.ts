import { daysBetween, isValidISODate } from './dates';

export interface Subject {
  id: string;
  name: string;
  color: string;
}
export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  due: string;
  estimateHours: number;
  done: boolean;
}
export interface Session {
  id: string;
  subjectId: string;
  assignmentId: string | null;
  date: string;
  start: string; // HH:MM
  minutes: number;
  done: boolean;
}

export type Errors<T> = Partial<Record<keyof T, string>>;

export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60), m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function validateSubject(name: string, existing: Subject[]): string | null {
  const n = name.trim();
  if (!n) return 'Enter a subject name.';
  if (n.length > 40) return 'Keep subject names under 40 characters.';
  if (existing.some((s) => s.name.toLowerCase() === n.toLowerCase())) return 'That subject already exists.';
  return null;
}

export function validateAssignment(a: { subjectId: string; title: string; due: string; estimateHours: string }) {
  const errors: Errors<typeof a> = {};
  if (!a.subjectId) errors.subjectId = 'Choose a subject.';
  if (!a.title.trim()) errors.title = 'Describe the assignment.';
  if (!isValidISODate(a.due)) errors.due = 'Pick a due date.';
  const est = Number(a.estimateHours);
  if (a.estimateHours === '' || !Number.isFinite(est) || est <= 0 || est > 200) errors.estimateHours = 'Estimate between 0.5 and 200 hours.';
  return errors;
}

export function validateSession(
  s: { subjectId: string; date: string; start: string; minutes: string },
  existing: Session[],
  ignoreId?: string,
) {
  const errors: Errors<typeof s> = {};
  if (!s.subjectId) errors.subjectId = 'Choose a subject.';
  if (!isValidISODate(s.date)) errors.date = 'Pick a date.';
  const start = toMinutes(s.start);
  if (start == null) errors.start = 'Use a time like 16:30.';
  const mins = Number(s.minutes);
  if (!Number.isInteger(mins) || mins < 15 || mins > 480) errors.minutes = 'Sessions run 15 to 480 minutes.';
  if (!errors.date && start != null && !errors.minutes) {
    if (start + mins > 24 * 60) errors.minutes = 'The session would run past midnight.';
    const clash = findOverlap({ date: s.date, start: s.start, minutes: mins }, existing, ignoreId);
    if (clash) errors.start = `Overlaps another session at ${clash.start}.`;
  }
  return errors;
}

export function findOverlap(s: { date: string; start: string; minutes: number }, existing: Session[], ignoreId?: string) {
  const a0 = toMinutes(s.start)!;
  const a1 = a0 + s.minutes;
  return existing.find((e) => {
    if (e.id === ignoreId || e.date !== s.date) return false;
    const b0 = toMinutes(e.start)!;
    const b1 = b0 + e.minutes;
    return a0 < b1 && b0 < a1;
  });
}

export type DueStatus = 'done' | 'overdue' | 'today' | 'soon' | 'later';

export function dueStatus(a: Assignment, today: string): DueStatus {
  if (a.done) return 'done';
  const d = daysBetween(today, a.due);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 3) return 'soon';
  return 'later';
}

export function dueLabel(a: Assignment, today: string): string {
  const d = daysBetween(today, a.due);
  switch (dueStatus(a, today)) {
    case 'done':
      return 'Completed';
    case 'overdue':
      return `Overdue by ${-d} day${d === -1 ? '' : 's'}`;
    case 'today':
      return 'Due today';
    default:
      return `Due in ${d} day${d === 1 ? '' : 's'}`;
  }
}

export function progress(assignments: Assignment[]) {
  const total = assignments.length;
  const done = assignments.filter((a) => a.done).length;
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function plannedMinutesFor(assignmentId: string, sessions: Session[]) {
  return sessions.filter((s) => s.assignmentId === assignmentId).reduce((sum, s) => sum + s.minutes, 0);
}

export function sortByDue(list: Assignment[]): Assignment[] {
  return [...list].sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
}
