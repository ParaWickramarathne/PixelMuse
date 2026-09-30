import { test, expect } from '@playwright/test';

test('demo can be resized, converted, compared, downloaded, and reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Smaller images.');
  await page.getByRole('button', { name: 'Try a demo' }).click();
  await expect(page.getByText('lavender-alpine.png', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Resize' }).click();
  await page.getByLabel('Width', { exact: true }).fill('900');
  await expect(page.getByLabel('Height', { exact: true })).toHaveValue('600');
  await page.getByLabel('Output format').selectOption('image/webp');
  await page.getByRole('button', { name: 'Optimize image', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Optimization results' })).toBeVisible();
  await expect(page.locator('.result-summary')).toContainText('900 × 600');
  await expect(page.locator('.result-summary')).toContainText('PNG → WEBP');
  const output = await page.locator('img[alt="Optimized image"]').evaluate(async (image: HTMLImageElement) => {
    const blob = await fetch(image.src).then(response => response.blob());
    const decoded = await createImageBitmap(blob);
    const result = { type: blob.type, width: decoded.width, height: decoded.height };
    decoded.close(); return result;
  });
  expect(output).toEqual({ type: 'image/webp', width: 900, height: 600 });
  await page.getByLabel('Before and after comparison').focus();
  await page.getByLabel('Before and after comparison').press('End');
  await expect(page.getByLabel('Before and after comparison')).toHaveValue('100');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download optimized image' }).click();
  expect((await downloadEvent).suggestedFilename()).toBe('lavender-alpine-pixelmuse.webp');
  await page.getByRole('button', { name: 'Reset workspace', exact: true }).click();
  await expect(page.locator('.image-row')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('PNG preserves alpha and JPEG flattens alpha onto white', async ({ page }) => {
  await page.goto('/');
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d')!; context.fillStyle = 'red'; context.fillRect(64,64,32,32);
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!)));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'transparent.png', mimeType: 'image/png', buffer: Buffer.from(bytes) });
  const pixel = async () => page.locator('img[alt="Optimized image"]').evaluate(async (image: HTMLImageElement) => {
    await image.decode(); const canvas = document.createElement('canvas'); canvas.width = 24; canvas.height = 24;
    const context = canvas.getContext('2d')!; context.drawImage(image,0,0);
    return Array.from(context.getImageData(0,0,1,1).data);
  });
  await page.getByLabel('Output format').selectOption('image/png');
  await page.getByRole('button', { name: 'Optimize image', exact: true }).click();
  await expect(page.locator('.result-summary')).toContainText('Lossless');
  expect((await pixel())[3]).toBe(0);
  await page.getByLabel('Output format').selectOption('image/jpeg');
  await page.getByRole('button', { name: 'Optimize image', exact: true }).click();
  await expect(page.locator('.result-summary')).toContainText('PNG → JPG');
  const rgba = await pixel();
  expect(rgba[3]).toBe(255); expect(rgba[0]).toBeGreaterThan(245); expect(rgba[1]).toBeGreaterThan(245); expect(rgba[2]).toBeGreaterThan(245);
});

test('batch optimization, PNG, errors, and unsaved result confirmation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a demo' }).click();
  await expect(page.locator('.image-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Try a demo' }).click();
  await expect(page.locator('.image-row')).toHaveCount(2);
  await page.getByLabel('Output format').selectOption('image/png');
  await expect(page.getByLabel('Image quality', { exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: 'Resize' }).click();
  await page.getByLabel('Resize preset').selectOption('half');
  await page.getByRole('button', { name: 'Optimize 2 images' }).click();
  await expect(page.locator('.batch-stats')).toContainText('2 / 2');
  await expect(page.locator('.result-summary')).toContainText('900 × 600');
  await page.getByRole('button', { name: 'Reset workspace', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my images' }).click();
  await expect(page.locator('.image-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset workspace', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reset workspace' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'unsupported.txt', mimeType: 'text/plain', buffer: Buffer.from('Not an image') });
  await expect(page.getByRole('alert')).toContainText('please choose a JPG, PNG, or WebP');
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('Broken image') });
  await expect(page.getByRole('alert')).toContainText('could not be read');
});

test('theme persists and mobile navigation stays within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Resize' }).click();
  await expect(page.getByRole('tab', { name: 'Resize' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/pixelmuse-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.getByRole('tab', { name: 'Compress' }).click();
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({ path: 'test-results/pixelmuse-desktop.png', fullPage: true });
});
