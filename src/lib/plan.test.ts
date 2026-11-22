import { describe, expect, it } from 'vitest';
import { addDays, isValidISODate, weekDays, weekStart } from './dates';
import { dueLabel, dueStatus, findOverlap, formatMinutes, progress, validateAssignment, validateSession, type Assignment, type Session } from './plan';

const base: Assignment = { id: 'a', subjectId: 's', title: 'Essay', due: '2026-03-10', estimateHours: 3, done: false };
const session = (over: Partial<Session>): Session => ({ id: 'x', subjectId: 's', assignmentId: null, date: '2026-03-09', start: '10:00', minutes: 60, done: false, ...over });

describe('dates', () => {
  it('finds the Monday of a week', () => {
    expect(weekStart('2026-03-12')).toBe('2026-03-09'); // Thursday -> Monday
    expect(weekStart('2026-03-15')).toBe('2026-03-09'); // Sunday -> Monday
    expect(weekDays('2026-03-09')).toHaveLength(7);
  });
  it('handles month boundaries and validates dates', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-02-28')).toBe(true);
  });
});

describe('due status', () => {
  it('classifies by days remaining', () => {
    expect(dueStatus(base, '2026-03-11')).toBe('overdue');
    expect(dueStatus(base, '2026-03-10')).toBe('today');
    expect(dueStatus(base, '2026-03-08')).toBe('soon');
    expect(dueStatus(base, '2026-03-01')).toBe('later');
    expect(dueStatus({ ...base, done: true }, '2026-03-11')).toBe('done');
    expect(dueLabel(base, '2026-03-12')).toBe('Overdue by 2 days');
  });
});

describe('sessions', () => {
  it('detects overlaps on the same day only', () => {
    const existing = [session({ id: '1' })];
    expect(findOverlap({ date: '2026-03-09', start: '10:30', minutes: 30 }, existing)).toBeTruthy();
    expect(findOverlap({ date: '2026-03-09', start: '11:00', minutes: 30 }, existing)).toBeUndefined();
    expect(findOverlap({ date: '2026-03-10', start: '10:30', minutes: 30 }, existing)).toBeUndefined();
  });
  it('validates fields', () => {
    const errs = validateSession({ subjectId: '', date: '', start: '25:00', minutes: '5' }, []);
    expect(Object.keys(errs).sort()).toEqual(['date', 'minutes', 'start', 'subjectId']);
    expect(validateSession({ subjectId: 's', date: '2026-03-09', start: '23:30', minutes: '60' }, []).minutes).toMatch(/midnight/);
  });
});

describe('assignments and progress', () => {
  it('validates required fields', () => {
    expect(validateAssignment({ subjectId: '', title: ' ', due: '', estimateHours: '0' })).toHaveProperty('estimateHours');
    expect(validateAssignment({ subjectId: 's', title: 'Lab', due: '2026-03-01', estimateHours: '2' })).toEqual({});
  });
  it('computes completion percentage', () => {
    expect(progress([])).toEqual({ total: 0, done: 0, pct: 0 });
    expect(progress([base, { ...base, id: 'b', done: true }, { ...base, id: 'c', done: true }]).pct).toBe(67);
  });
  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(95)).toBe('1 h 35 min');
  });
});
