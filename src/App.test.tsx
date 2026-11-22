import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('StudyFlow workflow', () => {
  it('guides a new user to create a subject first', () => {
    window.location.hash = '/week';
    render(<App />);
    expect(screen.getByText('Start by adding a subject')).toBeInTheDocument();
  });

  it('creates a subject and assignment, plans a session and tracks completion', async () => {
    window.location.hash = '/subjects';
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add subject' }));
    expect(screen.getByText('Enter a subject name.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Subject name'), 'Linear Algebra');
    await user.click(screen.getByRole('button', { name: 'Add subject' }));
    expect(screen.getByText(/Added Linear Algebra/)).toBeInTheDocument();
    unmount();

    window.location.hash = '/assignments';
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add assignment' }));
    expect(screen.getByText('Describe the assignment.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Title'), 'Eigenvalues worksheet');
    await user.click(screen.getByRole('button', { name: 'Add assignment' }));
    expect(screen.getByText(/Added “Eigenvalues worksheet”/)).toBeInTheDocument();
    await user.click(screen.getByLabelText('Mark “Eigenvalues worksheet” complete'));
    expect(screen.getByText('1 of 1 complete')).toBeInTheDocument();
  });

  it('flags overlapping sessions in the weekly plan', async () => {
    window.location.hash = '/week';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Load demo plan' }));
    const start = screen.getByLabelText('Start time');
    await user.clear(start);
    await user.type(start, '09:00');
    await user.click(screen.getByRole('button', { name: 'Add session' }));
    expect(screen.getByText(/Session added/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add session' }));
    expect(screen.getByText(/Overlaps another session at 09:00/)).toBeInTheDocument();
  });
});
