import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

final myRewardsProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await createDio().get('/me/rewards');
  return res.data as List;
});

class MyRewardsScreen extends ConsumerWidget {
  const MyRewardsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rewards = ref.watch(myRewardsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Rewards')),
      body: rewards.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.amber)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (list) => list.isEmpty
            ? const Center(child: Text('No rewards yet. Start entering campaigns!', style: TextStyle(color: AppTheme.muted), textAlign: TextAlign.center))
            : RefreshIndicator(
                color: AppTheme.amber,
                onRefresh: () => ref.refresh(myRewardsProvider.future),
                child: ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _RewardTile(reward: list[i]),
                ),
              ),
      ),
    );
  }
}

class _RewardTile extends StatelessWidget {
  final Map<String, dynamic> reward;
  const _RewardTile({required this.reward});

  @override
  Widget build(BuildContext context) {
    final status = reward['status'] as String? ?? '';
    final r = reward['reward'] as Map<String, dynamic>? ?? {};
    final campaign = r['campaign'] as Map<String, dynamic>? ?? {};

    Color statusColor;
    switch (status) {
      case 'ACTIVE': statusColor = const Color(0xFF22C55E); break;
      case 'REDEEMED': statusColor = AppTheme.muted; break;
      case 'EXPIRED': statusColor = Colors.redAccent; break;
      default: statusColor = AppTheme.muted;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        border: Border.all(
          color: status == 'ACTIVE' ? AppTheme.amber.withOpacity(0.4) : AppTheme.border,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.card_giftcard, color: AppTheme.amber, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(r['name'] ?? 'Reward', style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w700, fontSize: 16)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(status, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          if (campaign['name'] != null) ...[
            const SizedBox(height: 6),
            Text(campaign['name'], style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
          ],
          if (status == 'ACTIVE') ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.bg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  const Text('Redemption Code', style: TextStyle(color: AppTheme.muted, fontSize: 11)),
                  const SizedBox(height: 4),
                  Text(
                    reward['code'] ?? '',
                    style: const TextStyle(
                      color: AppTheme.amber,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
