import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/otp_screen.dart';
import '../features/auth/screens/register_screen.dart';
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

/// Holds auth token in memory and notifies GoRouter when it changes.
class AuthNotifier extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();
  static AuthNotifier? instance;

  String? _token;
  bool _initialized = false;

  bool get isAuthenticated => _token != null;
  bool get initialized => _initialized;

  AuthNotifier() {
    instance = this;
    _load();
  }

  Future<void> _load() async {
    _token = await _storage.read(key: 'accessToken');
    _initialized = true;
    notifyListeners();
  }

  Future<void> setToken(String token) async {
    _token = token;
    notifyListeners();
  }

  Future<void> clear() async {
    _token = null;
    notifyListeners();
  }
}

final authNotifierProvider = ChangeNotifierProvider<AuthNotifier>((_) => AuthNotifier());

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.read(authNotifierProvider);

  return GoRouter(
    initialLocation: '/home',
    refreshListenable: auth,
    redirect: (context, state) {
      if (!auth.initialized) return null;
      final isAuth = auth.isAuthenticated;
      final isAuthRoute =
          state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/otp') ||
          state.matchedLocation.startsWith('/register');
      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, _) => const RegisterScreen()),
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
          GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
          GoRoute(path: '/discover', builder: (_, _) => const DiscoverScreen()),
          GoRoute(path: '/scan', builder: (_, _) => const ScanScreen()),
          GoRoute(path: '/rewards', builder: (_, _) => const MyRewardsScreen()),
          GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
          GoRoute(path: '/notifications', builder: (_, _) => const NotificationsScreen()),
          GoRoute(path: '/favorites', builder: (_, _) => const FavoritesScreen()),
          GoRoute(path: '/history', builder: (_, _) => const HistoryScreen()),
          GoRoute(path: '/settings', builder: (_, _) => const SettingsScreen()),
        ],
      ),
      GoRoute(
        path: '/campaign/:id',
        builder: (_, state) => CampaignDetailScreen(id: state.pathParameters['id']!),
      ),
    ],
  );
});
