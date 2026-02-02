export function validateMeetConfig() {
  const required = [
    'MEET_JOINER_EMAIL',
    'MEET_JOINER_PASSWORD',
  ];
  const missing = required.filter((key) => !process.env[key]);
  return missing;
}

async function loadPlaywright() {
  try {
    const module = await import('playwright');
    return module;
  } catch (error) {
    throw new Error('Playwright not installed. Add dependency to enable Meet joiner.');
  }
}

async function joinMeetWithPlaywright(job) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://accounts.google.com/', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type=\"email\"]', process.env.MEET_JOINER_EMAIL);
  await page.click('#identifierNext');
  await page.waitForTimeout(2000);
  await page.fill('input[type=\"password\"]', process.env.MEET_JOINER_PASSWORD);
  await page.click('#passwordNext');
  await page.waitForTimeout(3000);

  await page.goto(job.meetingUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Attempt to disable camera/mic if buttons are present
  const micToggle = await page.$('button[aria-label*=\"microphone\"]');
  if (micToggle) await micToggle.click();
  const camToggle = await page.$('button[aria-label*=\"camera\"]');
  if (camToggle) await camToggle.click();

  const joinButton = await page.$('button:has-text(\"Join now\")');
  if (joinButton) await joinButton.click();

  return { browser, page };
}

export async function startMeetCapture(job) {
  const missing = validateMeetConfig();
  if (missing.length) {
    return {
      status: 'failed',
      reason: `Missing Google Meet joiner config: ${missing.join(', ')}`,
    };
  }

  await joinMeetWithPlaywright(job);
  return {
    status: 'in_progress',
    provider: 'meet',
    details: {
      jobId: job.id,
      meetingUrl: job.meetingUrl,
    },
  };
}
