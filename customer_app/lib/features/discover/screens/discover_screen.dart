import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

final discoverCampaignsProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await createDio().get('/campaigns/active');
  return res.data as List;
});

class DiscoverScreen extends ConsumerWidget {
  const DiscoverScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaigns = ref.watch(discoverCampaignsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Discover')),
      body: campaigns.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.amber)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) => RefreshIndicator(
          color: AppTheme.amber,
          onRefresh: () => ref.refresh(discoverCampaignsProvider.future),
          child: list.isEmpty
              ? const Center(child: Text('No active campaigns right now', style: TextStyle(color: AppTheme.muted)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final c = list[i] as Map<String, dynamic>;
                    final business = c['business'] as Map<String, dynamic>?;
                    return ListTile(
                      tileColor: AppTheme.card,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppTheme.border),
                      ),
                      leading: CircleAvatar(
                        backgroundColor: AppTheme.amber.withOpacity(0.15),
                        child: const Icon(Icons.local_bar, color: AppTheme.amber),
                      ),
                      title: Text(c['name'] ?? '', style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w600)),
                      subtitle: Text(business?['name'] ?? '', style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                      trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
                      onTap: () => context.push('/campaign/${c['id']}'),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
