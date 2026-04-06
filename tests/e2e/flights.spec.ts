import { test, expect } from '@playwright/test';

test.describe('Flights — manual add and edit', () => {
  test('add a flight and verify it appears in the list', async ({ page }) => {
    await page.goto('/flights/new');

    await page.fill('input[type="date"]', '2026-05-10');
    await page.fill('input[placeholder*="Origin"]', 'SFO');
    await page.fill('input[placeholder*="Destination"]', 'LAX');
    await page.fill('input[placeholder*="United"]', 'United');
    await page.fill('input[placeholder*="UA123"]', 'UA200');
    await page.fill('input[placeholder*="Boeing"]', 'Airbus A320');
    await page.fill('input[placeholder*="14A"]', '4C');
    await page.selectOption('select[aria-label="Class"]', 'Business');
    await page.fill('textarea', 'Smooth flight, early arrival');

    // Add a passenger
    await page.fill('input[placeholder*="Add passenger"]', 'Alice');
    await page.click('button[aria-label="Add passenger"]');
    expect(await page.textContent('text=Alice')).toBeTruthy();

    await page.click('button[type="submit"]');
    await page.waitForURL('/flights');

    // Flight should appear in the list
    await expect(page.locator('text=SFO')).toBeVisible();
    await expect(page.locator('text=LAX')).toBeVisible();
    await expect(page.locator('text=UA200')).toBeVisible();
  });

  test('edit a flight and verify changes persist', async ({ page }) => {
    // First create a flight
    await page.goto('/flights/new');
    await page.fill('input[type="date"]', '2026-06-01');
    await page.fill('input[placeholder*="Origin"]', 'ORD');
    await page.fill('input[placeholder*="Destination"]', 'BOS');
    await page.fill('input[placeholder*="United"]', 'American');
    await page.fill('input[placeholder*="UA123"]', 'AA50');
    await page.click('button[type="submit"]');
    await page.waitForURL('/flights');

    // Click through to the flight
    await page.click('text=ORD');
    await expect(page.url()).toMatch(/\/flights\/\d+/);

    // Edit it
    await page.click('button:text("Edit")');
    await page.fill('textarea', 'Updated notes from E2E test');
    await page.click('button[type="submit"]');

    // Verify the updated notes are shown
    await expect(page.locator('text=Updated notes from E2E test')).toBeVisible();
  });
});
