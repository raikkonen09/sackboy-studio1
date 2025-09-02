import { test, expect } from '@playwright/test';

test('landing renders and prompts upload', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.getByText('Upload an image to begin.')).toBeVisible();
});