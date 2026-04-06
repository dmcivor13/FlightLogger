import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../components/flights/FilterBar';
import type { FlightsFilter } from '../types';

describe('FilterBar', () => {
  it('calls onChange when origin input changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar filters={{}} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/origin/i);
    await user.type(input, 'SFO');

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ origin: 'SFO' }));
  });

  it('calls onChange when passenger input changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar filters={{}} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/passenger/i);
    await user.type(input, 'Alice');

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ passenger: 'Alice' }));
  });

  it('clears all fields when Clear button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const filters: FlightsFilter = { origin: 'SFO', passenger: 'Alice' };
    render(<FilterBar filters={filters} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('renders class of service select with all options', () => {
    render(<FilterBar filters={{}} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: /class/i });
    expect(select).toBeInTheDocument();
    ['Economy', 'Premium Economy', 'Business', 'First'].forEach((cls) => {
      expect(screen.getByRole('option', { name: cls })).toBeInTheDocument();
    });
  });
});
