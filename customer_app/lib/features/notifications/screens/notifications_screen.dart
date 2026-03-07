import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';

final notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(dioProvider);
  final res = await dio.get('/notifications');
  return res.data as List<dynamic>;
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifs = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: notifs.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.notifications_none, size: 56, color: Colors.white38),
                  SizedBox(height: 12),
                  Text('No notifications yet', style: TextStyle(color: Colors.white54)),
                ],
              ),
            );
          }
          return ListView.separated(
            itemCount: list.length,
            separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFF2a2a3a)),
            itemBuilder: (context, i) {
              final n = list[i];
              final isRead = n['readAt'] != null;
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: isRead
                      ? const Color(0xFF2a2a3a)
                      : const Color(0xFFf59e0b).withOpacity(0.15),
                  child: Icon(
                    Icons.notifications,
                    color: isRead ? Colors.white38 : const Color(0xFFf59e0b),
                    size: 20,
                  ),
                ),
                title: Text(
                  n['title'] ?? '',
                  style: TextStyle(
                    color: isRead ? Colors.white60 : Colors.white,
                    fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                  ),
                ),
                subtitle: Text(
                  n['body'] ?? '',
                  style: const TextStyle(color: Colors.white54, fontSize: 13),
                ),
                trailing: !isRead
                    ? const SizedBox(
                        width: 8,
                        height: 8,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: Color(0xFFf59e0b),
                            shape: BoxShape.circle,
                          ),
                        ),
                      )
                    : null,
                onTap: isRead
                    ? null
                    : () async {
                        try {
                          final dio = ref.read(dioProvider);
                          await dio.patch('/notifications/${n['id']}/read');
                          ref.invalidate(notificationsProvider);
                        } catch (_) {}
                      },
              );
            },
          );
        },
      ),
    );
  }
}
