import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter/foundation.dart';

import 'api.dart';
import 'parking.dart';

void main() => runApp(const MobilityApp());

const navy = Color(0xff10297a);
const blue = Color(0xff0753c9);
const cyan = Color(0xff00b3cf);
const ink = Color(0xff182b4c);

class MobilityApp extends StatelessWidget {
  final bool enableMapTiles;
  const MobilityApp({super.key, this.enableMapTiles = true});
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Smart E-Mobility Hub',
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: blue, primary: blue),
      scaffoldBackgroundColor: const Color(0xfff2f6fb),
      fontFamily: 'Roboto',
    ),
    home: AppShell(enableMapTiles: enableMapTiles),
  );
}

class AppShell extends StatefulWidget {
  final bool enableMapTiles;
  const AppShell({super.key, this.enableMapTiles = true});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int tab = 0;
  MobilityApi? api;
  Map<String, dynamic>? user;
  List<Map<String, dynamic>> hubs = [];
  String? loadError;
  static const configuredOrigin = String.fromEnvironment('MOBILITY_API_ORIGIN');

  @override
  void initState() {
    super.initState();
    final origin = configuredOrigin.isNotEmpty
        ? configuredOrigin
        : (kDebugMode ? 'http://127.0.0.1:3187' : '');
    if (origin.isNotEmpty) {
      try {
        api = MobilityApi(Uri.parse(origin));
      } catch (_) {
        loadError = 'Địa chỉ máy chủ không hợp lệ.';
      }
    }
  }

  @override
  void dispose() {
    api?.close();
    super.dispose();
  }

  Future<void> login() async {
    if (api == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Chưa cấu hình máy chủ.')));
      return;
    }
    final signedIn = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(builder: (_) => LoginPage(api: api!)),
    );
    if (!mounted || signedIn == null) return;
    setState(() {
      user = signedIn;
      hubs = [];
      loadError = null;
    });
    try {
      final found = await api!.hubs();
      if (mounted) setState(() => hubs = found);
    } catch (e) {
      if (mounted) setState(() => loadError = e.toString());
    }
  }

  Future<void> logout() async {
    try {
      await api!.logout();
      if (!mounted) return;
      setState(() {
        user = null;
        hubs = [];
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  void select(int value) => setState(() => tab = value);
  void open(String title, IconData icon, String description) {
    if (title == 'Đặt chỗ đỗ tại Hub' || title == 'Sạc xe') {
      if (user == null || api == null) {
        login();
        return;
      }
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ParkingPage(api: api!, charging: title == 'Sạc xe'),
        ),
      );
      return;
    }
    if (title == 'Thuê xe') {
      select(1);
      return;
    }
    if (title == 'Lịch sử sử dụng' && user != null && api != null) {
      Navigator.of(
        context,
      ).push(MaterialPageRoute<void>(builder: (_) => HistoryPage(api: api!)));
    } else {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              FeaturePage(title: title, icon: icon, description: description),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    resizeToAvoidBottomInset: false,
    body: SafeArea(
      bottom: false,
      child: IndexedStack(
        index: tab,
        children: [
          HomePage(onMap: () => select(1), onOpen: open),
          MapPage(
            hubs: hubs,
            loggedIn: user != null,
            onLogin: login,
            error: loadError,
            api: api,
            enableTiles: widget.enableMapTiles,
          ),
          const NotificationsPage(),
          AccountPage(
            onOpen: open,
            user: user,
            onLogin: login,
            onLogout: logout,
          ),
        ],
      ),
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: tab,
      onDestinationSelected: select,
      height: 72,
      backgroundColor: Colors.white,
      indicatorColor: const Color(0xffe4f8fb),
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home_rounded, color: cyan),
          label: 'Trang chủ',
        ),
        NavigationDestination(
          icon: Icon(Icons.map_outlined),
          selectedIcon: Icon(Icons.map_rounded, color: cyan),
          label: 'Bản đồ',
        ),
        NavigationDestination(
          icon: Icon(Icons.notifications_none_rounded),
          selectedIcon: Icon(Icons.notifications_rounded, color: cyan),
          label: 'Thông báo',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline_rounded),
          selectedIcon: Icon(Icons.person_rounded, color: cyan),
          label: 'Tài khoản',
        ),
      ],
    ),
  );
}

typedef OpenFeature = void Function(
  String title,
  IconData icon,
  String description,
);

class SkylineHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool home;
  const SkylineHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.home = false,
  });
  @override
  Widget build(BuildContext context) => Container(
    height: home ? 205 : 165,
    width: double.infinity,
    decoration: const BoxDecoration(
      color: navy,
      image: DecorationImage(
        image: AssetImage('assets/mobility-skyline.png'),
        fit: BoxFit.cover,
        alignment: Alignment.bottomCenter,
      ),
    ),
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
      child: home
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(
                  radius: 23,
                  backgroundColor: Colors.white,
                  child: Icon(Icons.bolt_rounded, color: blue, size: 32),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        subtitle ?? '',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xff082876),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: cyan),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.location_on_outlined,
                        size: 15,
                        color: Colors.white,
                      ),
                      SizedBox(width: 3),
                      Text(
                        'TP Hồ Chí Minh',
                        style: TextStyle(color: Colors.white, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            )
          : Align(
              alignment: Alignment.topCenter,
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 23,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
    ),
  );
}

class HomePage extends StatelessWidget {
  final VoidCallback onMap;
  final OpenFeature onOpen;
  const HomePage({super.key, required this.onMap, required this.onOpen});
  @override
  Widget build(BuildContext context) => CustomScrollView(
    slivers: [
      const SliverToBoxAdapter(
        child: SkylineHeader(
          title: 'Smart E-Mobility Hub',
          subtitle: 'Xin chào!',
          home: true,
        ),
      ),
      SliverToBoxAdapter(
        child: Transform.translate(
          offset: const Offset(0, -22),
          child: Container(
            padding: const EdgeInsets.fromLTRB(18, 22, 18, 30),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    QuickAction(
                      icon: Icons.location_on_outlined,
                      label: 'Tìm Hub',
                      color: const Color(0xff00a6b8),
                      onTap: onMap,
                    ),
                    QuickAction(
                      icon: Icons.electric_bike_rounded,
                      label: 'Thuê xe',
                      color: const Color(0xff27a65a),
                      onTap: () => onOpen(
                        'Thuê xe',
                        Icons.electric_bike_rounded,
                        'Chọn Hub và xe phù hợp cho chuyến đi.',
                      ),
                    ),
                    QuickAction(
                      icon: Icons.local_parking_rounded,
                      label: 'Đặt chỗ đỗ',
                      color: blue,
                      onTap: () => onOpen(
                        'Đặt chỗ đỗ tại Hub',
                        Icons.local_parking_rounded,
                        'Chọn Hub và tìm chỗ đỗ cho xe cá nhân.',
                      ),
                    ),
                    QuickAction(
                      icon: Icons.ev_station_rounded,
                      label: 'Sạc xe',
                      color: const Color(0xff22a557),
                      onTap: () => onOpen(
                        'Sạc xe',
                        Icons.ev_station_rounded,
                        'Gửi yêu cầu sạc cho xe đã đỗ tại Hub.',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                const SectionTitle('Dịch vụ'),
                const SizedBox(height: 15),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ServiceAction(
                      icon: Icons.electric_bike,
                      label: 'Xe điện',
                      color: blue,
                      onTap: () => onOpen(
                        'Thuê xe',
                        Icons.electric_bike,
                        'Chọn Hub và xe phù hợp cho chuyến đi.',
                      ),
                    ),
                    ServiceAction(
                      icon: Icons.local_parking_rounded,
                      label: 'Chỗ đỗ',
                      color: Colors.orange,
                      onTap: () => onOpen(
                        'Đặt chỗ đỗ tại Hub',
                        Icons.local_parking,
                        'Chọn Hub và tìm chỗ đỗ cho xe cá nhân.',
                      ),
                    ),
                    ServiceAction(
                      icon: Icons.ev_station_rounded,
                      label: 'Trạm sạc',
                      color: Colors.green,
                      onTap: () => onOpen(
                        'Sạc xe',
                        Icons.ev_station,
                        'Gửi yêu cầu sạc cho xe đã đỗ tại Hub.',
                      ),
                    ),
                    ServiceAction(
                      icon: Icons.history_rounded,
                      label: 'Lịch sử',
                      color: blue,
                      onTap: () => onOpen(
                        'Lịch sử sử dụng',
                        Icons.history,
                        'Các chuyến đi và giao dịch của bạn sẽ xuất hiện tại đây.',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                const SectionTitle('Hub gần bạn'),
                const SizedBox(height: 12),
                Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: onMap,
                    child: const Padding(
                      padding: EdgeInsets.all(16),
                      child: Row(
                        children: [
                          HubArtwork(),
                          SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Tìm Mobility Hub',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                    color: ink,
                                  ),
                                ),
                                SizedBox(height: 6),
                                Text(
                                  'Khám phá các Hub trong mạng lưới',
                                  style: TextStyle(
                                    color: Colors.blueGrey,
                                    fontSize: 13,
                                  ),
                                ),
                                SizedBox(height: 10),
                                Text(
                                  'Xem danh sách  →',
                                  style: TextStyle(
                                    color: blue,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 25),
                const SectionTitle('Thông tin mới'),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xffedf8f3),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.eco_rounded, color: Colors.green, size: 34),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Di chuyển xanh cùng Smart E-Mobility Hub',
                          style: TextStyle(
                            color: ink,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const DemoNote(),
              ],
            ),
          ),
        ),
      ),
    ],
  );
}

class QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const QuickAction({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => Expanded(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Column(
          children: [
            Material(
              color: const Color(0xfff3f8fc),
              elevation: 3,
              shadowColor: const Color(0x33759ab8),
              borderRadius: BorderRadius.circular(22),
              child: InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(22),
                child: SizedBox(
                  height: 69,
                  width: double.infinity,
                  child: Icon(icon, size: 35, color: color),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: ink,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class ServiceAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const ServiceAction({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => Expanded(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Column(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(icon, color: color, size: 30),
          ),
          const SizedBox(height: 7),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: ink,
            ),
          ),
        ],
      ),
    ),
  );
}

class SectionTitle extends StatelessWidget {
  final String title;
  const SectionTitle(this.title, {super.key});
  @override
  Widget build(BuildContext context) => Text(
    title,
    style: const TextStyle(
      color: ink,
      fontWeight: FontWeight.w800,
      fontSize: 20,
    ),
  );
}

class HubArtwork extends StatelessWidget {
  const HubArtwork({super.key});
  @override
  Widget build(BuildContext context) => Container(
    width: 95,
    height: 86,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(12),
      gradient: const LinearGradient(
        colors: [Color(0xff075ac9), Color(0xff15b5bf)],
      ),
    ),
    child: const Icon(
      Icons.electric_bike_rounded,
      size: 54,
      color: Colors.white,
    ),
  );
}

class DemoNote extends StatelessWidget {
  const DemoNote({super.key});
  @override
  Widget build(BuildContext context) => const Text(
    'Bản xem thiết kế · dữ liệu chỉ để minh họa',
    style: TextStyle(color: Colors.blueGrey, fontSize: 11),
  );
}

class MapPage extends StatefulWidget {
  final List<Map<String, dynamic>> hubs;
  final bool loggedIn;
  final VoidCallback onLogin;
  final String? error;
  final MobilityApi? api;
  final bool enableTiles;
  const MapPage({
    super.key,
    required this.hubs,
    required this.loggedIn,
    required this.onLogin,
    required this.error,
    required this.api,
    this.enableTiles = true,
  });
  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  String query = '';
  @override
  Widget build(BuildContext context) => Column(
    children: [
      const SkylineHeader(title: 'Bản đồ Hub'),
      Expanded(
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                onChanged: (value) =>
                    setState(() => query = value.toLowerCase()),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: 'Tìm Hub',
                  filled: true,
                  fillColor: const Color(0xfff4f7fa),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              HubMap(
                hubs: widget.hubs
                    .where(
                      (hub) =>
                          (hub['name'] as String).toLowerCase().contains(query),
                    )
                    .toList(),
                enableTiles: widget.enableTiles,
                onSelect: (hub) {
                  if (widget.api != null) {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            VehiclesPage(api: widget.api!, hub: hub),
                      ),
                    );
                  }
                },
              ),
              const SizedBox(height: 14),
              const SectionTitle('Danh sách Hub'),
              const SizedBox(height: 5),
              const Text(
                'Vị trí Hub chỉ mang tính minh họa',
                style: TextStyle(color: Colors.blueGrey, fontSize: 12),
              ),
              const SizedBox(height: 10),
              if (!widget.loggedIn)
                TextButton(
                  onPressed: widget.onLogin,
                  child: const Text('Đăng nhập để xem Hub'),
                )
              else if (widget.error != null)
                Text(widget.error!, style: const TextStyle(color: Colors.red)),
              Expanded(
                child: ListView(
                  children: widget.hubs
                      .where(
                        (hub) => (hub['name'] as String).toLowerCase().contains(
                          query,
                        ),
                      )
                      .map(
                        (hub) => Card(
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: Color(0xffe3f6f6),
                              child: Icon(
                                Icons.location_on_outlined,
                                color: cyan,
                              ),
                            ),
                            title: Text(
                              hub['name'] as String,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                            subtitle: const Text('Xem xe khả dụng'),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    VehiclesPage(api: widget.api!, hub: hub),
                              ),
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

// Approximate demo landmarks copied from ux/ui-development, not live positions.
const demoHubCoordinates = <String, LatLng>{
  'metro': LatLng(10.86639, 106.80111),
  'bku': LatLng(10.88022, 106.80570),
  'dorm-a': LatLng(10.87578, 106.80507),
  'library': LatLng(10.86977, 106.79620),
};

class HubMap extends StatelessWidget {
  final List<Map<String, dynamic>> hubs;
  final bool enableTiles;
  final void Function(Map<String, dynamic>) onSelect;
  const HubMap({
    super.key,
    required this.hubs,
    required this.enableTiles,
    required this.onSelect,
  });
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(16),
    child: SizedBox(
      height: MediaQuery.viewInsetsOf(context).bottom > 0
          ? 50
          : (MediaQuery.sizeOf(context).height < 700 ? 95 : 190),
      child: Stack(
        children: [
          const Positioned.fill(
            child: ColoredBox(
              color: Color(0xffeaf1f5),
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Text(
                    'Đang tải bản đồ. Nếu không thấy bản đồ, hãy kiểm tra kết nối Internet.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.blueGrey, fontSize: 12),
                  ),
                ),
              ),
            ),
          ),
          FlutterMap(
            options: const MapOptions(
              backgroundColor: Colors.transparent,
              initialCenter: LatLng(10.873, 106.802),
              initialZoom: 12.0,
              interactionOptions: InteractionOptions(
                flags:
                    InteractiveFlag.drag |
                    InteractiveFlag.pinchZoom |
                    InteractiveFlag.doubleTapZoom,
              ),
            ),
            children: [
              if (enableTiles)
                TileLayer(
                  urlTemplate: const String.fromEnvironment(
                    'MAP_TILE_URL',
                    defaultValue:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  ),
                  userAgentPackageName: 'vn.edu.vnuhcm.smart_mobility_design',
                  tileProvider: NetworkTileProvider(
                    headers: {
                      'User-Agent': 'SmartEMobilityHub/1.0 (vn.edu.vnuhcm.smart_mobility_design)',
                    },
                    silenceExceptions: true,
                  ),
                  panBuffer: 0,
                ),
              MarkerLayer(
                markers: [
                  for (final hub in hubs)
                    if (demoHubCoordinates.containsKey(hub['id']))
                      Marker(
                        key: ValueKey('hub-marker-${hub['id']}'),
                        point: demoHubCoordinates[hub['id']]!,
                        width: 42,
                        height: 42,
                        child: IconButton(
                          tooltip: hub['name'] as String,
                          padding: EdgeInsets.zero,
                          onPressed: () => onSelect(hub),
                          icon: const Icon(
                            Icons.location_on,
                            color: blue,
                            size: 38,
                          ),
                        ),
                      ),
                ],
              ),
            ],
          ),
          const Positioned(
            right: 4,
            bottom: 4,
            child: ColoredBox(
              color: Color(0xeaffffff),
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                child: Text(
                  '© OpenStreetMap contributors',
                  style: TextStyle(fontSize: 10, color: Colors.black87),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});
  @override
  Widget build(BuildContext context) => Column(
    children: [
      const SkylineHeader(title: 'Tin tức và thông báo'),
      Expanded(
        child: DefaultTabController(
          length: 2,
          initialIndex: 1,
          child: Column(
            children: [
              const Material(
                color: Colors.white,
                child: TabBar(
                  labelColor: navy,
                  indicatorColor: blue,
                  tabs: [
                    Tab(text: 'Tin tức'),
                    Tab(text: 'Thông báo'),
                  ],
                ),
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _noticeList(const [
                      Notice(
                        Icons.eco,
                        'Di chuyển xanh',
                        'Khám phá các dịch vụ của Smart E-Mobility Hub.',
                      ),
                    ]),
                    _noticeList(const [
                      Notice(
                        Icons.notifications_active_outlined,
                        'Chưa có thông báo',
                        'Các cập nhật về đặt xe và sạc sẽ xuất hiện tại đây.',
                      ),
                    ]),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );
  static Widget _noticeList(List<Notice> notices) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      ...notices,
      const Padding(padding: EdgeInsets.all(8), child: DemoNote()),
    ],
  );
}

class Notice extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;
  const Notice(this.icon, this.title, this.body, {super.key});
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xffe2f8f8),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: cyan),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: ink,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: const TextStyle(color: Colors.blueGrey, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class AccountPage extends StatelessWidget {
  final OpenFeature onOpen;
  final Map<String, dynamic>? user;
  final VoidCallback onLogin;
  final VoidCallback onLogout;
  const AccountPage({
    super.key,
    required this.onOpen,
    required this.user,
    required this.onLogin,
    required this.onLogout,
  });
  @override
  Widget build(BuildContext context) => ListView(
    children: [
      const SkylineHeader(title: 'Tài khoản'),
      Transform.translate(
        offset: const Offset(0, -32),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 43,
              backgroundColor: Colors.white,
              child: CircleAvatar(
                radius: 38,
                backgroundColor: navy,
                child: Icon(Icons.bolt_rounded, size: 48, color: Colors.white),
              ),
            ),
            const SizedBox(height: 15),
            if (user != null)
              Text(
                user!['id'] as String,
                style: const TextStyle(color: ink, fontWeight: FontWeight.w700),
              ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: user == null ? onLogin : onLogout,
              style: FilledButton.styleFrom(minimumSize: const Size(180, 48)),
              child: Text(user == null ? 'Đăng nhập' : 'Đăng xuất'),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Card(
                child: Column(
                  children: [
                    _row(Icons.person_outline, 'Thông tin cá nhân'),
                    _row(Icons.history, 'Lịch sử sử dụng'),
                    _row(Icons.settings_outlined, 'Cài đặt'),
                    _row(Icons.support_agent, 'Hỗ trợ'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 15),
            const DemoNote(),
          ],
        ),
      ),
    ],
  );
  Widget _row(IconData icon, String title) => ListTile(
    leading: Icon(icon, color: ink),
    title: Text(
      title,
      style: const TextStyle(color: ink, fontWeight: FontWeight.w600),
    ),
    trailing: const Icon(Icons.chevron_right),
    onTap: () => onOpen(
      title,
      icon,
      'Nội dung sẽ có khi ứng dụng được kết nối với hệ thống.',
    ),
  );
}

class FeaturePage extends StatefulWidget {
  final String title;
  final IconData icon;
  final String description;
  const FeaturePage({
    super.key,
    required this.title,
    required this.icon,
    required this.description,
  });
  @override
  State<FeaturePage> createState() => _FeaturePageState();
}

class _FeaturePageState extends State<FeaturePage> {
  String hub = 'Ga Metro ĐHQG';
  String slot = 'A01';
  static const hubs = [
    'Ga Metro ĐHQG',
    'ĐH Bách khoa · Cơ sở 2',
    'Ký túc xá khu A',
    'Thư viện Trung tâm',
  ];
  void notice() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Bản xem thiết kế chưa kết nối hệ thống.')),
  );
  Widget get hubPicker => DropdownButtonFormField<String>(
    initialValue: hub,
    decoration: const InputDecoration(
      labelText: 'Chọn Hub',
      prefixIcon: Icon(Icons.location_on_outlined),
      border: OutlineInputBorder(),
    ),
    items: hubs
        .map(
          (h) => DropdownMenuItem(
            value: h,
            child: Text(h, overflow: TextOverflow.ellipsis),
          ),
        )
        .toList(),
    onChanged: (value) => setState(() => hub = value!),
  );
  Widget get actionButton => SizedBox(
    width: double.infinity,
    height: 49,
    child: FilledButton(
      onPressed: notice,
      child: Text(
        widget.title == 'Sạc xe'
            ? 'Gửi yêu cầu sạc'
            : widget.title == 'Thuê xe'
            ? 'Chọn xe'
            : 'Xác nhận đặt chỗ',
      ),
    ),
  );
  @override
  Widget build(BuildContext context) {
    final isParking = widget.title == 'Đặt chỗ đỗ tại Hub';
    final isCharging = widget.title == 'Sạc xe';
    final isRental = widget.title == 'Thuê xe';
    final isService = isParking || isCharging || isRental;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: navy,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 27,
                      backgroundColor: const Color(0xffe0f5f6),
                      child: Icon(widget.icon, size: 29, color: cyan),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        widget.title,
                        style: const TextStyle(
                          color: ink,
                          fontWeight: FontWeight.w800,
                          fontSize: 19,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  widget.description,
                  style: const TextStyle(color: Colors.blueGrey, height: 1.4),
                ),
                if (isService) ...[
                  const SizedBox(height: 22),
                  hubPicker,
                  const SizedBox(height: 18),
                  if (isParking) ...[
                    const Text(
                      'Chọn chỗ đỗ',
                      style: TextStyle(fontWeight: FontWeight.w700, color: ink),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      children: ['A01', 'A02', 'A03', 'A04']
                          .map(
                            (value) => ChoiceChip(
                              label: Text(value),
                              selected: value == slot,
                              onSelected: (_) => setState(() => slot = value),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 18),
                    const TextField(
                      decoration: InputDecoration(
                        labelText: 'Mã xe cá nhân',
                        prefixIcon: Icon(Icons.directions_bike_outlined),
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                  if (isCharging) ...[
                    const TextField(
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Mức pin mong muốn (%)',
                        prefixIcon: Icon(Icons.battery_charging_full),
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Yêu cầu sạc cần có xe cá nhân đã đỗ tại Hub.',
                      style: TextStyle(color: Colors.blueGrey, fontSize: 12),
                    ),
                  ],
                  if (isRental) ...[
                    const Text(
                      'Phương tiện',
                      style: TextStyle(fontWeight: FontWeight.w700, color: ink),
                    ),
                    const SizedBox(height: 10),
                    const ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: Color(0xffe4f6ef),
                        child: Icon(Icons.electric_bike, color: Colors.green),
                      ),
                      title: Text('Xe đạp điện'),
                      subtitle: Text('Danh sách minh họa'),
                    ),
                    const ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: Color(0xffe4f0ff),
                        child: Icon(Icons.electric_moped, color: blue),
                      ),
                      title: Text('Xe máy điện'),
                      subtitle: Text('Danh sách minh họa'),
                    ),
                  ],
                  const SizedBox(height: 22),
                  actionButton,
                ] else if (widget.title == 'Đăng nhập') ...[
                  const SizedBox(height: 20),
                  const Text(
                    'Đăng nhập sẽ được bật sau khi kết nối hệ thống.',
                    style: TextStyle(color: Colors.blueGrey),
                  ),
                ] else ...[
                  const SizedBox(height: 20),
                  const Text(
                    'Chưa có dữ liệu để hiển thị.',
                    style: TextStyle(color: Colors.blueGrey),
                  ),
                ],
              ],
            ),
          ),
          const Padding(padding: EdgeInsets.all(14), child: DemoNote()),
        ],
      ),
    );
  }
}

class LoginPage extends StatefulWidget {
  final MobilityApi api;
  const LoginPage({super.key, required this.api});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final username = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String? error;
  @override
  void dispose() {
    username.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (username.text.trim().isEmpty || password.text.isEmpty || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final user = await widget.api.login(username.text.trim(), password.text);
      if (!(user['roles'] as List).contains('user')) {
        await widget.api.logout();
        throw ApiFailure(
          'FORBIDDEN_OPERATION',
          'Tài khoản không có quyền người dùng.',
        );
      }
      if (mounted) {
        FocusManager.instance.primaryFocus?.unfocus();
        Navigator.of(context).pop(user);
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Đăng nhập'),
      backgroundColor: navy,
      foregroundColor: Colors.white,
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Chào mừng trở lại',
                  style: TextStyle(
                    color: ink,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Đăng nhập bằng tài khoản đã được cấp.',
                  style: TextStyle(color: Colors.blueGrey),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: username,
                  enabled: !busy,
                  autofillHints: const [AutofillHints.username],
                  decoration: const InputDecoration(
                    labelText: 'Tài khoản',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: password,
                  enabled: !busy,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  onSubmitted: (_) => submit(),
                  decoration: const InputDecoration(
                    labelText: 'Mật khẩu',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(
                      error!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: busy ? null : submit,
                  child: Text(busy ? 'Đang đăng nhập…' : 'Đăng nhập'),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

class VehiclesPage extends StatefulWidget {
  final MobilityApi api;
  final Map<String, dynamic> hub;
  const VehiclesPage({super.key, required this.api, required this.hub});
  @override
  State<VehiclesPage> createState() => _VehiclesPageState();
}

class _VehiclesPageState extends State<VehiclesPage> {
  late Future<List<Map<String, dynamic>>> vehicles;
  bool busy = false;
  bool pending = false;
  String? error;
  @override
  void initState() {
    super.initState();
    refresh();
  }

  void refresh() {
    vehicles = widget.api.vehicles(widget.hub['id'] as String);
    widget.api
        .hasPendingWrite()
        .then((value) {
          if (mounted) setState(() => pending = value);
        })
        .catchError((Object e) {
          if (mounted) setState(() => error = e.toString());
        });
  }

  Future<void> reserve(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xác nhận giữ xe'),
        content: Text(
          'Giữ xe $id tại ${widget.hub['name']}? Thời hạn giữ xe do hệ thống xác nhận.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Quay lại'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xác nhận giữ xe'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await submit(() => widget.api.reserve(widget.hub['id'] as String, id));
  }

  Future<void> submit(Future<Map<String, dynamic>> Function() action) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await action();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(
            result['ticketCode'] != null ? 'Đã giữ xe' : 'Đã hoàn tất yêu cầu',
          ),
          content: Text(
            result['ticketCode'] != null
                ? 'Xe: ${result['vehicleId']}\nMã phiếu: ${result['ticketCode']}\nHạn nhận: ${result['expiresAt']}'
                : 'Trạng thái: ${result['status'] ?? 'Đã cập nhật'}. Xem lịch sử để kiểm tra.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Đóng'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) error = e.toString();
    } finally {
      if (mounted) {
        setState(() {
          busy = false;
          refresh();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.hub['name'] as String),
      backgroundColor: navy,
      foregroundColor: Colors.white,
    ),
    body: FutureBuilder<List<Map<String, dynamic>>>(
      future: vehicles,
      builder: (context, snapshot) {
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (pending)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Yêu cầu trước chưa rõ kết quả. Thử lại an toàn để lấy kết quả.',
                        style: TextStyle(color: ink),
                      ),
                      const SizedBox(height: 8),
                      FilledButton(
                        onPressed: busy
                            ? null
                            : () => submit(widget.api.retryPendingWrite),
                        child: const Text('Thử lại yêu cầu trước'),
                      ),
                    ],
                  ),
                ),
              ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(error!, style: const TextStyle(color: Colors.red)),
              ),
            const SectionTitle('Xe khả dụng'),
            const SizedBox(height: 10),
            if (!snapshot.hasData && !snapshot.hasError)
              const Center(child: CircularProgressIndicator()),
            if (snapshot.hasError) Text(snapshot.error.toString()),
            if (snapshot.hasData && snapshot.data!.isEmpty)
              const Text('Hiện không có xe khả dụng.'),
            if (snapshot.hasData)
              ...snapshot.data!.map(
                (vehicle) => Card(
                  child: ListTile(
                    leading: const CircleAvatar(
                      child: Icon(Icons.electric_bike),
                    ),
                    title: Text(vehicle['id'] as String),
                    subtitle: Text('Pin ${vehicle['batteryPercent']}%'),
                    trailing: FilledButton(
                      onPressed: busy || pending
                          ? null
                          : () => reserve(vehicle['id'] as String),
                      child: const Text('Đặt xe'),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}

class HistoryPage extends StatefulWidget {
  final MobilityApi api;
  const HistoryPage({super.key, required this.api});
  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  late Future<List<List<Map<String, dynamic>>>> records;
  bool busy = false;
  bool pending = false;
  String? message;
  @override
  void initState() {
    super.initState();
    refresh();
  }

  void refresh() {
    records = Future.wait([widget.api.reservations(), widget.api.trips()]);
    widget.api
        .hasPendingWrite()
        .then((value) {
          if (mounted) setState(() => pending = value);
        })
        .catchError((Object e) {
          if (mounted) setState(() => message = e.toString());
        });
  }

  Future<void> command(Future<Map<String, dynamic>> Function() action) async {
    if (busy) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      await action();
      if (mounted) message = 'Đã cập nhật trạng thái.';
    } catch (e) {
      if (mounted) message = e.toString();
    } finally {
      if (mounted) {
        setState(() {
          busy = false;
          refresh();
        });
      }
    }
  }

  Future<void> pickup(Map<String, dynamic> record) async {
    var input = '';
    final code = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nhận phương tiện'),
        content: TextField(
          onChanged: (value) => input = value,
          autofocus: true,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(labelText: 'Nhập mã trên xe'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Quay lại'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, input.trim()),
            child: const Text('Xác nhận nhận xe'),
          ),
        ],
      ),
    );
    if (code != null && code.isNotEmpty) {
      await command(() => widget.api.pickup(record['id'] as String, code));
    }
  }

  Future<void> cancel(Map<String, dynamic> record) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hủy giữ xe?'),
        content: const Text('Xe sẽ được trả lại danh sách khả dụng.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Quay lại'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Hủy giữ xe'),
          ),
        ],
      ),
    );
    if (yes == true) {
      await command(() => widget.api.cancelReservation(record['id'] as String));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Phiếu và chuyến của tôi'),
      backgroundColor: navy,
      foregroundColor: Colors.white,
      actions: [
        IconButton(
          tooltip: 'Tải lại',
          onPressed: busy ? null : () => setState(refresh),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: FutureBuilder<List<List<Map<String, dynamic>>>>(
      future: records,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Center(child: Text(snapshot.error.toString()));
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final reservations = snapshot.data![0];
        final trips = snapshot.data![1];
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (pending)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Yêu cầu trước chưa rõ kết quả. Thử lại an toàn trước khi tiếp tục.',
                      ),
                      FilledButton(
                        onPressed: busy
                            ? null
                            : () => command(widget.api.retryPendingWrite),
                        child: const Text('Thử lại yêu cầu trước'),
                      ),
                    ],
                  ),
                ),
              ),
            if (message != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(message!, style: const TextStyle(color: blue)),
              ),
            const SectionTitle('Phiếu giữ xe'),
            const SizedBox(height: 10),
            if (reservations.isEmpty) const Text('Bạn chưa có phiếu giữ xe.'),
            ...reservations.map(
              (record) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        record['vehicleId']?.toString() ?? 'Xe',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: ink,
                        ),
                      ),
                      Text('Trạng thái: ${record['status']}'),
                      if (record['ticketCode'] != null)
                        Text('Mã phiếu: ${record['ticketCode']}'),
                      if (record['expiresAt'] != null)
                        Text('Hạn nhận: ${record['expiresAt']}'),
                      if (record['status'] == 'Reserved')
                        Wrap(
                          spacing: 8,
                          children: [
                            FilledButton(
                              onPressed: busy || pending
                                  ? null
                                  : () => pickup(record),
                              child: const Text('Nhận xe'),
                            ),
                            OutlinedButton(
                              onPressed: busy || pending
                                  ? null
                                  : () => cancel(record),
                              child: const Text('Hủy giữ xe'),
                            ),
                          ],
                        ),
                      if (record['status'] == 'PickupClaimed' ||
                          record['status'] == 'PickupUncertain')
                        const Text(
                          'Đang chờ xác nhận thiết bị. Thử lại yêu cầu cũ trên thiết bị đã gửi.',
                        ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 22),
            const SectionTitle('Chuyến đi'),
            const SizedBox(height: 10),
            if (trips.isEmpty) const Text('Bạn chưa có chuyến đi.'),
            ...trips.map(
              (trip) => Card(
                child: ListTile(
                  leading: const Icon(Icons.electric_bike, color: cyan),
                  title: Text(trip['vehicleId']?.toString() ?? 'Xe'),
                  subtitle: Text('Trạng thái: ${trip['status']}'),
                  trailing: trip['status'] == 'Active'
                      ? TextButton(
                          onPressed: busy || pending
                              ? null
                              : () async {
                                  await Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => ReturnPage(
                                        api: widget.api,
                                        tripId: trip['id'] as String,
                                      ),
                                    ),
                                  );
                                  if (mounted) setState(refresh);
                                },
                          child: const Text('Trả xe'),
                        )
                      : null,
                ),
              ),
            ),
          ],
        );
      },
    ),
  );
}

class ReturnPage extends StatefulWidget {
  final MobilityApi api;
  final String tripId;
  const ReturnPage({super.key, required this.api, required this.tripId});
  @override
  State<ReturnPage> createState() => _ReturnPageState();
}

class _ReturnPageState extends State<ReturnPage> {
  late Future<List<dynamic>> details;
  List<Map<String, dynamic>> slots = [];
  String? hubId;
  String? slotId;
  String? error;
  bool checked = false;
  bool slotsChecked = false;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    details = Future.wait([widget.api.trip(widget.tripId), widget.api.hubs()]);
  }

  Future<void> loadSlots() async {
    if (hubId == null) return;
    setState(() {
      busy = true;
      error = null;
      slots = [];
      slotsChecked = false;
      slotId = null;
    });
    try {
      final result = await widget.api.returnSlots(hubId!, widget.tripId);
      if (mounted) {
        setState(() {
          slots = result;
          slotsChecked = true;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> submit() async {
    if (hubId == null || slotId == null || !checked || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.api.returnTrip(widget.tripId, hubId!, slotId!);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Trả phương tiện'),
      backgroundColor: navy,
      foregroundColor: Colors.white,
    ),
    body: FutureBuilder<List<dynamic>>(
      future: details,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Center(child: Text(snapshot.error.toString()));
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final trip = snapshot.data![0] as Map<String, dynamic>;
        final hubs = snapshot.data![1] as List<Map<String, dynamic>>;
        if (trip['pendingReturn'] != null) {
          return const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'Chuyến đang có yêu cầu trả xe chờ đối soát. Hãy thử lại yêu cầu cũ trên thiết bị đã gửi.',
            ),
          );
        }
        return ListView(
          padding: const EdgeInsets.all(18),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Xe ${trip['vehicleId']}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                        color: ink,
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: hubId,
                      decoration: const InputDecoration(
                        labelText: 'Hub trả xe',
                        border: OutlineInputBorder(),
                      ),
                      items: hubs
                          .map(
                            (hub) => DropdownMenuItem(
                              value: hub['id'] as String,
                              child: Text(
                                hub['name'] as String,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: busy
                          ? null
                          : (value) => setState(() {
                              hubId = value;
                              slotId = null;
                              slots = [];
                              slotsChecked = false;
                            }),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: busy || hubId == null ? null : loadSlots,
                      child: const Text('Kiểm tra chỗ trả'),
                    ),
                    if (slotsChecked) Text('${slots.length} chỗ khả dụng'),
                    DropdownButtonFormField<String>(
                      initialValue: slotId,
                      decoration: const InputDecoration(
                        labelText: 'Chỗ trả',
                        border: OutlineInputBorder(),
                      ),
                      items: slots
                          .map(
                            (slot) => DropdownMenuItem(
                              value: slot['id'] as String,
                              child: Text(
                                slot['code']?.toString() ??
                                    slot['id'].toString(),
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: busy
                          ? null
                          : (value) => setState(() => slotId = value),
                    ),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: checked,
                      onChanged: busy
                          ? null
                          : (value) => setState(() => checked = value ?? false),
                      title: const Text(
                        'Tôi đã đưa xe vào đúng chỗ và khóa an toàn.',
                      ),
                    ),
                    if (error != null)
                      Text(error!, style: const TextStyle(color: Colors.red)),
                    FilledButton(
                      onPressed: busy || slotId == null || !checked
                          ? null
                          : submit,
                      child: const Text('Xác nhận trả xe'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    ),
  );
}
