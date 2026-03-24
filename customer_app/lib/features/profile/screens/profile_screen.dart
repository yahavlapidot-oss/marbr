import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/router.dart' show authNotifierProvider;
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

final profileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await createDio().get('/me');
  return Map<String, dynamic>.from(res.data);
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final profile = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (user) => _ProfileContent(user: user, ref: ref, t: t),
      ),
    );
  }
}

class _ProfileContent extends StatelessWidget {
  final Map<String, dynamic> user;
  final WidgetRef ref;
  final String Function(String) t;
  const _ProfileContent({required this.user, required this.ref, required this.t});

  @override
  Widget build(BuildContext context) {
    final initials = ((user['fullName'] as String?)?.isNotEmpty == true)
        ? (user['fullName'] as String).substring(0, 1).toUpperCase()
        : 'U';
    final entriesCount = user['_count']?['entries'] ?? 0;
    final winsCount = user['_count']?['userRewards'] ?? 0;

    return SafeArea(
      child: SingleChildScrollView(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(t('profile'),
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppTheme.white,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    )),
                  GestureDetector(
                    onTap: () => context.go('/settings'),
                    child: Container(
                      width: 42, height: 42,
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Icon(Icons.settings_outlined, color: AppTheme.subtle, size: 20),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Avatar + name
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: AppTheme.gold.withAlpha(20),
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.gold.withAlpha(60), width: 2),
              ),
              child: Center(
                child: Text(initials,
                  style: const TextStyle(color: AppTheme.gold, fontSize: 32, fontWeight: FontWeight.w800)),
              ),
            ),
            const SizedBox(height: 14),
            Text(user['fullName'] ?? '',
              style: const TextStyle(color: AppTheme.white, fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(user['email'] ?? user['phone'] ?? '',
              style: const TextStyle(color: AppTheme.muted, fontSize: 14)),

            const SizedBox(height: 28),

            // Stats row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  _StatBox(value: '$entriesCount', label: t('raffles_entered'), icon: Icons.confirmation_number_outlined),
                  const SizedBox(width: 12),
                  _StatBox(value: '$winsCount', label: t('prizes_won'), icon: Icons.emoji_events_outlined),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Menu
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(t('account'),
                      style: const TextStyle(color: AppTheme.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                  ),
                  _MenuTile(icon: Icons.history, label: t('participation'), onTap: () => context.go('/history')),
                  _MenuTile(icon: Icons.notifications_outlined, label: t('notifications_menu'), onTap: () => context.go('/notifications')),
                  _MenuTile(icon: Icons.favorite_outline, label: t('favorite_venues'), onTap: () => context.go('/favorites')),

                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(t('more'),
                      style: const TextStyle(color: AppTheme.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                  ),
                  _MenuTile(icon: Icons.settings_outlined, label: t('settings'), onTap: () => context.go('/settings')),
                  _MenuTile(
                    icon: Icons.logout,
                    label: t('sign_out'),
                    destructive: true,
                    onTap: () async {
                      await const FlutterSecureStorage().deleteAll();
                      ref.read(authNotifierProvider).clear();
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  const _StatBox({required this.value, required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppTheme.gold, size: 22),
            const SizedBox(height: 8),
            Text(value,
              style: const TextStyle(color: AppTheme.white, fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(label,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.muted, fontSize: 10, letterSpacing: 0.8, height: 1.4)),
          ],
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;
  const _MenuTile({required this.icon, required this.label, required this.onTap, this.destructive = false});

  @override
  Widget build(BuildContext context) {
    final color = destructive ? Colors.redAccent : AppTheme.white;
    final iconColor = destructive ? Colors.redAccent : AppTheme.subtle;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: destructive ? Colors.redAccent.withAlpha(40) : AppTheme.border,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: iconColor, size: 20),
              const SizedBox(width: 14),
              Expanded(child: Text(label, style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.w500))),
              Icon(Icons.chevron_right, color: destructive ? Colors.redAccent.withAlpha(100) : AppTheme.muted, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
