import { addDays, toISO, weekStart } from './dates';
import type { Assignment, Session, Subject } from './plan';

export interface PlannerData {
  subjects: Subject[];
  assignments: Assignment[];
  sessions: Session[];
}

export const EMPTY: PlannerData = { subjects: [], assignments: [], sessions: [] };

export const SUBJECT_COLORS = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#dc2626', '#4b5563'];

/** Demo plan built around the current week so it always looks current. */
export function demoData(today = toISO(new Date())): PlannerData {
  const mon = weekStart(today);
  const subjects: Subject[] = [
    { id: 'demo-s1', name: 'Demo: Statistics', color: '#2563eb' },
    { id: 'demo-s2', name: 'Demo: Organic Chemistry', color: '#16a34a' },
    { id: 'demo-s3', name: 'Demo: Modern History', color: '#d97706' },
  ];
  const assignments: Assignment[] = [
    { id: 'demo-a1', subjectId: 'demo-s1', title: 'Problem set 4: regression', due: addDays(mon, 3), estimateHours: 4, done: false },
    { id: 'demo-a2', subjectId: 'demo-s2', title: 'Lab report: esterification', due: addDays(mon, 5), estimateHours: 5, done: false },
    { id: 'demo-a3', subjectId: 'demo-s3', title: 'Reading notes, chapters 7–8', due: addDays(mon, 1), estimateHours: 2, done: true },
    { id: 'demo-a4', subjectId: 'demo-s3', title: 'Essay outline', due: addDays(mon, 9), estimateHours: 3, done: false },
  ];
  const sessions: Session[] = [
    { id: 'demo-x1', subjectId: 'demo-s3', assignmentId: 'demo-a3', date: mon, start: '16:00', minutes: 60, done: true },
    { id: 'demo-x2', subjectId: 'demo-s1', assignmentId: 'demo-a1', date: addDays(mon, 1), start: '15:30', minutes: 90, done: false },
    { id: 'demo-x3', subjectId: 'demo-s2', assignmentId: 'demo-a2', date: addDays(mon, 2), start: '10:00', minutes: 120, done: false },
    { id: 'demo-x4', subjectId: 'demo-s1', assignmentId: 'demo-a1', date: addDays(mon, 2), start: '18:00', minutes: 60, done: false },
    { id: 'demo-x5', subjectId: 'demo-s2', assignmentId: 'demo-a2', date: addDays(mon, 4), start: '14:00', minutes: 90, done: false },
  ];
  return { subjects, assignments, sessions };
}
