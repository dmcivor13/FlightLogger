import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ImportPage } from '../pages/ImportPage';
import * as client from '../api/client';
import type { ImportPreviewResponse } from '../types';

vi.mock('../api/client');

const mockPreview: ImportPreviewResponse = {
  passenger: 'Alice',
  toCreate: [
    { flight_date: '2026-01-15', origin_iata: 'SFO', destination_iata: 'LAX', airline_name: 'United', flight_number: 'UA123', passengers: [{ name: 'Alice', seat: '14A', class: 'Economy' }] },
    { flight_date: '2026-02-20', origin_iata: 'LAX', destination_iata: 'JFK', airline_name: 'Delta', flight_number: 'DL456', passengers: [{ name: 'Alice' }] },
  ],
  toMerge: [
    {
      existingId: 5,
      existingFlight: {
        id: 5, flight_date: '2026-03-10', origin_iata: 'SFO', destination_iata: 'LAS', airline_name: 'Southwest',
        flight_number: 'WN789', passengers: [{ name: 'Bob' }], created_at: '', updated_at: '',
      },
      incomingFlight: { flight_date: '2026-03-10', origin_iata: 'SFO', destination_iata: 'LAS', airline_name: 'Southwest', flight_number: 'WN789', passengers: [{ name: 'Alice' }] },
    },
  ],
  skipped: [],
  token: 'test-token-123',
};

function renderImportPage() {
  return render(
    <MemoryRouter>
      <ImportPage />
    </MemoryRouter>,
  );
}

describe('ImportPage — Step 1 (Upload)', () => {
  beforeEach(() => {
    vi.mocked(client.importPreview).mockResolvedValue(mockPreview);
    vi.mocked(client.importCommit).mockResolvedValue({ rows_processed: 3, flights_created: 2, flights_matched: 1, passengers_added: 0, rows_skipped: 0, warnings: [] });
  });

  it('shows validation error when no file is selected', async () => {
    const user = userEvent.setup();
    renderImportPage();

    await user.type(screen.getByPlaceholderText(/passenger name/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /preview/i }));

    expect(screen.getByText(/please select a csv file/i)).toBeInTheDocument();
    expect(client.importPreview).not.toHaveBeenCalled();
  });

  it('shows validation error when passenger name is empty', async () => {
    const user = userEvent.setup();
    renderImportPage();

    const file = new File(['a,b'], 'flights.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /preview/i }));

    expect(screen.getByText(/passenger name is required/i)).toBeInTheDocument();
    expect(client.importPreview).not.toHaveBeenCalled();
  });
});

describe('ImportPage — Step 2 (Preview)', () => {
  beforeEach(() => {
    vi.mocked(client.importPreview).mockResolvedValue(mockPreview);
    vi.mocked(client.importCommit).mockResolvedValue({ rows_processed: 3, flights_created: 2, flights_matched: 1, passengers_added: 0, rows_skipped: 0, warnings: [] });
  });

  async function goToStep2() {
    const user = userEvent.setup();
    renderImportPage();
    await user.type(screen.getByPlaceholderText(/passenger name/i), 'Alice');
    const file = new File(['fake'], 'flights.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /preview/i }));
    await waitFor(() => expect(screen.getByText(/confirm import/i)).toBeInTheDocument());
    return user;
  }

  it('shows count of flights to create', async () => {
    await goToStep2();
    expect(screen.getByText(/2 flights? will be created/i)).toBeInTheDocument();
  });

  it('shows count of flights to merge', async () => {
    await goToStep2();
    expect(screen.getByText(/1 .*will update/i)).toBeInTheDocument();
  });

  it('skipped section is collapsed by default', async () => {
    const previewWithSkipped: ImportPreviewResponse = {
      ...mockPreview,
      skipped: [{ flight_date: '2026-04-01', origin_iata: 'SFO', destination_iata: 'LAX', airline_name: 'United', flight_number: 'UA999', passengers: [{ name: 'Alice' }] }],
    };
    vi.mocked(client.importPreview).mockResolvedValue(previewWithSkipped);

    const user = userEvent.setup();
    renderImportPage();
    await user.type(screen.getByPlaceholderText(/passenger name/i), 'Alice');
    const file = new File(['fake'], 'flights.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /preview/i }));
    await waitFor(() => screen.getByText(/confirm import/i));

    // The skipped flights list should not be visible (collapsed)
    expect(screen.queryByText('UA999')).not.toBeInTheDocument();
    // But the section header should be present
    expect(screen.getByText(/1 skipped/i)).toBeInTheDocument();
  });
});

describe('ImportPage — Step 3 (Result)', () => {
  it('shows created/merged/skipped counts after commit', async () => {
    vi.mocked(client.importPreview).mockResolvedValue(mockPreview);
    vi.mocked(client.importCommit).mockResolvedValue({ rows_processed: 3, flights_created: 2, flights_matched: 1, passengers_added: 0, rows_skipped: 0, warnings: [] });

    const user = userEvent.setup();
    renderImportPage();
    await user.type(screen.getByPlaceholderText(/passenger name/i), 'Alice');
    const file = new File(['fake'], 'flights.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /preview/i }));
    await waitFor(() => screen.getByText(/confirm import/i));
    await user.click(screen.getByRole('button', { name: /confirm import/i }));

    await waitFor(() => {
      expect(screen.getByText(/2 flights? created/i)).toBeInTheDocument();
      expect(screen.getByText(/1 matched/i)).toBeInTheDocument();
    });
  });
});
