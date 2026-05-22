import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdir } from 'fs/promises';

const BASE = 'http://localhost:3000';
const EMAIL = 'test.admin@cityads.team';
const PASS = 'TestPass123!';
const SS_DIR = '/tmp/screenshots';

await mkdir(SS_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const errors = [];
let step = 0;

function log(msg) { console.log(`[${++step}] ${msg}`); }
async function ss(name) {
  await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: false });
}
function checkForError(html, context) {
  const lower = html.toLowerCase();
  if (lower.includes('application error') || lower.includes('unhandled runtime error') || lower.includes('error:') && lower.includes('at ')) {
    errors.push(`ERROR on ${context}: found error text in page`);
  }
}

// ─── 1. Login ─────────────────────────────────────────────────────────────────
log('Navigating to login page...');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await ss('01-login');
log(`Login page title: ${await page.title()}`);

const emailInput = await page.$('#email, input[type="email"]');
const passInput = await page.$('#password, input[type="password"]');
if (!emailInput || !passInput) {
  errors.push('Login form not found');
  log(`Page HTML snippet: ${(await page.content()).slice(0, 500)}`);
} else {
  await emailInput.fill(EMAIL);
  await passInput.fill(PASS);
  await ss('02-login-filled');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.waitForURL('**/admin/**', { timeout: 12000 }).catch(() => {});
  await ss('03-after-login');
  log(`After login URL: ${page.url()}`);
  if (!page.url().includes('/admin/')) {
    errors.push(`Login failed — still at ${page.url()}`);
    const content = await page.content();
    checkForError(content, 'login');
  }
}

// ─── 2. Dashboard ─────────────────────────────────────────────────────────────
log('Testing Dashboard...');
await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
await ss('04-dashboard');
const dashContent = await page.content();
checkForError(dashContent, 'dashboard');
const dashH1 = await page.$eval('h1', el => el.textContent).catch(() => '');
log(`Dashboard h1: "${dashH1}"`);
if (!dashH1.includes('Dashboard')) errors.push('Dashboard h1 missing');

// Check metrics cards rendered
const cards = await page.$$('[class*="MetricsCard"], .rounded-lg.border');
log(`Dashboard cards found: ${cards.length}`);

// ─── 3. KOC List ──────────────────────────────────────────────────────────────
log('Testing KOC list...');
await page.goto(`${BASE}/admin/kocs`, { waitUntil: 'networkidle' });
await ss('05-koc-list');
checkForError(await page.content(), 'koc-list');
const kocH1 = await page.$eval('h1', el => el.textContent).catch(() => '');
log(`KOC list h1: "${kocH1}"`);

// Check for rating column
const ratingHeader = await page.$('th:has-text("Đánh giá")');
log(`Rating column found: ${!!ratingHeader}`);
if (!ratingHeader) errors.push('KOC list missing "Đánh giá" column');

// Check KOC name links
const kocLinks = await page.$$('td a[href*="/admin/kocs/"]');
log(`KOC name links found: ${kocLinks.length}`);

// ─── 4. KOC Profile ───────────────────────────────────────────────────────────
log('Testing KOC profile...');
if (kocLinks.length > 0) {
  const href = await kocLinks[0].getAttribute('href');
  log(`Navigating to KOC profile: ${href}`);
  await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
  await ss('06-koc-profile');
  checkForError(await page.content(), 'koc-profile');
  const backLink = await page.$('a[href="/admin/kocs"]');
  log(`KOC profile back link: ${!!backLink}`);
  const tabs = await page.$$('button[class*="border-b"]');
  log(`KOC profile tabs: ${tabs.length}`);
  if (tabs.length < 2) errors.push('KOC profile missing tabs');

  // Click "Thông tin" tab
  const infoTab = await page.$('button:has-text("Thông tin")');
  if (infoTab) {
    await infoTab.click();
    await page.waitForTimeout(500);
    await ss('07-koc-profile-info-tab');
    log('KOC profile info tab clicked');
  } else {
    errors.push('KOC profile "Thông tin" tab not found');
  }
} else {
  log('No KOC links found, skipping profile test');
}

// ─── 5. Proposals List ────────────────────────────────────────────────────────
log('Testing Proposals list...');
await page.goto(`${BASE}/admin/proposals`, { waitUntil: 'networkidle' });
await ss('08-proposals-list');
checkForError(await page.content(), 'proposals-list');
const propH1 = await page.$eval('h1', el => el.textContent).catch(() => '');
log(`Proposals h1: "${propH1}"`);
if (!propH1.includes('Proposal')) errors.push('Proposals page h1 missing');

// Test creating a proposal
log('Testing proposal creation...');
const createBtn = await page.$('button:has-text("Tạo Proposal")');
if (createBtn) {
  await createBtn.click();
  await page.waitForTimeout(500);
  await ss('09-proposal-create-dialog');

  const titleInput = await page.$('#p-title');
  if (titleInput) {
    await titleInput.fill('Test Proposal - Auto Test');
    const prospectInput = await page.$('#p-prospect');
    if (prospectInput) await prospectInput.fill('Test Brand Co');
    await ss('10-proposal-create-filled');

    const submitBtn = await page.$('button:has-text("Tạo & mở")');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForURL('**/admin/proposals/**', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await ss('11-proposal-detail');
      log(`Proposal detail URL: ${page.url()}`);
      checkForError(await page.content(), 'proposal-detail');

      // Check share link section
      const shareLink = await page.$('code');
      log(`Share link code element: ${!!shareLink}`);
      if (!shareLink) errors.push('Proposal detail missing share link');

      // Get share token from URL for public page test
      const proposalId = page.url().split('/admin/proposals/')[1];
      log(`Created proposal ID: ${proposalId}`);

      // Test "Thêm KOC" in proposal
      const addKocBtn = await page.$('button:has-text("Thêm KOC")');
      if (addKocBtn) {
        await addKocBtn.click();
        await page.waitForTimeout(500);
        await ss('12-proposal-add-koc-dialog');
        log('Proposal Add KOC dialog opened');
        const kocSearchInput = await page.$('input[placeholder*="Tìm"]');
        log(`KOC search input in dialog: ${!!kocSearchInput}`);
        // Close dialog
        await page.keyboard.press('Escape');
      } else {
        errors.push('Proposal detail missing "Thêm KOC" button');
      }
    }
  }
} else {
  errors.push('Proposals page missing "Tạo Proposal" button');
}

// ─── 6. Campaigns ─────────────────────────────────────────────────────────────
log('Testing Campaigns...');
await page.goto(`${BASE}/admin/campaigns`, { waitUntil: 'networkidle' });
await ss('13-campaigns');
checkForError(await page.content(), 'campaigns');
const campH1 = await page.$eval('h1', el => el.textContent).catch(() => '');
log(`Campaigns h1: "${campH1}"`);

// Visit first campaign detail to test the simplified board
const campLinks = await page.$$('td a[href*="/admin/campaigns/"]');
log(`Campaign links found: ${campLinks.length}`);
if (campLinks.length > 0) {
  const campHref = await campLinks[0].getAttribute('href');
  await page.goto(`${BASE}${campHref}`, { waitUntil: 'networkidle' });
  await ss('14-campaign-detail');
  checkForError(await page.content(), 'campaign-detail');

  // Check simplified column headers (should NOT have "Địa chỉ" or "Hàng mẫu")
  const addrCol = await page.$('th:has-text("Địa chỉ")');
  const sampleCol = await page.$('th:has-text("Hàng mẫu")');
  const statusCol = await page.$('th:has-text("Trạng thái")');
  const videoCol = await page.$('th:has-text("Video")');

  log(`Campaign board - "Địa chỉ" col removed: ${!addrCol}`);
  log(`Campaign board - "Hàng mẫu" col removed: ${!sampleCol}`);
  log(`Campaign board - "Trạng thái" col present: ${!!statusCol}`);
  log(`Campaign board - "Video" col present: ${!!videoCol}`);

  if (addrCol) errors.push('Campaign board still shows "Địa chỉ" column (should be removed)');
  if (sampleCol) errors.push('Campaign board still shows "Hàng mẫu" column (should be removed)');
  if (!statusCol) errors.push('Campaign board missing "Trạng thái" column');
  if (!videoCol) errors.push('Campaign board missing "Video" column');
}

// ─── 7. Clients ───────────────────────────────────────────────────────────────
log('Testing Clients...');
await page.goto(`${BASE}/admin/clients`, { waitUntil: 'networkidle' });
await ss('15-clients');
checkForError(await page.content(), 'clients');

// ─── 8. Sidebar Proposals link ────────────────────────────────────────────────
log('Checking sidebar...');
const sidebarProposals = await page.$('nav a[href="/admin/proposals"]');
log(`Sidebar Proposals link: ${!!sidebarProposals}`);
if (!sidebarProposals) errors.push('Sidebar missing Proposals link');

// ─── 9. Public proposal page ──────────────────────────────────────────────────
log('Testing public proposal page (no auth)...');
// Get any share token from DB
const propTokenCheck = await fetch(`${BASE}/admin/proposals`).catch(() => null);
// Use a fresh context (no cookies = not logged in)
const pubCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const pubPage = await pubCtx.newPage();

// First get a real token from DB via the proposals page
await page.goto(`${BASE}/admin/proposals`, { waitUntil: 'networkidle' });
const shareButtons = await page.$$('button[title="Copy link chia sẻ"]');
log(`Share buttons on proposals list: ${shareButtons.length}`);

// Try to get token from a Copy button's nearby link
const externalLinks = await page.$$('a[href^="/p/"]');
log(`Public /p/ links on proposals page: ${externalLinks.length}`);
if (externalLinks.length > 0) {
  const pubHref = await externalLinks[0].getAttribute('href');
  await pubPage.goto(`${BASE}${pubHref}`, { waitUntil: 'networkidle' });
  await ss('16-public-proposal');
  checkForError(await pubPage.content(), 'public-proposal');
  const pubH1 = await pubPage.$eval('h1', el => el.textContent).catch(() => '');
  log(`Public proposal h1: "${pubH1}"`);
  const hasHeader = await pubPage.$('header');
  log(`Public proposal has header: ${!!hasHeader}`);
}
await pubCtx.close();

// ─── 10. 404 check on protected route without auth ────────────────────────────
log('Checking redirect on protected route for unauthenticated user...');
const anonCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const anonPage = await anonCtx.newPage();
await anonPage.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
const anonUrl = anonPage.url();
log(`Unauthenticated /admin/dashboard redirects to: ${anonUrl}`);
if (anonUrl.includes('/admin/dashboard')) {
  errors.push('Auth middleware not working — unauthenticated user can see dashboard');
}
await anonCtx.close();

// ─── Summary ──────────────────────────────────────────────────────────────────
await browser.close();

console.log('\n============================');
console.log('TEST SUMMARY');
console.log('============================');
if (errors.length === 0) {
  console.log('✅ ALL CHECKS PASSED — no issues found');
} else {
  console.log(`❌ ${errors.length} ISSUE(S) FOUND:`);
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
}
console.log(`\nScreenshots saved to: ${SS_DIR}/`);
