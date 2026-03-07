import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';

final entryHistoryProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(dioProvider);
  final res = await dio.get('/entries?mine=true');
  return res.data as List<dynamic>;
});

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entries = ref.watch(entryHistoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Entry History')),
      body: entries.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.history, size: 56, color: Colors.white38),
                  SizedBox(height: 12),
                  Text('No entries yet', style: TextStyle(color: Colors.white54)),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final e = list[i];
              final campaign = e['campaign'];
              final createdAt = e['createdAt'] != null
                  ? DateTime.tryParse(e['createdAt'])
                  : null;

              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFF1e1e2e),
                    child: Icon(Icons.confirmation_number_outlined, color: Color(0xFFf59e0b), size: 20),
                  ),
                  title: Text(
                    campaign?['name'] ?? 'Campaign',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (e['branch']?['name'] != null)
                        Text(
                          e['branch']['name'],
                          style: const TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                      if (createdAt != null)
                        Text(
                          '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                          style: const TextStyle(color: Colors.white38, fontSize: 11),
                        ),
                    ],
                  ),
                  trailing: e['won'] == true
                      ? const Chip(
                          label: Text('Won!', style: TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.bold)),
                          backgroundColor: Color(0xFFf59e0b),
                          padding: EdgeInsets.zero,
                        )
                      : null,
                ),
              );
            },
          );
        },
      ),
    );
  }
}
