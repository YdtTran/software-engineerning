const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { scryptSync } = require('node:crypto');
const { backendFixture } = require('../modules/mobility-simulation/tests/fixtures/backend-fixture');
const { createApp } = require('../app');

test('operator UI handles live workflows and five simulations on mobile and desktop', { timeout: 60000 }, async t => {
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
    await page.getByLabel('Tài khoản', { exact: true }).fill('operator');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.locator('#live-nav button').first().waitFor();
    return page;
  }
  const desktop = await pageFor('operator-web', { width: 1440, height: 1000 });
  await desktop.getByRole('heading', { name: 'Tổng quan mạng lưới', exact: true }).waitFor();
  assert.deepEqual(await desktop.locator('.dashboard-metric strong').allTextContents(), ['62', '39', '9', '0']);
  assert.equal(await desktop.locator('#live-nav button').count(), 8);
  assert.ok((await desktop.locator('.hub-table tbody tr').count()) === 4);
  assert.equal(await desktop.locator('#hub-map').isVisible(), true);
  assert.match(await desktop.locator('.hub-map-note').innerText(), /minh họa/);
  await desktop.locator('.hub-map-marker').first().waitFor();
  assert.equal(await desktop.locator('.hub-map-marker').count(), 4);
  await desktop.locator('.hub-map-marker').first().click();
  assert.match(await desktop.locator('.maplibregl-popup').innerText(), /khả dụng/);
  await desktop.route('https://tiles.openfreemap.org/**', route => route.abort());
  await desktop.reload();
  await desktop.locator('.hub-map-status').getByText('Không tải được bản đồ. Vui lòng kiểm tra kết nối mạng.').waitFor();
  assert.equal(await desktop.locator('.hub-table tbody tr').count(), 4);
  await desktop.unroute('https://tiles.openfreemap.org/**');
  await desktop.reload();
  await desktop.locator('.hub-map-marker').first().waitFor();
  if (process.env.LIVE_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.LIVE_SCREENSHOT_DIR, { recursive: true });
    await desktop.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'operator-desktop-overview.png'), fullPage: true });
  }
  await desktop.locator('[data-view="resources"]').click();
  await desktop.getByRole('heading', { name: 'Quản lý tài nguyên', exact: true }).waitFor();
  assert.deepEqual(await desktop.locator('.resource-metrics strong').allTextContents(), ['62', '39', '9', '110']);
  if (process.env.LIVE_SCREENSHOT_DIR) {
    await desktop.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'operator-desktop-resources.png'), fullPage: true });
  }
  await desktop.locator('#resource-create-form select[name="hubId"]').selectOption('metro');
  await desktop.locator('#resource-create-form input[name="id"]').fill('UI-RESOURCE-1');
  await desktop.locator('#resource-create-form select[name="vehicleType"]').selectOption('electric_bicycle');
  await desktop.locator('#resource-create-form input[name="batteryPercent"]').fill('88');
  assert.equal(await desktop.locator('#resource-create-form').evaluate(form => form.checkValidity()), true);
  const createResponsePromise = desktop.waitForResponse(response => response.url().endsWith('/api/v1/operations/resources') && response.request().method() === 'POST');
  await desktop.locator('#resource-create-form button').click();
  const createResponse = await createResponsePromise;
  assert.equal(createResponse.status(), 201, await createResponse.text());
  await desktop.waitForFunction(() => document.querySelector('.success')?.textContent.includes('UI-RESOURCE-1'));
  assert.match(await desktop.locator('.success').textContent(), /Đã thêm UI-RESOURCE-1/);
  assert.equal(db.prepare("SELECT battery_percent FROM electric_vehicles WHERE id='UI-RESOURCE-1'").get().battery_percent, 88);
  await desktop.locator('[data-resource-status="UI-RESOURCE-1"]').click();
  await desktop.locator('tr', { has: desktop.locator('[data-resource-status="UI-RESOURCE-1"]') }).getByText('Bảo trì', { exact: true }).waitFor();
  assert.equal(db.prepare("SELECT status FROM electric_vehicles WHERE id='UI-RESOURCE-1'").get().status, 'Maintenance');
  await desktop.locator('[data-resource-status="UI-RESOURCE-1"]').click();
  await desktop.locator('tr', { has: desktop.locator('[data-resource-status="UI-RESOURCE-1"]') }).getByText('Khả dụng', { exact: true }).waitFor();
  desktop.once('dialog', dialog => dialog.accept());
  const deleteResponsePromise = desktop.waitForResponse(response => response.url().endsWith('/api/v1/operations/resources/UI-RESOURCE-1') && response.request().method() === 'DELETE');
  await desktop.locator('[data-resource-delete="UI-RESOURCE-1"]').click();
  const deleteResponse = await deleteResponsePromise;
  assert.equal(deleteResponse.status(), 200, await deleteResponse.text());
  await desktop.waitForFunction(() => document.querySelector('.success')?.textContent.includes('Đã xóa'));
  assert.equal(db.prepare("SELECT count(*) AS n FROM electric_vehicles WHERE id='UI-RESOURCE-1'").get().n, 0);
  assert.doesNotMatch(await desktop.locator('#live-app').textContent(), /UC(?:08|09|10|11|12)/);
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
  await desktop.getByRole('heading', { name: 'Điều phối phương tiện', exact: true }).waitFor();
  assert.match(await desktop.locator('.transfer-suggestion').textContent(), /Đề xuất từ mô phỏng/);
  const transferForm = desktop.locator('#redistribute-form');
  assert.equal(await transferForm.locator('[data-transfer-submit]').isDisabled(), true);
  if (await transferForm.locator('input[name="vehicleIds"]').count() > 1) {
    await transferForm.locator('input[name="vehicleIds"]').nth(0).check();
    await transferForm.locator('input[name="vehicleIds"]').nth(1).check();
    await transferForm.locator('input[name="slotIds"]').first().check();
    assert.equal(await transferForm.locator('[data-transfer-submit]').isDisabled(), true, 'Mismatched vehicle and slot counts must not be submittable.');
    await transferForm.locator('input[name="vehicleIds"]').nth(1).uncheck();
  } else {
    await transferForm.locator('input[name="vehicleIds"]').first().check();
    await transferForm.locator('input[name="slotIds"]').first().check();
  }
  const [plannedVehicle] = await transferForm.locator('input[name="vehicleIds"]:checked').evaluateAll(inputs => inputs.map(input => input.value));
  await transferForm.locator('[data-transfer-submit]').click();
  await desktop.waitForFunction(() => document.querySelector('.success')?.textContent.includes('Đã tạo lệnh'));
  const firstTransfer = db.prepare('SELECT id, status FROM transfers').get();
  assert.equal(firstTransfer.status, 'Planned');
  assert.equal(db.prepare('SELECT status FROM electric_vehicles WHERE id = ?').get(plannedVehicle).status, 'TransferHeld');
  const firstCard = desktop.locator(`[data-transfer="${firstTransfer.id}"]`);
  await firstCard.getByText('Chờ xuất phát', { exact: true }).waitFor();
  await desktop.reload();
  await firstCard.getByText('Chờ xuất phát', { exact: true }).waitFor();
  desktop.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? 'Kiểm thử hủy lệnh' : undefined));
  await firstCard.locator(`[data-transfer-depart="${firstTransfer.id}"]`).click();
  await firstCard.getByText('Đang di chuyển', { exact: true }).waitFor();
  assert.equal(db.prepare('SELECT status FROM transfers WHERE id = ?').get(firstTransfer.id).status, 'InTransit');
  assert.equal(await firstCard.locator('[data-transfer-cancel]').count(), 0, 'In-transit transfers must not offer cancellation.');
  await firstCard.locator('.arrival-form button').click();
  await desktop.waitForFunction(() => document.getElementById('live-status').textContent.includes('Cần xác nhận đủ'));
  await firstCard.locator('input[name="observedVehicleIds"]').first().check();
  await firstCard.locator('.arrival-form button').click();
  await firstCard.getByText('Hoàn tất', { exact: true }).waitFor();
  assert.equal(db.prepare('SELECT status FROM transfers WHERE id = ?').get(firstTransfer.id).status, 'Completed');
  assert.equal(await firstCard.locator('[data-transfer-depart], .arrival-form').count(), 0, 'Completed transfers must not accept further lifecycle actions.');
  await transferForm.locator('input[name="vehicleIds"]').first().check();
  await transferForm.locator('input[name="slotIds"]').first().check();
  await transferForm.locator('[data-transfer-submit]').click();
  await desktop.waitForFunction(id => [...document.querySelectorAll('[data-transfer]')].some(card => card.dataset.transfer !== id), firstTransfer.id);
  const secondTransfer = db.prepare("SELECT id FROM transfers WHERE status = 'Planned'").get();
  const heldSlot = db.prepare('SELECT slot_id FROM transfer_destination_slots WHERE transfer_id = ?').get(secondTransfer.id).slot_id;
  await desktop.locator(`[data-transfer-cancel="${secondTransfer.id}"]`).click();
  await desktop.locator(`[data-transfer="${secondTransfer.id}"]`).getByText('Đã hủy', { exact: true }).waitFor();
  assert.equal(db.prepare('SELECT cancel_reason FROM transfers WHERE id = ?').get(secondTransfer.id).cancel_reason, 'Kiểm thử hủy lệnh');
  assert.equal(db.prepare('SELECT status FROM parking_slots WHERE id = ?').get(heldSlot).status, 'Available');
  await desktop.locator('#transfer-lookup-form input[name="transferId"]').fill('TRF-KHONG-TON-TAI');
  await desktop.locator('#transfer-lookup-form button').click();
  await desktop.waitForFunction(() => document.getElementById('live-status').textContent.includes('Không tìm thấy lệnh'));
  assert.doesNotMatch(await desktop.locator('#live-app').textContent(), /UC(?:08|09|10|11|12)/);
  if (process.env.LIVE_SCREENSHOT_DIR) {
    await desktop.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'operator-desktop-redistribute.png'), fullPage: true });
  }
  const incidentVehicle = db.prepare("SELECT id FROM electric_vehicles WHERE hub_id = 'metro' AND status = 'Available' ORDER BY id LIMIT 1").get().id;
  const rider = await browser.newContext();
  const login = await rider.request.post(origin + '/api/v1/session', { headers: { origin }, data: { username: 'rider', password: 'test-password' } });
  assert.equal(login.status(), 200);
  async function riderPost(route, data, key) {
    const response = await rider.request.post(origin + '/api/v1' + route, { headers: { origin, 'idempotency-key': key }, data });
    assert.ok(response.ok(), await response.text());
    return (await response.json()).data;
  }
  const reservation = await riderPost('/vehicle-reservations', { vehicleId: incidentVehicle, hubId: 'metro' }, 'incident-reserve');
  const activeTrip = await riderPost(`/vehicle-reservations/${reservation.id}/pickup`, { vehicleCode: incidentVehicle }, 'incident-pickup');
  await riderPost(`/trips/${activeTrip.id}/incidents`, { description: 'Phanh sau kêu bất thường khi xuống dốc' }, 'incident-report');
  assert.equal(db.prepare('SELECT status FROM mobility_trips WHERE id = ?').get(activeTrip.id).status, 'Active');
  assert.equal(db.prepare('SELECT status FROM electric_vehicles WHERE id = ?').get(incidentVehicle).status, 'InUse');
  const returnSlot = db.prepare("SELECT id FROM parking_slots WHERE hub_id = 'bku' AND status = 'Available' ORDER BY id LIMIT 1").get().id;
  await riderPost(`/trips/${activeTrip.id}/return`, { hubId: 'bku', slotId: returnSlot, confirmed: true }, 'incident-return');
  await rider.close();
  assert.equal(db.prepare('SELECT status FROM electric_vehicles WHERE id = ?').get(incidentVehicle).status, 'Faulty');
  const incidentRecord = db.prepare('SELECT id FROM incidents WHERE reported_trip_id = ?').get(activeTrip.id);
  await desktop.locator('[data-view="incidents"]').click();
  await desktop.getByRole('heading', { name: 'Sự cố vận hành', exact: true }).waitFor();
  await desktop.locator('#incident-filter-form select[name="status"]').selectOption('Open');
  await desktop.locator('#incident-filter-form select[name="hubId"]').selectOption('bku');
  await desktop.locator('#incident-filter-form button.primary').click();
  const incidentCard = desktop.locator(`[data-incident="${incidentRecord.id}"]`);
  await incidentCard.getByText('Mới tiếp nhận', { exact: true }).waitFor();
  assert.match(await incidentCard.textContent(), /Lỗi · Đã cách ly/);
  await incidentCard.locator('input[name="resourceId"]').fill('WRONG-VEHICLE');
  await incidentCard.locator('input[name="technicianId"]').fill('TECH-MINH-01');
  await incidentCard.locator('.incident-handle-form button').click();
  await desktop.waitForFunction(() => document.getElementById('live-status').textContent.includes('không khớp với tài nguyên của sự cố'));
  await incidentCard.locator('input[name="resourceId"]').fill(incidentVehicle);
  await incidentCard.locator('input[name="technicianId"]').fill('TECH-MINH-01');
  await incidentCard.locator('.incident-handle-form button').click();
  await desktop.waitForFunction(() => document.querySelector('.success')?.textContent.includes('TECH-MINH-01'));
  await desktop.locator('[data-action="clear-incident-filters"]').click();
  await incidentCard.getByText('Đang xử lý', { exact: true }).waitFor();
  assert.match(await incidentCard.locator('.incident-assignment').textContent(), /TECH-MINH-01/);
  await desktop.reload();
  await incidentCard.getByText('Đang xử lý', { exact: true }).waitFor();
  assert.match(await incidentCard.locator('.incident-assignment').textContent(), /TECH-MINH-01/);
  await incidentCard.locator('input[name="resolutionNotes"]').fill('Đã căn chỉnh phanh sau và kiểm tra an toàn');
  await incidentCard.locator('.incident-resolve-form button').click();
  await incidentCard.getByText('Đã xử lý', { exact: true }).waitFor();
  assert.equal(db.prepare('SELECT status FROM incidents WHERE id = ?').get(incidentRecord.id).status, 'Resolved');
  assert.equal(db.prepare('SELECT status FROM electric_vehicles WHERE id = ?').get(incidentVehicle).status, 'Available');
  assert.doesNotMatch(await desktop.locator('#live-app').textContent(), /UC(?:08|09|10|11|12)/);
  if (process.env.LIVE_SCREENSHOT_DIR) {
    await desktop.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'operator-desktop-incidents.png'), fullPage: true });
  }
  db.prepare('UPDATE mobility_hubs SET power_limit_kw = ? WHERE id = ?').run(12.6, 'library');
  db.prepare("UPDATE charging_points SET status = 'Fault' WHERE id = 'library-C03'").run();
  db.prepare("UPDATE electric_vehicles SET battery_percent = 40 WHERE id = 'EM-117'").run();
  db.prepare("UPDATE electric_vehicles SET battery_percent = 45 WHERE id = 'EB-135'").run();
  const insertChargingReq = db.prepare(`INSERT INTO charging_requests (
    id, user_id, vehicle_id, occupancy_id, hub_id,
    battery_at_request, target_battery_percent, needed_by, requested_start,
    manual_priority_rank, status, created_at, updated_at
  ) VALUES (?, 'operator', ?, NULL, 'library', ?, 90, '2030-01-01T12:00:00.000Z', NULL, NULL, 'Queued', ?, ?)`);
  insertChargingReq.run('CREQ-UI-1', 'EM-117', 40, '2026-11-16T01:00:00.000Z', '2026-11-16T01:00:00.000Z');
  insertChargingReq.run('CREQ-UI-2', 'EB-135', 45, '2026-11-16T01:01:00.000Z', '2026-11-16T01:01:00.000Z');
  await desktop.locator('[data-view="schedule"]').click();
  await desktop.getByRole('heading', { name: 'Lịch sạc thông minh', exact: true }).waitFor();
  await desktop.locator('#schedule-hub').selectOption('library');
  await desktop.locator('[data-charging-request="CREQ-UI-1"]').waitFor();
  assert.deepEqual(await desktop.locator('.schedule-metrics strong').allTextContents(), ['12.6 kW', '0 kW', '12.6 kW', '2 chờ · 2/3 cổng']);
  assert.deepEqual(
    await desktop.locator('[data-charging-request]').evaluateAll(nodes => nodes.map(node => node.dataset.chargingRequest)),
    ['CREQ-UI-1', 'CREQ-UI-2']
  );
  await desktop.locator('#schedule-override-form input[name="rank:CREQ-UI-2"]').fill('1');
  await desktop.locator('#schedule-override-form input[name="rank:CREQ-UI-1"]').fill('2');
  await desktop.locator('#schedule-override-form button.primary').click();
  await desktop.waitForFunction(() => document.querySelector('.success')?.textContent.includes('thứ tự ưu tiên'));
  assert.deepEqual(
    await desktop.locator('[data-charging-request]').evaluateAll(nodes => nodes.map(node => node.dataset.chargingRequest)),
    ['CREQ-UI-2', 'CREQ-UI-1']
  );
  await desktop.reload();
  await desktop.locator('#schedule-hub').selectOption('library');
  await desktop.locator('[data-charging-request="CREQ-UI-2"]').waitFor();
  assert.deepEqual(
    await desktop.locator('[data-charging-request]').evaluateAll(nodes => nodes.map(node => node.dataset.chargingRequest)),
    ['CREQ-UI-2', 'CREQ-UI-1']
  );
  const req2Card = desktop.locator('[data-charging-request="CREQ-UI-2"]');
  await req2Card.locator('select[name="pointId"]').selectOption('library-C03');
  await req2Card.locator('.charging-allocate-form button').click();
  await desktop.waitForFunction(() => document.getElementById('live-status').textContent.includes('đang bận, đang sửa chữa'));
  await req2Card.locator('select[name="pointId"]').selectOption('library-C01');
  await req2Card.locator('input[name="powerKw"]').fill('7.4');
  await req2Card.locator('.charging-allocate-form button').click();
  await desktop.waitForFunction(() => document.querySelector('[data-charging-request="CREQ-UI-2"]')?.dataset.chargingPhase === 'allocated');
  assert.deepEqual(await desktop.locator('.schedule-metrics strong').allTextContents(), ['12.6 kW', '7.4 kW', '5.2 kW', '1 chờ · 1/3 cổng']);
  const req1Card = desktop.locator('[data-charging-request="CREQ-UI-1"]');
  await req1Card.locator('select[name="pointId"]').selectOption('library-C02');
  await req1Card.locator('input[name="powerKw"]').fill('7.4');
  await req1Card.locator('.charging-allocate-form button').click();
  await desktop.waitForFunction(() => document.getElementById('live-status').textContent.includes('vượt giới hạn công suất an toàn'));
  await req1Card.locator('select[name="pointId"]').selectOption('library-C02');
  await req1Card.locator('input[name="powerKw"]').fill('5.2');
  await req1Card.locator('.charging-allocate-form button').click();
  await desktop.waitForFunction(() => document.querySelector('[data-charging-request="CREQ-UI-1"]')?.dataset.chargingPhase === 'allocated');
  assert.deepEqual(await desktop.locator('.schedule-metrics strong').allTextContents(), ['12.6 kW', '12.6 kW', '0 kW', '0 chờ · 0/3 cổng']);
  db.prepare("UPDATE charging_allocations SET state = 'Charging' WHERE request_id = 'CREQ-UI-2'").run();
  db.prepare("UPDATE charging_requests SET status = 'Charging' WHERE id = 'CREQ-UI-2'").run();
  db.prepare("UPDATE charging_allocations SET state = 'Stopping' WHERE request_id = 'CREQ-UI-1'").run();
  await desktop.locator('[data-action="refresh"]').click();
  await desktop.waitForFunction(() => document.querySelector('[data-charging-request="CREQ-UI-2"]')?.dataset.chargingPhase === 'active');
  assert.equal(await req1Card.getAttribute('data-charging-phase'), 'stopping');
  db.prepare("UPDATE charging_allocations SET state = 'Complete', allocated_power_kw = 0, released_at = '2026-11-16T02:00:00.000Z' WHERE request_id = 'CREQ-UI-1'").run();
  db.prepare("UPDATE charging_requests SET status = 'Completed' WHERE id = 'CREQ-UI-1'").run();
  await desktop.locator('[data-action="refresh"]').click();
  await desktop.waitForFunction(() => document.querySelector('[data-charging-request="CREQ-UI-1"]')?.dataset.chargingPhase === 'completed');
  assert.doesNotMatch(await desktop.locator('#live-app').textContent(), /UC(?:08|09|10|11|12)/);
  if (process.env.LIVE_SCREENSHOT_DIR) {
    await desktop.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'operator-desktop-schedule.png'), fullPage: true });
  }
  for (const width of [1440, 1150, 820]) {
    await desktop.setViewportSize({ width, height: 1000 });
    assert.ok(await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Operator desktop must not overflow horizontally at ${width}px.`);
  }
  await desktop.setViewportSize({ width: 1440, height: 1000 });
  await desktop.locator('[data-view="account"]').click();
  await desktop.getByRole('heading', { name: 'Tài khoản vận hành', exact: true }).waitFor();
  assert.deepEqual(await desktop.locator('.account-metrics strong').allTextContents(), ['operator', 'Operator', '4 Hub', '0']);
  assert.doesNotMatch(await desktop.locator('#live-app').textContent(), /UC(?:08|09|10|11|12)/);
  if (process.env.LIVE_SCREENSHOT_DIR) {
    await desktop.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'operator-desktop-account.png'), fullPage: true });
  }
  await desktop.locator('[data-action="logout"]').click();
  await desktop.locator('#login-form').waitFor();
  const mobile = await pageFor('operator-app', { width: 390, height: 844 });
  await mobile.getByRole('heading', { name: 'Tổng quan mạng lưới', exact: true }).waitFor();
  assert.equal(await mobile.locator('#hub-map').count(), 0);
  if (process.env.LIVE_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.LIVE_SCREENSHOT_DIR, { recursive: true });
    await mobile.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'operator-mobile-overview.png'), fullPage: true });
  }
  await mobile.locator('[data-view="op-menu"]').click();
  await mobile.locator('.operator-menu-card [data-view="results"]').click();
  await mobile.locator('[data-result]').first().click();
  await mobile.getByRole('button', { name: 'Xuất kết quả JSON' }).waitFor();
  assert.equal(await mobile.locator('thead').isVisible(), true);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (process.env.LIVE_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.LIVE_SCREENSHOT_DIR, { recursive: true });
    for (const [name, page] of [['operator-desktop', desktop], ['operator-mobile', mobile]]) {
      await page.screenshot({ path: path.join(process.env.LIVE_SCREENSHOT_DIR, name + '.png'), fullPage: true });
    }
  }
  const newHubs = ['demo-dorm-b', 'demo-hcmus', 'demo-hcmussh', 'demo-uit', 'demo-iu', 'demo-uel'];
  for (const id of newHubs) db.prepare('INSERT INTO mobility_hubs (id, name) VALUES (?, ?)').run(id, id);
  const overview = await pageFor('operator-web', { width: 1440, height: 1000 });
  await overview.locator('.hub-map-marker').nth(9).waitFor();
  assert.equal(await overview.locator('.hub-map-marker').count(), 10);
  assert.deepEqual(errors, []);
});
