import { test, expect } from '@playwright/test';
import { createTestUser, loginViaUI } from '../fixtures/test-user.js';

test.describe('Trip Lifecycle E2E Flow', () => {
  test('creates, edits, views, and deletes a trip with isolated user state', async ({
    page,
    request,
  }) => {
    // 1. Create a dynamic isolated user
    const user = await createTestUser(request);

    // 2. Log in through UI
    await loginViaUI(page, user.username, user.password);

    // 3. Navigate to create trip page
    await page.click('a[href="/trips/new"], button:has-text("Plan a Trip"), button:has-text("Plan Your First Journey")');
    await expect(page).toHaveURL(/\/trips\/new/);
    await expect(page.locator('h1')).toContainText('Plan a New Journey');

    // 4. Fill in trip details
    await page.fill('input[name="title"]', 'Kyoto Autumn Explorer');
    await page.fill('textarea[name="description"]', 'Temple visits and traditional garden exploration.');
    await page.fill('input[name="start_date"]', '2026-10-01');
    await page.fill('input[name="end_date"]', '2026-10-15');

    // 5. Submit trip creation
    await page.click('button[type="submit"]:has-text("Create Journey")');

    // 6. Verify detail page load
    await expect(page).toHaveURL(/\/trips\/\d+/);
    await expect(page.locator('h1')).toContainText('Kyoto Autumn Explorer');
    await expect(page.locator('text=15 Days Duration')).toBeVisible();

    // 7. Edit the trip
    await page.click('a[href$="/edit"], button:has-text("Edit Journey")');
    await expect(page).toHaveURL(/\/trips\/\d+\/edit/);

    await page.fill('input[name="title"]', 'Kyoto & Tokyo Autumn Tour');
    await page.click('button[type="submit"]:has-text("Save Changes")');

    // 8. Verify updated title on detail page
    await expect(page).toHaveURL(/\/trips\/\d+/);
    await expect(page.locator('h1')).toContainText('Kyoto & Tokyo Autumn Tour');

    // 9. Go to Trips list and verify card presence
    await page.click('a[href="/"], button:has-text("My Trips"), a:has-text("My Trips")');
    await expect(page.locator('h3:has-text("Kyoto & Tokyo Autumn Tour")')).toBeVisible();

    // 10. Open trip and delete it
    await page.click('text="Kyoto & Tokyo Autumn Tour"');
    await expect(page).toHaveURL(/\/trips\/\d+/);

    await page.click('button:has-text("Delete")');
    // Confirm deletion inside modal
    await page.click('button:has-text("Delete Journey")');

    // 11. Verify return to trips list and empty state
    await expect(page).toHaveURL(/\/trips|\/$/);
    await expect(page.locator('text="Kyoto & Tokyo Autumn Tour"')).not.toBeVisible();
    await expect(page.locator('text=No journeys planned yet')).toBeVisible();
  });
});
