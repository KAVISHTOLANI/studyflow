import { useState } from 'react';
import { EmptyState, Field, Landing, NotFound, Notice, Shell, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
import { addDays, formatDay, toISO, weekDays, weekStart } from './lib/dates';
import { demoData, EMPTY, SUBJECT_COLORS, type PlannerData } from './lib/demo';
import {
  dueLabel,
  dueStatus,
  formatMinutes,
  plannedMinutesFor,
  progress,
  sortByDue,
  toMinutes,
  validateAssignment,
  validateSession,
  validateSubject,
  type Assignment,
  type Session,
} from './lib/plan';

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/week', label: 'Week' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/subjects', label: 'Subjects' },
];

type SetData = (fn: (d: PlannerData) => PlannerData) => void;

export default function App() {
  const [route] = useRoute();
  const [data, setRaw] = usePersistentState<PlannerData>('studyflow:data', () => demoData());
  const setData: SetData = (fn) => setRaw((d) => fn(d));
  const today = toISO(new Date());

  let page;
  if (route === '/') page = <Home />;
  else if (data.subjects.length === 0 && ['/week', '/assignments'].includes(route))
    page = <Start setData={setData} />;
  else if (route === '/week') page = <Week data={data} setData={setData} today={today} />;
  else if (route === '/assignments') page = <Assignments data={data} setData={setData} today={today} />;
  else if (route === '/subjects') page = <Subjects data={data} setData={setData} />;
  else page = <NotFound />;

  return (
    <Shell name="StudyFlow" wordmark={['Study', 'Flow']} nav={NAV} route={route} cta={{ to: '/week', label: 'Open my week' }}>
      {page}
    </Shell>
  );
}

function HeroWeek() {
  const today = toISO(new Date());
  const d = demoData(today);
  const mon = weekStart(today);
  const days = weekDays(mon).slice(0, 5);
  const top = 8 * 60, span = 12 * 60;
  const subj = (id: string) => d.subjects.find((s) => s.id === id)!;
  return (
    <div className="hero-week">
      <div className="hw-axis" aria-hidden="true">
        {[8, 11, 14, 17, 20].map((h) => <span key={h} style={{ top: `${((h * 60 - top) / span) * 100}%` }}>{String(h).padStart(2, '0')}:00</span>)}
      </div>
      {days.map((day) => (
        <div key={day} className={`hw-day ${day === today ? 'is-today' : ''}`}>
          <div className="hw-head">{formatDay(day, { weekday: 'short' })} <span>{formatDay(day, { day: 'numeric' })}</span></div>
          <div className="hw-col">
            {d.assignments.filter((a) => a.due === day).map((a) => (
              <div key={a.id} className={`hw-due ${a.done ? 'done' : ''}`} title={a.title}>Due · {a.title.split(':')[0]}</div>
            ))}
            {d.sessions.filter((s) => s.date === day).map((s) => {
              const st = toMinutes(s.start)!;
              return (
                <div key={s.id} className={`hw-block ${s.done ? 'done' : ''}`} style={{ top: `${((st - top) / span) * 100}%`, height: `${(s.minutes / span) * 100}%`, ['--c' as string]: subj(s.subjectId).color }}>
                  <strong>{s.start}</strong>
                  <span>{subj(s.subjectId).name.replace('Demo: ', '')}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Study planner · weekly view"
      title={<>Every deadline, <em>one week at a time.</em></>}
      lead="Add subjects and assignments, schedule study sessions around their due dates, and watch completion climb as you tick things off. Overlaps are caught before they happen."
      primary={{ href: '#/week', label: 'Open my week' }}
      secondary={{ href: '#/assignments', label: 'See assignments' }}
      previewLabel="This week — demo plan"
      preview={<HeroWeek />}
      steps={[
        { title: 'Add subjects', body: 'Give each course a name and colour so the week reads at a glance.' },
        { title: 'Log assignments', body: 'Record the due date and how many hours you expect it to take.' },
        { title: 'Plan sessions', body: 'Book study blocks on specific days. Overlapping blocks are flagged.' },
      ]}
      stepsIntro="StudyFlow opens with a labelled demo plan for the current week, so you can explore before entering your own."
      features={[
        { title: 'Weekly schedule', body: 'Seven-day view with sessions, deadlines and planned hours. Move between weeks.' },
        { title: 'Deadline status', body: 'Overdue, due today and due soon are highlighted in the assignment list.' },
        { title: 'Planned vs estimated', body: 'Each assignment shows how many of its estimated hours you have scheduled.' },
        { title: 'Progress by subject', body: 'Completion percentage overall and for each course.' },
      ]}
      note="Everything is stored in this browser. There are no accounts, reminders or sync between devices yet."
      closing={{ title: <>Plan <em>this week.</em></>, action: { href: '#/week', label: 'Open my week' } }}
    />
  );
}

function Start({ setData }: { setData: SetData }) {
  return (
    <EmptyState
      title="Start by adding a subject"
      actions={
        <>
          <a className="btn btn-primary" href="#/subjects">Add a subject</a>
          <button type="button" className="btn" onClick={() => setData(() => demoData())}>Load demo plan</button>
        </>
      }
    >
      Assignments and study sessions belong to a subject, so create one first — or explore with a labelled demo plan for this week.
    </EmptyState>
  );
}

/* ---------------- Week ---------------- */
function Week({ data, setData, today }: { data: PlannerData; setData: SetData; today: string }) {
  const [start, setStart] = useState(() => weekStart(today));
  const days = weekDays(start);
  const end = days[6];
  const weekSessions = data.sessions.filter((s) => s.date >= start && s.date <= end);
  const planned = weekSessions.reduce((n, s) => n + s.minutes, 0);
  const completed = weekSessions.filter((s) => s.done).reduce((n, s) => n + s.minutes, 0);
  const dueThisWeek = data.assignments.filter((a) => a.due >= start && a.due <= end);
  const overall = progress(data.assignments);
  const subj = (id: string) => data.subjects.find((s) => s.id === id);

  const toggle = (id: string) =>
    setData((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) }));
  const remove = (id: string) => setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace · Week</p>
          <h1>Week of <em>{formatDay(start, { day: 'numeric', month: 'long' })}</em></h1>
          <p>
            {formatDay(start)} – {formatDay(end)}
          </p>
        </div>
        <div className="row" role="group" aria-label="Change week">
          <button type="button" className="btn" onClick={() => setStart(addDays(start, -7))}>← Previous</button>
          <button type="button" className="btn" onClick={() => setStart(weekStart(today))} disabled={start === weekStart(today)}>This week</button>
          <button type="button" className="btn" onClick={() => setStart(addDays(start, 7))}>Next →</button>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><div className="stat-label">Planned this week</div><div className="stat-value">{formatMinutes(planned)}</div></div>
        <div className="stat"><div className="stat-label">Studied</div><div className="stat-value">{formatMinutes(completed)}</div></div>
        <div className="stat"><div className="stat-label">Due this week</div><div className="stat-value">{dueThisWeek.filter((a) => !a.done).length}</div></div>
        <div className="stat">
          <div className="stat-label">Assignments complete</div>
          <div className="stat-value" data-testid="overall">{overall.pct}%</div>
          <div className="progress" aria-hidden="true"><span style={{ width: `${overall.pct}%` }} /></div>
        </div>
      </div>
      <div className="layout-side">
        <SessionForm data={data} setData={setData} defaultDate={days.includes(today) ? today : start} />
        <div className="week-grid">
          {days.map((day) => {
            const items = weekSessions.filter((s) => s.date === day).sort((a, b) => a.start.localeCompare(b.start));
            const due = dueThisWeek.filter((a) => a.due === day);
            return (
              <section key={day} className={`day ${day === today ? 'is-today' : ''}`} aria-label={formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}>
                <h3>
                  {formatDay(day, { weekday: 'short' })} <span className="muted">{formatDay(day, { day: 'numeric' })}</span>
                  {day === today && <span className="badge badge-accent">Today</span>}
                </h3>
                {due.map((a) => (
                  <div key={a.id} className={`due-chip ${a.done ? 'is-done' : ''}`}>Due: {a.title}</div>
                ))}
                {items.length === 0 && due.length === 0 && <p className="hint">Nothing planned</p>}
                {items.map((s) => {
                  const sub = subj(s.subjectId);
                  const a = data.assignments.find((x) => x.id === s.assignmentId);
                  const endMin = toMinutes(s.start)! + s.minutes;
                  return (
                    <div key={s.id} className={`session ${s.done ? 'is-done' : ''}`} style={{ borderLeftColor: sub?.color }}>
                      <label className="check">
                        <input type="checkbox" checked={s.done} onChange={() => toggle(s.id)} aria-label={`Mark ${sub?.name} session at ${s.start} as done`} />
                        <span>
                          <strong>{s.start}–{String(Math.floor(endMin / 60)).padStart(2, '0')}:{String(endMin % 60).padStart(2, '0')}</strong>
                          <span className="session-sub">{sub?.name}</span>
                          {a && <span className="hint">{a.title}</span>}
                        </span>
                      </label>
                      <button type="button" className="btn btn-ghost btn-sm icon-btn" onClick={() => remove(s.id)} aria-label={`Delete session at ${s.start}`}>✕</button>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SessionForm({ data, setData, defaultDate }: { data: PlannerData; setData: SetData; defaultDate: string }) {
  const blank = { subjectId: data.subjects[0]?.id ?? '', assignmentId: '', date: defaultDate, start: '16:00', minutes: '60' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<ReturnType<typeof validateSession>>({});
  const [flash, setFlash] = useFlash();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const openAssignments = data.assignments.filter((a) => a.subjectId === form.subjectId && !a.done);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateSession(form, data.sessions);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const s: Session = {
      id: uid('ses'),
      subjectId: form.subjectId,
      assignmentId: form.assignmentId || null,
      date: form.date,
      start: form.start.padStart(5, '0'),
      minutes: Number(form.minutes),
      done: false,
    };
    setData((d) => ({ ...d, sessions: [...d.sessions, s] }));
    setFlash({ kind: 'success', text: `Session added on ${formatDay(s.date)} at ${s.start}.` });
  }

  return (
    <form className="card stack" onSubmit={submit} noValidate aria-labelledby="add-session">
      <h2 id="add-session">Plan a session</h2>
      <Field label="Subject" error={errors.subjectId}>
        {(c) => (
          <select {...c} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value, assignmentId: '' })}>
            {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Assignment (optional)">
        {(c) => (
          <select {...c} value={form.assignmentId} onChange={set('assignmentId')}>
            <option value="">General revision</option>
            {openAssignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        )}
      </Field>
      <Field label="Date" error={errors.date}>{(c) => <input type="date" {...c} value={form.date} onChange={set('date')} />}</Field>
      <div className="form-grid">
        <Field label="Start time" error={errors.start}>{(c) => <input type="time" {...c} value={form.start} onChange={set('start')} />}</Field>
        <Field label="Minutes" error={errors.minutes}>{(c) => <input type="number" min={15} max={480} step={15} {...c} value={form.minutes} onChange={set('minutes')} />}</Field>
      </div>
      <button type="submit" className="btn btn-primary">Add session</button>
      {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
    </form>
  );
}

/* ---------------- Assignments ---------------- */
function Assignments({ data, setData, today }: { data: PlannerData; setData: SetData; today: string }) {
  const [filter, setFilter] = useState('all');
  const blank = { subjectId: data.subjects[0]?.id ?? '', title: '', due: addDays(today, 7), estimateHours: '2' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<ReturnType<typeof validateAssignment>>({});
  const [flash, setFlash] = useFlash();
  const list = sortByDue(data.assignments.filter((a) => filter === 'all' || a.subjectId === filter));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateAssignment(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const a: Assignment = { id: uid('asg'), subjectId: form.subjectId, title: form.title.trim(), due: form.due, estimateHours: Number(form.estimateHours), done: false };
    setData((d) => ({ ...d, assignments: [...d.assignments, a] }));
    setForm({ ...blank, subjectId: form.subjectId });
    setFlash({ kind: 'success', text: `Added “${a.title}”.` });
  }
  const toggle = (id: string) => setData((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, done: !a.done } : a)) }));
  const remove = (id: string) =>
    setData((d) => ({
      ...d,
      assignments: d.assignments.filter((a) => a.id !== id),
      sessions: d.sessions.map((s) => (s.assignmentId === id ? { ...s, assignmentId: null } : s)),
    }));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace · Assignments</p>
          <h1>Assign<em>ments</em></h1>
          <p>{progress(data.assignments).done} of {data.assignments.length} complete</p>
        </div>
        <Field label="Show subject">
          {(c) => (
            <select {...c} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All subjects</option>
              {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </Field>
      </div>
      <div className="layout-side">
        <form className="card stack" onSubmit={submit} noValidate aria-labelledby="add-asg">
          <h2 id="add-asg">New assignment</h2>
          <Field label="Subject" error={errors.subjectId}>
            {(c) => (
              <select {...c} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Title" error={errors.title}>{(c) => <input type="text" {...c} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Problem set 5" />}</Field>
          <div className="form-grid">
            <Field label="Due date" error={errors.due}>{(c) => <input type="date" {...c} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />}</Field>
            <Field label="Estimated hours" error={errors.estimateHours}>{(c) => <input type="number" step={0.5} min={0.5} {...c} value={form.estimateHours} onChange={(e) => setForm({ ...form, estimateHours: e.target.value })} />}</Field>
          </div>
          <button type="submit" className="btn btn-primary">Add assignment</button>
          {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
        </form>
        <div className="stack">
          {list.length === 0 ? (
            <EmptyState title="No assignments here yet">Add one with the form. Deadlines also appear in your weekly schedule.</EmptyState>
          ) : (
            <ul className="list card asg-list">
              {list.map((a) => {
                const sub = data.subjects.find((s) => s.id === a.subjectId);
                const status = dueStatus(a, today);
                const planned = plannedMinutesFor(a.id, data.sessions);
                return (
                  <li key={a.id} className={`asg ${a.done ? 'is-done' : ''}`}>
                    <input type="checkbox" checked={a.done} onChange={() => toggle(a.id)} aria-label={`Mark “${a.title}” complete`} />
                    <div className="asg-main">
                      <div className="row">
                        <strong className="asg-title">{a.title}</strong>
                        <span className={`badge ${status === 'overdue' ? 'badge-err' : status === 'today' || status === 'soon' ? 'badge-warn' : status === 'done' ? 'badge-ok' : ''}`}>{dueLabel(a, today)}</span>
                      </div>
                      <div className="hint">
                        <span className="dot" style={{ background: sub?.color }} /> {sub?.name} · due {formatDay(a.due)} · {formatMinutes(planned)} planned of {a.estimateHours} h estimated
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(a.id)} aria-label={`Delete “${a.title}”`}>Delete</button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="card">
            <h3>Progress by subject</h3>
            {data.subjects.map((s) => {
              const p = progress(data.assignments.filter((a) => a.subjectId === s.id));
              return (
                <div key={s.id} className="subject-progress">
                  <span>{s.name}</span>
                  <div className="progress" role="progressbar" aria-label={`${s.name} progress`} aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${p.pct}%`, background: s.color }} />
                  </div>
                  <span className="small muted">{p.total ? `${p.done}/${p.total}` : 'none'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Subjects ---------------- */
function Subjects({ data, setData }: { data: PlannerData; setData: SetData }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[data.subjects.length % SUBJECT_COLORS.length]);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateSubject(name, data.subjects);
    setError(err);
    if (err) return;
    setData((d) => ({ ...d, subjects: [...d.subjects, { id: uid('sub'), name: name.trim(), color }] }));
    setFlash({ kind: 'success', text: `Added ${name.trim()}. Next, add an assignment.` });
    setName('');
    setColor(SUBJECT_COLORS[(data.subjects.length + 1) % SUBJECT_COLORS.length]);
  }
  function remove(id: string) {
    setData((d) => ({
      subjects: d.subjects.filter((s) => s.id !== id),
      assignments: d.assignments.filter((a) => a.subjectId !== id),
      sessions: d.sessions.filter((s) => s.subjectId !== id),
    }));
    setConfirmId(null);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace · Subjects</p>
          <h1>Sub<em>jects</em></h1>
          <p>Each subject gets a colour used throughout the planner. Subjects starting with “Demo:” are sample data.</p>
        </div>
        {data.subjects.length > 0 && (
          <button type="button" className="btn btn-danger" onClick={() => { if (window.confirm('Delete all subjects, assignments and sessions?')) setData(() => EMPTY); }}>
            Clear all data
          </button>
        )}
      </div>
      <div className="layout-side">
        <form className="card stack" onSubmit={submit} noValidate aria-labelledby="add-subject">
          <h2 id="add-subject">Add a subject</h2>
          <Field label="Subject name" error={error}>{(c) => <input type="text" {...c} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Linear Algebra" />}</Field>
          <fieldset className="swatches">
            <legend className="label">Colour</legend>
            {SUBJECT_COLORS.map((c) => (
              <label key={c} className="swatch" style={{ background: c }}>
                <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} aria-label={`Colour ${c}`} />
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn btn-primary">Add subject</button>
          {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
        </form>
        {data.subjects.length === 0 ? (
          <EmptyState title="No subjects yet">Add your first course on the left.</EmptyState>
        ) : (
          <ul className="list card">
            {data.subjects.map((s) => {
              const count = data.assignments.filter((a) => a.subjectId === s.id).length;
              return (
                <li key={s.id} className="row row-between">
                  <span className="row">
                    <span className="dot dot-lg" style={{ background: s.color }} />
                    <strong>{s.name}</strong>
                    <span className="hint">{count} assignment{count === 1 ? '' : 's'}</span>
                  </span>
                  {confirmId === s.id ? (
                    <span className="row">
                      <span className="small">Also deletes its assignments and sessions.</span>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(s.id)}>Confirm delete</button>
                      <button type="button" className="btn btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button type="button" className="btn btn-sm" onClick={() => setConfirmId(s.id)} aria-label={`Delete ${s.name}`}>Delete</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
