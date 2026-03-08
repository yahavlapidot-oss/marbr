import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/otp_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../features/discover/screens/discover_screen.dart';
import '../features/campaigns/screens/campaign_detail_screen.dart';
import '../features/scan/screens/scan_screen.dart';
import '../features/rewards/screens/my_rewards_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/notifications/screens/notifications_screen.dart';
import '../features/favorites/screens/favorites_screen.dart';
import '../features/history/screens/history_screen.dart';
import '../features/settings/screens/settings_screen.dart';
import '../features/shell/shell_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) async {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'accessToken');
      final isAuth = token != null;
      final isAuthRoute =
          state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/otp');
      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/otp',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>;
          return OtpScreen(
            target: extra['target'] as String,
            devCode: extra['devCode'] as String?,
          );
        },
      ),
      ShellRoute(
        builder: (context, state, child) => ShellScreen(child: child),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/discover', builder: (_, __) => const DiscoverScreen()),
          GoRoute(path: '/scan', builder: (_, __) => const ScanScreen()),
          GoRoute(path: '/rewards', builder: (_, __) => const MyRewardsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/favorites', builder: (_, __) => const FavoritesScreen()),
          GoRoute(path: '/history', builder: (_, __) => const HistoryScreen()),
          GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
        ],
      ),
      GoRoute(
        path: '/campaign/:id',
        builder: (_, state) => CampaignDetailScreen(id: state.pathParameters['id']!),
      ),
    ],
  );
});
