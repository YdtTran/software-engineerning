import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_mobility_design/api.dart';

void main() {
  test(
    'parking reservation, check-in and charging use their separate contracts',
    () async {
      final dir = await Directory.systemTemp.createTemp('parking-api-');
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final calls = <String, dynamic>{};
      server.listen((request) async {
        request.response.headers.contentType = ContentType.json;
        if (request.uri.path == '/api/v1/session') {
          await utf8.decoder.bind(request).join();
          request.response.cookies.add(Cookie('demo_session', 'test'));
          request.response.write(
            jsonEncode({
              'data': {
                'id': 'rider',
                'roles': ['user'],
              },
            }),
          );
        } else if (request.method == 'GET') {
          calls[request.uri.path] = request.uri.queryParameters;
          request.response.write(
            jsonEncode({
              'data': {
                'availableSlots': [
                  {'id': 'A01'},
                ],
              },
            }),
          );
        } else {
          expect(request.headers.value('idempotency-key'), isNotNull);
          calls[request.uri.path] = jsonDecode(
            await utf8.decoder.bind(request).join(),
          );
          request.response.write(
            jsonEncode({
              'data': {'id': 'ok'},
            }),
          );
        }
        await request.response.close();
      });
      final api = MobilityApi(
        Uri.parse('http://127.0.0.1:${server.port}'),
        storageDirectory: () async => dir,
      );
      await api.login('rider', 'password');
      expect(
        (await api.parkingAvailability('bku', 'PV-1')).single['id'],
        'A01',
      );
      await api.reserveParking('bku', 'A01', 'PV-1');
      await api.checkInParking('R1', 'bku', 'T1');
      await api.requestCharging('O1', 80);
      expect(calls['/api/v1/hubs/bku/parking-availability'], {
        'privateVehicleId': 'PV-1',
        'pool': 'immediate',
      });
      expect(calls['/api/v1/parking-reservations'], {
        'hubId': 'bku',
        'slotId': 'A01',
        'privateVehicleId': 'PV-1',
        'pool': 'immediate',
      });
      expect(calls['/api/v1/parking-reservations/R1/check-in'], {
        'hubId': 'bku',
        'ticketCode': 'T1',
      });
      expect(calls['/api/v1/charging-requests'], {
        'occupancyId': 'O1',
        'targetBatteryPercent': 80,
      });
      await api.close();
      await server.close(force: true);
      await dir.delete(recursive: true);
    },
  );
}
