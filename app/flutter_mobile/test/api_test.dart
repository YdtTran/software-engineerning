import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_mobility_design/api.dart';

void main() {
  test(
    'session cookie, origin and authenticated discovery round trip',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final origin = 'http://127.0.0.1:${server.port}';
      server.listen((request) async {
        request.response.headers.contentType = ContentType.json;
        if (request.uri.path == '/api/v1/session' && request.method == 'POST') {
          expect(request.headers.value('origin'), origin);
          expect(
            jsonDecode(await utf8.decoder.bind(request).join())['username'],
            'user',
          );
          request.response.cookies.add(
            Cookie('demo_session', 'abc')..httpOnly = true,
          );
          request.response.write(
            jsonEncode({
              'data': {
                'id': 'user',
                'roles': ['user'],
              },
            }),
          );
        } else if (request.uri.path == '/api/v1/hubs') {
          expect(request.cookies.single.value, 'abc');
          request.response.write(
            jsonEncode({
              'data': [
                {'id': 'hub', 'name': 'Hub'},
              ],
            }),
          );
        } else {
          request.response.statusCode = 401;
          request.response.write(
            jsonEncode({
              'error': {'code': 'UNAUTHENTICATED', 'message': 'expired'},
            }),
          );
        }
        await request.response.close();
      });
      final api = MobilityApi(Uri.parse(origin));
      expect((await api.login('user', 'secret'))['id'], 'user');
      expect((await api.hubs()).single['name'], 'Hub');
      await api.close();
      await server.close(force: true);
    },
  );
}
