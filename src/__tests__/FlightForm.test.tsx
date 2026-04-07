import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlightForm } from '../components/flights/FlightForm';

const baseValues = {
  flight_date: '2026-04-06',
  origin_iata: 'SFO',
  destination_iata: 'LAX',
  airline_name: 'United',
  flight_number: 'UA123',
  passengers: [] as { name: string }[],
};

describe('FlightForm', () => {
  it('calls onSubmit with correct payload when all required fields are filled', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<FlightForm initialValues={baseValues} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const [payload] = onSubmit.mock.calls[0];
    expect(payload.flight_date).toBe('2026-04-06');
    expect(payload.origin_iata).toBe('SFO');
    expect(payload.destination_iata).toBe('LAX');
    expect(payload.airline_name).toBe('United');
    expect(payload.flight_number).toBe('UA123');
    expect(Array.isArray(payload.passengers)).toBe(true);
  });

  it('does not submit when required fields are empty', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<FlightForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('adds a passenger card when the add button is clicked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<FlightForm initialValues={baseValues} onSubmit={onSubmit} onCancel={vi.fn()} />);

    const input = screen.getByPlaceholderText(/add passenger/i);
    await user.type(input, 'Bob');
    await user.click(screen.getByRole('button', { name: /add passenger/i }));

    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('removes a passenger card when the remove button is clicked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <FlightForm
        initialValues={{ ...baseValues, passengers: [{ name: 'Alice' }] }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove alice/i }));
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('includes passengers with per-passenger fields in submitted payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <FlightForm
        initialValues={{
          ...baseValues,
          passengers: [
            { name: 'Alice', seat: '3A', class: 'Business' },
            { name: 'Bob' },
          ],
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const passengers = onSubmit.mock.calls[0][0].passengers;
    expect(passengers).toHaveLength(2);
    const alice = passengers.find((p: { name: string }) => p.name === 'Alice');
    expect(alice.seat).toBe('3A');
    expect(alice.class).toBe('Business');
    expect(passengers.find((p: { name: string }) => p.name === 'Bob')).toBeDefined();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<FlightForm initialValues={baseValues} onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
