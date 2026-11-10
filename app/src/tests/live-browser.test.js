const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { scryptSync } = require('node:crypto');
const { backendFixture } = require('../modules/mobility-simulation/tests/fixtures/backend-fixture');
const { createApp } = require('../app');

test('live UI completes rental, lost-response retry and five simulations on mobile and desktop', { timeout: 60000 }, async t => {
  let chromium;
  try { ({ chromium } = require(process.env.LIVE_PLAYWRIGHT || 'playwright')); }
  catch (error) { if (process.env.LIVE_PLAYWRIGHT) throw error; t.skip('Set LIVE_PLAYWRIGHT to a Playwright module to run browser integration.'); return; }
  const { db } = backendFixture(t);
  const salt = '0123456789abcdef0123456789abcdef';
  const account = (username, role) => ({ username, id: username, roles: [role], salt,
    passwordHash: scryptSync('test-password', Buffer.from(salt, 'hex'), 64).toString('hex') });
  const app = createApp({ db, secureCookies: false, simulateDevices: true, demoAccounts: [account('rider', 'user'), account('operator', 'operator')] });
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  t.after(() => browser.close());
  const errors = [];
  async function pageFor(experience, viewport) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/' + experience + '.html');
    await page.getByLabel('Tài khoản', { exact: true }).fill(experience === 'user-app' ? 'rider' : 'operator');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.locator('#live-nav button').first().waitFor();
    return page;
  }
  const user = await pageFor('user-app', { width: 390, height: 844 });
  await user.locator('[data-hub="metro"]').click();
  await user.locator('[data-vehicle="EB-024"]').click();
  await user.getByRole('button', { name: 'Xác nhận giữ xe', exact: true }).click();
  await user.locator('.pickup-form').waitFor();
  await user.reload(); await user.locator('.pickup-form').waitFor();
  await user.getByLabel('Mã trên xe').fill('WRONG');
  await user.getByRole('button', { name: 'Xác nhận nhận xe', exact: true }).click();
  await user.waitForFunction(() => document.getElementById('live-status').textContent.includes('không khớp'));
  await user.getByLabel('Mã trên xe').fill('EB-024');
  await user.getByRole('button', { name: 'Xác nhận nhận xe', exact: true }).click();
  await user.locator('.return-form').waitFor();
  await user.getByLabel('Hub trả xe').selectOption('bku');
  await user.getByRole('button', { name: 'Kiểm tra chỗ trả', exact: true }).click();
  await user.locator('select[name="slotId"] option[value="bku-A01"]').waitFor({ state: 'attached' });
  await user.getByLabel('Chỗ trả', { exact: true }).selectOption('bku-A01');
  await user.locator('input[name="confirmed"]').check();
  await user.getByRole('button', { name: 'Xác nhận trả xe', exact: true }).click();
  await user.waitForFunction(() => document.querySelector('.success')?.textContent.includes('kết thúc chuyến'));
  assert.equal(db.prepare('SELECT status FROM mobility_trips').get().status, 'Completed');
  assert.equal(await user.evaluate(() => fetch('/api/v1/simulations').then(response => response.status)), 403);
  await user.locator('[data-view="home"]').click();
  await user.locator('[data-hub="metro"]').click();
  await user.locator('[data-vehicle="EB-031"]').click();
  let lost = false;
  await user.route('**/api/v1/vehicle-reservations', async route => {
    if (route.request().method() === 'POST' && !lost) { lost = true; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await user.getByRole('button', { name: 'Xác nhận giữ xe', exact: true }).click();
  await user.waitForFunction(() => document.getElementById('live-status').textContent.includes('Mất kết nối'));
  await user.reload();
  await user.getByRole('button', { name: 'Thử lại yêu cầu trước', exact: true }).click();
  await user.locator('.pickup-form').waitFor();
  assert.equal(db.prepare("SELECT count(*) AS n FROM vehicle_reservations WHERE vehicle_id='EB-031'").get().n, 1);
  await user.locator('[data-cancel]').click();
  await user.waitForFunction(() => !document.querySelector('.pickup-form'));
  assert.ok(await user.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const desktop = await pageFor('operator-web', { width: 1440, height: 1000 });
  for (const scenario of ['metro', 'parking', 'charging-demand', 'charging', 'clustering']) {
    await desktop.locator('[data-view="simulation"]').click();
    await desktop.locator('#scenario').selectOption(scenario);
    await desktop.locator('#simulation-form button').click();
    await desktop.getByRole('button', { name: 'Xuất kết quả JSON' }).waitFor();
  }
  assert.equal(db.prepare('SELECT count(*) AS n FROM simulation_results').get().n, 5);
  await desktop.reload();
  await desktop.locator('[data-result]').first().click();
  await desktop.getByRole('button', { name: 'Xuất kết quả JSON' }).waitFor();
  assert.ok(await desktop.locator('table').textContent().then(text => text.includes('Tỷ lệ phục vụ')));
  await desktop.locator('[data-recommendation]').first().click();
  await desktop.locator('#transfer-form input[name="vehicleIds"]').first().check();
  await desktop.locator('#transfer-form input[name="slotIds"]').first().check();
  await desktop.locator('#transfer-form button').click();
  await desktop.waitForFunction(() => document.querySelector('.success')?.textContent.includes('Đã tạo lệnh'));
  assert.equal(db.prepare('SELECT status FROM transfers').get().status, 'Planned');
  const mobile = await pageFor('operator-app', { width: 390, height: 844 });
  await mobile.locator('[data-view="results"]').click();
  await mobile.locator('[data-result]').first().click();
  await mobile.getByRole('button', { name: 'Xuất kết quả JSON' }).waitFor();
  assert.equal(await mobile.locator('thead').isVisible(), true);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (process.env.LIVE_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.LIVE_SCREENSHOT_DIR, { recursive: true });
    for (const [name, page] of [['user-mobile', user], ['operator-desktop', desktop], ['operator-mobile', mobile]]) {
      await page.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, name + '.png'), fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
});
