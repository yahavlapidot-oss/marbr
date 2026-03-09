import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

final notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await createDio().get('/me/notifications');
  return res.data as List<dynamic>;
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifs = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: const Text('Notifications'),
      ),
      body: notifs.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off, color: AppTheme.muted, size: 40),
              const SizedBox(height: 12),
              const Text('Could not load notifications',
                style: TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.refresh(notificationsProvider),
                child: const Text('Retry', style: TextStyle(color: AppTheme.gold)),
              ),
            ],
          ),
        ),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.notifications_none, size: 48, color: AppTheme.muted),
                  SizedBox(height: 12),
                  Text('No notifications yet',
                    style: TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
                  SizedBox(height: 4),
                  Text('You\'ll see campaign alerts and win notices here',
                    style: TextStyle(color: AppTheme.muted, fontSize: 13)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            color: AppTheme.gold,
            onRefresh: () => ref.refresh(notificationsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final n = list[i];
                final isRead = n['readAt'] != null;
                final createdAt = n['createdAt'] != null
                    ? DateTime.tryParse(n['createdAt'])
                    : null;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: GestureDetector(
                    onTap: isRead ? null : () async {
                      try {
                        await createDio().patch('/notifications/${n['id']}/read');
                        ref.invalidate(notificationsProvider);
                      } catch (_) {}
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isRead ? AppTheme.card : AppTheme.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isRead ? AppTheme.border : AppTheme.gold.withAlpha(60),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 38, height: 38,
                            decoration: BoxDecoration(
                              color: isRead ? AppTheme.surface : AppTheme.gold.withAlpha(20),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(Icons.notifications,
                              color: isRead ? AppTheme.muted : AppTheme.gold, size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(n['title'] ?? '',
                                  style: TextStyle(
                                    color: isRead ? AppTheme.subtle : AppTheme.white,
                                    fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                                    fontSize: 14,
                                  )),
                                if (n['body'] != null) ...[
                                  const SizedBox(height: 3),
                                  Text(n['body'],
                                    style: const TextStyle(color: AppTheme.muted, fontSize: 13, height: 1.4)),
                                ],
                                if (createdAt != null) ...[
                                  const SizedBox(height: 6),
                                  Text(_formatTime(createdAt),
                                    style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                                ],
                              ],
                            ),
                          ),
                          if (!isRead)
                            Container(
                              width: 8, height: 8,
                              margin: const EdgeInsets.only(top: 4, left: 8),
                              decoration: const BoxDecoration(color: AppTheme.gold, shape: BoxShape.circle),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
