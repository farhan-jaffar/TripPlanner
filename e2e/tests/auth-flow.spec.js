import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test.describe('Authentication & Profile E2E Flow', () => {
  test('registers new user, updates profile, logs out, and logs back in', async ({ page }) => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const username = `traveler_${suffix}`;
    const email = `traveler_${suffix}@journey.test`;
    const password = 'Password123!Secure';

    // 1. Navigate to Register page
    await page.goto('/register');
    await expect(page).toHaveTitle(/TripPlanner/i);

    // 2. Fill registration form
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);

    // 3. Submit registration
    await page.click('button[type="submit"]:has-text("Create Journey Account")');

    // 4. Verify landing on the main authenticated page
    await expect(page).toHaveURL(/\/trips|\/$/);
    await expect(page.locator('header')).toBeVisible();

    // 5. Navigate to Profile page via user menu
    await page.click('button[aria-label="User menu"]');
    await page.click('a:has-text("Profile & Account")');
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator('h1')).toContainText('Personal Profile');

    // 6. Update display name & bio
    await page.fill('input[name="display_name"]', 'Explorer Jordan');
    await page.fill('textarea[name="bio"]', 'Traveling across the world exploring hidden gems.');
    await page.click('button[type="submit"]:has-text("Save Profile")');

    // Verify update persistence
    await expect(page.locator('input[name="display_name"]')).toHaveValue('Explorer Jordan');

    // 7. Logout via User menu
    await page.click('button[aria-label="User menu"]');
    await page.click('button:has-text("Log Out")');
    await expect(page).toHaveURL(/\/login/);

    // 8. Re-login with the same credentials
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]:has-text("Sign In")');

    // 9. Verify successful login
    await expect(page).toHaveURL(/\/trips|\/$/);
    await expect(page.locator('header')).toBeVisible();
  });
});
