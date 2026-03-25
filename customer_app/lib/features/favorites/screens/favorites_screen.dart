import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

final favoritesProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await createDio().get('/me/favorites');
  return res.data as List<dynamic>;
});

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final favs = ref.watch(favoritesProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
        title: Text(t('favorites_title')),
      ),
      body: favs.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off, color: AppTheme.muted, size: 40),
              const SizedBox(height: 12),
              Text(t('could_not_load_fav'),
                style: const TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.refresh(favoritesProvider),
                child: Text(t('retry'), style: const TextStyle(color: AppTheme.gold)),
              ),
            ],
          ),
        ),
        data: (list) {
          if (list.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.favorite_border, size: 48, color: AppTheme.muted),
                  const SizedBox(height: 12),
                  Text(t('no_favorites'),
                    style: const TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(t('save_venues'),
                    style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            color: AppTheme.gold,
            onRefresh: () => ref.refresh(favoritesProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final b = list[i]['business'] ?? list[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48, height: 48,
                          decoration: BoxDecoration(
                            color: AppTheme.gold.withAlpha(20),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: b['logoUrl'] != null
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(b['logoUrl'], fit: BoxFit.cover))
                              : const Icon(Icons.local_bar, color: AppTheme.gold, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(b['name'] ?? '',
                                style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w700, fontSize: 15)),
                              if (b['description'] != null) ...[
                                const SizedBox(height: 2),
                                Text(b['description'],
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                              ],
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () async {
                            try {
                              await createDio().patch('/me/favorites/${b['id']}');
                              ref.invalidate(favoritesProvider);
                            } catch (_) {}
                          },
                          child: Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(
                              color: AppTheme.gold.withAlpha(15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.favorite, color: AppTheme.gold, size: 18),
                          ),
                        ),
                      ],
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
}
