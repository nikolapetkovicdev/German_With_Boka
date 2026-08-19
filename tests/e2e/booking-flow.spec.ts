import {expect, test} from '@playwright/test';

test('najvazniji tok rezervacije prolazi', async ({page}) => {
  await page.goto('/sr/login');
  await expect(page.getByRole('heading', {name: 'Prijava'})).toBeVisible();
  await page.getByLabel('Email').fill('parent@germanwithboka.local');
  await page.getByLabel('Lozinka').fill('DemoPassword123!');
  await page.getByRole('button', {name: 'Prijavi se'}).click();
  await expect(page).toHaveURL(/\/sr\/dashboard/);
  await page.getByRole('link', {name: 'Zakaži čas'}).first().click();
  await page.getByLabel('Tema časa').fill('Playwright probni cas');
  await page.getByRole('button', {name: 'Rezerviši termin'}).click();
  await expect(page.getByText('Termin je privremeno zadržan')).toBeVisible();
  await page.getByRole('button', {name: 'Uplatio sam'}).click();
  await expect(page).toHaveURL(/\/sr\/dashboard/);
});

test('promena jezika menja tekst interfejsa', async ({page}) => {
  await page.goto('/sr/login');
  await page.getByRole('link', {name: 'EN'}).click();
  await expect(page.getByRole('heading', {name: 'Sign in'})).toBeVisible();
});
