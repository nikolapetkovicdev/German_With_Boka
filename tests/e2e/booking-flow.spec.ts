import {expect, test} from '@playwright/test';

test('najvazniji tok rezervacije prolazi', async ({page}) => {
  await page.goto('/sr/login');
  await expect(page.getByRole('heading', {name: /Prij/})).toBeVisible();
  await page.getByLabel('Email').fill('parent@germanwithboka.local');
  await page.getByLabel('Lozinka').fill('DemoPassword123!');
  await page.getByRole('button', {name: 'Prijavi se'}).click();
  await expect(page).toHaveURL(/\/sr\/dashboard/);

  const bookLink = page.getByRole('link', {name: /Zaka/}).first();
  if (!(await bookLink.isVisible())) {
    await page.getByRole('button', {name: /meni/i}).click();
  }
  await page.getByRole('link', {name: /Zaka/}).first().click();

  const firstDayWithTerms = page.locator('details').filter({hasText: /slobodno/i}).first();
  await firstDayWithTerms.click();
  await firstDayWithTerms.getByRole('button', {name: '45 min'}).first().click();
  await page.locator('input[name="topic"]').fill('Playwright probni cas');
  await page.getByRole('button', {name: /Rezerv/}).last().click();
  await expect(page.getByText(/Mesecni plan|Mese/)).toBeVisible();
  await page.getByRole('button', {name: 'Uplatio sam'}).click();
  await expect(page).toHaveURL(/\/sr\/dashboard/);
});

test('promena jezika menja tekst interfejsa', async ({page}) => {
  await page.goto('/sr/login');
  const languageLink = page.getByRole('link', {name: 'EN'});
  if (!(await languageLink.isVisible())) {
    await page.getByRole('button', {name: /meni/i}).click();
  }
  await page.getByRole('link', {name: 'EN'}).click();
  await expect(page.getByRole('heading', {name: 'Sign in'})).toBeVisible();
});
