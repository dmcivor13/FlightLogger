import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURE_CSV = path.join(__dirname, '../fixtures/sample-tripit.csv');

test.describe('CSV Import flow', () => {
  test('upload CSV for Alice — preview shows creates, confirm works, flights appear in list', async ({ page }) => {
    await page.goto('/import');

    await page.fill('input[placeholder*="Passenger name"]', 'Alice');
    await page.setInputFiles('input[type="file"]', FIXTURE_CSV);
    await page.click('button:text("Preview")');

    // Step 2 — preview
    await expect(page.locator('text=3 flights will be created')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=0 merged')).not.toBeVisible();

    await page.click('button:text("Confirm Import")');

    // Step 3 — result
    await expect(page.locator('text=3 flights created')).toBeVisible({ timeout: 5000 });

    // Navigate to flights list
    await page.click('a:text("View Flights")');
    await page.waitForURL('/flights');
    await expect(page.locator('text=UA123')).toBeVisible();
  });

  test('uploading same CSV for Alice again results in all skipped', async ({ page }) => {
    // Upload once for Alice
    await page.goto('/import');
    await page.fill('input[placeholder*="Passenger name"]', 'Alice');
    await page.setInputFiles('input[type="file"]', FIXTURE_CSV);
    await page.click('button:text("Preview")');
    await page.click('button:text("Confirm Import")');
    await expect(page.locator('text=3 flights created')).toBeVisible({ timeout: 5000 });

    // Upload again for Alice
    await page.click('button:text("Import Another")');
    await page.fill('input[placeholder*="Passenger name"]', 'Alice');
    await page.setInputFiles('input[type="file"]', FIXTURE_CSV);
    await page.click('button:text("Preview")');

    // All 3 should be skipped
    await expect(page.locator('text=3 skipped')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=0 flights will be created')).not.toBeVisible();
  });

  test('uploading same CSV for Bob tags him on existing flights without creating duplicates', async ({ page }) => {
    // Alice first
    await page.goto('/import');
    await page.fill('input[placeholder*="Passenger name"]', 'Alice');
    await page.setInputFiles('input[type="file"]', FIXTURE_CSV);
    await page.click('button:text("Preview")');
    await page.click('button:text("Confirm Import")');
    await expect(page.locator('text=3 flights created')).toBeVisible({ timeout: 5000 });

    // Bob next
    await page.click('button:text("Import Another")');
    await page.fill('input[placeholder*="Passenger name"]', 'Bob');
    await page.setInputFiles('input[type="file"]', FIXTURE_CSV);
    await page.click('button:text("Preview")');

    // All 3 should be merges
    await expect(page.locator('text=3 will update existing records')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=0 flights will be created')).not.toBeVisible();

    await page.click('button:text("Confirm Import")');
    await expect(page.locator('text=3 merged')).toBeVisible({ timeout: 5000 });

    // Navigate to a flight — Bob should be tagged
    await page.goto('/flights');
    await page.click('text=UA123');
    await expect(page.locator('text=Bob')).toBeVisible();

    // Total flights should still be 3
    await page.goto('/flights');
    const cards = page.locator('a[href^="/flights/"]');
    await expect(cards).toHaveCount(3);
  });
});
