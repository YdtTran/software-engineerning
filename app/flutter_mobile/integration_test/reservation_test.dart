import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:smart_mobility_design/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('reserve, pick up and return a vehicle', (tester) async {
    const username = String.fromEnvironment('DEMO_TEST_USER');
    const password = String.fromEnvironment('DEMO_TEST_PASSWORD');
    expect(username.isNotEmpty && password.isNotEmpty, isTrue);
    Future<void> waitFor(Finder finder) async {
      for (var i = 0; i < 20 && finder.evaluate().isEmpty; i++) {
        await tester.pump(const Duration(milliseconds: 500));
      }
      if (finder.evaluate().isEmpty) {
        debugPrint(
          tester
              .widgetList<Text>(find.byType(Text))
              .map((item) => item.data)
              .whereType<String>()
              .join(' | '),
        );
      }
      expect(finder, findsWidgets);
    }

    await tester.pumpWidget(const MobilityApp(enableMapTiles: false));
    await tester.tap(find.text('Tài khoản').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Đăng nhập').first);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(EditableText).first, username);
    await tester.enterText(find.byType(EditableText).last, password);
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await waitFor(find.text('Đăng xuất'));
    await tester.tap(find.text('Bản đồ').last);
    await tester.pumpAndSettle();
    await waitFor(find.text('Ga Metro ĐHQG'));
    await tester.tap(find.text('Ga Metro ĐHQG').first);
    await waitFor(find.text('Đặt xe'));
    final tile = find
        .ancestor(
          of: find.text('Đặt xe').first,
          matching: find.byType(ListTile),
        )
        .first;
    final vehicleId = tester
        .widget<Text>(
          find.descendant(of: tile, matching: find.byType(Text)).first,
        )
        .data!;
    await tester.tap(find.text('Đặt xe').first);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Xác nhận giữ xe'));
    await waitFor(find.text('Đã giữ xe'));
    await tester.tap(find.text('Đóng'));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tài khoản').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lịch sử sử dụng'));
    await tester.pumpAndSettle();
    final vehicleCards = find.ancestor(
      of: find.text(vehicleId),
      matching: find.byType(Card),
    );
    final pickupButton = find.descendant(
      of: vehicleCards,
      matching: find.text('Nhận xe'),
    );
    await waitFor(pickupButton);
    await tester.tap(pickupButton.first);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, vehicleId);
    await tester.tap(find.widgetWithText(FilledButton, 'Xác nhận nhận xe'));
    final returnButton = find.descendant(
      of: vehicleCards,
      matching: find.text('Trả xe'),
    );
    await waitFor(returnButton);
    await tester.ensureVisible(returnButton.first);
    await tester.tap(returnButton.first);
    await tester.pumpAndSettle();
    await waitFor(find.text('Hub trả xe'));
    await tester.tap(find.byType(DropdownButtonFormField<String>).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ga Metro ĐHQG').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Kiểm tra chỗ trả'));
    await waitFor(find.textContaining('chỗ khả dụng'));
    await tester.tap(find.byType(DropdownButtonFormField<String>).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('A01').last);
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byType(CheckboxListTile));
    await tester.tap(find.byType(CheckboxListTile));
    await tester.pumpAndSettle();
    expect(
      tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
      isTrue,
    );
    expect(
      tester
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Xác nhận trả xe'),
          )
          .onPressed,
      isNotNull,
    );
    await tester.tap(find.text('Xác nhận trả xe'));
    await waitFor(find.text('Phiếu và chuyến của tôi'));
  });
}
