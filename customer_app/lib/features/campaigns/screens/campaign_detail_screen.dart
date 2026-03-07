import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

final campaignProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await createDio().get('/campaigns/$id');
  return Map<String, dynamic>.from(res.data);
});

class CampaignDetailScreen extends ConsumerWidget {
  final String id;
  const CampaignDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaign = ref.watch(campaignProvider(id));

    return Scaffold(
      appBar: AppBar(title: const Text('Campaign')),
      body: campaign.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.amber)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (c) {
          final type = (c['type'] as String? ?? '').replaceAll('_', ' ');
          final entries = c['_count']?['entries'] ?? 0;
          final rewards = c['rewards'] as List? ?? [];

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppTheme.amber.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(type, style: const TextStyle(color: AppTheme.amber, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(height: 12),
                Text(c['name'] ?? '', style: const TextStyle(color: AppTheme.white, fontSize: 24, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                if (c['description'] != null)
                  Text(c['description'], style: const TextStyle(color: AppTheme.subtle, fontSize: 15)),
                const SizedBox(height: 24),

                // Stats row
                Row(
                  children: [
                    _statChip(Icons.people_outline, '$entries entries'),
                    const SizedBox(width: 10),
                    if (c['endsAt'] != null)
                      _statChip(Icons.timer_outlined, _timeLeft(c['endsAt'])),
                  ],
                ),
                const SizedBox(height: 24),

                // Rewards
                if (rewards.isNotEmpty) ...[
                  const Text('Prize', style: TextStyle(color: AppTheme.white, fontWeight: FontWeight.w700, fontSize: 17)),
                  const SizedBox(height: 10),
                  ...rewards.map((r) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      border: Border.all(color: AppTheme.amber.withOpacity(0.4)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.card_giftcard, color: AppTheme.amber),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(r['name'] ?? '', style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w600)),
                              if (r['description'] != null)
                                Text(r['description'], style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                            ],
                          ),
                        ),
                        if (r['inventory'] != null)
                          Text('${r['inventory'] - (r['allocated'] ?? 0)} left', style: const TextStyle(color: AppTheme.amber, fontSize: 12)),
                      ],
                    ),
                  )),
                  const SizedBox(height: 24),
                ],

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/scan'),
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Scan to Enter'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _statChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.card,
        border: Border.all(color: AppTheme.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(children: [
        Icon(icon, color: AppTheme.muted, size: 14),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(color: AppTheme.subtle, fontSize: 12)),
      ]),
    );
  }

  String _timeLeft(String endsAt) {
    final end = DateTime.tryParse(endsAt);
    if (end == null) return '';
    final diff = end.difference(DateTime.now());
    if (diff.isNegative) return 'Ended';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m left';
    if (diff.inHours < 24) return '${diff.inHours}h left';
    return '${diff.inDays}d left';
  }
}
