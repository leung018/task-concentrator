/* eslint-disable playwright/expect-expect */
import { Page } from '@playwright/test'
import { test, expect } from './fixtures.js'

test.describe.configure({ mode: 'parallel' })

test('should able to persist blocked domains and update ui', async ({ page, extensionId }) => {
  await goToBlockedDomainsPage(page, extensionId)

  // Add two domains
  await addBlockedDomain(page, 'abc.com')
  await addBlockedDomain(page, 'xyz.com')

  let domains = page.getByTestId('blocked-domain')
  await expect(domains).toHaveCount(2)
  await expect(domains.nth(0)).toHaveText('abc.com')
  await expect(domains.nth(1)).toHaveText('xyz.com')

  // Remove one domain
  await removeBlockedDomain(page, 'abc.com')

  domains = page.getByTestId('blocked-domain')
  await expect(domains).toHaveCount(1)
  await expect(domains.nth(0)).toHaveText('xyz.com')

  // Reload the page
  await page.reload()

  domains = page.getByTestId('blocked-domain')
  await expect(domains).toHaveCount(1)
  await expect(domains.nth(0)).toHaveText('xyz.com')
})

test('should blocking of browsing control function properly', async ({ page, extensionId }) => {
  const extraPage1 = await page.context().newPage()
  const extraPage2 = await page.context().newPage()
  for (const p of [page, extraPage1, extraPage2]) {
    await p.route('https://google.com', async (route) => {
      await route.fulfill({ body: 'This is fake google.com' })
    })
    await p.route('https://facebook.com', async (route) => {
      await route.fulfill({ body: 'This is fake facebook.com' })
    })
  }
  await extraPage1.goto('https://google.com')
  await expect(extraPage1.locator('body')).toContainText('This is fake google.com')

  await extraPage2.goto('https://facebook.com')
  await expect(extraPage2.locator('body')).toContainText('This is fake facebook.com')

  // Add blocked Domain
  await goToBlockedDomainsPage(page, extensionId)
  await addBlockedDomain(page, 'google.com')

  // Previous page which is in google.com should be blocked
  await assertInBlockedTemplate(extraPage1)

  // Future request to google.com should be blocked
  await assertGoToBlockedTemplate(extraPage1, 'https://google.com')

  // Facebook should not be blocked
  await expect(extraPage2.locator('body')).toContainText('This is fake facebook.com')
  await assertNotGoToBlockedTemplate(extraPage2, 'https://facebook.com')
})

test("should access blocked domain through other websites won't cause ERR_BLOCKED_BY_CLIENT", async ({
  page,
  extensionId
}) => {
  await goToBlockedDomainsPage(page, extensionId)

  await addBlockedDomain(page, 'facebook.com')

  await page.route('https://facebook.com', async (route) => {
    await route.fulfill({ body: 'This is fake facebook.com' })
  })

  await page.route('https://google.com/search-results', async (route) => {
    await route.fulfill({ body: '<a href="https://www.facebook.com">Facebook</a>' })
  })

  await page.goto('https://google.com/search-results')
  await page.click('a')

  await assertInBlockedTemplate(page)
})

test('should browsing control able to unblock domain', async ({ page, extensionId }) => {
  await goToBlockedDomainsPage(page, extensionId)

  await addBlockedDomain(page, 'google.com')
  await removeBlockedDomain(page, 'google.com')

  await page.route('https://google.com', async (route) => {
    await route.fulfill({ body: 'This is fake google.com' })
  })
  await assertNotGoToBlockedTemplate(page, 'https://google.com')
})

test('should able to persist blocking schedules and update ui', async ({ page, extensionId }) => {
  await goToSchedulesPage(page, extensionId)

  // Add a schedule
  await page.getByTestId('check-weekday-sun').check()

  await page.getByTestId('start-time-input').fill('10:00')

  await page.getByTestId('end-time-input').fill('12:00')

  await page.getByTestId('add-button').click()

  let schedules = page.getByTestId('weekly-schedule')
  await expect(schedules).toHaveCount(1)
  await expect(schedules.nth(0)).toContainText('Sun')
  await expect(schedules.nth(0)).toContainText('10:00 - 12:00')

  // Reload to check if the schedule is persisted
  await page.reload()

  schedules = page.getByTestId('weekly-schedule')
  await expect(schedules).toHaveCount(1)
  await expect(schedules.nth(0)).toContainText('Sun')
  await expect(schedules.nth(0)).toContainText('10:00 - 12:00')

  // Remove the schedule
  await page.getByTestId('remove-schedule-with-index-0').click()
  await expect(page.getByTestId('weekly-schedule')).toHaveCount(0)

  // Reload to check if the schedule is removed
  await page.reload()
  await expect(page.getByTestId('weekly-schedule')).toHaveCount(0)
})

test('should able to disable blocking according to schedule', async ({ page, extensionId }) => {
  await goToBlockedDomainsPage(page, extensionId)

  await addBlockedDomain(page, 'google.com')

  await page.route('https://google.com', async (route) => {
    await route.fulfill({ body: 'This is fake google.com' })
  })

  await goToSchedulesPage(page, extensionId)

  await addNonActiveSchedule(page)

  await assertNotGoToBlockedTemplate(page, 'https://google.com')
})

test('should pomodoro timer count successfully', async ({ page, extensionId }) => {
  await goToPomodoroTimer(page, extensionId)

  await expect(page.getByTestId('timer-display')).toContainText('25:00')

  await page.getByTestId('start-button').click()

  await expect(page.getByTestId('timer-display')).toContainText('24:59')

  await page.getByTestId('pause-button').click()
  await page.reload()
  await page.getByTestId('start-button').click()

  await expect(page.getByTestId('timer-display')).toContainText('24:57')
})

test('should clicking the options button in timer can go to options page', async ({
  page,
  extensionId
}) => {
  await goToPomodoroTimer(page, extensionId)

  await page.getByTestId('options-button').click()

  await assertOpenedOptionsPage(page)
})

test('should close tab service function properly and wont close irrelevant page', async ({
  page,
  extensionId
}) => {
  await goToReminderPage(page, extensionId)

  const extraPage = await page.context().newPage()
  await extraPage.route('https://google.com', async (route) => {
    await route.fulfill({ body: 'This is fake google.com' })
  })
  await extraPage.goto('https://google.com')

  await page.getByTestId('start-button').click()

  await assertWithRetry(async () => {
    expect(page.context().pages()).not.toContain(page)
    expect(page.context().pages()).toContain(extraPage)
  })
})

test('should able to save daily reset time', async ({ page, extensionId }) => {
  await goToStatisticsPage(page, extensionId)

  await page.getByTestId('time-input').fill('10:30')

  await page.getByTestId('save-button').click()

  await expect(page.getByTestId('time-input')).toHaveValue('10:30')

  await page.reload()

  await expect(page.getByTestId('time-input')).toHaveValue('10:30')
})

test('should able to change pomodoro timer config', async ({ page, extensionId }) => {
  await goToTestingConfigPage(page, extensionId)

  await page.getByTestId('focus-duration').fill('10')
  await page.getByTestId('short-break-duration').fill('2')
  await page.getByTestId('long-break-duration').fill('4')
  await page.getByTestId('num-of-pomodori-per-cycle').fill('3')

  await page.getByTestId('save-button').click()
  await page.reload()

  await expect(page.getByTestId('focus-duration')).toHaveValue('10')
  await expect(page.getByTestId('short-break-duration')).toHaveValue('2')
  await expect(page.getByTestId('long-break-duration')).toHaveValue('4')
  await expect(page.getByTestId('num-of-pomodori-per-cycle')).toHaveValue('3')
})

async function addBlockedDomain(page: Page, domain: string) {
  const input = page.getByTestId('blocked-domain-input')
  const addButton = page.getByTestId('add-button')

  await input.fill(domain)
  await addButton.click()
}

async function removeBlockedDomain(page: Page, domain: string) {
  const removeButton = page.getByTestId(`remove-${domain}`)
  await removeButton.click()
}

async function addNonActiveSchedule(page: Page) {
  let startHours: number
  let endHours: number

  // FIXME: I can't find a way to mock the time in the test. Clock in playwright doesn't modify the time in service worker.
  // i.e. I choose to compute hours so that current time must not be in the schedule.
  const now = new Date()
  if (now.getHours() >= 21) {
    startHours = 1
    endHours = 2
  } else {
    startHours = now.getHours() + 2
    endHours = now.getHours() + 3
  }

  await page.getByTestId('check-weekday-mon').check()

  await page.getByTestId('start-time-input').fill(`${formatNumber(startHours)}:00`)

  await page.getByTestId('end-time-input').fill(`${formatNumber(endHours)}:00`)

  await page.getByTestId('add-button').click()
}

const TEXT_IN_BLOCKED_TEMPLATE = 'Stay Focused'

async function assertInBlockedTemplate(page: Page) {
  await expect(page.locator('body')).toContainText(TEXT_IN_BLOCKED_TEMPLATE)
}

async function assertWithRetry(assert: () => Promise<void>, retryCount = 3, intervalMs = 100) {
  try {
    await assert()
  } catch (Exception) {
    if (retryCount <= 0) {
      throw Exception
    }
    await sleep(intervalMs)
    return assertWithRetry(assert, retryCount - 1, intervalMs)
  }
}

async function assertGoToBlockedTemplate(page: Page, targetUrl: string) {
  return assertWithRetry(async () => {
    await page.goto(targetUrl)
    expect(await page.locator('body').textContent()).toContain(TEXT_IN_BLOCKED_TEMPLATE)
  })
}

async function assertNotGoToBlockedTemplate(page: Page, targetUrl: string) {
  return assertWithRetry(async () => {
    await page.goto(targetUrl)
    expect(await page.locator('body').textContent()).not.toContain(TEXT_IN_BLOCKED_TEMPLATE)
  })
}

async function assertOpenedOptionsPage(page: Page) {
  return assertWithRetry(async () => {
    const pages = page.context().pages()
    const optionsPage = pages.find((p) => p.url().includes('options.html'))
    expect(optionsPage).toBeDefined()
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function goToBlockedDomainsPage(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/options.html`)
}

async function goToSchedulesPage(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/options.html#/schedules`)
}

async function goToPomodoroTimer(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
}

async function goToReminderPage(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/reminder.html`)
}

async function goToStatisticsPage(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/options.html#/statistics`)
}

async function goToTestingConfigPage(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/testing-config.html`)
}

// TODO: copy from src/util.ts and find way to share the code between e2e and src, so that we can avoid duplication
function formatNumber(num: number, minDigits: number = 2): string {
  return num.toLocaleString(undefined, { minimumIntegerDigits: minDigits })
}
