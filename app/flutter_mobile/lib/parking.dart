import 'package:flutter/material.dart';

import 'api.dart';

const _blue = Color(0xff10297a);

class ParkingPage extends StatefulWidget {
  final MobilityApi api;
  final bool charging;
  const ParkingPage({super.key, required this.api, required this.charging});
  @override
  State<ParkingPage> createState() => _ParkingPageState();
}

class _ParkingPageState extends State<ParkingPage> {
  final vehicle = TextEditingController();
  final reservation = TextEditingController();
  final occupancy = TextEditingController();
  final request = TextEditingController();
  final session = TextEditingController();
  final target = TextEditingController();
  late Future<List<Map<String, dynamic>>> hubs;
  List<Map<String, dynamic>> slots = [];
  String? hub;
  String? slot;
  String? error;
  Map<String, dynamic>? result;
  bool busy = false;
  bool pending = false;
  bool searched = false;

  @override
  void initState() {
    super.initState();
    hubs = widget.api.hubs();
    refreshPending();
  }

  @override
  void dispose() {
    for (final c in [
      vehicle,
      reservation,
      occupancy,
      request,
      session,
      target,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> refreshPending() async {
    try {
      final value = await widget.api.hasPendingWrite();
      if (mounted) setState(() => pending = value);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  void invalidate() {
    slots = [];
    slot = null;
    searched = false;
  }

  Future<void> search() async {
    if (hub == null || vehicle.text.trim().isEmpty || busy) return;
    setState(() {
      busy = true;
      error = null;
      invalidate();
    });
    try {
      final found = await widget.api.parkingAvailability(
        hub!,
        vehicle.text.trim(),
      );
      if (mounted) {
        setState(() {
          slots = found;
          searched = true;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> run(Future<Map<String, dynamic>> Function() action) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final value = await action();
      if (!mounted) return;
      setState(() {
        result = value;
        if (value['ticketCode'] != null && value['id'] != null) {
          reservation.text = value['id'].toString();
        }
        if (value['occupancyId'] != null) {
          occupancy.text = value['occupancyId'].toString();
        }
      });
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) {
        setState(() => busy = false);
        await refreshPending();
      }
    }
  }

  Future<void> confirm(
    String title,
    String description,
    Future<Map<String, dynamic>> Function() action,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(description),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Quay lại'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) await run(action);
  }

  Widget field(
    TextEditingController controller,
    String label, {
    TextInputType? keyboardType,
    ValueChanged<String>? onChanged,
  }) => TextField(
    controller: controller,
    enabled: !busy,
    keyboardType: keyboardType,
    onChanged: onChanged ?? (_) => setState(() {}),
    decoration: InputDecoration(
      labelText: label,
      border: const OutlineInputBorder(),
    ),
  );
  Widget button(String label, VoidCallback? action) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: FilledButton(
      onPressed: busy || pending ? null : action,
      child: Text(label),
    ),
  );
  Widget output() {
    if (result == null) return const SizedBox.shrink();
    final keys = [
      'id',
      'status',
      'ticketCode',
      'hubId',
      'slotId',
      'occupancyId',
      'sessionId',
      'expiresAt',
      'actualCheckoutAt',
    ];
    const names = {
      'id': 'Mã bản ghi',
      'status': 'Trạng thái',
      'ticketCode': 'Mã phiếu',
      'hubId': 'Hub',
      'slotId': 'Chỗ',
      'occupancyId': 'Mã lượt đỗ',
      'sessionId': 'Mã phiên sạc',
      'expiresAt': 'Hạn',
      'actualCheckoutAt': 'Giờ rời chỗ',
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Kết quả',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const Text(
              'Nhấn giữ để sao chép mã tra cứu.',
              style: TextStyle(color: Colors.blueGrey),
            ),
            for (final key in keys)
              if (result![key] != null)
                SelectableText('${names[key]}: ${result![key]}'),
          ],
        ),
      ),
    );
  }

  Widget parkingBody(List<Map<String, dynamic>> allHubs) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Text(
        'Đặt chỗ đến ngay',
        style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 8),
      const Text(
        'Dùng mã xe cá nhân đã đăng ký cho tài khoản. Đặt chỗ chưa phải là nhận chỗ.',
      ),
      const SizedBox(height: 14),
      DropdownButtonFormField<String>(
        initialValue: hub,
        decoration: const InputDecoration(
          labelText: 'Chọn Hub',
          border: OutlineInputBorder(),
        ),
        items: allHubs
            .map(
              (h) => DropdownMenuItem(
                value: h['id'] as String,
                child: Text(
                  h['name'] as String,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            )
            .toList(),
        onChanged: busy
            ? null
            : (value) => setState(() {
                hub = value;
                invalidate();
              }),
      ),
      const SizedBox(height: 12),
      field(vehicle, 'Mã xe cá nhân', onChanged: (_) => setState(invalidate)),
      OutlinedButton(
        onPressed: busy || hub == null || vehicle.text.trim().isEmpty
            ? null
            : search,
        child: const Text('Kiểm tra chỗ trống'),
      ),
      if (searched) Text('${slots.length} chỗ khả dụng'),
      if (slots.isNotEmpty)
        DropdownButtonFormField<String>(
          key: ValueKey('${hub}_${vehicle.text}_${slots.length}'),
          initialValue: slot,
          decoration: const InputDecoration(
            labelText: 'Chọn chỗ',
            border: OutlineInputBorder(),
          ),
          items: slots
              .map(
                (s) => DropdownMenuItem(
                  value: s['id'] as String,
                  child: Text((s['code'] ?? s['id']).toString()),
                ),
              )
              .toList(),
          onChanged: busy ? null : (value) => setState(() => slot = value),
        ),
      button(
        'Đặt chỗ đỗ',
        hub == null || slot == null || vehicle.text.trim().isEmpty
            ? null
            : () => confirm(
                'Đặt chỗ đỗ?',
                'Hệ thống sẽ kiểm tra lại chỗ trống trước khi xác nhận.',
                () =>
                    widget.api.reserveParking(hub!, slot!, vehicle.text.trim()),
              ),
      ),
      const Divider(height: 35),
      const Text(
        'Tra cứu và nhận chỗ',
        style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 8),
      const Text('Nhập mã bản ghi đã nhận sau khi đặt chỗ.'),
      const SizedBox(height: 12),
      field(reservation, 'Mã bản ghi đặt chỗ'),
      OutlinedButton(
        onPressed: busy || reservation.text.trim().isEmpty
            ? null
            : () => run(
                () => widget.api.parkingReservation(reservation.text.trim()),
              ),
        child: const Text('Tra cứu phiếu'),
      ),
      if (result?['id'] == reservation.text.trim() &&
          result?['status'] == 'Reserved' &&
          result?['hubId'] != null &&
          result?['ticketCode'] != null) ...[
        button(
          'Nhận chỗ',
          () => confirm(
            'Xác nhận nhận chỗ?',
            'Chỉ tiếp tục khi xe đã đến đúng Hub. Thiết bị sẽ xác nhận tình trạng chỗ.',
            () => widget.api.checkInParking(
              reservation.text.trim(),
              result!['hubId'].toString(),
              result!['ticketCode'].toString(),
            ),
          ),
        ),
        button(
          'Hủy đặt chỗ',
          () => confirm(
            'Hủy đặt chỗ?',
            'Cam kết đặt chỗ sẽ được hủy nếu hệ thống cho phép.',
            () => widget.api.cancelParking(reservation.text.trim()),
          ),
        ),
      ],
      const Divider(height: 35),
      const Text(
        'Tra cứu và rời chỗ',
        style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 12),
      field(occupancy, 'Mã lượt đỗ'),
      OutlinedButton(
        onPressed: busy || occupancy.text.trim().isEmpty
            ? null
            : () =>
                  run(() => widget.api.parkingOccupancy(occupancy.text.trim())),
        child: const Text('Tra cứu lượt đỗ'),
      ),
      if (result?['id'] == occupancy.text.trim() &&
          result?['actualCheckoutAt'] == null)
        button(
          'Rời chỗ',
          () => confirm(
            'Xác nhận rời chỗ?',
            'Chỉ tiếp tục khi xe đã rời chỗ và thiết bị sạc đã được ngắt an toàn.',
            () => widget.api.checkOutParking(occupancy.text.trim()),
          ),
        ),
    ],
  );
  Widget chargingBody() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Text(
        'Yêu cầu sạc',
        style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 8),
      const Text('Xe cá nhân cần nhận chỗ trước khi gửi yêu cầu sạc.'),
      const SizedBox(height: 12),
      field(occupancy, 'Mã lượt đỗ'),
      const SizedBox(height: 12),
      field(
        target,
        'Mức pin mong muốn (%)',
        keyboardType: TextInputType.number,
      ),
      button(
        'Gửi yêu cầu sạc',
        occupancy.text.trim().isEmpty ||
                int.tryParse(target.text) == null ||
                int.parse(target.text) < 1 ||
                int.parse(target.text) > 100
            ? null
            : () => confirm(
                'Gửi yêu cầu sạc?',
                'Yêu cầu sẽ chờ hệ thống phân lịch; chưa bắt đầu cấp điện.',
                () => widget.api.requestCharging(
                  occupancy.text.trim(),
                  int.parse(target.text),
                ),
              ),
      ),
      const Divider(height: 35),
      const Text(
        'Tra cứu yêu cầu',
        style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 12),
      field(request, 'Mã yêu cầu sạc'),
      OutlinedButton(
        onPressed: busy || request.text.trim().isEmpty
            ? null
            : () => run(() => widget.api.chargingRequest(request.text.trim())),
        child: const Text('Tra cứu yêu cầu'),
      ),
      if (result?['id'] == request.text.trim() &&
          ['Queued', 'Allocated'].contains(result?['status']))
        button(
          'Hủy yêu cầu sạc',
          () => confirm(
            'Hủy yêu cầu sạc?',
            'Hệ thống chỉ hủy yêu cầu chưa cấp điện.',
            () => widget.api.cancelCharging(request.text.trim()),
          ),
        ),
      const Divider(height: 35),
      const Text(
        'Phiên sạc',
        style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 12),
      field(session, 'Mã phiên sạc'),
      OutlinedButton(
        onPressed: busy || session.text.trim().isEmpty
            ? null
            : () => run(() => widget.api.chargingSession(session.text.trim())),
        child: const Text('Tra cứu phiên sạc'),
      ),
      if (result?['id'] == session.text.trim() &&
          ['Active', 'Stopping'].contains(result?['status']))
        button(
          'Dừng sạc',
          () => confirm(
            'Dừng sạc?',
            'Hệ thống sẽ xác nhận ngắt điện; đầu nối chỉ được giải phóng sau khi ngắt an toàn.',
            () => widget.api.stopCharging(session.text.trim()),
          ),
        ),
    ],
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.charging ? 'Sạc xe' : 'Đặt chỗ đỗ'),
      backgroundColor: _blue,
      foregroundColor: Colors.white,
    ),
    body: FutureBuilder<List<Map<String, dynamic>>>(
      future: hubs,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Center(child: Text(snapshot.error.toString()));
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (pending)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Yêu cầu trước chưa rõ kết quả. Thử lại an toàn trước khi tiếp tục.',
                      ),
                      FilledButton(
                        onPressed: busy
                            ? null
                            : () => run(widget.api.retryPendingWrite),
                        child: const Text('Thử lại yêu cầu trước'),
                      ),
                    ],
                  ),
                ),
              ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(error!, style: const TextStyle(color: Colors.red)),
              ),
            output(),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: widget.charging
                    ? chargingBody()
                    : parkingBody(snapshot.data!),
              ),
            ),
          ],
        );
      },
    ),
  );
}
