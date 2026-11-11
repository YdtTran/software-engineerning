(() => {
  'use strict';
  const experience = new URLSearchParams(location.search).get('experience') || 'user-app';
  const operator = experience === 'operator-app' || experience === 'operator-web';
  document.body.classList.add(operator ? experience : 'user-app');
  document.getElementById('experience-label').textContent = operator ? 'Không gian vận hành' : 'Ứng dụng người dùng';
  const root = document.getElementById('live-app'), nav = document.getElementById('live-nav'), status = document.getElementById('live-status');
  const state = { user: null, hubs: [], vehicles: [], reservations: [], trips: [], results: [], result: null,
    selectedHub: '', selectedVehicle: null, hubMatches: null, returnChoices: {}, scenario: 'metro', draft: null,
    view: location.hash.slice(1) || (operator ? 'simulation' : 'home'), error: '', busy: false, success: '' };
  const labels = { metro: 'Khách Metro tăng đột biến', parking: 'Hub hết chỗ đỗ', 'charging-demand': 'Nhu cầu sạc tăng', charging: 'Cổng sạc ngừng hoạt động', clustering: 'Xe phân bố mất cân bằng' };
  const statuses = { Reserved: 'Đang giữ xe', PickupClaimed: 'Đang xác nhận nhận xe', PickupUncertain: 'Cần đối soát nhận xe', Fulfilled: 'Đã nhận xe', Cancelled: 'Đã hủy', Expired: 'Đã hết hạn', Active: 'Đang đi', Completed: 'Đã hoàn tất' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const name = id => state.hubs.find(hub => hub.id === id)?.name || id;
  const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
  const vehicleName = vehicle => `${vehicle.vehicleType === 'electric_motorbike' ? 'Xe máy điện' : 'Xe đạp điện'} · ${vehicle.id}`;
  const empty = text => `<p class="empty">${esc(text)}</p>`;
  const option = (value, text, selected) => `<option value="${esc(value)}" ${selected === value ? 'selected' : ''}>${esc(text)}</option>`;
  const messages = {
    UNAUTHENTICATED: 'Phiên đã kết thúc. Vui lòng đăng nhập lại.', FORBIDDEN_OPERATION: 'Tài khoản không có quyền thực hiện thao tác này.',
    VEHICLE_CODE_MISMATCH: 'Mã xe không khớp phiếu. Hãy kiểm tra mã trên xe.', RESERVATION_EXPIRED: 'Phiếu đã hết hạn. Vui lòng chọn xe lại.',
    VEHICLE_NOT_AVAILABLE: 'Xe vừa được giữ hoặc không còn khả dụng. Danh sách đã được cập nhật.',
    SLOT_UNAVAILABLE: 'Chỗ trả vừa thay đổi hoặc đã có cam kết khác. Hãy chọn lại chỗ.',
    DEVICE_UNCONFIRMED: 'Chưa xác nhận được trạng thái xe. Tài nguyên đang được giữ để đối soát; hãy thử lại yêu cầu cũ.',
    COMMAND_IN_PROGRESS: 'Yêu cầu cũ đang được xử lý. Hãy tải lại trạng thái rồi thử lại.', RETURN_PENDING: 'Chuyến đang có một yêu cầu trả xe cần đối soát.',
    INVALID_SCENARIO: 'Tham số mô phỏng chưa hợp lệ. Hãy kiểm tra giới hạn và số cổng sạc của Hub.',
    IDEMPOTENCY_KEY_REUSED: 'Yêu cầu đã thay đổi. Hãy tải lại trạng thái trước khi tiếp tục.',
    RESERVATION_CONFLICT: 'Trạng thái phiếu đã thay đổi. Hãy kiểm tra lại phiếu.',
    INTERNAL_ERROR: 'Chưa thể hoàn tất yêu cầu. Bạn có thể thử lại.', SNAPSHOT_UNAVAILABLE: 'Chưa lấy được dữ liệu mạng lưới. Hãy thử lại.'
  };
  async function api(path, options = {}) {
    let response;
    try { response = await fetch('/api/v1' + path, { credentials: 'same-origin', ...options }); }
    catch { const error = new Error('Mất kết nối. Yêu cầu được giữ lại để bạn thử lại an toàn.'); error.network = true; throw error; }
    const body = await response.json();
    if (!response.ok) {
      if (response.status === 401) state.user = null;
      const error = new Error(messages[body.error?.code] || body.error?.message || 'Không thể thực hiện yêu cầu.');
      error.status = response.status; error.code = body.error?.code; throw error;
    }
    return body.data;
  }
  function pendingStore() {
    const storageKey = `mobility-pending:${state.user.id}`;
    let values;
    try { values = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { values = {}; }
    return { values, save: () => localStorage.setItem(storageKey, JSON.stringify(values)) };
  }
  async function write(path, body, operation) {
    const store = pendingStore(), serialized = JSON.stringify(body), previous = store.values[operation];
    if (previous && previous.body !== serialized) throw new Error('Yêu cầu trước chưa rõ kết quả. Hãy thử lại đúng yêu cầu cũ trước khi thay đổi.');
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const key = previous?.key || Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    store.values[operation] = { key, body: serialized, path }; store.save();
    try {
      const data = await api(path, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: serialized });
      delete store.values[operation]; store.save(); return data;
    } catch (error) {
      if (error.status && error.status < 500 && error.code !== 'COMMAND_IN_PROGRESS') { delete store.values[operation]; store.save(); }
      throw error;
    }
  }
  async function refreshUser() {
    [state.reservations, state.trips] = await Promise.all([api('/vehicle-reservations'), api('/trips')]);
    state.trips = await Promise.all(state.trips.map(trip => trip.status === 'Active' ? api('/trips/' + encodeURIComponent(trip.id)) : trip));
  }
  async function reload() {
    state.hubs = await api('/hubs');
    state.hubMatches = null;
    state.selectedHub ||= state.hubs[0]?.id || '';
    if (operator) state.results = await api('/simulations');
    else {
      await refreshUser();
      if (state.selectedHub) state.vehicles = await api(`/hubs/${encodeURIComponent(state.selectedHub)}/vehicles`);
    }
    if (state.view === 'transfer' && state.draft) await loadTransferDraft(state.draft);
  }
  async function loadTransferDraft(item) {
    const [vehicles, slots] = await Promise.all([api(`/hubs/${encodeURIComponent(item.sourceHubId)}/vehicles`), api(`/operations/resources?kind=slot&hubId=${encodeURIComponent(item.destinationHubId)}`)]);
    state.draft = { ...item, vehicles: vehicles.filter(vehicle => vehicle.batteryPercent >= 80), slots: slots.filter(slot => slot.status.toLowerCase() === 'available') };
  }
  async function run(action) {
    if (state.busy) return;
    state.busy = true; state.error = ''; state.success = '';
    root.setAttribute('aria-busy', 'true');
    status.textContent = 'Đang xử lý…';
    root.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try { await action(); }
    catch (error) {
      state.error = error.message;
      if ([409, 422, 503].includes(error.status)) {
        try { await reload(); } catch { /* Preserve the original failure. */ }
      }
    } finally { state.busy = false; render(); }
  }
  function login() {
    return `<section class="card login"><h1>Đăng nhập</h1><p class="muted">${operator ? 'Dành cho tài khoản vận hành.' : 'Dành cho tài khoản người dùng đã được cấp.'}</p><form id="login-form"><label>Tài khoản<input class="field" name="username" autocomplete="username" required></label><label>Mật khẩu<input class="field" name="password" type="password" autocomplete="current-password" required></label><button class="primary" type="submit">Đăng nhập</button></form></section>`;
  }
  function home() {
    return `<h1>Tìm Hub, chọn xe</h1><form id="hub-search" class="filter-form"><input class="field" name="q" aria-label="Tìm Hub" placeholder="Tên Hub hoặc trường…"><button class="secondary">Tìm kiếm</button></form><div class="live-grid">${(state.hubMatches || state.hubs).map(hub => `<section class="card"><h2>${esc(hub.name)}</h2><button class="${state.selectedHub === hub.id ? 'primary' : 'secondary'}" data-hub="${esc(hub.id)}">Xem xe</button></section>`).join('') || empty('Không tìm thấy Hub phù hợp.')}</div><h2>Xe tại ${esc(name(state.selectedHub))}</h2><div class="live-grid">${state.vehicles.map(vehicle => `<section class="card"><h3>${esc(vehicleName(vehicle))}</h3><p>Pin ${esc(vehicle.batteryPercent)}%</p><button class="primary" data-vehicle="${esc(vehicle.id)}">Chọn xe</button></section>`).join('') || empty('Hiện không có xe khả dụng tại Hub này.')}</div>${state.selectedVehicle ? `<section class="card"><h2>Xác nhận giữ ${esc(state.selectedVehicle.id)}</h2><p>Giữ xe tối đa 15 phút. Tình trạng xe sẽ được kiểm tra lại khi xác nhận.</p><button class="primary" data-action="reserve">Xác nhận giữ xe</button></section>` : ''}`;
  }
  function journeys() {
    const reservations = state.reservations.filter(record => ['Reserved', 'PickupClaimed', 'PickupUncertain'].includes(record.status));
    return `<h1>Phiếu và chuyến của tôi</h1><button class="secondary" data-action="refresh">Tải lại trạng thái</button><h2 style="margin-top:22px">Phiếu đang xử lý</h2>${reservations.map(record => `<section class="card"><h3>${esc(record.vehicleId)} · ${esc(statuses[record.status])}</h3><p>${esc(name(record.hubId))}</p><p>Hạn nhận: ${esc(date(record.expiresAt))}</p><p class="record-id">Mã phiếu: ${esc(record.ticketCode)}</p><form class="pickup-form" data-id="${esc(record.id)}"><label>Mã trên xe<input class="field" name="vehicleCode" required value="${record.status === 'Reserved' ? '' : esc(record.vehicleId)}" autocomplete="off"></label><button class="primary">${record.status === 'Reserved' ? 'Xác nhận nhận xe' : 'Thử lại xác nhận nhận xe'}</button></form>${record.status === 'Reserved' ? `<button class="secondary" data-cancel="${esc(record.id)}" style="margin-top:12px">Hủy giữ xe</button>` : '<p class="notice">Xe đang được giữ trong lúc xác nhận. Không tạo yêu cầu nhận xe mới.</p>'}</section>`).join('') || empty('Bạn không có phiếu giữ xe đang chờ.')}<h2>Chuyến đi</h2>${state.trips.map(trip => {
      const choice = state.returnChoices[trip.id] || { hubId: state.hubs[0]?.id, slots: [] };
      return `<section class="card"><h3>${esc(trip.vehicleId)} · ${esc(statuses[trip.status])}</h3><p>Bắt đầu: ${esc(date(trip.startTime))}</p>${trip.status === 'Active' && trip.pendingReturn ? `<p class="notice">Đang đối soát tại ${esc(name(trip.pendingReturn.hubId))}, chỗ ${esc(trip.pendingReturn.slotId)}. Thử lại yêu cầu cũ trên thiết bị đã gửi.</p><button class="primary" data-retry-return="${esc(trip.id)}">Thử lại xác nhận trả xe</button>` : trip.status === 'Active' ? `<form class="return-form" data-id="${esc(trip.id)}"><label>Hub trả xe<select class="field return-hub" name="hubId" data-trip="${esc(trip.id)}">${state.hubs.map(hub => option(hub.id, hub.name, choice.hubId)).join('')}</select></label><button type="button" class="secondary" data-slots="${esc(trip.id)}">Kiểm tra chỗ trả</button><label>Chỗ trả<select class="field" name="slotId" aria-label="Chỗ trả" required><option value="">Chọn chỗ đã kiểm tra</option>${choice.slots.map(slot => option(slot.id, slot.code)).join('')}</select></label><label class="check"><input name="confirmed" type="checkbox" required> Tôi đã đưa xe vào đúng chỗ và khóa an toàn.</label><button class="primary">Xác nhận trả xe</button></form><button class="secondary" data-report="${esc(trip.id)}" style="margin-top:12px">Báo sự cố</button>` : `<p>Kết thúc: ${esc(date(trip.endTime))}</p><p>Hub trả: ${esc(name(trip.hubId))}</p><p>Quãng đường: ${trip.distance == null ? 'Chưa có số đo' : esc(trip.distance) + ' km'}</p>`}</section>`;
    }).join('') || empty('Bạn chưa có chuyến đi.')}<details><summary>Lịch sử phiếu</summary>${state.reservations.filter(record => !reservations.includes(record)).map(record => `<p>${esc(record.vehicleId)} · ${esc(statuses[record.status])}</p>`).join('') || 'Chưa có lịch sử.'}</details>`;
  }
  function simulation() {
    const s = state.scenario;
    const numeric = (field, text, value, min, max, step = 1) => `<label>${text}<input class="field" type="number" name="${field}" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`;
    let specific = '';
    if (s === 'metro') specific = numeric('demandMultiplier', 'Hệ số tăng nhu cầu', 4, 1, 10, 0.1);
    if (s === 'parking') specific = numeric('occupiedPercent', 'Tỷ lệ lấp đầy giả định (%)', 100, 0, 100);
    if (s === 'charging-demand' || s === 'charging') specific = numeric('chargingRequestsPerHour', 'Yêu cầu sạc / giờ / Hub', 20, 0, 1000) + numeric('powerBudgetKw', 'Ngân sách công suất giả định (kW)', 14, 0, 1000, 0.1) + numeric('portPowerKw', 'Công suất mỗi cổng (kW)', 7, 0.1, 100, 0.1) + (s === 'charging' ? numeric('failedPorts', 'Số cổng ngừng hoạt động tại mỗi Hub', 1, 0, 100) : numeric('chargingMultiplier', 'Hệ số tăng nhu cầu sạc', 4, 1, 10, 0.1));
    if (s === 'clustering') specific = `<label>Hub tập trung xe<select class="field" name="targetHubId">${state.hubs.map(hub => option(hub.id, hub.name)).join('')}</select></label>` + numeric('returnBias', 'Tỷ lệ chuyến hướng về Hub tập trung', 0.9, 0, 1, 0.1);
    return `<h1>Mô phỏng What-if</h1><section class="card"><form id="simulation-form"><label>Kịch bản<select id="scenario" class="field" name="scenario">${Object.entries(labels).map(([id, text]) => option(id, text, s)).join('')}</select></label><fieldset class="selection"><legend>Hub trong phạm vi</legend>${state.hubs.map((hub, index) => `<label class="check"><input type="checkbox" name="hubIds" value="${esc(hub.id)}" ${index === 0 || (s === 'clustering' && index === 1) ? 'checked' : ''}>${esc(hub.name)}</label>`).join('')}</fieldset><div class="live-grid">${numeric('durationMinutes', 'Thời lượng (phút)', 60, 1, 240)}${numeric('demandPerHour', 'Lượt thuê / giờ / Hub', 40, 0, 1000)}${numeric('seed', 'Mã tái hiện kết quả', 1, 0, 4294967295)}${specific}</div><p class="muted">Mô hình demo sử dụng thời lượng chuyến 15 phút và sạc 45 phút. Kết quả kèm giả định để bạn xem trước khi quyết định.</p><button class="primary">Chạy mô phỏng</button></form></section>`;
  }
  function results() {
    const result = state.result;
    const fields = [['serviceSuccessRate', 'Tỷ lệ phục vụ (%)'], ['averageWaitMinutes', 'Chờ thuê trung bình (phút)'], ['rejectedTrips', 'Lượt thuê chưa phục vụ'], ['rejectedReturns', 'Lượt trả thiếu chỗ'], ['unservedChargingRequests', 'Yêu cầu sạc còn chờ']];
    const recommendation = item => item.kind === 'redistribute' ? `Điều chuyển ${item.quantity} xe từ ${name(item.sourceHubId)} đến ${name(item.destinationHubId)}` : item.kind === 'reroute' ? `Hướng dẫn từ ${name(item.sourceHubId)} sang ${name(item.destinationHubId)}` : item.kind === 'inspect-ports' ? `Kiểm tra ${item.failedPorts} cổng tại ${name(item.hubId)}` : `Xem lại lịch sạc tại ${name(item.hubId)} (${item.queuedRequests} yêu cầu chờ)`;
    return `<h1>Kết quả đã lưu</h1>${result ? `<section class="card"><h2>${esc(labels[result.inputs.scenario])}</h2><p>Dữ liệu đầu vào lúc ${esc(date(result.inputSnapshotTime))}</p><p class="record-id">Mã kết quả: ${esc(result.id)}</p><div class="table-wrap"><table><thead><tr><th>Chỉ số</th><th>Cơ sở</th><th>Kịch bản</th></tr></thead><tbody>${fields.map(([field, text]) => `<tr><td>${text}</td><td>${esc(result.baselineMetrics[field])}</td><td>${esc(result.projectedMetrics[field])}</td></tr>`).join('')}</tbody></table></div><h3 style="margin-top:20px">Khuyến nghị</h3>${result.recommendations.map((item, index) => `<p>${esc(recommendation(item))}</p>${item.kind === 'redistribute' ? `<button class="secondary" data-recommendation="${index}">Xem phương án điều chuyển</button>` : ''}`).join('') || '<p class="muted">Chưa có khuyến nghị bổ sung trong lần chạy này.</p>'}<details><summary>Giả định của mô hình</summary><ul>${result.assumptions.map(text => `<li>${esc(text)}</li>`).join('')}</ul></details><button class="secondary" data-action="export">Xuất kết quả JSON</button></section>` : empty('Chọn một kết quả đã lưu để xem.')}<div class="live-grid">${state.results.map(result => `<section class="card"><h3>${esc(labels[result.scenario])}</h3><p>${esc(date(result.inputSnapshotTime))}</p><button class="primary" data-result="${esc(result.id)}">Mở kết quả</button></section>`).join('') || empty('Chưa có kết quả mô phỏng.')}</div>`;
  }
  function transfer() {
    const draft = state.draft;
    if (!draft) return empty('Chọn khuyến nghị điều chuyển từ một kết quả mô phỏng.');
    return `<h1>Xem phương án điều chuyển</h1><section class="card"><p>${esc(name(draft.sourceHubId))} → ${esc(name(draft.destinationHubId))}</p><p>Đề xuất ${esc(draft.quantity)} xe. Chọn xe và chỗ từ dữ liệu hiện tại; hệ thống sẽ kiểm tra lại khi tạo lệnh.</p><form id="transfer-form"><fieldset class="selection"><legend>Xe điều chuyển</legend>${draft.vehicles.map(vehicle => `<label class="check"><input type="checkbox" name="vehicleIds" value="${esc(vehicle.id)}">${esc(vehicle.id)} · pin ${esc(vehicle.batteryPercent)}%</label>`).join('') || 'Không có xe đủ điều kiện.'}</fieldset><fieldset class="selection"><legend>Chỗ tại Hub đích</legend>${draft.slots.map(slot => `<label class="check"><input type="checkbox" name="slotIds" value="${esc(slot.id)}">${esc(slot.attributes.code)}</label>`).join('') || 'Không có chỗ đỗ đang hiển thị khả dụng.'}</fieldset><button class="primary">Tạo lệnh điều chuyển</button></form></section>`;
  }
  function render() {
    root.setAttribute('aria-busy', String(state.busy)); status.textContent = state.error;
    const views = operator ? [['simulation', 'Mô phỏng'], ['results', 'Kết quả'], ['account', 'Tài khoản']] : [['home', 'Tìm xe'], ['journeys', 'Chuyến của tôi'], ['account', 'Tài khoản']];
    nav.innerHTML = state.user ? views.map(([id, title]) => `<button data-view="${id}" class="${state.view === id ? 'active' : ''}">${title}</button>`).join('') : '';
    if (!state.user) { root.innerHTML = login(); return; }
    const roles = state.user.roles || [];
    if (!roles.includes(operator ? 'operator' : 'user')) {
      root.innerHTML = '<section class="card"><p>Tài khoản không có quyền sử dụng giao diện này. Hãy mở đúng ứng dụng hoặc đăng nhập bằng tài khoản phù hợp.</p><button class="secondary" data-action="logout">Đăng xuất</button></section>'; return;
    }
    const account = () => `<section class="card"><h1>Tài khoản</h1><p>${esc(state.user.id)}</p><button class="secondary" data-action="logout">Đăng xuất</button></section>`;
    const screens = operator ? { simulation, results, transfer, account } : { home, journeys, account };
    if (!screens[state.view]) state.view = operator ? 'simulation' : 'home';
    history.replaceState(null, '', '#' + state.view);
    const unresolved = Object.entries(pendingStore().values).filter(([, entry]) => entry.path);
    const pending = unresolved.length ? `<section class="card"><h2>Yêu cầu chưa rõ kết quả</h2><p>Bạn có thể lấy lại kết quả của yêu cầu trước bằng cách thử lại an toàn.</p>${unresolved.map(([operation]) => `<button class="secondary" data-retry-operation="${esc(operation)}">Thử lại yêu cầu trước</button>`).join('')}</section>` : '';
    root.innerHTML = (state.success ? `<p class="success" role="status">${esc(state.success)}</p>` : '') + pending + screens[state.view]();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || state.busy) return;
    if (button.dataset.view) { state.view = button.dataset.view; state.error = ''; state.success = ''; history.replaceState(null, '', '#' + state.view); render(); }
    else if (button.dataset.retryOperation) run(async () => {
      const operation = button.dataset.retryOperation, entry = pendingStore().values[operation];
      const result = await write(entry.path, JSON.parse(entry.body), operation);
      await reload();
      if (operator && result.inputs) { state.result = result; state.view = 'results'; }
      else if (!operator) state.view = 'journeys';
      state.success = 'Đã lấy lại kết quả yêu cầu trước.';
    });
    else if (button.dataset.hub) run(async () => { state.selectedHub = button.dataset.hub; state.selectedVehicle = null; state.vehicles = await api(`/hubs/${encodeURIComponent(state.selectedHub)}/vehicles`); });
    else if (button.dataset.vehicle) { state.selectedVehicle = state.vehicles.find(vehicle => vehicle.id === button.dataset.vehicle); render(); }
    else if (button.dataset.cancel) run(async () => { await write(`/vehicle-reservations/${encodeURIComponent(button.dataset.cancel)}/cancel`, {}, 'cancel:' + button.dataset.cancel); await refreshUser(); });
    else if (button.dataset.slots) run(async () => {
      const id = button.dataset.slots, form = button.closest('form'), hubId = form.elements.hubId.value;
      state.returnChoices[id] = { hubId, slots: await api(`/hubs/${encodeURIComponent(hubId)}/return-slots?tripId=${encodeURIComponent(id)}`) };
      if (!state.returnChoices[id].slots.length) state.error = 'Hub này hiện không có chỗ trả phù hợp. Hãy chọn Hub khác.';
    });
    else if (button.dataset.retryReturn) run(async () => {
      const trip = state.trips.find(record => record.id === button.dataset.retryReturn);
      await write(`/trips/${encodeURIComponent(trip.id)}/return`, { hubId: trip.pendingReturn.hubId, slotId: trip.pendingReturn.slotId, confirmed: true }, 'return:' + trip.id);
      await refreshUser(); state.success = 'Đã xác nhận trả xe.';
    });
    else if (button.dataset.report) {
      const description = prompt('Mô tả sự cố của chuyến đi:');
      if (description?.trim()) run(async () => { await write(`/trips/${encodeURIComponent(button.dataset.report)}/incidents`, { description: description.trim() }, 'incident:' + button.dataset.report); state.success = 'Đã ghi nhận sự cố. Chuyến vẫn được giữ để xử lý an toàn.'; });
    }
    else if (button.dataset.result) run(async () => { state.result = await api('/simulations/' + encodeURIComponent(button.dataset.result)); state.view = 'results'; });
    else if (button.dataset.recommendation !== undefined) run(async () => {
      const item = state.result.recommendations[Number(button.dataset.recommendation)];
      await loadTransferDraft(item); state.view = 'transfer';
    });
    else if (button.dataset.action === 'reserve') run(async () => { await write('/vehicle-reservations', { vehicleId: state.selectedVehicle.id, hubId: state.selectedHub }, 'reserve'); state.selectedVehicle = null; await refreshUser(); state.view = 'journeys'; state.success = 'Đã giữ xe. Hãy nhận trước thời hạn trên phiếu.'; });
    else if (button.dataset.action === 'refresh') run(reload);
    else if (button.dataset.action === 'logout') run(async () => { await api('/session', { method: 'DELETE' }); state.user = null; state.result = null; state.reservations = []; state.trips = []; });
    else if (button.dataset.action === 'export' && state.result) {
      const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(state.result, null, 2)], { type: 'application/json' }));
      link.href = url; link.download = `simulation-${state.result.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'scenario') { state.scenario = event.target.value; render(); }
    if (event.target.classList.contains('return-hub')) state.returnChoices[event.target.dataset.trip] = { hubId: event.target.value, slots: [] };
  });
  document.addEventListener('submit', event => {
    event.preventDefault(); const form = event.target, data = new FormData(form);
    if (form.id === 'login-form') run(async () => { state.user = await api('/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: data.get('username'), password: data.get('password') }) }); await reload(); });
    else if (form.id === 'hub-search') run(async () => { state.hubMatches = await api('/hubs?q=' + encodeURIComponent(data.get('q'))); });
    else if (form.classList.contains('pickup-form')) run(async () => { await write(`/vehicle-reservations/${encodeURIComponent(form.dataset.id)}/pickup`, { vehicleCode: data.get('vehicleCode') }, 'pickup:' + form.dataset.id); await refreshUser(); state.success = 'Đã nhận xe. Chuyến đi đang hoạt động.'; });
    else if (form.classList.contains('return-form')) run(async () => { await write(`/trips/${encodeURIComponent(form.dataset.id)}/return`, { hubId: data.get('hubId'), slotId: data.get('slotId'), confirmed: data.get('confirmed') === 'on' }, 'return:' + form.dataset.id); await refreshUser(); state.success = 'Đã trả xe và kết thúc chuyến đi.'; });
    else if (form.id === 'simulation-form') run(async () => {
      const parameters = {};
      for (const [key, value] of data.entries()) if (!['scenario', 'hubIds'].includes(key)) parameters[key] = key === 'targetHubId' ? value : Number(value);
      state.result = await write('/simulations', { scenario: data.get('scenario'), hubIds: data.getAll('hubIds'), parameters }, 'simulation');
      state.results = await api('/simulations'); state.view = 'results';
    });
    else if (form.id === 'transfer-form') run(async () => {
      const vehicleIds = data.getAll('vehicleIds'), destinationSlotIds = data.getAll('slotIds');
      if (!vehicleIds.length || vehicleIds.length !== destinationSlotIds.length) throw new Error('Chọn số xe bằng số chỗ đỗ đích.');
      const transfer = await write('/transfers', { sourceHubId: state.draft.sourceHubId, destinationHubId: state.draft.destinationHubId, vehicleIds, destinationSlotIds }, 'transfer');
      state.view = 'results'; state.success = `Đã tạo lệnh ${transfer.id}. Lệnh đang chờ xác nhận xuất phát.`;
    });
  });
  window.addEventListener('online', () => { if (state.user) run(reload); });
  run(async () => { try { state.user = await api('/session'); } catch (error) { if (error.status !== 401) throw error; } if (state.user) await reload(); });
})();
