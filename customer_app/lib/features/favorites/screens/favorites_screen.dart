import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';

final favoritesProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.read(dioProvider);
  final res = await dio.get('/users/me/favorites');
  return res.data as List<dynamic>;
});

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favs = ref.watch(favoritesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Favorites')),
      body: favs.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.favorite_border, size: 56, color: Colors.white38),
                  SizedBox(height: 12),
                  Text('No favorites yet', style: TextStyle(color: Colors.white54)),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, i) {
              final b = list[i]['business'] ?? list[i];
              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: b['logoUrl'] != null
                      ? CircleAvatar(backgroundImage: NetworkImage(b['logoUrl']))
                      : CircleAvatar(
                          backgroundColor: const Color(0xFFf59e0b).withOpacity(0.15),
                          child: const Icon(Icons.local_bar, color: Color(0xFFf59e0b)),
                        ),
                  title: Text(b['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Text(b['description'] ?? '', style: const TextStyle(color: Colors.white54, fontSize: 13)),
                  trailing: IconButton(
                    icon: const Icon(Icons.favorite, color: Color(0xFFf59e0b)),
                    onPressed: () async {
                      try {
                        final dio = ref.read(dioProvider);
                        await dio.delete('/businesses/${b['id']}/favorite');
                        ref.invalidate(favoritesProvider);
                      } catch (_) {}
                    },
                  ),
                  onTap: () => context.push('/campaigns'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
