import 'package:flutter_test/flutter_test.dart';
import 'package:smart_mobility_design/main.dart';

void main() {
  testWidgets('four main screens and quick actions are navigable', (
    tester,
  ) async {
    await tester.pumpWidget(const MobilityApp(enableMapTiles: false));
    expect(find.text('Smart E-Mobility Hub'), findsOneWidget);
    expect(find.text('Đặt chỗ đỗ'), findsWidgets);
    await tester.tap(find.text('Bản đồ').last);
    await tester.pumpAndSettle();
    expect(find.text('Tìm Hub'), findsWidgets);
    expect(find.text('Đăng nhập để xem Hub'), findsOneWidget);
    await tester.tap(find.text('Thông báo').last);
    await tester.pumpAndSettle();
    expect(find.text('Tin tức và thông báo'), findsOneWidget);
    await tester.tap(find.text('Tài khoản').last);
    await tester.pumpAndSettle();
    expect(find.text('Đăng nhập'), findsOneWidget);
    await tester.tap(find.text('Trang chủ').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Đặt chỗ đỗ').first);
    await tester.pumpAndSettle();
    expect(find.text('Chào mừng trở lại'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
