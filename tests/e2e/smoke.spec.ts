import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import getegridFixture from './fixtures/getegrid.json' with { type: 'json' }
import extractFixture from './fixtures/extract.json' with { type: 'json' }

/**
 * Smoke tests for the generated static build (bern context).
 * The oereb service endpoints are mocked with fixtures, so the
 * critical flows run deterministically without the live service.
 */

async function searchInput(page: Page) {
  const input = page.getByRole('textbox', { name: '-searchbox' })
  await expect(input).toBeVisible()
  return input
}

test('boots and renders the german ui', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Kein Grundstück ausgewertet!')).toBeVisible()
  await expect(page.getByText('ÖREB-Kataster – Kanton Bern')).toBeVisible()
  await expect(page.locator('#map canvas')).toBeVisible()
})

test('switches the language to french', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Kein Grundstück ausgewertet!')).toBeVisible()

  await page.getByRole('button', { name: 'Français' }).first().click()

  await expect(page.getByText('Aucun bien-fonds évalué!')).toBeVisible()
  await expect(page).toHaveURL(/#\/fr$/)
})

test('resolves coordinate queries without the search service', async ({ page }) => {
  await page.goto('/')
  const input = await searchInput(page)

  await input.pressSequentially('2600983, 1197426')
  await expect(
    page.getByRole('option', { name: /Landeskoordinate LV95/ }),
  ).toBeVisible()

  await input.fill('')
  await input.pressSequentially('46.94304142827599, 7.440462684216267')
  await expect(
    page.getByRole('option', { name: /WGS84-Koordinate/ }),
  ).toBeVisible()
})

test('loads an extract from a coordinate search result', async ({ page }) => {
  await page.route('**/getegrid/**', route =>
    route.fulfill({ json: getegridFixture }),
  )
  await page.route('**/extract/json*', route =>
    route.fulfill({ json: extractFixture }),
  )

  await page.goto('/')
  const input = await searchInput(page)

  await input.pressSequentially('46.94304142827599, 7.440462684216267')
  await page.getByRole('option', { name: /WGS84-Koordinate/ }).click()

  await expect(page).toHaveURL(/#\/d\/CH951946873506$/)
  await expect(page.getByRole('heading', { name: /Grundstück: 571 in Bern/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Betroffene ÖREB-Themen 2' })).toBeVisible()
})
