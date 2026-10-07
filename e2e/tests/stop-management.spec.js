import { test, expect } from '@playwright/test';
import { createTestUser, loginViaUI } from '../fixtures/test-user.js';

test.describe('Stop & Timeline Management E2E Flow', () => {
  test('adds multiple stops, verifies chronological ordering, edits, and deletes a stop', async ({
    page,
    request,
  }) => {
    // 1. Create isolated user and login
    const user = await createTestUser(request);
    await loginViaUI(page, user.username, user.password);

    // 2. Create parent trip
    await page.click('a[href="/trips/new"], button:has-text("Plan a Trip"), button:has-text("Plan Your First Journey")');
    await expect(page).toHaveURL(/\/trips\/new/);

    await page.fill('input[name="title"]', 'Pacific Highway Adventure');
    await page.fill('textarea[name="description"]', 'Coastal drive along California Highway 1.');
    await page.fill('input[name="start_date"]', '2026-09-01');
    await page.fill('input[name="end_date"]', '2026-09-20');
    await page.click('button[type="submit"]:has-text("Create Journey")');

    await expect(page).toHaveURL(/\/trips\/\d+/);

    // 3. Add Stop 1
    await page.click('a[href$="/stops/new"], button:has-text("Add Itinerary Stop"), a:has-text("Add Itinerary Stop")');
    await expect(page).toHaveURL(/\/trips\/\d+\/stops\/new/);

    await page.fill('input[name="name"]', 'Big Sur Coastline');
    await page.fill('input[name="location"]', 'California, USA');
    await page.fill('textarea[name="description"]', 'Camping near the cliffs and seeing McWay Falls.');
    await page.fill('input[name="arrival_date"]', '2026-09-02');
    await page.fill('input[name="departure_date"]', '2026-09-05');
    await page.click('button[type="submit"]:has-text("Add Stop to Itinerary")');

    // Verify redirect to trip detail and presence of Stop 1
    await expect(page).toHaveURL(/\/trips\/\d+/);
    await expect(page.locator('h4:has-text("Big Sur Coastline")')).toBeVisible();
    await expect(page.locator('text=1 Stop')).toBeVisible();

    // 4. Add Stop 2
    await page.click('a[href$="/stops/new"], button:has-text("Add Itinerary Stop"), a:has-text("Add Itinerary Stop")');
    await expect(page).toHaveURL(/\/trips\/\d+\/stops\/new/);

    await page.fill('input[name="name"]', 'Monterey Bay Aquarium');
    await page.fill('input[name="location"]', 'Monterey, CA');
    await page.fill('input[name="arrival_date"]', '2026-09-06');
    await page.fill('input[name="departure_date"]', '2026-09-08');
    await page.click('button[type="submit"]:has-text("Add Stop to Itinerary")');

    // Verify both stops in timeline and 2 Stops badge
    await expect(page).toHaveURL(/\/trips\/\d+/);
    await expect(page.locator('h4:has-text("Big Sur Coastline")')).toBeVisible();
    await expect(page.locator('h4:has-text("Monterey Bay Aquarium")')).toBeVisible();
    await expect(page.locator('text=2 Stops')).toBeVisible();

    // 5. Edit Stop 1
    const stop1Card = page.locator('div:has(> div > div > h4:has-text("Big Sur Coastline"))').first();
    await stop1Card.locator('button[aria-label="Edit stop"], a[aria-label="Edit stop"], a[href*="/stops/"][href$="/edit"]').first().click();

    await expect(page).toHaveURL(/\/trips\/\d+\/stops\/\d+\/edit/);
    await page.fill('input[name="location"]', 'Big Sur & Highway 1, CA');
    await page.click('button[type="submit"]:has-text("Save Changes")');

    // Verify updated location on trip detail
    await expect(page).toHaveURL(/\/trips\/\d+/);
    await expect(page.locator('text=Big Sur & Highway 1, CA')).toBeVisible();

    // 6. Delete Stop 2
    const stop2Card = page.locator('div:has(> div > div > h4:has-text("Monterey Bay Aquarium"))').first();
    await stop2Card.locator('button[aria-label="Delete stop"]').first().click();

    // Confirm deletion modal
    await page.click('button:has-text("Remove Stop")');

    // Verify stop 2 removed and stop count updated to 1 Stop
    await expect(page.locator('h4:has-text("Monterey Bay Aquarium")')).not.toBeVisible();
    await expect(page.locator('text=1 Stop')).toBeVisible();
  });
});
