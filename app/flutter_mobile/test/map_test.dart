import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_mobility_design/main.dart';

void main() {
  testWidgets('map displays only known demo hubs and filters them', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MapPage(
            hubs: const [
              {'id': 'metro', 'name': 'Ga Metro ĐHQG'},
              {'id': 'unknown', 'name': 'Other Hub'},
            ],
            loggedIn: true,
            onLogin: () {},
            error: null,
            api: null,
            enableTiles: false,
          ),
        ),
      ),
    );
    expect(find.text('Vị trí Hub chỉ mang tính minh họa'), findsOneWidget);
    expect(find.byKey(const ValueKey('hub-marker-metro')), findsOneWidget);
    expect(find.byKey(const ValueKey('hub-marker-unknown')), findsNothing);
    await tester.enterText(find.byType(TextField), 'Metro');
    await tester.pump();
    expect(find.text('Ga Metro ĐHQG'), findsWidgets);
    expect(find.text('Other Hub'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
