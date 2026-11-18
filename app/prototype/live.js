(() => {
  'use strict';
  const experience = new URLSearchParams(location.search).get('experience') === 'operator-app' ? 'operator-app' : 'operator-web';
  document.body.classList.add(experience);
  document.getElementById('experience-label').textContent = experience === 'operator-web' ? 'TRUNG TÂM ĐIỀU HÀNH' : 'ỨNG DỤNG VẬN HÀNH';
  const root = document.getElementById('live-app'), nav = document.getElementById('live-nav'), status = document.getElementById('live-status');
  const state = { user: null, hubs: [], networkOverview: [], resources: [], results: [], result: null,
    scenario: 'metro', draft: null,
    resourceLimit: 20, resourceFilters: { q: '', hubId: '', kind: '', status: '' }, newResourceKind: 'vehicle',
    transfers: [], transferPlan: null, transferFilter: '', arrivalChoices: {},
    incidents: [], filteredIncidents: null, incidentFilters: { status: '', hubId: '' },
    scheduleHub: '', chargingSchedule: null, chargingHistory: [],
    view: location.hash.slice(1) || 'overview', error: '', busy: false, success: '' };
  const labels = { metro: 'Khách Metro tăng đột biến', parking: 'Hub hết chỗ đỗ', 'charging-demand': 'Nhu cầu sạc tăng', charging: 'Cổng sạc ngừng hoạt động', clustering: 'Xe phân bố mất cân bằng' };
  const iconPaths = {
    home: 'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7', grid: 'M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z',
    bike: 'M9 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M23 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 17l5-10 6 10H5 M9 7h7l3 10 M15 3h3l1 4 M7 7h5',
    arrow: 'M5 12h14 m-6-6 6 6-6 6', alert: 'm12 3 10 18H2Z M12 9v5 M12 17v1', bolt: 'm13 2-9 12h7l-1 8 10-13h-7Z',
    chart: 'M4 3v18h18 M8 16l5-7 4 3 5-8', user: 'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21a8 8 0 0 1 16 0Z',
    search: 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0 m-2 6 6 6', parking: 'M5 21V3h8a5 5 0 0 1 0 10H5', qr: 'M3 3h6v6H3Z M15 3h6v6h-6Z M3 15h6v6H3Z M15 15h3v3h3v3h-6Z',
    settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPaths[name] || iconPaths.grid}"/></svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const name = id => state.hubs.find(hub => hub.id === id)?.name || id;
  const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
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
    INVALID_STATE_TRANSITION: 'Tài nguyên đang được sử dụng hoặc trạng thái mới không an toàn.',
    CANNOT_DELETE_ACTIVE_VEHICLE: 'Không thể xóa xe đang được sử dụng, giữ chỗ hoặc đỗ tại Hub.',
    RESOURCE_NOT_FOUND: 'Không tìm thấy tài nguyên.', VEHICLE_NOT_FOUND: 'Không tìm thấy xe.',
    ALLOCATION_CONFLICT: 'Tài nguyên vừa được một nghiệp vụ khác sử dụng. Dữ liệu đã được tải lại.',
    CHARGING_GUARD_UNAVAILABLE: 'Chưa thể đổi trạng thái cổng sạc khi chưa có xác nhận an toàn.',
    INTERNAL_ERROR: 'Chưa thể hoàn tất yêu cầu. Bạn có thể thử lại.', SNAPSHOT_UNAVAILABLE: 'Chưa lấy được dữ liệu mạng lưới. Hãy thử lại.',
    TRANSFER_NOT_FOUND: 'Không tìm thấy lệnh điều chuyển với mã này.', HUB_NOT_FOUND: 'Không tìm thấy Hub.',
    SOURCE_DESTINATION_SAME: 'Hub nguồn và Hub đích phải khác nhau.',
    INSUFFICIENT_DESTINATION_SLOTS: 'Số chỗ đỗ đích phải bằng số xe điều chuyển.',
    VEHICLE_NOT_ELIGIBLE_FOR_TRANSFER: 'Có xe không còn đủ điều kiện điều chuyển (khả dụng, pin từ 80%). Dữ liệu đã được tải lại.',
    VEHICLE_NOT_AT_SOURCE_HUB: 'Có xe không còn ở Hub nguồn. Dữ liệu đã được tải lại.',
    VEHICLE_BATTERY_DROPPED: 'Mức pin của xe đã giảm dưới 80%. Hãy hủy lệnh hoặc sạc xe trước khi xuất phát.',
    SLOT_HOLD_FAILED: 'Chỗ đỗ đích vừa được giữ hoặc sử dụng bởi nghiệp vụ khác. Dữ liệu đã được tải lại, hãy chọn lại chỗ.',
    SLOT_NOT_AVAILABLE: 'Chỗ đỗ đích không còn trống. Dữ liệu đã được tải lại, hãy chọn lại chỗ.',
    SLOT_WRONG_HUB: 'Chỗ đỗ không thuộc Hub đích đã chọn.',
    TRANSFER_DEPART_CONFLICT: 'Trạng thái lệnh vừa thay đổi. Dữ liệu đã được tải lại.',
    TRANSFER_CANCEL_CONFLICT: 'Trạng thái lệnh vừa thay đổi. Dữ liệu đã được tải lại.',
    TRANSFER_ARRIVE_CONFLICT: 'Trạng thái lệnh vừa thay đổi. Dữ liệu đã được tải lại.',
    ALREADY_IN_TRANSIT: 'Lệnh đã xuất phát trước đó. Dữ liệu đã được tải lại.',
    ALREADY_CANCELLED: 'Lệnh đã được hủy trước đó.', TRANSFER_ALREADY_CANCELLED: 'Lệnh đã được hủy trước đó.',
    TRANSFER_ALREADY_COMPLETED: 'Lệnh đã hoàn tất trước đó.', CANNOT_CANCEL_COMPLETED: 'Không thể hủy lệnh đã hoàn tất.',
    CANNOT_CANCEL_IN_TRANSIT: 'Không thể hủy lệnh khi xe đã xuất phát.',
    NOT_IN_TRANSIT: 'Lệnh chưa ở trạng thái đang di chuyển nên chưa thể xác nhận đến nơi.',
    INCOMPLETE_ARRIVAL_SET: 'Danh sách xe đến nơi chưa đủ. Hãy kiểm tra từng xe của lệnh.',
    VEHICLE_MISMATCH_ON_ARRIVAL: 'Danh sách xe đến nơi không khớp lệnh. Hãy kiểm tra từng xe.',
    INSUFFICIENT_REPLACEMENT_SLOTS: 'Chưa đủ chỗ thay thế cho toàn bộ xe của lệnh.',
    VEHICLE_NOT_IN_TRANSFER: 'Có xe không còn ở trạng thái điều chuyển. Dữ liệu đã được tải lại.',
    INCIDENT_NOT_FOUND: 'Không tìm thấy hồ sơ sự cố.',
    MISSING_TRIP_ID: 'Thiếu mã chuyến đi khi báo cáo sự cố.',
    INVALID_DESCRIPTION: 'Vui lòng nhập mô tả sự cố.',
    MISSING_TECHNICIAN: 'Vui lòng nhập mã kỹ thuật viên phụ trách.',
    INVALID_ASSIGNMENT_DATA: 'Thông tin phân công bảo trì chưa hợp lệ.',
    INVALID_RESOURCE_KIND: 'Loại tài nguyên không hợp lệ.',
    INVALID_RESOURCE_ID: 'Mã tài nguyên không hợp lệ.',
    RESOURCE_ID_MISMATCH: 'Mã tài nguyên xác nhận không khớp với tài nguyên của sự cố.',
    INCIDENT_ASSIGNMENT_CONFLICT: 'Sự cố vừa được phân công hoặc đã thay đổi trạng thái. Dữ liệu đã được tải lại.',
    INCIDENT_ALREADY_CLOSED: 'Sự cố đã được đóng trước đó. Dữ liệu đã được tải lại.',
    ALREADY_RESOLVED: 'Sự cố đã được hoàn tất xử lý trước đó.',
    MAINTENANCE_NOT_ASSIGNED: 'Cần phân công kỹ thuật viên và chuyển sang trạng thái đang xử lý trước khi hoàn tất.',
    TRIP_NOT_ACTIVE: 'Chuyến đi không còn hoạt động nên không thể ghi nhận sự cố hành trình.',
    TRIP_NOT_FOUND: 'Không tìm thấy chuyến đi liên quan.',
    REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu sạc.',
    POINT_NOT_FOUND: 'Không tìm thấy cổng sạc.',
    POINT_NOT_ELIGIBLE: 'Cổng sạc hoặc yêu cầu không thuộc Hub đang chọn.',
    POINT_UNAVAILABLE: 'Cổng sạc đang bận, đang sửa chữa hoặc có sự cố chưa xử lý. Dữ liệu đã được tải lại.',
    INCOMPATIBLE_CONNECTOR: 'Chuẩn kết nối của xe không tương thích với cổng sạc đã chọn.',
    INVALID_POWER_REQUEST: 'Công suất phân bổ phải lớn hơn 0 và không vượt định mức của cổng sạc.',
    POWER_BUDGET_EXCEEDED: 'Công suất yêu cầu vượt giới hạn công suất an toàn (BR15) của Hub. Dữ liệu đã được tải lại.',
    INVALID_INTERVAL: 'Khoảng thời gian phân bổ không hợp lệ (kết thúc phải sau bắt đầu và ở tương lai).',
    CONFLICT_STATE: 'Trạng thái yêu cầu sạc vừa thay đổi. Dữ liệu đã được tải lại.'
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
  async function write(path, body, operation, method = 'POST') {
    const store = pendingStore(), serialized = JSON.stringify(body), previous = store.values[operation];
    if (previous && (previous.body !== serialized || (previous.method || 'POST') !== method)) throw new Error('Yêu cầu trước chưa rõ kết quả. Hãy thử lại đúng yêu cầu cũ trước khi thay đổi.');
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const key = previous?.key || Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    store.values[operation] = { key, body: serialized, path, method }; store.save();
    try {
      const data = await api(path, { method, headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: serialized });
      delete store.values[operation]; store.save(); return data;
    } catch (error) {
      if (error.status && error.status < 500 && error.code !== 'COMMAND_IN_PROGRESS') { delete store.values[operation]; store.save(); }
      throw error;
    }
  }
  async function reload() {
    state.hubs = await api('/hubs');
    state.scheduleHub ||= state.hubs[0]?.id || '';
    [state.results, state.networkOverview, state.resources, state.transfers, state.incidents, state.chargingSchedule] = await Promise.all([api('/simulations'), api('/operations/hubs'), api('/operations/resources'), experience === 'operator-web' ? loadTransfers() : [], experience === 'operator-web' ? loadIncidents() : [], experience === 'operator-web' ? loadChargingSchedule() : null]);
    if (state.view === 'transfer' && state.draft) await loadTransferDraft(state.draft);
  }
  async function loadTransferDraft(item) {
    const [vehicles, slots] = await Promise.all([api(`/hubs/${encodeURIComponent(item.sourceHubId)}/vehicles`), api(`/operations/resources?kind=slot&hubId=${encodeURIComponent(item.destinationHubId)}`)]);
    state.draft = { ...item, vehicles: vehicles.filter(vehicle => vehicle.batteryPercent >= 80), slots: slots.filter(slot => slot.status.toLowerCase() === 'available') };
  }
  // The transfer contract exposes lookup by ID only, so this browser remembers IDs it created or looked up and always reloads their state from the server.
  function transferStore() {
    const storageKey = `mobility-transfers:${state.user.id}`;
    let ids;
    try { ids = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { ids = []; }
    return { ids: Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && id) : [], save: values => localStorage.setItem(storageKey, JSON.stringify(values.slice(0, 12))) };
  }
  function rememberTransfer(id) { const store = transferStore(); store.save([id, ...store.ids.filter(value => value !== id)]); }
  function forgetTransfer(id) { const store = transferStore(); store.save(store.ids.filter(value => value !== id)); state.transfers = state.transfers.filter(record => record.id !== id); delete state.arrivalChoices[id]; }
  async function loadTransfers() {
    const store = transferStore();
    const settled = await Promise.allSettled(store.ids.map(id => api('/transfers/' + encodeURIComponent(id))));
    const kept = [], records = [];
    for (const [index, outcome] of settled.entries()) {
      const id = store.ids[index];
      if (outcome.status === 'fulfilled') { kept.push(id); records.push(outcome.value); continue; }
      if (outcome.reason?.status === 401) throw outcome.reason;
      if (outcome.reason?.status === 404) continue;
      kept.push(id); records.push({ id, loadError: outcome.reason?.message || 'Chưa tải được trạng thái lệnh.' });
    }
    store.save(kept);
    return records;
  }
  function incidentAssignmentStore() {
    const storageKey = `mobility-incident-assignments:${state.user.id}`;
    let values;
    try { values = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { values = {}; }
    return { values: values && typeof values === 'object' ? values : {}, save: () => localStorage.setItem(storageKey, JSON.stringify(values)) };
  }
  function rememberIncidentAssignment(id, assignment) {
    if (!id || !assignment) return;
    const store = incidentAssignmentStore(); store.values[id] = assignment; store.save();
  }
  function decorateIncidents(records) {
    const store = incidentAssignmentStore().values;
    return records.map(item => {
      const saved = item.assignment || store[item.id] || null;
      const assignment = saved ? { ...saved, status: item.status === 'Resolved' ? 'Completed' : saved.status || 'Assigned' } : null;
      return { ...item, assignment };
    });
  }
  async function loadIncidents() {
    const all = decorateIncidents(await api('/incidents'));
    const params = new URLSearchParams(Object.entries(state.incidentFilters).filter(([, value]) => value));
    state.filteredIncidents = params.size ? decorateIncidents(await api('/incidents?' + params)) : null;
    return all;
  }
  function chargingHistoryStore(hubId) {
    const storageKey = `mobility-charging-history:${state.user.id}:${hubId}`;
    let ids;
    try { ids = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { ids = []; }
    return { ids: Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && id) : [], save: values => localStorage.setItem(storageKey, JSON.stringify(values.slice(0, 20))) };
  }
  function rememberChargingRequests(hubId, ids) {
    if (!hubId || !ids.length) return;
    const store = chargingHistoryStore(hubId);
    store.save([...new Set([...ids, ...store.ids])]);
  }
  async function loadChargingSchedule() {
    const hubId = state.scheduleHub ||= state.hubs[0]?.id || '';
    if (!hubId) return null;
    const schedule = await api(`/hubs/${encodeURIComponent(hubId)}/charging-schedule`);
    const knownIds = [...schedule.queue.map(item => item.id), ...schedule.allocations.map(item => item.requestId)];
    rememberChargingRequests(hubId, knownIds);
    const queuedIds = new Set(schedule.queue.map(item => item.id));
    const extraIds = [...new Set([...schedule.allocations.map(item => item.requestId), ...chargingHistoryStore(hubId).ids])].filter(id => !queuedIds.has(id));
    const settled = await Promise.allSettled(extraIds.map(id => api('/charging-requests/' + encodeURIComponent(id))));
    state.chargingHistory = settled.filter(item => item.status === 'fulfilled' && item.value?.hubId === hubId).map(item => item.value);
    return schedule;
  }
  async function run(action) {
    if (state.busy) return;
    state.busy = true; state.error = ''; state.success = '';
    root.setAttribute('aria-busy', 'true');
    status.classList.add('loading');
    status.textContent = 'Đang xử lý…';
    root.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try { await action(); }
    catch (error) {
      state.error = error.message;
      if ([409, 422, 503].includes(error.status)) {
        try { await reload(); } catch { /* Preserve the original failure. */ }
      }
    } finally { state.busy = false; status.classList.remove('loading'); render(); }
  }
  function login() {
    return `<section class="card login"><h1>Đăng nhập</h1><p class="muted">Dành cho tài khoản vận hành.</p><form id="login-form"><label>Tài khoản<input class="field" name="username" autocomplete="username" required></label><label>Mật khẩu<input class="field" name="password" type="password" autocomplete="current-password" required></label><button class="primary" type="submit">Đăng nhập</button></form></section>`;
  }
  function alertText(hub) {
    if (hub.capacity.occupancyRate >= 95) return `Bãi đỗ đã lấp đầy ${hub.capacity.occupancyRate}%.`;
    if (hub.vehicles.available === 0) return 'Không còn xe khả dụng.';
    if (hub.capacity.occupancyRate >= 85) return `Bãi đỗ đã lấp đầy ${hub.capacity.occupancyRate}%.`;
    const availableRatio = hub.vehicles.total ? (hub.vehicles.available / hub.vehicles.total) * 100 : 0;
    if (availableRatio <= 10) return `Chỉ còn ${hub.vehicles.available}/${hub.vehicles.total} xe khả dụng.`;
    if (hub.charging.faultedPoints) return `${hub.charging.faultedPoints} cổng sạc cần kiểm tra.`;
    return 'Các tài nguyên đang vận hành trong ngưỡng bình thường.';
  }
  function overview() {
    const hubs = state.networkOverview;
    const displayLevel = hub => hub.alert.level === 'GREEN' && (hub.charging.faultedPoints || hub.vehicles.faulted) ? 'YELLOW' : hub.alert.level;
    const needsAttention = hub => displayLevel(hub) !== 'GREEN';
    const totals = hubs.reduce((sum, hub) => ({
      vehicles: sum.vehicles + hub.vehicles.available,
      slots: sum.slots + hub.capacity.availableSlots,
      charging: sum.charging + hub.charging.availablePoints,
      alerts: sum.alerts + (needsAttention(hub) ? 1 : 0)
    }), { vehicles: 0, slots: 0, charging: 0, alerts: 0 });
    const alertHubs = hubs.filter(needsAttention);
    const observedAt = hubs.map(hub => hub.observationTime).filter(Boolean).sort().at(-1);
    const metric = (label, value, note, tone = '') => `<section class="dashboard-metric ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></section>`;
    const levelLabel = { RED: 'Khẩn cấp', YELLOW: 'Cảnh báo', GREEN: 'Bình thường' };
    return `<div class="dashboard-heading"><div><h1>Tổng quan mạng lưới</h1><p class="muted">${hubs.length} Hub · Cập nhật ${esc(date(observedAt))}</p></div><button class="secondary" data-action="refresh">Tải lại dữ liệu</button></div>
      ${experience === 'operator-web' ? `<section class="hub-map-card"><div class="hub-map-heading"><div><p class="eyebrow">MẠNG LƯỚI MOBILITY HUB</p><h2>Bản đồ vận hành</h2></div><span class="hub-map-note">Vị trí minh họa khi chưa có tọa độ từ hệ thống</span></div><div class="hub-map-frame"><div id="hub-map" role="region" aria-label="Bản đồ vị trí Mobility Hub"></div><p class="hub-map-status" role="status">Đang tải bản đồ…</p></div></section>` : ''}
      <div class="dashboard-metrics">${metric('Xe khả dụng', totals.vehicles, 'Có thể phân bổ ngay')}${metric('Chỗ đỗ trống', totals.slots, 'Không gồm chỗ đang giữ')}${metric('Cổng sạc trống', totals.charging, 'Cổng sẵn sàng')}${metric('Hub cần chú ý', totals.alerts, totals.alerts ? 'Theo ngưỡng BR10' : 'Mạng lưới ổn định', totals.alerts ? 'warning' : '')}</div>
      <div class="dashboard-columns"><section class="card"><div class="section-heading"><div><h2>Cần chú ý</h2></div><span class="status-pill level-${alertHubs.some(hub => displayLevel(hub) === 'RED') ? 'red' : alertHubs.length ? 'yellow' : 'green'}">${alertHubs.length} cảnh báo</span></div>${alertHubs.map(hub => { const level = displayLevel(hub); return `<article class="hub-alert level-${level.toLowerCase()}"><div><strong>${esc(hub.hubName)}</strong><p>${esc(alertText(hub))}</p></div><span>${esc(levelLabel[level])}</span></article>`; }).join('') || empty('Không có Hub vượt ngưỡng BR10 hoặc tài nguyên lỗi.')}</section>
      <section class="card"><h2>Sức khỏe mạng lưới</h2><div class="health-legend"><span><i class="level-green"></i>Bình thường</span><span><i class="level-yellow"></i>Cảnh báo</span><span><i class="level-red"></i>Khẩn cấp</span></div><p class="muted">Ngưỡng BR10 và số tài nguyên lỗi đều lấy từ ảnh chụp mạng lưới do máy chủ cung cấp.</p></section></div>
      <section class="card"><div class="section-heading"><div><h2>Trạng thái các Hub</h2></div></div>${hubs.length ? `<div class="table-wrap"><table class="hub-table"><thead><tr><th>Mobility Hub</th><th>Xe khả dụng</th><th>Chỗ trống</th><th>Sạc trống</th><th>Lấp đầy</th><th>Trạng thái</th></tr></thead><tbody>${hubs.map(hub => { const level = displayLevel(hub); return `<tr><td><strong>${esc(hub.hubName)}</strong><small>${esc(hub.hubId)}</small></td><td>${esc(hub.vehicles.available)} / ${esc(hub.vehicles.total)}</td><td>${esc(hub.capacity.availableSlots)} / ${esc(hub.capacity.totalSlots)}</td><td>${esc(hub.charging.availablePoints)} / ${esc(hub.charging.totalPoints)}</td><td><div class="occupancy"><span><i style="width:${Math.min(100, hub.capacity.occupancyRate)}%"></i></span>${esc(hub.capacity.occupancyRate)}%</div></td><td><span class="status-pill level-${level.toLowerCase()}">${esc(levelLabel[level])}</span></td></tr>`; }).join('')}</tbody></table></div>` : empty('Chưa có dữ liệu Hub để hiển thị.')}</section>`;
  }
  const resourceKindLabel = kind => ({ vehicle: 'Phương tiện', slot: 'Chỗ đỗ', charging_point: 'Cổng sạc' }[kind] || kind);
  const resourceStatusKey = status => String(status || '').toLowerCase().replace(/[_\s-]/g, '');
  function resourceStatusLabel(status) {
    return ({ available: 'Khả dụng', idle: 'Khả dụng', maintenance: 'Bảo trì', repair: 'Đang sửa chữa', suspended: 'Tạm ngưng', blocked: 'Tạm ngưng', faulty: 'Lỗi', faulted: 'Lỗi', fault: 'Lỗi', occupied: 'Đang sử dụng', reserved: 'Đã giữ', inuse: 'Đang sử dụng', transferheld: 'Chờ điều chuyển', intransit: 'Đang điều chuyển', needscharging: 'Cần sạc', charging: 'Đang sạc' }[resourceStatusKey(status)] || status);
  }
  function resourceTone(status) {
    const key = resourceStatusKey(status);
    if (['available', 'idle'].includes(key)) return 'green';
    if (['fault', 'faulted', 'faulty'].includes(key)) return 'red';
    if (['maintenance', 'repair', 'suspended', 'blocked', 'needscharging'].includes(key)) return 'yellow';
    return 'blue';
  }
  function resourceDetail(resource) {
    if (resource.kind === 'vehicle') return `${resource.attributes.vehicleType === 'electric_motorbike' ? 'Xe máy điện' : 'Xe đạp điện'} · Pin ${resource.attributes.batteryPercent}%`;
    if (resource.kind === 'slot') return `Mã ${resource.attributes.code} · ${resource.attributes.pool === 'advance' ? 'Đặt trước' : 'Trả ngay'}`;
    return `Mã ${resource.attributes.code}`;
  }
  function resourceTransition(resource) {
    const key = resourceStatusKey(resource.status);
    if (resource.kind === 'vehicle') {
      if (key === 'available') return { status: 'Maintenance', label: 'Chuyển bảo trì' };
      if (['maintenance', 'suspended'].includes(key)) return { status: 'Available', label: 'Kích hoạt lại' };
    }
    if (resource.kind === 'slot') {
      if (key === 'available') return { status: 'Suspended', label: 'Tạm ngưng' };
      if (['suspended', 'blocked'].includes(key)) return { status: 'Available', label: 'Mở lại' };
    }
    if (resource.kind === 'charging_point') {
      if (['available', 'idle', 'fault', 'faulted'].includes(key)) return { status: 'Maintenance', label: 'Chuyển sửa chữa' };
      if (['maintenance', 'repair'].includes(key)) return { status: 'Available', label: 'Xác nhận an toàn' };
    }
    return null;
  }
  function resourceCreateFields() {
    if (state.newResourceKind === 'vehicle') return `<label>Loại xe<select class="field" name="vehicleType"><option value="electric_bicycle">Xe đạp điện</option><option value="electric_motorbike">Xe máy điện</option></select></label><label>Mức pin (%)<input class="field" name="batteryPercent" type="number" min="0" max="100" value="100" required></label>`;
    if (state.newResourceKind === 'slot') return `<label>Mã chỗ đỗ<input class="field" name="code" placeholder="Ví dụ: B01" required></label><label>Nhóm sử dụng<select class="field" name="pool"><option value="immediate">Trả xe ngay</option><option value="advance">Đặt trước</option></select></label>`;
    return `<label>Mã cổng sạc<input class="field" name="code" placeholder="Ví dụ: C05" required></label>`;
  }
  function resources() {
    if (experience !== 'operator-web') return plannedScreen('Quản lý tài nguyên');
    const all = [...state.resources].sort((a, b) => `${a.kind}:${a.hubId}:${a.id}`.localeCompare(`${b.kind}:${b.hubId}:${b.id}`, 'vi'));
    const statuses = [...new Set(all.map(resource => resource.status))].sort((a, b) => a.localeCompare(b, 'vi'));
    const filters = state.resourceFilters;
    const query = filters.q.trim().toLocaleLowerCase('vi');
    const filtered = all.filter(resource => (!filters.hubId || resource.hubId === filters.hubId) && (!filters.kind || resource.kind === filters.kind) && (!filters.status || resource.status === filters.status) && (!query || `${resource.id} ${resourceDetail(resource)} ${name(resource.hubId)}`.toLocaleLowerCase('vi').includes(query)));
    const counts = kind => all.filter(resource => resource.kind === kind).length;
    const rows = filtered.slice(0, state.resourceLimit);
    return `<div class="dashboard-heading resource-heading"><div><h1>Quản lý tài nguyên</h1><p class="muted">Theo dõi, bổ sung và chuyển trạng thái tài nguyên vật lý tại các Hub.</p></div><button class="secondary" data-action="refresh">Tải lại dữ liệu</button></div>
      <div class="resource-metrics"><section><span>Phương tiện</span><strong>${counts('vehicle')}</strong></section><section><span>Chỗ đỗ</span><strong>${counts('slot')}</strong></section><section><span>Cổng sạc</span><strong>${counts('charging_point')}</strong></section><section><span>Đang hiển thị</span><strong>${filtered.length}</strong></section></div>
      <div class="resource-layout"><section class="card resource-create"><h2>Đăng ký thiết bị mới</h2><form id="resource-create-form"><label>Loại tài nguyên<select class="field" id="resource-kind" name="kind"><option value="vehicle" ${state.newResourceKind === 'vehicle' ? 'selected' : ''}>Phương tiện</option><option value="slot" ${state.newResourceKind === 'slot' ? 'selected' : ''}>Chỗ đỗ</option><option value="charging_point" ${state.newResourceKind === 'charging_point' ? 'selected' : ''}>Cổng sạc</option></select></label><label>Mobility Hub<select class="field" name="hubId">${state.hubs.map(hub => option(hub.id, hub.name)).join('')}</select></label><label>Mã định danh<input class="field" name="id" placeholder="Mã duy nhất" required></label>${resourceCreateFields()}<button class="primary full">Thêm tài nguyên</button></form></section>
      <div class="resource-catalog"><section class="card resource-filter-card"><form id="resource-filter-form" class="resource-filters"><label>Tìm kiếm<input class="field" name="q" value="${esc(filters.q)}" placeholder="Mã hoặc tên Hub"></label><label>Hub<select class="field" name="hubId"><option value="">Tất cả Hub</option>${state.hubs.map(hub => option(hub.id, hub.name, filters.hubId)).join('')}</select></label><label>Loại<select class="field" name="kind"><option value="">Tất cả</option>${[['vehicle', 'Phương tiện'], ['slot', 'Chỗ đỗ'], ['charging_point', 'Cổng sạc']].map(([value, text]) => option(value, text, filters.kind)).join('')}</select></label><label>Trạng thái<select class="field" name="status"><option value="">Tất cả</option>${statuses.map(value => option(value, resourceStatusLabel(value), filters.status)).join('')}</select></label><div class="resource-filter-actions"><button class="primary">Lọc dữ liệu</button><button class="secondary" type="button" data-action="clear-resource-filters">Xóa lọc</button></div></form></section>
      <section class="card resource-table-card">${rows.length ? `<div class="table-wrap"><table class="resource-table"><thead><tr><th>Tài nguyên</th><th>Loại</th><th>Mobility Hub</th><th>Thông số</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows.map(resource => { const transition = resourceTransition(resource); const deletable = resource.kind === 'vehicle' && !['inuse', 'reserved', 'transferheld', 'intransit'].includes(resourceStatusKey(resource.status)); return `<tr><td><strong>${esc(resource.id)}</strong></td><td>${esc(resourceKindLabel(resource.kind))}</td><td>${esc(name(resource.hubId))}</td><td>${esc(resourceDetail(resource))}</td><td><span class="status-pill level-${resourceTone(resource.status)}">${esc(resourceStatusLabel(resource.status))}</span></td><td><div class="resource-actions">${transition ? `<button class="secondary" data-resource-status="${esc(resource.id)}" data-target-status="${esc(transition.status)}">${esc(transition.label)}</button>` : '<span class="muted">Được quản lý bởi vòng đời hiện tại</span>'}${deletable ? `<button class="danger" data-resource-delete="${esc(resource.id)}">Xóa</button>` : ''}</div></td></tr>`; }).join('')}</tbody></table></div>${state.resourceLimit < filtered.length ? `<button class="secondary full resource-more" data-action="show-more-resources">Xem thêm (${filtered.length - state.resourceLimit})</button>` : ''}` : empty('Không có tài nguyên phù hợp bộ lọc.')}</section></div></div>`;
  }
  const transferStatusMeta = { Planned: ['Chờ xuất phát', 'yellow'], InTransit: ['Đang di chuyển', 'blue'], Completed: ['Hoàn tất', 'green'], Cancelled: ['Đã hủy', 'grey'] };
  const eligibleTransferVehicles = hubId => state.resources.filter(resource => resource.kind === 'vehicle' && resource.hubId === hubId && resourceStatusKey(resource.status) === 'available' && Number(resource.attributes.batteryPercent) >= 80)
    .sort((a, b) => b.attributes.batteryPercent - a.attributes.batteryPercent || a.id.localeCompare(b.id, 'vi'));
  const availableTransferSlots = hubId => state.resources.filter(resource => resource.kind === 'slot' && resource.hubId === hubId && resourceStatusKey(resource.status) === 'available')
    .sort((a, b) => String(a.attributes.code).localeCompare(String(b.attributes.code), 'vi', { numeric: true }));
  function slotLabel(slotId) {
    const slot = state.resources.find(resource => resource.kind === 'slot' && resource.id === slotId);
    return slot ? `Chỗ ${slot.attributes.code} · ${name(slot.hubId)}` : slotId;
  }
  function ensureTransferPlan() {
    const ids = state.hubs.map(hub => hub.id);
    const plan = state.transferPlan ||= { sourceHubId: '', destinationHubId: '', quantity: null, vehicleIds: [], slotIds: [] };
    if (!ids.includes(plan.sourceHubId)) plan.sourceHubId = ids[0] || '';
    if (!ids.includes(plan.destinationHubId) || plan.destinationHubId === plan.sourceHubId) plan.destinationHubId = ids.find(id => id !== plan.sourceHubId) || '';
    const vehicles = eligibleTransferVehicles(plan.sourceHubId), slots = availableTransferSlots(plan.destinationHubId);
    plan.vehicleIds = plan.vehicleIds.filter(id => vehicles.some(vehicle => vehicle.id === id));
    plan.slotIds = plan.slotIds.filter(id => slots.some(slot => slot.id === id));
    return plan;
  }
  function transferCounter(vehicleCount, slotCount) {
    if (!vehicleCount && !slotCount) return 'Chọn xe tại Hub nguồn và cùng số chỗ trống tại Hub đích.';
    if (vehicleCount !== slotCount) return `Đã chọn ${vehicleCount} xe · ${slotCount} chỗ — số xe và số chỗ phải bằng nhau.`;
    return `Đã chọn ${vehicleCount} xe · ${slotCount} chỗ — sẵn sàng tạo lệnh.`;
  }
  function arrivalChoice(transfer) {
    return state.arrivalChoices[transfer.id] ||= { observed: [], replace: false, hubId: transfer.destinationHubId, slots: [] };
  }
  function arrivalForm(transfer) {
    const choice = arrivalChoice(transfer), required = transfer.vehicleIds.length;
    const hubs = state.hubs.filter(hub => hub.id !== transfer.sourceHubId);
    const held = choice.hubId === transfer.destinationHubId ? transfer.destinationSlotIds.map(id => ({ id, held: true })) : [];
    const candidates = [...held, ...availableTransferSlots(choice.hubId).filter(slot => !held.some(item => item.id === slot.id)).map(slot => ({ id: slot.id, held: false }))];
    const replacement = choice.replace ? `<label>Hub thay thế<select class="field arrival-hub" name="replacementHubId" data-transfer="${esc(transfer.id)}">${hubs.map(hub => option(hub.id, hub.name, choice.hubId)).join('')}</select></label>
      <fieldset class="selection"><legend>Chỗ thay thế (chọn đúng ${required})</legend>${candidates.map(slot => `<label class="check"><input type="checkbox" name="replacementSlotIds" value="${esc(slot.id)}" ${choice.slots.includes(slot.id) ? 'checked' : ''}>${esc(slotLabel(slot.id))}${slot.held ? ' · đang giữ cho lệnh này' : ''}</label>`).join('') || '<p class="muted">Hub này không có chỗ trống phù hợp. Hãy chọn Hub khác.</p>'}</fieldset>` : '';
    return `<form class="arrival-form" data-transfer-arrive="${esc(transfer.id)}">
      <fieldset class="selection"><legend>Xe đã có mặt tại Hub đích (${required} xe)</legend>${transfer.vehicleIds.map(id => `<label class="check"><input type="checkbox" name="observedVehicleIds" value="${esc(id)}" ${choice.observed.includes(id) ? 'checked' : ''}>${esc(id)}</label>`).join('')}</fieldset>
      <label class="check"><input type="checkbox" name="replace" class="arrival-replace" data-transfer="${esc(transfer.id)}" ${choice.replace ? 'checked' : ''}>Hub đích không còn đủ chỗ đã giữ — chọn Hub hoặc chỗ thay thế</label>${replacement}
      <button class="primary">Xác nhận đến nơi</button></form>`;
  }
  function transferActions(transfer) {
    if (transfer.status === 'Planned') return `<div class="transfer-actions"><button class="primary" data-transfer-depart="${esc(transfer.id)}">Xác nhận xuất phát</button><button class="danger" data-transfer-cancel="${esc(transfer.id)}">Hủy lệnh</button></div><p class="muted transfer-hint">Máy chủ kiểm tra lại mức pin của từng xe trước khi cho xuất phát.</p>`;
    if (transfer.status === 'InTransit') return arrivalForm(transfer);
    return `<div class="transfer-actions"><button class="secondary" data-transfer-forget="${esc(transfer.id)}">Bỏ theo dõi</button></div>`;
  }
  function transferCard(transfer) {
    if (transfer.loadError) return `<article class="card transfer-card"><div class="transfer-card-head"><div><h3>${esc(transfer.id)}</h3><p class="muted">${esc(transfer.loadError)}</p></div><button class="secondary" data-transfer-forget="${esc(transfer.id)}">Bỏ theo dõi</button></div></article>`;
    const [label, tone] = transferStatusMeta[transfer.status] || [transfer.status, 'blue'];
    const assignments = transfer.vehicleSlotAssignments || transfer.vehicleIds.map((vehicleId, index) => ({ vehicleId, slotId: transfer.destinationSlotIds[index] }));
    const slotHeading = transfer.status === 'Completed' ? 'Chỗ đỗ đã nhận xe' : transfer.status === 'Cancelled' ? 'Chỗ đã giữ (đã nhả)' : 'Chỗ giữ tại Hub đích';
    const facts = [['Tạo lệnh', date(transfer.createdAt)], ['Xuất phát', transfer.departedAt && date(transfer.departedAt)], ['Đến nơi', transfer.arrivedAt && date(transfer.arrivedAt)], ['Hủy lệnh', transfer.cancelledAt && date(transfer.cancelledAt)], ['Số xe', transfer.vehicleIds.length], ['Người tạo', transfer.createdBy]].filter(([, value]) => value);
    return `<article class="card transfer-card" data-transfer="${esc(transfer.id)}"><div class="transfer-card-head"><div><h3>${esc(transfer.id)}</h3><p class="transfer-route-text">${esc(name(transfer.sourceHubId))} ${icon('arrow')} ${esc(name(transfer.destinationHubId))}</p></div><span class="status-pill level-${tone}">${esc(label)}</span></div>
      <dl class="transfer-meta">${facts.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${transfer.cancelReason ? `<p class="notice transfer-reason">Lý do hủy: ${esc(transfer.cancelReason)}</p>` : ''}
      <div class="table-wrap"><table class="transfer-assignments"><thead><tr><th>Phương tiện</th><th>${slotHeading}</th></tr></thead><tbody>${assignments.map(item => `<tr><td><strong>${esc(item.vehicleId)}</strong></td><td>${esc(slotLabel(item.slotId))}</td></tr>`).join('')}</tbody></table></div>${transferActions(transfer)}</article>`;
  }
  function redistribute() {
    const plan = ensureTransferPlan();
    const vehicles = eligibleTransferVehicles(plan.sourceHubId), slots = availableTransferSlots(plan.destinationHubId);
    const transfers = state.transfers, count = status => transfers.filter(record => record.status === status).length;
    const shown = transfers.filter(record => !state.transferFilter || record.status === state.transferFilter);
    const ready = plan.vehicleIds.length > 0 && plan.vehicleIds.length === plan.slotIds.length;
    return `<div class="dashboard-heading"><div><h1>Điều phối phương tiện</h1><p class="muted">Giữ xe và chỗ đỗ đích, theo dõi lệnh từ lúc lập đến khi xe vào chỗ.</p></div><button class="secondary" data-action="refresh">Tải lại dữ liệu</button></div>
      <div class="resource-metrics transfer-metrics"><section><span>Lệnh đang theo dõi</span><strong>${transfers.length}</strong></section><section><span>Chờ xuất phát</span><strong>${count('Planned')}</strong></section><section><span>Đang di chuyển</span><strong>${count('InTransit')}</strong></section><section><span>Hoàn tất</span><strong>${count('Completed')}</strong></section></div>
      <div class="transfer-layout"><section class="card transfer-create"><h2>Tạo lệnh điều chuyển</h2>${plan.quantity ? `<p class="notice transfer-suggestion">Đề xuất từ mô phỏng: điều chuyển ${esc(plan.quantity)} xe. Hệ thống vẫn kiểm tra lại khi tạo lệnh.</p>` : ''}
        <form id="redistribute-form"><div class="transfer-route"><label>Hub nguồn<select class="field" id="transfer-source" name="sourceHubId">${state.hubs.map(hub => option(hub.id, hub.name, plan.sourceHubId)).join('')}</select></label><label>Hub đích<select class="field" id="transfer-destination" name="destinationHubId">${state.hubs.filter(hub => hub.id !== plan.sourceHubId).map(hub => option(hub.id, hub.name, plan.destinationHubId)).join('')}</select></label></div>
        <fieldset class="selection"><legend>Xe đủ điều kiện (${vehicles.length})</legend><p class="muted transfer-hint">Khả dụng tại Hub nguồn, pin từ 80% trở lên.</p>${vehicles.map(vehicle => `<label class="check"><input type="checkbox" name="vehicleIds" value="${esc(vehicle.id)}" ${plan.vehicleIds.includes(vehicle.id) ? 'checked' : ''}>${esc(vehicle.id)} · ${vehicle.attributes.vehicleType === 'electric_motorbike' ? 'Xe máy điện' : 'Xe đạp điện'} · pin ${esc(vehicle.attributes.batteryPercent)}%</label>`).join('') || '<p class="muted">Không có xe đủ điều kiện tại Hub nguồn.</p>'}</fieldset>
        <fieldset class="selection"><legend>Chỗ trống tại Hub đích (${slots.length})</legend>${slots.map(slot => `<label class="check"><input type="checkbox" name="slotIds" value="${esc(slot.id)}" ${plan.slotIds.includes(slot.id) ? 'checked' : ''}>Chỗ ${esc(slot.attributes.code)} · ${slot.attributes.pool === 'advance' ? 'Đặt trước' : 'Trả ngay'}</label>`).join('') || '<p class="muted">Hub đích không còn chỗ trống. Hãy chọn Hub khác.</p>'}</fieldset>
        <p class="transfer-counter ${ready ? 'ready' : ''}" data-transfer-counter>${esc(transferCounter(plan.vehicleIds.length, plan.slotIds.length))}</p><button class="primary full" data-transfer-submit ${ready ? '' : 'disabled'}>Tạo lệnh điều chuyển</button></form></section>
        <div class="transfer-board"><section class="card transfer-toolbar"><form id="transfer-lookup-form" class="transfer-lookup"><label>Tra cứu theo mã lệnh<input class="field" name="transferId" placeholder="Ví dụ: TRF-…" autocomplete="off" required></label><button class="secondary">Tra cứu</button></form><label class="transfer-filter">Trạng thái<select class="field" id="transfer-status-filter"><option value="">Tất cả</option>${Object.entries(transferStatusMeta).map(([value, [text]]) => option(value, text, state.transferFilter)).join('')}</select></label></section>
          ${shown.map(transferCard).join('') || empty(transfers.length ? 'Không có lệnh ở trạng thái đã chọn.' : 'Chưa theo dõi lệnh nào. Tạo lệnh mới hoặc tra cứu theo mã lệnh.')}<p class="muted transfer-note">Danh sách gồm các lệnh được tạo hoặc tra cứu trên trình duyệt này; trạng thái luôn được tải lại từ máy chủ.</p></div></div>`;
  }
  const incidentStatusMeta = { Open: ['Mới tiếp nhận', 'red'], Investigating: ['Đang xử lý', 'yellow'], Resolved: ['Đã xử lý', 'green'] };
  const incidentSeverityLabel = value => ({ Emergency: 'Khẩn cấp (SLA 60 giây)', Critical: 'Nghiêm trọng (SLA 30 phút)', Standard: 'Tiêu chuẩn (SLA 120 phút)' }[value] || value);
  const reporterRoleLabel = value => ({ User: 'Người dùng', Operator: 'Vận hành', System: 'Hệ thống' }[value] || value);
  function defaultIncidentSla(item) {
    if (item.assignment?.slaDeadline) return item.assignment.slaDeadline;
    if (item.slaDeadline) return item.slaDeadline;
    const minutes = String(item.severity).toLowerCase() === 'emergency' ? 1 : String(item.severity).toLowerCase() === 'critical' ? 30 : 120;
    const base = Date.parse(item.reportedAt);
    return Number.isNaN(base) ? null : new Date(base + minutes * 60 * 1000).toISOString();
  }
  function defaultScheduleInput() {
    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return now.toISOString().slice(0, 16);
  }
  function incidentResourceInfo(item) {
    const resource = state.resources.find(entry => entry.id === item.resourceId);
    if (!resource) return { hubLabel: item.reportedLocation || 'Chưa xác định', stateLabel: 'Đang kiểm tra trạng thái', tone: 'yellow' };
    const key = resourceStatusKey(resource.status), label = resourceStatusLabel(resource.status);
    const note = ['fault', 'faulted', 'faulty', 'maintenance', 'repair', 'suspended', 'blocked'].includes(key)
      ? `${label} · Đã cách ly`
      : key === 'inuse' ? `${label} · Giữ chuyến đang đi, cách ly khi trả xe` : label;
    return { hubLabel: name(resource.hubId), stateLabel: note, tone: resourceTone(resource.status) };
  }
  function incidentCard(item) {
    const [statusLabel, statusTone] = incidentStatusMeta[item.status] || [item.status, 'blue'];
    const info = incidentResourceInfo(item);
    const sla = defaultIncidentSla(item);
    const facts = [
      ['Nguồn báo cáo', `${reporterRoleLabel(item.reporterRole)} · ${item.reporterId}`],
      ['Tài nguyên', `${resourceKindLabel(item.resourceKind)} · ${item.resourceId}`],
      ['Mobility Hub', info.hubLabel],
      ['Trạng thái cách ly', info.stateLabel],
      ['Chuyến liên quan', item.reportedTripId || 'Thiết bị tại trạm'],
      ['Mức độ', incidentSeverityLabel(item.severity)],
      ['Thời gian báo cáo', date(item.reportedAt)],
      ['Hạn SLA', date(sla)]
    ];
    const assignment = item.assignment ? `<div class="incident-assignment"><div class="incident-assignment-head"><strong>Phân công bảo trì · ${esc(item.assignment.id)}</strong><span class="status-pill level-${item.assignment.status === 'Completed' ? 'green' : 'blue'}">${item.assignment.status === 'Completed' ? 'Đã hoàn thành' : 'Đã phân công'}</span></div><p class="muted">Kỹ thuật viên: <strong>${esc(item.assignment.technicianId)}</strong> · Lịch bảo trì: ${esc(date(item.assignment.scheduledAt))} · Hạn SLA: ${esc(date(item.assignment.slaDeadline))}</p></div>` : '';
    const actions = item.status === 'Open'
      ? `<form class="incident-handle-form" data-incident-handle="${esc(item.id)}"><div class="incident-form-grid"><label>Mã tài nguyên xác nhận<input class="field" name="resourceId" value="${esc(item.resourceId)}" required></label><label>Kỹ thuật viên phụ trách<input class="field" name="technicianId" placeholder="Ví dụ: TECH-01" required></label><label>Lịch bảo trì<input class="field" type="datetime-local" name="scheduledAt" value="${esc(defaultScheduleInput())}" required></label></div><button class="primary">Nhận xử lý & phân công</button></form>`
      : item.status === 'Investigating'
      ? `<form class="incident-resolve-form" data-incident-resolve="${esc(item.id)}"><label>Ghi chú kết quả xử lý<input class="field" name="resolutionNotes" placeholder="Mô tả kết quả kiểm tra, khắc phục và xác nhận an toàn" required></label><button class="primary">Hoàn tất xử lý</button></form>`
      : `<p class="notice incident-resolved">Đã xử lý lúc ${esc(date(item.resolvedAt))} · Ghi chú: ${esc(item.resolutionNotes || 'Đã hoàn tất bảo trì')}</p>`;
    return `<article class="card incident-card" data-incident="${esc(item.id)}"><div class="transfer-card-head"><div><h3>${esc(item.id)} · ${esc(item.resourceId)}</h3><p class="incident-desc">${esc(item.description)}</p></div><span class="status-pill level-${statusTone}">${esc(statusLabel)}</span></div><dl class="transfer-meta incident-meta">${facts.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${assignment}${actions}</article>`;
  }
  function incidents() {
    if (experience !== 'operator-web') return plannedScreen('Sự cố vận hành');
    const all = state.incidents, rows = state.filteredIncidents ?? all;
    const count = status => all.filter(item => item.status === status).length;
    const filters = state.incidentFilters;
    return `<div class="dashboard-heading"><div><h1>Sự cố vận hành</h1><p class="muted">Tiếp nhận cảnh báo thiết bị và sự cố hành trình, phân công kỹ thuật viên và xác nhận hoàn tất bảo trì.</p></div><button class="secondary" data-action="refresh">Tải lại dữ liệu</button></div>
      <div class="resource-metrics incident-metrics"><section><span>Tổng sự cố</span><strong>${all.length}</strong></section><section><span>Mới tiếp nhận</span><strong>${count('Open')}</strong></section><section><span>Đang xử lý</span><strong>${count('Investigating')}</strong></section><section><span>Đã xử lý</span><strong>${count('Resolved')}</strong></section></div>
      <section class="card incident-filter-card"><form id="incident-filter-form" class="incident-filters"><label>Trạng thái<select class="field" name="status"><option value="">Tất cả trạng thái</option>${Object.entries(incidentStatusMeta).map(([value, [text]]) => option(value, text, filters.status)).join('')}</select></label><label>Mobility Hub<select class="field" name="hubId"><option value="">Tất cả Hub</option>${state.hubs.map(hub => option(hub.id, hub.name, filters.hubId)).join('')}</select></label><div class="resource-filter-actions"><button class="primary">Lọc sự cố</button><button class="secondary" type="button" data-action="clear-incident-filters">Xóa lọc</button></div></form></section>
      <div class="incident-list">${rows.map(incidentCard).join('') || empty(all.length ? 'Không có sự cố phù hợp bộ lọc đã chọn.' : 'Hiện không có sự cố vận hành nào.')}</div>`;
  }
  const chargingPhaseMeta = {
    queued: { key: 'queued', label: 'Chờ phân bổ', tone: 'yellow' },
    allocated: { key: 'allocated', label: 'Đã phân bổ cổng', tone: 'blue' },
    active: { key: 'active', label: 'Đang sạc', tone: 'green' },
    stopping: { key: 'stopping', label: 'Đang ngắt sạc', tone: 'yellow' },
    completed: { key: 'completed', label: 'Đã hoàn tất', tone: 'grey' }
  };
  function chargingPhase(req, alloc) {
    if (alloc) {
      if (alloc.state === 'Charging' || req?.status === 'Charging') return chargingPhaseMeta.active;
      if (alloc.state === 'Stopping' || alloc.state === 'FaultUncertain') return chargingPhaseMeta.stopping;
      if (alloc.state === 'Complete') return chargingPhaseMeta.completed;
      return chargingPhaseMeta.allocated;
    }
    if (req?.status === 'Completed') return chargingPhaseMeta.completed;
    if (req?.status === 'Charging') return chargingPhaseMeta.active;
    return chargingPhaseMeta.queued;
  }
  function chargingPriorityLabel(req) {
    const soc = typeof req.currentBatteryPercent === 'number' ? req.currentBatteryPercent : req.batteryAtRequest;
    const base = soc < 10 ? 'Khẩn cấp (<10% pin · ưu tiên tuyệt đối)' : soc < 20 ? 'Cấp thiết (<20% pin)' : req.sharedReservationId ? 'Xe dùng chung có lịch đặt' : 'Tiêu chuẩn (theo hạn cần xe)';
    return Number.isInteger(req.manualPriorityRank) ? `${base} · Ưu tiên #${req.manualPriorityRank}` : base;
  }
  function defaultEndInput(hours = 1) {
    const future = new Date(Date.now() + hours * 3600000 - new Date().getTimezoneOffset() * 60000);
    return future.toISOString().slice(0, 16);
  }
  function chargingRequestCard(item, alloc, schedule) {
    const phase = chargingPhase(item, alloc);
    const connector = String(item.connectorType || item.vehicleConnectorType || 'type2').toUpperCase();
    const soc = typeof item.currentBatteryPercent === 'number' ? item.currentBatteryPercent : item.batteryAtRequest;
    const point = alloc && schedule.points.find(entry => entry.id === alloc.pointId);
    const compatiblePoints = schedule.points.filter(entry => String(entry.connectorType).toLowerCase() === connector.toLowerCase());
    const preferredPoint = compatiblePoints.find(entry => ['available', 'idle'].includes(resourceStatusKey(entry.status)) && !schedule.allocations.some(active => active.pointId === entry.id)) || compatiblePoints[0] || schedule.points[0];
    const defaultPower = preferredPoint ? Number(Math.min(preferredPoint.ratedPowerKw, schedule.remainingPowerKw > 0 ? schedule.remainingPowerKw : preferredPoint.ratedPowerKw).toFixed(1)) : 7.4;
    const facts = [
      ['Phương tiện', `${item.vehicleId} · ${connector}`],
      ['Mức pin', `${soc}% → mục tiêu ${item.targetBatteryPercent}%`],
      ['Mức ưu tiên', chargingPriorityLabel(item)],
      ['Hạn cần xe', date(item.neededBy)],
      ['Cổng phân bổ', alloc ? `${point ? `Cổng ${point.code}` : alloc.pointId} (${alloc.pointId})` : phase.key === 'completed' ? 'Đã giải phóng cổng' : 'Chưa phân bổ'],
      ['Công suất cấp', alloc ? `${alloc.allocatedPowerKw} kW` : '—'],
      ['Khoảng thời gian', alloc ? `${date(alloc.startAt)} → ${date(alloc.endAt)}` : phase.key === 'completed' ? 'Đã hoàn tất phiên sạc' : 'Chờ xếp lịch']
    ];
    const allocateForm = phase.key === 'queued' ? `<form class="charging-allocate-form" data-charging-allocate="${esc(item.id)}"><div class="charging-allocate-grid"><label>Cổng sạc<select class="field" name="pointId" required>${schedule.points.map(entry => {
      const busy = schedule.allocations.some(active => active.pointId === entry.id);
      const match = String(entry.connectorType).toLowerCase() === connector.toLowerCase();
      const note = !match ? 'Khác chuẩn kết nối' : busy ? 'Đã phân bổ' : resourceStatusLabel(entry.status);
      return option(entry.id, `Cổng ${entry.code} · ${String(entry.connectorType).toUpperCase()} · ${entry.ratedPowerKw} kW · ${note}`, preferredPoint?.id);
    }).join('')}</select></label><label>Công suất phân bổ (kW)<input class="field" type="number" name="powerKw" min="0.1" max="100" step="0.1" value="${esc(defaultPower)}" required></label><label>Bắt đầu<input class="field" type="datetime-local" name="startAt" value="${esc(defaultScheduleInput())}" required></label><label>Kết thúc<input class="field" type="datetime-local" name="endAt" value="${esc(defaultEndInput(1))}" required></label></div><button class="primary">Phân bổ cổng & công suất</button></form>` : '';
    return `<article class="card charging-card" data-charging-request="${esc(item.id)}" data-charging-phase="${esc(phase.key)}"><div class="transfer-card-head"><div><h3>${esc(item.id)} · ${esc(item.vehicleId)}</h3><p class="muted">Người yêu cầu: ${esc(item.userId)}</p></div><span class="status-pill level-${phase.tone}">${esc(phase.label)}</span></div><dl class="transfer-meta charging-meta">${facts.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${allocateForm}</article>`;
  }
  function schedule() {
    if (experience !== 'operator-web') return plannedScreen('Lịch sạc');
    const data = state.chargingSchedule;
    if (!data) return empty('Chưa tải được dữ liệu lịch sạc của Hub.');
    const allocByRequest = new Map(data.allocations.map(item => [item.requestId, item]));
    const unallocatedQueue = data.queue.filter(item => !allocByRequest.has(item.id));
    const combined = [...data.queue, ...state.chargingHistory.filter(item => !data.queue.some(queued => queued.id === item.id) && item.status !== 'Cancelled')];
    for (const alloc of data.allocations) {
      if (!combined.some(item => item.id === alloc.requestId)) {
        combined.push({ id: alloc.requestId, userId: 'operator', vehicleId: alloc.pointId, connectorType: 'type2', batteryAtRequest: 20, targetBatteryPercent: 90, neededBy: alloc.endAt, status: alloc.state === 'Charging' ? 'Charging' : 'Queued' });
      }
    }
    const availablePoints = data.points.filter(point => ['available', 'idle'].includes(resourceStatusKey(point.status)) && !data.allocations.some(alloc => alloc.pointId === point.id));
    const budgetPercent = data.powerLimitKW > 0 ? Math.min(100, Math.round((data.allocatedPowerKw / data.powerLimitKW) * 100)) : 0;
    return `<div class="dashboard-heading"><div><h1>Lịch sạc thông minh</h1><p class="muted">Quản lý hàng đợi ưu tiên, phân bổ cổng tương thích và kiểm soát giới hạn công suất an toàn theo từng Hub.</p></div><div class="schedule-head-actions"><label class="schedule-hub-picker">Mobility Hub<select class="field" id="schedule-hub">${state.hubs.map(hub => option(hub.id, hub.name, state.scheduleHub)).join('')}</select></label><button class="secondary" data-action="refresh">Tải lại dữ liệu</button></div></div>
      <div class="resource-metrics schedule-metrics"><section><span>Giới hạn công suất (BR15)</span><strong>${esc(data.powerLimitKW)} kW</strong></section><section><span>Đang phân bổ</span><strong>${esc(data.allocatedPowerKw)} kW</strong></section><section><span>Công suất còn lại</span><strong>${esc(data.remainingPowerKw)} kW</strong></section><section><span>Hàng đợi / Cổng sẵn sàng</span><strong>${unallocatedQueue.length} chờ · ${availablePoints.length}/${data.points.length} cổng</strong></section></div>
      <div class="schedule-layout"><section class="card schedule-points-card"><h2>Cổng sạc & ngân sách công suất tại ${esc(data.hubName)}</h2><div class="schedule-budget-bar"><div class="occupancy"><span><i style="width:${budgetPercent}%"></i></span>${budgetPercent}% ngân sách công suất (${esc(data.allocatedPowerKw)} / ${esc(data.powerLimitKW)} kW)</div><p class="muted">Quy tắc BR15: tổng công suất cấp đồng thời không vượt giới hạn an toàn của Hub; xe và cổng phải cùng chuẩn kết nối.</p></div>
        <div class="table-wrap"><table class="schedule-points-table"><thead><tr><th>Cổng sạc</th><th>Chuẩn</th><th>Định mức</th><th>Trạng thái</th><th>Phân bổ hiện tại</th></tr></thead><tbody>${data.points.map(point => {
          const alloc = data.allocations.find(item => item.pointId === point.id);
          const statusText = alloc ? `${alloc.requestId} · ${alloc.allocatedPowerKw} kW (${chargingPhase(null, alloc).label})` : ['available', 'idle'].includes(resourceStatusKey(point.status)) ? 'Sẵn sàng phân bổ' : ['fault', 'faulted', 'faulty', 'maintenance', 'repair'].includes(resourceStatusKey(point.status)) ? 'Đang cách ly / bảo trì' : resourceStatusLabel(point.status);
          return `<tr><td><strong>${esc(point.code)}</strong><small class="muted"> · ${esc(point.id)}</small></td><td>${esc(String(point.connectorType).toUpperCase())}</td><td>${esc(point.ratedPowerKw)} kW</td><td><span class="status-pill level-${resourceTone(point.status)}">${esc(resourceStatusLabel(point.status))}</span></td><td>${esc(statusText)}</td></tr>`;
        }).join('')}</tbody></table></div></section>
        <div class="schedule-queue-board">${data.queue.length ? `<section class="card schedule-override-card"><h2>Điều chỉnh thứ tự ưu tiên hàng đợi</h2><p class="muted">Nhập thứ tự ưu tiên (1–1000) cho các yêu cầu đang xếp hàng; yêu cầu khẩn cấp dưới 10% pin luôn giữ quyền ưu tiên an toàn.</p><form id="schedule-override-form"><div class="schedule-override-list">${data.queue.map((req, index) => `<label class="schedule-override-item"><span><strong>#${index + 1} · ${esc(req.vehicleId)}</strong> (${esc(req.id)} · pin ${esc(req.currentBatteryPercent ?? req.batteryAtRequest)}%)</span><input class="field" type="number" min="1" max="1000" name="rank:${esc(req.id)}" value="${esc(req.manualPriorityRank ?? index + 1)}" required></label>`).join('')}</div><div class="resource-filter-actions"><button class="primary">Lưu thứ tự ưu tiên</button><button class="secondary" type="button" data-action="clear-schedule-overrides">Đặt lại mặc định</button></div></form></section>` : ''}
          <div class="schedule-phase-legend"><span class="status-pill level-yellow">Chờ phân bổ</span><span class="status-pill level-blue">Đã phân bổ cổng</span><span class="status-pill level-green">Đang sạc</span><span class="status-pill level-yellow">Đang ngắt sạc</span><span class="status-pill level-grey">Đã hoàn tất</span></div>
          ${combined.map(item => chargingRequestCard(item, allocByRequest.get(item.id), data)).join('') || empty('Hiện chưa có yêu cầu sạc hoặc phiên sạc nào tại Hub này.')}</div></div>`;
  }
  function plannedScreen(title) {
    return `<section class="card planned-screen"><h1>${esc(title)}</h1><p class="muted">Màn hình đã có trong khung điều hướng và sẽ được nối API ở đợt triển khai tiếp theo.</p><button class="secondary" data-view="overview">Quay lại Tổng quan</button></section>`;
  }
  function operatorMenu() {
    const items = [['redistribute', 'arrow', 'Điều phối phương tiện'], ['schedule', 'bolt', 'Lịch sạc thông minh'], ['simulation', 'chart', 'Mô phỏng What-if'], ['results', 'chart', 'Kết quả mô phỏng'], ['account', 'user', 'Tài khoản']];
    return `<section class="card operator-menu-card"><p class="eyebrow">OPERATOR APP</p><h2>Công cụ vận hành</h2>${items.map(([view, symbol, text]) => `<button data-view="${view}">${icon(symbol)}<span>${esc(text)}</span>${icon('arrow')}</button>`).join('')}</section><p class="notice">Ứng dụng hiện trường dùng cùng quyền Operator và dữ liệu với dashboard trung tâm.</p>`;
  }
  const scenarioDescriptions = {
    metro: 'Mô phỏng lưu lượng khách tăng đột biến từ tuyến Metro đổ về các Hub lân cận trong giờ cao điểm.',
    parking: 'Kiểm tra khả năng tiếp nhận trả xe và chuyển hướng khi tỷ lệ lấp đầy bãi đỗ đạt ngưỡng tới hạn.',
    'charging-demand': 'Đánh giá áp lực hàng đợi sạc và tỷ lệ phục vụ khi nhu cầu sạc tăng cao đồng loạt.',
    charging: 'Phân tích tác động khi một số cổng sạc tại Hub ngừng hoạt động và ngân sách công suất bị thu hẹp.',
    clustering: 'Mô phỏng hiện tượng phương tiện dồn về một Hub tập trung gây mất cân bằng nguồn cung giữa các trạm.'
  };
  function simulation() {
    const s = state.scenario;
    const numeric = (field, text, value, min, max, step = 1) => `<label>${text}<input class="field" type="number" name="${field}" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`;
    let specific = '';
    if (s === 'metro') specific = numeric('demandMultiplier', 'Hệ số tăng nhu cầu', 4, 1, 10, 0.1);
    if (s === 'parking') specific = numeric('occupiedPercent', 'Tỷ lệ lấp đầy giả định (%)', 100, 0, 100);
    if (s === 'charging-demand' || s === 'charging') specific = numeric('chargingRequestsPerHour', 'Yêu cầu sạc / giờ / Hub', 20, 0, 1000) + numeric('powerBudgetKw', 'Ngân sách công suất giả định (kW)', 14, 0, 1000, 0.1) + numeric('portPowerKw', 'Công suất mỗi cổng (kW)', 7, 0.1, 100, 0.1) + (s === 'charging' ? numeric('failedPorts', 'Số cổng ngừng hoạt động tại mỗi Hub', 1, 0, 100) : numeric('chargingMultiplier', 'Hệ số tăng nhu cầu sạc', 4, 1, 10, 0.1));
    if (s === 'clustering') specific = `<label>Hub tập trung xe<select class="field" name="targetHubId">${state.hubs.map(hub => option(hub.id, hub.name)).join('')}</select></label>` + numeric('returnBias', 'Tỷ lệ chuyến hướng về Hub tập trung', 0.9, 0, 1, 0.1);
    const formCard = `<section class="card"><form id="simulation-form"><label>Kịch bản<select id="scenario" class="field" name="scenario">${Object.entries(labels).map(([id, text]) => option(id, text, s)).join('')}</select></label><fieldset class="selection"><legend>Hub trong phạm vi</legend>${state.hubs.map((hub, index) => `<label class="check"><input type="checkbox" name="hubIds" value="${esc(hub.id)}" ${index === 0 || (s === 'clustering' && index === 1) ? 'checked' : ''}>${esc(hub.name)}</label>`).join('')}</fieldset><div class="live-grid">${numeric('durationMinutes', 'Thời lượng (phút)', 60, 1, 240)}${numeric('demandPerHour', 'Lượt thuê / giờ / Hub', 40, 0, 1000)}${numeric('seed', 'Mã tái hiện kết quả', 1, 0, 4294967295)}${specific}</div><p class="muted">Mô hình demo sử dụng thời lượng chuyến 15 phút và sạc 45 phút. Kết quả kèm giả định để bạn xem trước khi quyết định.</p><button class="primary">Chạy mô phỏng</button></form></section>`;
    if (experience !== 'operator-web') return `<h1>Mô phỏng What-if</h1>${formCard}`;
    return `<div class="dashboard-heading"><div><h1>Mô phỏng What-if</h1><p class="muted">Chạy thử 5 kịch bản vận hành trên ảnh chụp mạng lưới hiện tại mà không làm thay đổi dữ liệu thật.</p></div><button class="secondary" data-action="refresh">Tải lại dữ liệu</button></div>
      <div class="resource-metrics simulation-metrics"><section><span>Kịch bản chuẩn</span><strong>5</strong></section><section><span>Hub trong mạng lưới</span><strong>${state.hubs.length}</strong></section><section><span>Xe khả dụng hiện tại</span><strong>${state.resources.filter(item => item.kind === 'vehicle' && resourceStatusKey(item.status) === 'available').length}</strong></section><section><span>Kết quả đã lưu</span><strong>${state.results.length}</strong></section></div>
      <div class="simulation-layout">${formCard}<section class="card simulation-guide-card"><h2>${esc(labels[s])}</h2><p>${esc(scenarioDescriptions[s])}</p><dl class="transfer-meta"><div><dt>Nguồn dữ liệu</dt><dd>Ảnh chụp trực tiếp từ SQLite</dd></div><div><dt>Tính toàn vẹn</dt><dd>Bảo toàn số lượng phương tiện</dd></div><div><dt>Tái hiện kết quả</dt><dd>Cùng tham số và seed cho cùng kết quả</dd></div></dl>${state.results.length ? `<h3>Lần chạy gần nhất</h3><div class="simulation-recent">${state.results.slice(0, 3).map(item => `<button class="secondary full" data-result="${esc(item.id)}">${esc(labels[item.scenario])} · ${esc(date(item.inputSnapshotTime))}</button>`).join('')}</div>` : empty('Chưa có kết quả mô phỏng nào được lưu.')}</section></div>`;
  }
  function results() {
    const result = state.result;
    const fields = [['serviceSuccessRate', 'Tỷ lệ phục vụ (%)'], ['averageWaitMinutes', 'Chờ thuê trung bình (phút)'], ['rejectedTrips', 'Lượt thuê chưa phục vụ'], ['rejectedReturns', 'Lượt trả thiếu chỗ'], ['unservedChargingRequests', 'Yêu cầu sạc còn chờ']];
    const recommendation = item => item.kind === 'redistribute' ? `Điều chuyển ${item.quantity} xe từ ${name(item.sourceHubId)} đến ${name(item.destinationHubId)}` : item.kind === 'reroute' ? `Hướng dẫn từ ${name(item.sourceHubId)} sang ${name(item.destinationHubId)}` : item.kind === 'inspect-ports' ? `Kiểm tra ${item.failedPorts} cổng tại ${name(item.hubId)}` : `Xem lại lịch sạc tại ${name(item.hubId)} (${item.queuedRequests} yêu cầu chờ)`;
    const detail = result ? `<section class="card results-detail-card"><div class="transfer-card-head"><div><h2>${esc(labels[result.inputs.scenario])}</h2><p class="muted">Dữ liệu đầu vào lúc ${esc(date(result.inputSnapshotTime))}</p><p class="record-id">Mã kết quả: ${esc(result.id)}</p></div><button class="secondary" data-action="export">Xuất kết quả JSON</button></div><div class="table-wrap"><table><thead><tr><th>Chỉ số</th><th>Cơ sở</th><th>Kịch bản</th></tr></thead><tbody>${fields.map(([field, text]) => `<tr><td>${text}</td><td>${esc(result.baselineMetrics[field])}</td><td><strong>${esc(result.projectedMetrics[field])}</strong></td></tr>`).join('')}</tbody></table></div><h3 style="margin-top:20px">Khuyến nghị vận hành</h3><div class="results-recommendations">${result.recommendations.map((item, index) => `<div class="results-recommendation-item"><p>${esc(recommendation(item))}</p>${item.kind === 'redistribute' ? `<button class="secondary" data-recommendation="${index}">Xem phương án điều chuyển</button>` : ''}</div>`).join('') || '<p class="muted">Chưa có khuyến nghị bổ sung trong lần chạy này.</p>'}</div><details><summary>Giả định của mô hình</summary><ul>${result.assumptions.map(text => `<li>${esc(text)}</li>`).join('')}</ul></details></section>` : empty('Chọn một kết quả đã lưu để xem.');
    const list = `<div class="live-grid results-catalog">${state.results.map(item => `<section class="card ${result?.id === item.id ? 'results-card-active' : ''}"><h3>${esc(labels[item.scenario])}</h3><p class="muted">${esc(date(item.inputSnapshotTime))}</p><p class="record-id">${esc(item.id)}</p><button class="primary" data-result="${esc(item.id)}">${result?.id === item.id ? 'Đang xem kết quả' : 'Mở kết quả'}</button></section>`).join('') || empty('Chưa có kết quả mô phỏng.')}</div>`;
    if (experience !== 'operator-web') return `<h1>Kết quả đã lưu</h1>${detail}${list}`;
    return `<div class="dashboard-heading"><div><h1>Kết quả đã lưu</h1><p class="muted">Đối chiếu chỉ số cơ sở với kịch bản giả định, xuất báo cáo JSON hoặc chuyển khuyến nghị sang điều phối.</p></div><button class="secondary" data-action="refresh">Tải lại dữ liệu</button></div>
      <div class="resource-metrics results-metrics"><section><span>Tổng kết quả đã lưu</span><strong>${state.results.length}</strong></section><section><span>Kịch bản đang mở</span><strong>${esc(result ? labels[result.inputs.scenario] : 'Chưa chọn')}</strong></section><section><span>Tỷ lệ phục vụ dự kiến</span><strong>${result ? `${esc(result.projectedMetrics.serviceSuccessRate)}%` : '—'}</strong></section><section><span>Khuyến nghị</span><strong>${result ? result.recommendations.length : 0}</strong></section></div>
      ${detail}<h2 class="results-list-heading">Danh sách kết quả mô phỏng (${state.results.length})</h2>${list}`;
  }
  function transfer() {
    const draft = state.draft;
    if (!draft) return empty('Chọn khuyến nghị điều chuyển từ một kết quả mô phỏng.');
    return `<h1>Xem phương án điều chuyển</h1><section class="card"><p>${esc(name(draft.sourceHubId))} → ${esc(name(draft.destinationHubId))}</p><p>Đề xuất ${esc(draft.quantity)} xe. Chọn xe và chỗ từ dữ liệu hiện tại; hệ thống sẽ kiểm tra lại khi tạo lệnh.</p><form id="transfer-form"><fieldset class="selection"><legend>Xe điều chuyển</legend>${draft.vehicles.map(vehicle => `<label class="check"><input type="checkbox" name="vehicleIds" value="${esc(vehicle.id)}">${esc(vehicle.id)} · pin ${esc(vehicle.batteryPercent)}%</label>`).join('') || 'Không có xe đủ điều kiện.'}</fieldset><fieldset class="selection"><legend>Chỗ tại Hub đích</legend>${draft.slots.map(slot => `<label class="check"><input type="checkbox" name="slotIds" value="${esc(slot.id)}">${esc(slot.attributes.code)}</label>`).join('') || 'Không có chỗ đỗ đang hiển thị khả dụng.'}</fieldset><button class="primary">Tạo lệnh điều chuyển</button></form></section>`;
  }
  let hubMap;
  const fallbackLocations = { metro: [106.8091, 10.8794], bku: [106.8053, 10.8805], 'dorm-a': [106.8065, 10.8781], library: [106.8017, 10.8758], 'demo-dorm-b': [106.7992, 10.8748], 'demo-hcmus': [106.8017, 10.8784], 'demo-hcmussh': [106.8031, 10.8804], 'demo-uit': [106.8021, 10.8706], 'demo-iu': [106.8081, 10.8805], 'demo-uel': [106.8112, 10.8821] };
  async function renderHubMap(container) {
    const status = container.nextElementSibling;
    try {
      const maplibre = await import('/vendor/maplibre/maplibre-gl.mjs');
      if (!container.isConnected) return;
      const map = new maplibre.Map({ container, style: 'https://tiles.openfreemap.org/styles/bright', center: [106.8065, 10.8781], zoom: 13.8 });
      hubMap = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => { map.resize(); if (count > 1) map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 }); status.hidden = true; });
      map.on('error', () => { if (!map.isStyleLoaded()) status.textContent = 'Không tải được bản đồ. Vui lòng kiểm tra kết nối mạng.'; });
      const bounds = new maplibre.LngLatBounds();
      let count = 0;
      for (const hub of state.hubs) {
        const location = hub.location;
        const verified = location && Number.isFinite(location.lat) && Number.isFinite(location.lng) && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180;
        const coordinates = verified ? [location.lng, location.lat] : fallbackLocations[hub.id];
        if (!coordinates) continue;
        const snapshot = state.networkOverview.find(item => item.hubId === hub.id);
        const level = snapshot?.alert.level === 'RED' ? 'red' : snapshot?.alert.level === 'YELLOW' || snapshot?.charging.faultedPoints || snapshot?.vehicles.faulted ? 'yellow' : 'green';
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = `hub-map-marker level-${level}`; pin.setAttribute('aria-label', hub.name);
        const detail = snapshot ? `${hub.name}\n${snapshot.vehicles.available} xe khả dụng · ${snapshot.capacity.availableSlots} chỗ trống · ${snapshot.charging.availablePoints} cổng sạc trống` : hub.name;
        const popup = new maplibre.Popup({ offset: 18 }).setText(detail + (verified ? '' : '\nVị trí minh họa'));
        new maplibre.Marker({ element: pin }).setLngLat(coordinates).setPopup(popup).addTo(map);
        bounds.extend(coordinates); count++;
      }
    } catch {
      if (container.isConnected) status.textContent = 'Không tải được bản đồ. Vui lòng kiểm tra kết nối mạng.';
    }
  }
  function render() {
    if (hubMap) { hubMap.remove(); hubMap = null; }
    root.setAttribute('aria-busy', String(state.busy)); status.textContent = state.error;
    const operatorViews = [['overview', 'Tổng quan'], ['resources', 'Tài nguyên'], ['redistribute', 'Điều phối'], ['incidents', 'Sự cố'], ['schedule', 'Lịch sạc'], ['simulation', 'Mô phỏng'], ['results', 'Kết quả'], ['account', 'Tài khoản']];
    const views = experience === 'operator-app' ? [['overview', 'Tổng quan'], ['resources', 'Tài nguyên'], ['incidents', 'Sự cố'], ['op-menu', 'Chức năng']] : operatorViews;
    document.body.classList.toggle('authenticated', Boolean(state.user));
    const viewIcons = { overview: 'grid', resources: 'bike', redistribute: 'arrow', incidents: 'alert', schedule: 'bolt', simulation: 'chart', results: 'chart', account: 'user', 'op-menu': 'settings', home: 'home', journeys: 'bike' };
    const mobilePrimary = ['overview', 'resources', 'incidents'];
    nav.innerHTML = state.user ? views.map(([id, title]) => {
      const active = state.view === id || (id === 'op-menu' && !mobilePrimary.includes(state.view));
      return `<button data-view="${id}" class="${active ? 'active' : ''}">${icon(viewIcons[id])}<span>${title}</span></button>`;
    }).join('') : '';
    if (!state.user) { root.innerHTML = login(); return; }
    const roles = state.user.roles || [];
    if (!roles.includes('operator')) {
      root.innerHTML = '<section class="card"><p>Tài khoản không có quyền sử dụng giao diện này. Hãy mở đúng ứng dụng hoặc đăng nhập bằng tài khoản phù hợp.</p><button class="secondary" data-action="logout">Đăng xuất</button></section>'; return;
    }
    const unresolved = Object.entries(pendingStore().values).filter(([, entry]) => entry.path);
    const account = () => experience !== 'operator-web'
      ? `<section class="card"><h1>Tài khoản</h1><p>${esc(state.user.id)}</p><button class="secondary" data-action="logout">Đăng xuất</button></section>`
      : `<div class="dashboard-heading"><div><h1>Tài khoản vận hành</h1><p class="muted">Thông tin phiên xác thực, vai trò phân quyền tại máy chủ và trạng thái kết nối trung tâm điều hành.</p></div><button class="secondary" data-action="refresh">Tải lại dữ liệu</button></div>
        <div class="resource-metrics account-metrics"><section><span>Tài khoản đang đăng nhập</span><strong>${esc(state.user.id)}</strong></section><section><span>Vai trò phân quyền</span><strong>${esc(roles.map(role => role === 'operator' ? 'Operator' : 'User').join(', '))}</strong></section><section><span>Phạm vi quản lý</span><strong>${state.hubs.length} Hub</strong></section><section><span>Yêu cầu chờ đối soát</span><strong>${unresolved.length}</strong></section></div>
        <section class="card account-detail-card"><h2>Phiên làm việc hiện tại</h2><dl class="transfer-meta"><div><dt>Định danh người vận hành</dt><dd>${esc(state.user.id)}</dd></div><div><dt>Quyền hạn máy chủ</dt><dd>Toàn quyền điều hành mạng lưới, tài nguyên, điều phối, sự cố, lịch sạc và mô phỏng</dd></div><div><dt>Cơ chế xác thực</dt><dd>Phiên máy chủ (HttpOnly Cookie · kiểm tra cùng Origin)</dd></div><div><dt>Bảo vệ ghi dữ liệu</dt><dd>Idempotency-Key tự động và lưu trữ khôi phục khi mất kết nối</dd></div></dl><div class="transfer-actions"><button class="danger" data-action="logout">Đăng xuất khỏi phiên</button></div></section>`;
    const screens = {
      overview,
      resources,
      redistribute: experience === 'operator-web' ? redistribute : () => plannedScreen('Điều phối xe'),
      incidents: experience === 'operator-web' ? incidents : () => plannedScreen('Sự cố vận hành'),
      schedule: experience === 'operator-web' ? schedule : () => plannedScreen('Lịch sạc'),
      simulation,
      results,
      transfer,
      'op-menu': operatorMenu,
      account
    };
    if (!screens[state.view]) state.view = 'overview';
    history.replaceState(null, '', '#' + state.view);
    const pending = unresolved.length ? `<section class="card"><h2>Yêu cầu chưa rõ kết quả</h2><p>Bạn có thể lấy lại kết quả của yêu cầu trước bằng cách thử lại an toàn.</p>${unresolved.map(([operation]) => `<button class="secondary" data-retry-operation="${esc(operation)}">Thử lại yêu cầu trước</button>`).join('')}</section>` : '';
    const feedback = (state.success ? `<p class="success" role="status">${esc(state.success)}</p>` : '') + pending;
    let content = screens[state.view]();
    const title = operatorViews.find(([id]) => id === state.view)?.[1] || views.find(([id]) => id === state.view)?.[1] || '';
    if (experience === 'operator-app') {
      const pageTitle = { overview: 'Tổng quan mạng lưới', resources: 'Quản lý tài nguyên', redistribute: 'Điều phối phương tiện', incidents: 'Sự cố vận hành', schedule: 'Lịch sạc thông minh', simulation: 'Mô phỏng What-if', results: 'Kết quả mô phỏng', account: 'Tài khoản', 'op-menu': 'Chức năng vận hành' }[state.view] || title;
      content = `<header class="live-mobile-top operator-top"><p class="eyebrow">SMART E-MOBILITY / OPERATOR</p><h1>${esc(pageTitle)}</h1><small>Ứng dụng vận hành · Dữ liệu trực tiếp</small></header><div class="live-mobile-pad">${feedback}${content}</div>`;
    } else content = feedback + content;
    root.innerHTML = content;
    const mapContainer = root.querySelector('#hub-map');
    if (mapContainer) renderHubMap(mapContainer);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || state.busy) return;
    if (button.dataset.view) { state.view = button.dataset.view; state.error = ''; state.success = ''; history.replaceState(null, '', '#' + state.view); render(); }
    else if (button.dataset.retryOperation) run(async () => {
      const operation = button.dataset.retryOperation, entry = pendingStore().values[operation];
      const result = await write(entry.path, JSON.parse(entry.body), operation, entry.method || 'POST');
      if (operation === 'transfer-create' && result?.id) rememberTransfer(result.id);
      if (operation.startsWith('incident-handle:') && result?.assignment) rememberIncidentAssignment(result.id, result.assignment);
      await reload();
      if (result.inputs) { state.result = result; state.view = 'results'; }
      else if (operation.startsWith('transfer-')) state.view = 'redistribute';
      else if (operation.startsWith('incident-')) state.view = 'incidents';
      else if (operation.startsWith('schedule-')) state.view = 'schedule';
      state.success = 'Đã lấy lại kết quả yêu cầu trước.';
    });
    else if (button.dataset.result) run(async () => { state.result = await api('/simulations/' + encodeURIComponent(button.dataset.result)); state.view = 'results'; state.success = `Đã mở kết quả mô phỏng ${state.result.id}.`; });
    else if (button.dataset.resourceStatus) run(async () => {
      const id = button.dataset.resourceStatus, target = button.dataset.targetStatus;
      await write(`/operations/resources/${encodeURIComponent(id)}`, { status: target, reason: 'Cập nhật từ Operator Dashboard' }, `resource-status:${id}:${target}`, 'PATCH');
      await reload(); state.success = `Đã cập nhật trạng thái ${id}.`;
    });
    else if (button.dataset.resourceDelete) {
      const id = button.dataset.resourceDelete;
      if (confirm(`Xóa phương tiện ${id}? Thao tác chỉ thành công khi xe không thuộc nghiệp vụ đang hoạt động.`)) run(async () => {
        await write(`/operations/resources/${encodeURIComponent(id)}`, {}, `resource-delete:${id}`, 'DELETE');
        await reload(); state.success = `Đã xóa ${id}.`;
      });
    }
    else if (button.dataset.recommendation !== undefined) run(async () => {
      const item = state.result.recommendations[Number(button.dataset.recommendation)];
      if (experience === 'operator-web') {
        state.transferPlan = { sourceHubId: item.sourceHubId, destinationHubId: item.destinationHubId, quantity: item.quantity, vehicleIds: [], slotIds: [] };
        await reload(); state.view = 'redistribute'; return;
      }
      await loadTransferDraft(item); state.view = 'transfer';
    });
    else if (button.dataset.transferDepart) {
      const id = button.dataset.transferDepart;
      if (confirm(`Xác nhận các xe của lệnh ${id} đã rời Hub nguồn?`)) run(async () => {
        await write(`/transfers/${encodeURIComponent(id)}/depart`, {}, `transfer-depart:${id}`);
        await reload(); state.success = `Lệnh ${id} đang di chuyển. Xác nhận đến nơi khi xe tới Hub đích.`;
      });
    }
    else if (button.dataset.transferCancel) {
      const id = button.dataset.transferCancel;
      const reason = prompt(`Lý do hủy lệnh ${id}:`, 'Điều phối lại theo tình hình vận hành');
      if (reason !== null) run(async () => {
        if (!reason.trim()) throw new Error('Nhập lý do hủy lệnh.');
        await write(`/transfers/${encodeURIComponent(id)}/cancel`, { reason: reason.trim() }, `transfer-cancel:${id}`);
        await reload(); state.success = `Đã hủy lệnh ${id}. Xe và chỗ đỗ đích đã được nhả.`;
      });
    }
    else if (button.dataset.transferForget) { forgetTransfer(button.dataset.transferForget); render(); }
    else if (button.dataset.action === 'refresh') run(reload);
    else if (button.dataset.action === 'show-more-resources') { state.resourceLimit += 20; render(); }
    else if (button.dataset.action === 'clear-resource-filters') { state.resourceFilters = { q: '', hubId: '', kind: '', status: '' }; state.resourceLimit = 20; render(); }
    else if (button.dataset.action === 'clear-incident-filters') run(async () => { state.incidentFilters = { status: '', hubId: '' }; await reload(); });
    else if (button.dataset.action === 'clear-schedule-overrides') run(async () => {
      const overrides = (state.chargingSchedule?.queue || []).map(item => ({ requestId: item.id, priorityRank: null }));
      if (!overrides.length) return;
      state.chargingSchedule = await write(`/hubs/${encodeURIComponent(state.scheduleHub)}/charging-schedule/override`, { overrides }, `schedule-override-clear:${state.scheduleHub}`);
      await reload(); state.success = 'Đã đặt lại thứ tự ưu tiên mặc định.';
    });
    else if (button.dataset.action === 'logout') run(async () => { await api('/session', { method: 'DELETE' }); state.user = null; state.result = null; state.transfers = []; state.transferPlan = null; state.arrivalChoices = {}; state.incidents = []; state.filteredIncidents = null; state.chargingSchedule = null; state.chargingHistory = []; });
    else if (button.dataset.action === 'export' && state.result) {
      const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(state.result, null, 2)], { type: 'application/json' }));
      link.href = url; link.download = `simulation-${state.result.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'scenario') { state.scenario = event.target.value; render(); }
    if (event.target.id === 'resource-kind') { state.newResourceKind = event.target.value; render(); }
    if (state.transferPlan && event.target.id === 'transfer-source') { state.transferPlan.sourceHubId = event.target.value; state.transferPlan.vehicleIds = []; render(); return; }
    if (state.transferPlan && event.target.id === 'transfer-destination') { state.transferPlan.destinationHubId = event.target.value; state.transferPlan.slotIds = []; render(); return; }
    if (event.target.id === 'transfer-status-filter') { state.transferFilter = event.target.value; render(); return; }
    if (event.target.id === 'schedule-hub') { state.scheduleHub = event.target.value; run(async () => { state.chargingSchedule = await loadChargingSchedule(); }); return; }
    const form = event.target.form;
    if (state.transferPlan && form?.id === 'redistribute-form') {
      const data = new FormData(form);
      state.transferPlan.vehicleIds = data.getAll('vehicleIds'); state.transferPlan.slotIds = data.getAll('slotIds');
      const vehicleCount = state.transferPlan.vehicleIds.length, slotCount = state.transferPlan.slotIds.length, ready = vehicleCount > 0 && vehicleCount === slotCount;
      const counter = form.querySelector('[data-transfer-counter]');
      counter.textContent = transferCounter(vehicleCount, slotCount); counter.classList.toggle('ready', ready);
      form.querySelector('[data-transfer-submit]').disabled = !ready;
    }
    if (form?.classList.contains('arrival-form')) {
      const transfer = state.transfers.find(record => record.id === form.dataset.transferArrive);
      if (!transfer) return;
      const choice = arrivalChoice(transfer), data = new FormData(form);
      choice.observed = data.getAll('observedVehicleIds'); choice.slots = data.getAll('replacementSlotIds');
      if (event.target.classList.contains('arrival-replace')) { choice.replace = event.target.checked; choice.hubId = transfer.destinationHubId; choice.slots = []; render(); }
      else if (event.target.classList.contains('arrival-hub')) { choice.hubId = event.target.value; choice.slots = []; render(); }
    }
  });
  document.addEventListener('submit', event => {
    event.preventDefault(); const form = event.target, formId = form.getAttribute('id'), data = new FormData(form);
    if (formId === 'login-form') run(async () => { state.user = await api('/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: data.get('username'), password: data.get('password') }) }); await reload(); });
    else if (formId === 'resource-filter-form') {
      state.resourceFilters = { q: String(data.get('q') || ''), hubId: String(data.get('hubId') || ''), kind: String(data.get('kind') || ''), status: String(data.get('status') || '') };
      state.resourceLimit = 20; render();
    }
    else if (formId === 'resource-create-form') run(async () => {
      const kind = String(data.get('kind')), id = String(data.get('id')).trim();
      const attributes = { id };
      if (kind === 'vehicle') { attributes.vehicleType = String(data.get('vehicleType')); attributes.batteryPercent = Number(data.get('batteryPercent')); }
      if (kind === 'slot') { attributes.code = String(data.get('code')).trim(); attributes.pool = String(data.get('pool')); }
      if (kind === 'charging_point') attributes.code = String(data.get('code')).trim();
      const resource = await write('/operations/resources', { kind, hubId: String(data.get('hubId')), attributes }, `resource-create:${id}`);
      await reload(); state.resourceFilters = { q: resource.id, hubId: '', kind: '', status: '' }; state.resourceLimit = 20; state.success = `Đã thêm ${resource.id}.`;
    });
    else if (formId === 'simulation-form') run(async () => {
      const parameters = {};
      for (const [key, value] of data.entries()) if (!['scenario', 'hubIds'].includes(key)) parameters[key] = key === 'targetHubId' ? value : Number(value);
      state.result = await write('/simulations', { scenario: data.get('scenario'), hubIds: data.getAll('hubIds'), parameters }, 'simulation');
      state.results = await api('/simulations'); state.view = 'results'; state.success = `Đã chạy mô phỏng và lưu kết quả ${state.result.id}.`;
    });
    else if (formId === 'transfer-form') run(async () => {
      const vehicleIds = data.getAll('vehicleIds'), destinationSlotIds = data.getAll('slotIds');
      if (!vehicleIds.length || vehicleIds.length !== destinationSlotIds.length) throw new Error('Chọn số xe bằng số chỗ đỗ đích.');
      const transfer = await write('/transfers', { sourceHubId: state.draft.sourceHubId, destinationHubId: state.draft.destinationHubId, vehicleIds, destinationSlotIds }, 'transfer');
      state.view = 'results'; state.success = `Đã tạo lệnh ${transfer.id}. Lệnh đang chờ xác nhận xuất phát.`;
    });
    else if (formId === 'redistribute-form') run(async () => {
      const sourceHubId = String(data.get('sourceHubId') || ''), destinationHubId = String(data.get('destinationHubId') || '');
      const vehicleIds = data.getAll('vehicleIds'), destinationSlotIds = data.getAll('slotIds');
      if (!sourceHubId || !destinationHubId || sourceHubId === destinationHubId) throw new Error('Hub nguồn và Hub đích phải khác nhau.');
      if (!vehicleIds.length || vehicleIds.length !== destinationSlotIds.length) throw new Error('Chọn số xe bằng số chỗ đỗ đích.');
      const transfer = await write('/transfers', { sourceHubId, destinationHubId, vehicleIds, destinationSlotIds }, 'transfer-create');
      rememberTransfer(transfer.id);
      state.transferPlan = { sourceHubId, destinationHubId, quantity: null, vehicleIds: [], slotIds: [] }; state.transferFilter = '';
      await reload(); state.success = `Đã tạo lệnh ${transfer.id}. Xe và chỗ đỗ đích đang được giữ, chờ xác nhận xuất phát.`;
    });
    else if (formId === 'transfer-lookup-form') run(async () => {
      const id = String(data.get('transferId') || '').trim();
      if (!id) throw new Error('Nhập mã lệnh cần tra cứu.');
      const record = await api('/transfers/' + encodeURIComponent(id));
      rememberTransfer(record.id);
      state.transfers = [record, ...state.transfers.filter(item => item.id !== record.id)]; state.transferFilter = '';
      state.success = `Đã tải lệnh ${record.id}.`;
    });
    else if (form.classList.contains('arrival-form')) run(async () => {
      const id = form.dataset.transferArrive, transfer = state.transfers.find(record => record.id === id);
      if (!transfer) throw new Error('Không tìm thấy lệnh trong danh sách. Hãy tải lại dữ liệu.');
      const required = transfer.vehicleIds.length, observedVehicleIds = data.getAll('observedVehicleIds');
      if (observedVehicleIds.length !== required) throw new Error(`Cần xác nhận đủ ${required} xe đã có mặt trước khi hoàn tất lệnh.`);
      const body = { observedVehicleIds };
      if (data.get('replace') === 'on') {
        const replacementSlotIds = data.getAll('replacementSlotIds');
        if (replacementSlotIds.length !== required) throw new Error(`Chọn đúng ${required} chỗ thay thế.`);
        body.replacementDestinationHubId = String(data.get('replacementHubId')); body.replacementSlotIds = replacementSlotIds;
      }
      const result = await write(`/transfers/${encodeURIComponent(id)}/arrive`, body, `transfer-arrive:${id}`);
      delete state.arrivalChoices[id];
      await reload(); state.success = `Lệnh ${id} đã hoàn tất. Xe đã vào chỗ tại ${name(result.destinationHubId)}.`;
    });
    else if (formId === 'incident-filter-form') run(async () => {
      state.incidentFilters = { status: String(data.get('status') || ''), hubId: String(data.get('hubId') || '') };
      await reload();
    });
    else if (form.classList.contains('incident-handle-form')) run(async () => {
      const id = form.dataset.incidentHandle;
      const resourceId = String(data.get('resourceId') || '').trim();
      const technicianId = String(data.get('technicianId') || '').trim();
      const rawSchedule = String(data.get('scheduledAt') || '').trim();
      const parsedSchedule = Date.parse(rawSchedule);
      if (!resourceId || !technicianId || Number.isNaN(parsedSchedule)) throw new Error('Nhập đủ mã tài nguyên, kỹ thuật viên và lịch bảo trì hợp lệ.');
      const result = await write(`/incidents/${encodeURIComponent(id)}/handle`, { resourceId, technicianId, scheduledAt: new Date(parsedSchedule).toISOString() }, `incident-handle:${id}`);
      rememberIncidentAssignment(result.id, result.assignment);
      await reload(); state.success = `Đã phân công ${result.assignment.technicianId} xử lý sự cố ${id}.`;
    });
    else if (form.classList.contains('incident-resolve-form')) run(async () => {
      const id = form.dataset.incidentResolve;
      const resolutionNotes = String(data.get('resolutionNotes') || '').trim();
      if (!resolutionNotes) throw new Error('Nhập ghi chú kết quả xử lý trước khi hoàn tất.');
      await write(`/incidents/${encodeURIComponent(id)}/resolve`, { resolutionNotes }, `incident-resolve:${id}`);
      await reload(); state.success = `Đã hoàn tất xử lý sự cố ${id}.`;
    });
    else if (formId === 'schedule-override-form') run(async () => {
      const overrides = (state.chargingSchedule?.queue || []).map(item => ({
        requestId: item.id,
        priorityRank: Number(data.get('rank:' + item.id))
      }));
      if (!overrides.length) throw new Error('Không có yêu cầu sạc trong hàng đợi để sắp xếp.');
      state.chargingSchedule = await write(`/hubs/${encodeURIComponent(state.scheduleHub)}/charging-schedule/override`, { overrides }, `schedule-override:${state.scheduleHub}`);
      await reload(); state.success = 'Đã cập nhật thứ tự ưu tiên hàng đợi sạc.';
    });
    else if (form.classList.contains('charging-allocate-form')) run(async () => {
      const id = form.dataset.chargingAllocate;
      const pointId = String(data.get('pointId') || '').trim();
      const powerKw = Number(data.get('powerKw'));
      const startMs = Date.parse(String(data.get('startAt') || ''));
      const endMs = Date.parse(String(data.get('endAt') || ''));
      if (!pointId || !Number.isFinite(powerKw) || powerKw <= 0 || Number.isNaN(startMs) || Number.isNaN(endMs)) {
        throw new Error('Chọn cổng sạc, công suất và khoảng thời gian hợp lệ.');
      }
      const result = await write(`/charging-requests/${encodeURIComponent(id)}/allocate`, {
        pointId,
        powerKw,
        startAt: new Date(startMs).toISOString(),
        endAt: new Date(endMs).toISOString()
      }, `schedule-allocate:${id}`);
      rememberChargingRequests(state.scheduleHub, [id]);
      await reload(); state.success = `Đã phân bổ ${result.allocatedPowerKw} kW tại cổng ${result.pointId} cho yêu cầu ${id}.`;
    });
  });
  window.addEventListener('online', () => { if (state.user) run(reload); });
  run(async () => { try { state.user = await api('/session'); } catch (error) { if (error.status !== 401) throw error; } if (state.user) await reload(); });
})();
