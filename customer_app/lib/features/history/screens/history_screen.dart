import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

final entryHistoryProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await createDio().get('/entries?mine=true');
  return res.data as List<dynamic>;
});

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final entries = ref.watch(entryHistoryProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
        title: Text(t('history_title')),
      ),
      body: entries.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off, color: AppTheme.muted, size: 40),
              const SizedBox(height: 12),
              Text(t('could_not_load_hist'),
                style: const TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.refresh(entryHistoryProvider),
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
                  const Icon(Icons.history, size: 48, color: AppTheme.muted),
                  const SizedBox(height: 12),
                  Text(t('no_entries'),
                    style: const TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(t('start_scanning'),
                    style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            color: AppTheme.gold,
            onRefresh: () => ref.refresh(entryHistoryProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final e = list[i];
                final campaign = e['campaign'];
                final createdAt = e['createdAt'] != null
                    ? DateTime.tryParse(e['createdAt'])
                    : null;
                final won = e['won'] == true;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: won ? AppTheme.gold.withAlpha(60) : AppTheme.border,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: won ? AppTheme.gold.withAlpha(20) : AppTheme.surface,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            won ? Icons.emoji_events : Icons.confirmation_number_outlined,
                            color: won ? AppTheme.gold : AppTheme.subtle, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(campaign?['name'] ?? 'Campaign',
                                style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w600, fontSize: 15)),
                              if (e['branch']?['name'] != null) ...[
                                const SizedBox(height: 2),
                                Row(children: [
                                  const Icon(Icons.location_on_outlined, color: AppTheme.muted, size: 12),
                                  const SizedBox(width: 3),
                                  Text(e['branch']['name'],
                                    style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                                ]),
                              ],
                              if (createdAt != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                                  style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                              ],
                            ],
                          ),
                        ),
                        if (won)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.gold.withAlpha(20),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: AppTheme.gold.withAlpha(60)),
                            ),
                            child: Text(t('won'),
                              style: const TextStyle(color: AppTheme.gold, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
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
