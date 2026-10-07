import crypto from 'crypto';

/**
 * Generates a randomized, unique throwaway user for complete test isolation.
 * Automatically registers the user against the running Django API.
 */
export async function createTestUser(request) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const user = {
    username: `pw_${suffix}`,
    email: `pw_${suffix}@test.local`,
    password: 'TestPass123!Secure',
  };

  const response = await request.post('http://127.0.0.1:8000/api/v1/auth/register/', {
    data: user,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Failed to create test user: ${response.status()} - ${errorBody}`);
  }

  const data = await response.json();
  return {
    ...user,
    tokens: data.tokens,
    profile: data.user?.profile,
  };
}

/**
 * Helper to log in a user through the UI form.
 */
export async function loginViaUI(page, username, password) {
  await page.goto('/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
  // Wait for redirect to home / trips and authenticated header to load
  await page.waitForURL(url => url.pathname === '/' || url.pathname === '/trips');
  await page.waitForSelector('header button[aria-label="User menu"]');
}
