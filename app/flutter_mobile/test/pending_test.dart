import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_mobility_design/api.dart';

void main() {
  test('lost reservation response retains key across restart and prevents different writes', () async {
    final directory = await Directory.systemTemp.createTemp(
      'mobility_pending_',
    );
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    String? key;
    var calls = 0;
    server.listen((request) async {
      request.response.headers.contentType = ContentType.json;
      if (request.uri.path == '/api/v1/session') {
        await utf8.decoder.bind(request).join();
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
        calls++;
        final received = request.headers.value('idempotency-key');
        key ??= received;
        expect(received, key);
        await utf8.decoder.bind(request).join();
        if (calls == 1) {
          final socket = await request.response.detachSocket();
          socket.destroy();
          return;
        }
        request.response.write(
          jsonEncode({
            'data': {'id': 'reservation-1'},
          }),
        );
      }
      await request.response.close();
    });
    final origin = Uri.parse('http://127.0.0.1:${server.port}');
    final api = MobilityApi(origin, storageDirectory: () async => directory);
    await api.login('rider', 'password');
    await expectLater(api.reserve('hub', 'bike'), throwsA(isA<ApiFailure>()));
    expect(await api.hasPendingWrite(), isTrue);
    await api.close();
    final afterRestart = MobilityApi(
      origin,
      storageDirectory: () async => directory,
    );
    await afterRestart.login('rider', 'password');
    await expectLater(
      afterRestart.reserve('hub', 'different'),
      throwsA(isA<ApiFailure>()),
    );
    expect(calls, 1);
    expect((await afterRestart.retryPendingWrite())['id'], 'reservation-1');
    expect(await afterRestart.hasPendingWrite(), isFalse);
    await afterRestart.close();
    await server.close(force: true);
    await directory.delete(recursive: true);
  });
}
