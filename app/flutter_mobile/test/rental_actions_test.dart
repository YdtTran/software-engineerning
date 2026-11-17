import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_mobility_design/api.dart';

void main() {
  test(
    'pickup, cancellation and return send distinct idempotent commands',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'rental_actions_',
      );
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final seen = <String, Map<String, dynamic>>{};
      server.listen((request) async {
        request.response.headers.contentType = ContentType.json;
        final data = await utf8.decoder.bind(request).join();
        if (request.uri.path == '/api/v1/session') {
          request.response.cookies.add(Cookie('demo_session', 'abc'));
          request.response.write(
            jsonEncode({
              'data': {
                'id': 'rider',
                'roles': ['user'],
              },
            }),
          );
        } else {
          final key = request.headers.value('idempotency-key');
          expect(key, isNotNull);
          seen[request.uri.path] = {'body': jsonDecode(data), 'key': key};
          request.response.write(
            jsonEncode({
              'data': {'status': 'ok'},
            }),
          );
        }
        await request.response.close();
      });
      final api = MobilityApi(
        Uri.parse('http://127.0.0.1:${server.port}'),
        storageDirectory: () async => directory,
      );
      await api.login('rider', 'password');
      await api.pickup('ticket', 'EB-024');
      await api.cancelReservation('other');
      await api.returnTrip('trip', 'hub', 'slot');
      expect(seen['/api/v1/vehicle-reservations/ticket/pickup']!['body'], {
        'vehicleCode': 'EB-024',
      });
      expect(seen['/api/v1/vehicle-reservations/other/cancel']!['body'], {});
      expect(seen['/api/v1/trips/trip/return']!['body'], {
        'hubId': 'hub',
        'slotId': 'slot',
        'confirmed': true,
      });
      expect(seen.values.map((v) => v['key']).toSet(), hasLength(3));
      await api.close();
      await server.close(force: true);
      await directory.delete(recursive: true);
    },
  );
}
