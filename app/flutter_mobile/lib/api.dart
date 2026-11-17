import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:path_provider/path_provider.dart';

import 'package:flutter/foundation.dart';

class ApiFailure implements Exception {
  final String code;
  final String message;
  final int? status;
  ApiFailure(this.code, this.message, [this.status]);
  @override
  String toString() => message;
}

class MobilityApi {
  final Uri origin;
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 10);
  String? _session;
  String? _actor;
  bool _writing = false;
  final Future<Directory> Function() storageDirectory;

  MobilityApi(this.origin, {Future<Directory> Function()? storageDirectory})
    : storageDirectory = storageDirectory ?? getApplicationSupportDirectory {
    if (origin.scheme != 'https' &&
        !(kDebugMode &&
            origin.scheme == 'http' &&
            (origin.host == '127.0.0.1' || origin.host == 'localhost'))) {
      throw ArgumentError(
        'An HTTPS server is required outside local debugging.',
      );
    }
    if (origin.userInfo.isNotEmpty ||
        origin.hasQuery ||
        origin.hasFragment ||
        (origin.path.isNotEmpty && origin.path != '/')) {
      throw ArgumentError('Server URL must be an origin.');
    }
  }

  Future<dynamic> _request(
    String method,
    String path, [
    Object? body,
    String? idempotencyKey,
  ]) async {
    final uri = origin.resolve('/api/v1$path');
    try {
      final request = await _client
          .openUrl(method, uri)
          .timeout(const Duration(seconds: 15));
      request.followRedirects = false;
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      if (_session != null) {
        request.headers.set(HttpHeaders.cookieHeader, _session!);
      }
      if (method != 'GET') request.headers.set('Origin', origin.origin);
      if (idempotencyKey != null) {
        request.headers.set('Idempotency-Key', idempotencyKey);
      }
      if (body != null) {
        request.headers.contentType = ContentType.json;
        request.write(jsonEncode(body));
      }
      final response = await request.close().timeout(
        const Duration(seconds: 15),
      );
      final content = await utf8.decoder
          .bind(response)
          .join()
          .timeout(const Duration(seconds: 15));
      final decoded = jsonDecode(content) as Map<String, dynamic>;
      if (response.statusCode < 200 || response.statusCode >= 300) {
        if (response.statusCode == 401) _session = null;
        final error = decoded['error'] as Map<String, dynamic>?;
        throw ApiFailure(
          error?['code'] as String? ?? 'ERROR',
          error?['message'] as String? ?? 'Không thể thực hiện yêu cầu.',
          response.statusCode,
        );
      }
      for (final cookie in response.cookies) {
        if (cookie.name == 'demo_session') {
          _session = '${cookie.name}=${cookie.value}';
        }
      }
      return decoded['data'];
    } on ApiFailure {
      rethrow;
    } catch (_) {
      throw ApiFailure(
        'NETWORK',
        'Không thể kết nối máy chủ. Hãy kiểm tra kết nối và thử lại.',
      );
    }
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    final user = await _request('POST', '/session', {
      'username': username,
      'password': password,
    }) as Map<String, dynamic>;
    _actor = user['id'] as String;
    return user;
  }

  Future<void> logout() async {
    await _request('DELETE', '/session');
    _session = null;
    _actor = null;
  }

  Future<File> _pendingFile() async =>
      File('${(await storageDirectory()).path}/pending-mobility-write.json');
  Future<Map<String, dynamic>?> _pending() async {
    final file = await _pendingFile();
    if (!await file.exists()) return null;
    final entry = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
    if (_actor == null ||
        entry['actor'] != _actor ||
        entry['origin'] != origin.origin) {
      throw ApiFailure(
        'PENDING_OTHER_ACCOUNT',
        'Có yêu cầu chưa rõ kết quả của tài khoản hoặc máy chủ khác trên thiết bị này.',
      );
    }
    return entry;
  }

  Future<bool> hasPendingWrite() async => await _pending() != null;
  Future<Map<String, dynamic>> reserve(String hubId, String vehicleId) =>
      _write('/vehicle-reservations', {'vehicleId': vehicleId, 'hubId': hubId});
  Future<Map<String, dynamic>> cancelReservation(String id) =>
      _write('/vehicle-reservations/${Uri.encodeComponent(id)}/cancel', {});
  Future<Map<String, dynamic>> pickup(String id, String vehicleCode) => _write(
    '/vehicle-reservations/${Uri.encodeComponent(id)}/pickup',
    {'vehicleCode': vehicleCode},
  );
  Future<Map<String, dynamic>> returnTrip(
    String id,
    String hubId,
    String slotId,
  ) => _write('/trips/${Uri.encodeComponent(id)}/return', {
    'hubId': hubId,
    'slotId': slotId,
    'confirmed': true,
  });
  Future<Map<String, dynamic>> trip(String id) async =>
      await _request('GET', '/trips/${Uri.encodeComponent(id)}')
          as Map<String, dynamic>;
  Future<List<Map<String, dynamic>>> returnSlots(
    String hubId,
    String tripId,
  ) async => (await _request(
    'GET',
    '/hubs/${Uri.encodeComponent(hubId)}/return-slots?tripId=${Uri.encodeQueryComponent(tripId)}',
  ) as List).cast<Map<String, dynamic>>();
  Future<List<Map<String, dynamic>>> parkingAvailability(
    String hubId,
    String vehicleId,
  ) async {
    final result = await _request(
      'GET',
      '/hubs/${Uri.encodeComponent(hubId)}/parking-availability?privateVehicleId=${Uri.encodeQueryComponent(vehicleId)}&pool=immediate',
    ) as Map<String, dynamic>;
    return (result['availableSlots'] as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> reserveParking(
    String hubId,
    String slotId,
    String vehicleId,
  ) => _write('/parking-reservations', {
    'hubId': hubId,
    'slotId': slotId,
    'privateVehicleId': vehicleId,
    'pool': 'immediate',
  });
  Future<Map<String, dynamic>> parkingReservation(String id) async =>
      await _request('GET', '/parking-reservations/${Uri.encodeComponent(id)}')
          as Map<String, dynamic>;
  Future<Map<String, dynamic>> cancelParking(String id) =>
      _write('/parking-reservations/${Uri.encodeComponent(id)}/cancel', {});
  Future<Map<String, dynamic>> checkInParking(
    String id,
    String hubId,
    String ticketCode,
  ) => _write('/parking-reservations/${Uri.encodeComponent(id)}/check-in', {
    'hubId': hubId,
    'ticketCode': ticketCode,
  });
  Future<Map<String, dynamic>> parkingOccupancy(String id) async =>
      await _request('GET', '/parking-occupancies/${Uri.encodeComponent(id)}')
          as Map<String, dynamic>;
  Future<Map<String, dynamic>> checkOutParking(String id) =>
      _write('/parking-occupancies/${Uri.encodeComponent(id)}/check-out', {});
  Future<Map<String, dynamic>> requestCharging(
    String occupancyId,
    int target,
  ) => _write('/charging-requests', {
    'occupancyId': occupancyId,
    'targetBatteryPercent': target,
  });
  Future<Map<String, dynamic>> chargingRequest(String id) async =>
      await _request('GET', '/charging-requests/${Uri.encodeComponent(id)}')
          as Map<String, dynamic>;
  Future<Map<String, dynamic>> cancelCharging(String id) =>
      _write('/charging-requests/${Uri.encodeComponent(id)}/cancel', {});
  Future<Map<String, dynamic>> chargingSession(String id) async =>
      await _request('GET', '/charging-sessions/${Uri.encodeComponent(id)}')
          as Map<String, dynamic>;
  Future<Map<String, dynamic>> stopCharging(String id) =>
      _write('/charging-sessions/${Uri.encodeComponent(id)}/stop', {});
  Future<Map<String, dynamic>> retryPendingWrite() => _write(null, null);
  Future<Map<String, dynamic>> _write(
    String? path,
    Map<String, dynamic>? body,
  ) async {
    if (_actor == null || _session == null) {
      throw ApiFailure('UNAUTHENTICATED', 'Vui lòng đăng nhập lại.');
    }
    if (_writing) {
      throw ApiFailure('COMMAND_IN_PROGRESS', 'Yêu cầu đang được xử lý.');
    }
    _writing = true;
    try {
      var entry = await _pending();
      if (entry == null) {
        if (path == null || body == null) {
          throw ApiFailure('NO_PENDING', 'Không có yêu cầu cần thử lại.');
        }
        final random = Random.secure();
        final key = List.generate(
          16,
          (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
        ).join();
        entry = {
          'actor': _actor,
          'origin': origin.origin,
          'path': path,
          'body': body,
          'key': key,
        };
        final file = await _pendingFile();
        await file.parent.create(recursive: true);
        final temp = File('${file.path}.tmp');
        await temp.writeAsString(jsonEncode(entry), flush: true);
        await temp.rename(file.path);
      } else if (path != null &&
          (path != entry['path'] ||
              jsonEncode(body) != jsonEncode(entry['body']))) {
        throw ApiFailure(
          'PENDING_WRITE',
          'Hãy thử lại yêu cầu trước trước khi tạo yêu cầu mới.',
        );
      }
      try {
        final result = await _request(
          'POST',
          entry['path'] as String,
          entry['body'],
          entry['key'] as String,
        ) as Map<String, dynamic>;
        await (await _pendingFile()).delete();
        return result;
      } on ApiFailure catch (e) {
        if (e.status != null &&
            [400, 403, 404, 409, 422].contains(e.status) &&
            ![
              'COMMAND_IN_PROGRESS',
              'IDEMPOTENCY_KEY_REUSED',
            ].contains(e.code)) {
          await (await _pendingFile()).delete();
        }
        rethrow;
      }
    } finally {
      _writing = false;
    }
  }

  Future<List<Map<String, dynamic>>> hubs() async =>
      (await _request('GET', '/hubs') as List).cast<Map<String, dynamic>>();
  Future<List<Map<String, dynamic>>> vehicles(String hubId) async =>
      (await _request(
        'GET',
        '/hubs/${Uri.encodeComponent(hubId)}/vehicles',
      ) as List).cast<Map<String, dynamic>>();
  Future<List<Map<String, dynamic>>> reservations() async =>
      (await _request('GET', '/vehicle-reservations') as List)
          .cast<Map<String, dynamic>>();
  Future<List<Map<String, dynamic>>> trips() async =>
      (await _request('GET', '/trips') as List).cast<Map<String, dynamic>>();
  Future<void> close() async => _client.close(force: true);
}
