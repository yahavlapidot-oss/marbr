import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

final profileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await createDio().get('/me');
  return Map<String, dynamic>.from(res.data);
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.amber)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (user) => SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              CircleAvatar(
                radius: 44,
                backgroundColor: AppTheme.amber.withOpacity(0.15),
                child: Text(
                  (user['fullName'] as String? ?? 'U').substring(0, 1).toUpperCase(),
                  style: const TextStyle(color: AppTheme.amber, fontSize: 32, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 12),
              Text(user['fullName'] ?? '', style: const TextStyle(color: AppTheme.white, fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(user['email'] ?? user['phone'] ?? '', style: const TextStyle(color: AppTheme.muted)),
              const SizedBox(height: 32),
              _tile(context, Icons.history, 'Participation History', '/history'),
              _tile(context, Icons.notifications_outlined, 'Notifications', '/notifications'),
              _tile(context, Icons.favorite_outline, 'Favorite Venues', '/favorites'),
              _tile(context, Icons.settings_outlined, 'Settings', '/settings'),
              const SizedBox(height: 16),
              ListTile(
                tileColor: AppTheme.card,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.redAccent.withOpacity(0.3)),
                ),
                leading: const Icon(Icons.logout, color: Colors.redAccent),
                title: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
                onTap: () async {
                  await const FlutterSecureStorage().deleteAll();
                  if (context.mounted) context.go('/login');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String label, String route) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        tileColor: AppTheme.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppTheme.border),
        ),
        leading: Icon(icon, color: AppTheme.subtle),
        title: Text(label, style: const TextStyle(color: AppTheme.white)),
        trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
        onTap: () => context.go(route),
      ),
    );
  }
}
