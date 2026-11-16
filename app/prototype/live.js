(() => {
  'use strict';
  const experience = new URLSearchParams(location.search).get('experience') || 'user-app';
  const operator = experience === 'operator-app' || experience === 'operator-web';
  document.body.classList.add(operator ? experience : 'user-app');
  document.getElementById('experience-label').textContent = experience === 'operator-web' ? 'TRUNG TÂM ĐIỀU HÀNH' : experience === 'operator-app' ? 'ỨNG DỤNG VẬN HÀNH' : 'ỨNG DỤNG NGƯỜI DÙNG';
  const root = document.getElementById('live-app'), nav = document.getElementById('live-nav'), status = document.getElementById('live-status');
  const state = { user: null, hubs: [], networkOverview: [], resources: [], vehicles: [], reservations: [], trips: [], results: [], result: null,
    selectedHub: '', selectedVehicle: null, hubMatches: null, returnChoices: {}, scenario: 'metro', draft: null,
    vehicleLimit: 3, resourceLimit: 20, resourceFilters: { q: '', hubId: '', kind: '', status: '' }, newResourceKind: 'vehicle',
    transfers: [], transferPlan: null, transferFilter: '', arrivalChoices: {},
    incidents: [], filteredIncidents: null, incidentFilters: { status: '', hubId: '' },
    view: location.hash.slice(1) || (operator ? 'overview' : 'home'), error: '', busy: false, success: '' };
  const labels = { metro: 'Khách Metro tăng đột biến', parking: 'Hub hết chỗ đỗ', 'charging-demand': 'Nhu cầu sạc tăng', charging: 'Cổng sạc ngừng hoạt động', clustering: 'Xe phân bố mất cân bằng' };
  const statuses = { Reserved: 'Đang giữ xe', PickupClaimed: 'Đang xác nhận nhận xe', PickupUncertain: 'Cần đối soát nhận xe', Fulfilled: 'Đã nhận xe', Cancelled: 'Đã hủy', Expired: 'Đã hết hạn', Active: 'Đang đi', Completed: 'Đã hoàn tất' };
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
    TRIP_NOT_FOUND: 'Không tìm thấy chuyến đi liên quan.'
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
  async function refreshUser() {
    [state.reservations, state.trips] = await Promise.all([api('/vehicle-reservations'), api('/trips')]);
    state.trips = await Promise.all(state.trips.map(trip => trip.status === 'Active' ? api('/trips/' + encodeURIComponent(trip.id)) : trip));
  }
  async function reload() {
    state.hubs = await api('/hubs');
    state.hubMatches = null;
    state.selectedHub ||= state.hubs[0]?.id || '';
    if (operator) [state.results, state.networkOverview, state.resources, state.transfers, state.incidents] = await Promise.all([api('/simulations'), api('/operations/hubs'), api('/operations/resources'), experience === 'operator-web' ? loadTransfers() : [], experience === 'operator-web' ? loadIncidents() : []]);
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
    const hubs = state.hubMatches || state.hubs;
    return `<section class="live-user-hero"><p class="eyebrow">KẾT NỐI TỪ METRO ĐẾN GIẢNG ĐƯỜNG</p><h1>Chặng đường ngắn.<br>Tương lai xanh.</h1><p>Xe điện sẵn sàng cho hành trình của bạn.</p><button data-action="scroll-hubs">Khám phá Hub gần bạn →</button></section>
      <div class="live-quick"><button data-action="scroll-hubs"><span>${icon('bike')}</span>Đặt xe</button><button disabled><span>${icon('parking')}</span>Chỗ đỗ</button><button disabled><span>${icon('bolt')}</span>Sạc xe</button><button data-view="journeys"><span>${icon('qr')}</span>Nhận xe</button></div>
      <div class="section-heading" id="hub-list"><div><p class="eyebrow">UC01 · HUB GẦN BẠN</p><h2>Chọn Mobility Hub</h2></div><span class="muted">${hubs.length} Hub</span></div>
      <div class="live-hub-list">${hubs.map(hub => `<section class="card live-hub-card"><div><span class="hub-mark">${icon('grid')}</span><div><h3>${esc(hub.name)}</h3><p class="muted">Dữ liệu mạng lưới trực tiếp</p></div></div><button class="${state.selectedHub === hub.id ? 'primary' : 'secondary'}" data-hub="${esc(hub.id)}">${state.selectedHub === hub.id ? 'Đang chọn' : 'Xem xe'}</button></section>`).join('') || empty('Không tìm thấy Hub phù hợp.')}</div>
      <div class="section-heading"><div><p class="eyebrow">UC02 · PHƯƠNG TIỆN</p><h2>Xe tại ${esc(name(state.selectedHub))}</h2></div><span class="muted">${state.vehicles.length} xe</span></div><div class="live-grid live-vehicle-list">${state.vehicles.slice(0, state.vehicleLimit).map(vehicle => `<section class="card"><div class="vehicle-art">${icon('bike')}</div><h3>${esc(vehicleName(vehicle))}</h3><p class="muted">Mức pin <strong>${esc(vehicle.batteryPercent)}%</strong></p><button class="primary full" data-vehicle="${esc(vehicle.id)}">Chọn xe ${icon('arrow')}</button></section>`).join('') || empty('Hiện không có xe khả dụng tại Hub này.')}</div>${state.vehicleLimit < state.vehicles.length ? `<button class="secondary full show-more" data-action="show-more-vehicles">Xem thêm xe (${state.vehicles.length - state.vehicleLimit})</button>` : ''}${state.selectedVehicle ? `<section class="card live-confirm"><p class="eyebrow">UC03 · XÁC NHẬN</p><h2>Giữ ${esc(state.selectedVehicle.id)}</h2><p>Xe được giữ tối đa 15 phút và sẽ được kiểm tra lại trước khi xác nhận.</p><button class="primary full" data-action="reserve">Xác nhận giữ xe</button></section>` : ''}`;
  }
  function journeys() {
    const reservations = state.reservations.filter(record => ['Reserved', 'PickupClaimed', 'PickupUncertain'].includes(record.status));
    return `<h1>Phiếu và chuyến của tôi</h1><button class="secondary" data-action="refresh">Tải lại trạng thái</button><h2 style="margin-top:22px">Phiếu đang xử lý</h2>${reservations.map(record => `<section class="card"><h3>${esc(record.vehicleId)} · ${esc(statuses[record.status])}</h3><p>${esc(name(record.hubId))}</p><p>Hạn nhận: ${esc(date(record.expiresAt))}</p><p class="record-id">Mã phiếu: ${esc(record.ticketCode)}</p><form class="pickup-form" data-id="${esc(record.id)}"><label>Mã trên xe<input class="field" name="vehicleCode" required value="${record.status === 'Reserved' ? '' : esc(record.vehicleId)}" autocomplete="off"></label><button class="primary">${record.status === 'Reserved' ? 'Xác nhận nhận xe' : 'Thử lại xác nhận nhận xe'}</button></form>${record.status === 'Reserved' ? `<button class="secondary" data-cancel="${esc(record.id)}" style="margin-top:12px">Hủy giữ xe</button>` : '<p class="notice">Xe đang được giữ trong lúc xác nhận. Không tạo yêu cầu nhận xe mới.</p>'}</section>`).join('') || empty('Bạn không có phiếu giữ xe đang chờ.')}<h2>Chuyến đi</h2>${state.trips.map(trip => {
      const choice = state.returnChoices[trip.id] || { hubId: state.hubs[0]?.id, slots: [] };
      return `<section class="card"><h3>${esc(trip.vehicleId)} · ${esc(statuses[trip.status])}</h3><p>Bắt đầu: ${esc(date(trip.startTime))}</p>${trip.status === 'Active' && trip.pendingReturn ? `<p class="notice">Đang đối soát tại ${esc(name(trip.pendingReturn.hubId))}, chỗ ${esc(trip.pendingReturn.slotId)}. Thử lại yêu cầu cũ trên thiết bị đã gửi.</p><button class="primary" data-retry-return="${esc(trip.id)}">Thử lại xác nhận trả xe</button>` : trip.status === 'Active' ? `<form class="return-form" data-id="${esc(trip.id)}"><label>Hub trả xe<select class="field return-hub" name="hubId" data-trip="${esc(trip.id)}">${state.hubs.map(hub => option(hub.id, hub.name, choice.hubId)).join('')}</select></label><button type="button" class="secondary" data-slots="${esc(trip.id)}">Kiểm tra chỗ trả</button><label>Chỗ trả<select class="field" name="slotId" aria-label="Chỗ trả" required><option value="">Chọn chỗ đã kiểm tra</option>${choice.slots.map(slot => option(slot.id, slot.code)).join('')}</select></label><label class="check"><input name="confirmed" type="checkbox" required> Tôi đã đưa xe vào đúng chỗ và khóa an toàn.</label><button class="primary">Xác nhận trả xe</button></form><button class="secondary" data-report="${esc(trip.id)}" style="margin-top:12px">Báo sự cố</button>` : `<p>Kết thúc: ${esc(date(trip.endTime))}</p><p>Hub trả: ${esc(name(trip.hubId))}</p><p>Quãng đường: ${trip.distance == null ? 'Chưa có số đo' : esc(trip.distance) + ' km'}</p>`}</section>`;
    }).join('') || empty('Bạn chưa có chuyến đi.')}<details><summary>Lịch sử phiếu</summary>${state.reservations.filter(record => !reservations.includes(record)).map(record => `<p>${esc(record.vehicleId)} · ${esc(statuses[record.status])}</p>`).join('') || 'Chưa có lịch sử.'}</details>`;
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
      <section class="operator-web-visual" aria-label="Mạng lưới giao thông điện thông minh"><div class="operator-web-visual-copy"><p class="eyebrow">SMART E-MOBILITY HUB · VNU-HCM</p><h2>Thành phố chuyển động.<br>Mạng lưới luôn sẵn sàng.</h2><p>Kết nối Mobility Hub, metro và khu đô thị bằng dữ liệu vận hành trực tiếp.</p></div><div class="operator-web-visual-summary"><span>Ảnh chụp hiện tại</span><strong>${esc(hubs.length)} Hub đang theo dõi</strong><small>${esc(totals.vehicles)} xe khả dụng · ${esc(totals.alerts)} Hub cần chú ý</small></div></section>
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
  function plannedScreen(title) {
    return `<section class="card planned-screen"><h1>${esc(title)}</h1><p class="muted">Màn hình đã có trong khung điều hướng và sẽ được nối API ở đợt triển khai tiếp theo.</p><button class="secondary" data-view="overview">Quay lại Tổng quan</button></section>`;
  }
  function operatorMenu() {
    const items = [['redistribute', 'arrow', 'Điều phối phương tiện'], ['schedule', 'bolt', 'Lịch sạc thông minh'], ['simulation', 'chart', 'Mô phỏng What-if'], ['results', 'chart', 'Kết quả mô phỏng'], ['account', 'user', 'Tài khoản']];
    return `<section class="card operator-menu-card"><p class="eyebrow">OPERATOR APP</p><h2>Công cụ vận hành</h2>${items.map(([view, symbol, text]) => `<button data-view="${view}">${icon(symbol)}<span>${esc(text)}</span>${icon('arrow')}</button>`).join('')}</section><p class="notice">Ứng dụng hiện trường dùng cùng quyền Operator và dữ liệu với dashboard trung tâm.</p>`;
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
    const operatorViews = [['overview', 'Tổng quan'], ['resources', 'Tài nguyên'], ['redistribute', 'Điều phối'], ['incidents', 'Sự cố'], ['schedule', 'Lịch sạc'], ['simulation', 'Mô phỏng'], ['results', 'Kết quả'], ['account', 'Tài khoản']];
    const views = operator ? (experience === 'operator-app' ? [['overview', 'Tổng quan'], ['resources', 'Tài nguyên'], ['incidents', 'Sự cố'], ['op-menu', 'Chức năng']] : operatorViews) : [['home', 'Tìm xe'], ['journeys', 'Chuyến của tôi'], ['account', 'Tài khoản']];
    document.body.classList.toggle('authenticated', Boolean(state.user));
    const viewIcons = { overview: 'grid', resources: 'bike', redistribute: 'arrow', incidents: 'alert', schedule: 'bolt', simulation: 'chart', results: 'chart', account: 'user', 'op-menu': 'settings', home: 'home', journeys: 'bike' };
    const mobilePrimary = ['overview', 'resources', 'incidents'];
    nav.innerHTML = state.user ? views.map(([id, title]) => {
      const active = state.view === id || (id === 'op-menu' && !mobilePrimary.includes(state.view));
      return `<button data-view="${id}" class="${active ? 'active' : ''}">${icon(viewIcons[id])}<span>${title}</span></button>`;
    }).join('') : '';
    if (!state.user) { root.innerHTML = login(); return; }
    const roles = state.user.roles || [];
    if (!roles.includes(operator ? 'operator' : 'user')) {
      root.innerHTML = '<section class="card"><p>Tài khoản không có quyền sử dụng giao diện này. Hãy mở đúng ứng dụng hoặc đăng nhập bằng tài khoản phù hợp.</p><button class="secondary" data-action="logout">Đăng xuất</button></section>'; return;
    }
    const account = () => `<section class="card"><h1>Tài khoản</h1><p>${esc(state.user.id)}</p><button class="secondary" data-action="logout">Đăng xuất</button></section>`;
    const screens = operator ? {
      overview,
      resources,
      redistribute: experience === 'operator-web' ? redistribute : () => plannedScreen('Điều phối xe'),
      incidents: experience === 'operator-web' ? incidents : () => plannedScreen('Sự cố vận hành'),
      schedule: () => plannedScreen('Lịch sạc'),
      simulation,
      results,
      transfer,
      'op-menu': operatorMenu,
      account
    } : { home, journeys, account };
    if (!screens[state.view]) state.view = operator ? 'overview' : 'home';
    history.replaceState(null, '', '#' + state.view);
    const unresolved = Object.entries(pendingStore().values).filter(([, entry]) => entry.path);
    const pending = unresolved.length ? `<section class="card"><h2>Yêu cầu chưa rõ kết quả</h2><p>Bạn có thể lấy lại kết quả của yêu cầu trước bằng cách thử lại an toàn.</p>${unresolved.map(([operation]) => `<button class="secondary" data-retry-operation="${esc(operation)}">Thử lại yêu cầu trước</button>`).join('')}</section>` : '';
    const feedback = (state.success ? `<p class="success" role="status">${esc(state.success)}</p>` : '') + pending;
    let content = screens[state.view]();
    const title = operatorViews.find(([id]) => id === state.view)?.[1] || views.find(([id]) => id === state.view)?.[1] || '';
    if (experience === 'operator-app') {
      const pageTitle = { overview: 'Tổng quan mạng lưới', resources: 'Quản lý tài nguyên', redistribute: 'Điều phối phương tiện', incidents: 'Sự cố vận hành', schedule: 'Lịch sạc thông minh', simulation: 'Mô phỏng What-if', results: 'Kết quả mô phỏng', account: 'Tài khoản', 'op-menu': 'Chức năng vận hành' }[state.view] || title;
      content = `<header class="live-mobile-top operator-top"><p class="eyebrow">SMART E-MOBILITY / OPERATOR</p><h1>${esc(pageTitle)}</h1><small>Ứng dụng vận hành · Dữ liệu trực tiếp</small></header><div class="live-mobile-pad">${feedback}${content}</div>`;
    } else if (!operator) {
      const search = state.view === 'home' ? `<form id="hub-search" class="mobile-search">${icon('search')}<input name="q" aria-label="Tìm Hub" placeholder="Tìm Hub trong khu đô thị…"><button aria-label="Tìm kiếm">${icon('arrow')}</button></form>` : '';
      content = `<header class="live-mobile-top user-top"><div class="mobile-brand"><span class="logo">e<span>↗</span></span><strong>Smart E-Mobility</strong></div><small>Xin chào, ${esc(state.user.id)}</small><h1>${state.view === 'home' ? 'Hôm nay bạn đi đâu?' : esc(title)}</h1>${search}</header><div class="live-mobile-pad">${feedback}${content}</div>`;
    } else content = feedback + content;
    root.innerHTML = content;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || state.busy) return;
    if (button.dataset.view) { state.view = button.dataset.view; state.error = ''; state.success = ''; history.replaceState(null, '', '#' + state.view); render(); }
    else if (button.dataset.retryOperation) run(async () => {
      const operation = button.dataset.retryOperation, entry = pendingStore().values[operation];
      const result = await write(entry.path, JSON.parse(entry.body), operation, entry.method || 'POST');
      if (operator && operation === 'transfer-create' && result?.id) rememberTransfer(result.id);
      if (operator && operation.startsWith('incident-handle:') && result?.assignment) rememberIncidentAssignment(result.id, result.assignment);
      await reload();
      if (operator && result.inputs) { state.result = result; state.view = 'results'; }
      else if (operator && operation.startsWith('transfer-')) state.view = 'redistribute';
      else if (operator && operation.startsWith('incident-')) state.view = 'incidents';
      else if (!operator) state.view = 'journeys';
      state.success = 'Đã lấy lại kết quả yêu cầu trước.';
    });
    else if (button.dataset.hub) run(async () => { state.selectedHub = button.dataset.hub; state.selectedVehicle = null; state.vehicleLimit = 3; state.vehicles = await api(`/hubs/${encodeURIComponent(state.selectedHub)}/vehicles`); });
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
    else if (button.dataset.action === 'reserve') run(async () => { await write('/vehicle-reservations', { vehicleId: state.selectedVehicle.id, hubId: state.selectedHub }, 'reserve'); state.selectedVehicle = null; await refreshUser(); state.view = 'journeys'; state.success = 'Đã giữ xe. Hãy nhận trước thời hạn trên phiếu.'; });
    else if (button.dataset.action === 'refresh') run(reload);
    else if (button.dataset.action === 'scroll-hubs') document.getElementById('hub-list')?.scrollIntoView({ behavior: 'smooth' });
    else if (button.dataset.action === 'show-more-vehicles') { state.vehicleLimit += 3; render(); }
    else if (button.dataset.action === 'show-more-resources') { state.resourceLimit += 20; render(); }
    else if (button.dataset.action === 'clear-resource-filters') { state.resourceFilters = { q: '', hubId: '', kind: '', status: '' }; state.resourceLimit = 20; render(); }
    else if (button.dataset.action === 'clear-incident-filters') run(async () => { state.incidentFilters = { status: '', hubId: '' }; await reload(); });
    else if (button.dataset.action === 'logout') run(async () => { await api('/session', { method: 'DELETE' }); state.user = null; state.result = null; state.reservations = []; state.trips = []; state.transfers = []; state.transferPlan = null; state.arrivalChoices = {}; state.incidents = []; state.filteredIncidents = null; });
    else if (button.dataset.action === 'export' && state.result) {
      const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(state.result, null, 2)], { type: 'application/json' }));
      link.href = url; link.download = `simulation-${state.result.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'scenario') { state.scenario = event.target.value; render(); }
    if (event.target.id === 'resource-kind') { state.newResourceKind = event.target.value; render(); }
    if (event.target.classList.contains('return-hub')) state.returnChoices[event.target.dataset.trip] = { hubId: event.target.value, slots: [] };
    if (state.transferPlan && event.target.id === 'transfer-source') { state.transferPlan.sourceHubId = event.target.value; state.transferPlan.vehicleIds = []; render(); return; }
    if (state.transferPlan && event.target.id === 'transfer-destination') { state.transferPlan.destinationHubId = event.target.value; state.transferPlan.slotIds = []; render(); return; }
    if (event.target.id === 'transfer-status-filter') { state.transferFilter = event.target.value; render(); return; }
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
    else if (formId === 'hub-search') run(async () => { state.hubMatches = await api('/hubs?q=' + encodeURIComponent(data.get('q'))); });
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
    else if (form.classList.contains('pickup-form')) run(async () => { await write(`/vehicle-reservations/${encodeURIComponent(form.dataset.id)}/pickup`, { vehicleCode: data.get('vehicleCode') }, 'pickup:' + form.dataset.id); await refreshUser(); state.success = 'Đã nhận xe. Chuyến đi đang hoạt động.'; });
    else if (form.classList.contains('return-form')) run(async () => { await write(`/trips/${encodeURIComponent(form.dataset.id)}/return`, { hubId: data.get('hubId'), slotId: data.get('slotId'), confirmed: data.get('confirmed') === 'on' }, 'return:' + form.dataset.id); await refreshUser(); state.success = 'Đã trả xe và kết thúc chuyến đi.'; });
    else if (formId === 'simulation-form') run(async () => {
      const parameters = {};
      for (const [key, value] of data.entries()) if (!['scenario', 'hubIds'].includes(key)) parameters[key] = key === 'targetHubId' ? value : Number(value);
      state.result = await write('/simulations', { scenario: data.get('scenario'), hubIds: data.getAll('hubIds'), parameters }, 'simulation');
      state.results = await api('/simulations'); state.view = 'results';
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
  });
  window.addEventListener('online', () => { if (state.user) run(reload); });
  run(async () => { try { state.user = await api('/session'); } catch (error) { if (error.status !== 401) throw error; } if (state.user) await reload(); });
})();
