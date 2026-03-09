import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

final myRewardsProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await createDio().get('/me/rewards');
  return res.data as List;
});

class MyRewardsScreen extends ConsumerStatefulWidget {
  const MyRewardsScreen({super.key});

  @override
  ConsumerState<MyRewardsScreen> createState() => _MyRewardsScreenState();
}

class _MyRewardsScreenState extends ConsumerState<MyRewardsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rewards = ref.watch(myRewardsProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: const Text('My Wins'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: TabBar(
              controller: _tabs,
              indicator: BoxDecoration(
                color: AppTheme.gold,
                borderRadius: BorderRadius.circular(8),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.black,
              unselectedLabelColor: AppTheme.subtle,
              labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
              dividerColor: Colors.transparent,
              tabs: const [Tab(text: 'Active'), Tab(text: 'History')],
            ),
          ),
        ),
      ),
      body: rewards.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off, color: AppTheme.muted, size: 40),
              const SizedBox(height: 12),
              const Text('Could not load rewards',
                style: TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.refresh(myRewardsProvider),
                child: const Text('Retry', style: TextStyle(color: AppTheme.gold)),
              ),
            ],
          ),
        ),
        data: (list) {
          final active = list.where((r) => r['status'] == 'ACTIVE').toList();
          final history = list.where((r) => r['status'] != 'ACTIVE').toList();
          return TabBarView(
            controller: _tabs,
            children: [
              _RewardsList(items: active, onRefresh: () => ref.refresh(myRewardsProvider.future),
                emptyIcon: Icons.emoji_events_outlined,
                emptyText: 'No active rewards',
                emptySubtext: 'Win a campaign to see your prizes here'),
              _RewardsList(items: history, onRefresh: () => ref.refresh(myRewardsProvider.future),
                emptyIcon: Icons.history,
                emptyText: 'No history yet',
                emptySubtext: 'Past rewards will appear here'),
            ],
          );
        },
      ),
    );
  }
}

class _RewardsList extends StatelessWidget {
  final List<dynamic> items;
  final Future<void> Function() onRefresh;
  final IconData emptyIcon;
  final String emptyText;
  final String emptySubtext;

  const _RewardsList({
    required this.items,
    required this.onRefresh,
    required this.emptyIcon,
    required this.emptyText,
    required this.emptySubtext,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(emptyIcon, color: AppTheme.muted, size: 52),
            const SizedBox(height: 14),
            Text(emptyText, style: const TextStyle(color: AppTheme.subtle, fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(emptySubtext, style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      color: AppTheme.gold,
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        itemCount: items.length,
        itemBuilder: (_, i) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _RewardCard(reward: items[i]),
        ),
      ),
    );
  }
}

class _RewardCard extends StatefulWidget {
  final Map<String, dynamic> reward;
  const _RewardCard({required this.reward});

  @override
  State<_RewardCard> createState() => _RewardCardState();
}

class _RewardCardState extends State<_RewardCard> {
  bool _copied = false;

  void _copyCode(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    setState(() => _copied = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _copied = false);
  }

  void _showRedeemSheet(BuildContext context) {
    final code = widget.reward['code'] as String? ?? '';
    final r = widget.reward['reward'] as Map<String, dynamic>? ?? {};
    final campaign = r['campaign'] as Map<String, dynamic>? ?? {};

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(
              color: AppTheme.border, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            const Icon(Icons.emoji_events, color: AppTheme.gold, size: 40),
            const SizedBox(height: 12),
            Text(r['name'] ?? 'Reward',
              style: const TextStyle(color: AppTheme.white, fontSize: 20, fontWeight: FontWeight.w800)),
            if (campaign['name'] != null) ...[
              const SizedBox(height: 4),
              Text(campaign['name'],
                style: const TextStyle(color: AppTheme.muted, fontSize: 14)),
            ],
            const SizedBox(height: 24),
            const Text('SHOW THIS CODE TO STAFF',
              style: TextStyle(color: AppTheme.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                color: AppTheme.bg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.gold.withAlpha(60)),
              ),
              child: Column(
                children: [
                  Text(code,
                    style: const TextStyle(
                      color: AppTheme.gold, fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: 6)),
                  const SizedBox(height: 6),
                  const Text('Tap below to copy',
                    style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: code));
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Code copied to clipboard'),
                      backgroundColor: AppTheme.gold,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                icon: const Icon(Icons.copy, size: 18),
                label: const Text('COPY CODE'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.reward['status'] as String? ?? '';
    final r = widget.reward['reward'] as Map<String, dynamic>? ?? {};
    final campaign = r['campaign'] as Map<String, dynamic>? ?? {};
    final isActive = status == 'ACTIVE';
    final isRedeemed = status == 'REDEEMED';
    final expiresAt = DateTime.tryParse((widget.reward['expiresAt'] as String?) ?? '');
    final timeLeft = expiresAt?.difference(DateTime.now());
    final isExpiringSoon = timeLeft != null && timeLeft.inHours < 24 && !timeLeft.isNegative;

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isActive ? AppTheme.gold.withAlpha(60) : AppTheme.border),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: isActive ? AppTheme.gold.withAlpha(20) : AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.emoji_events,
                    color: isActive ? AppTheme.gold : AppTheme.muted, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(r['name'] ?? 'Reward',
                        style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w700, fontSize: 16)),
                      if (campaign['name'] != null) ...[
                        const SizedBox(height: 2),
                        Text(campaign['name'],
                          style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                      ],
                    ],
                  ),
                ),
                _StatusBadge(status: status),
              ],
            ),
          ),

          if (isActive && widget.reward['code'] != null) ...[
            Container(height: 0.5, color: AppTheme.border),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  if (isExpiringSoon)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          const Icon(Icons.timer_outlined, color: Color(0xFFF97316), size: 14),
                          const SizedBox(width: 6),
                          Text('Expires in ${timeLeft.inHours}h ${timeLeft.inMinutes % 60}m',
                            style: const TextStyle(color: Color(0xFFF97316), fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  // Code with copy tap
                  GestureDetector(
                    onTap: () => _copyCode(widget.reward['code']),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: AppTheme.bg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.gold.withAlpha(40)),
                      ),
                      child: Column(
                        children: [
                          const Text('REDEMPTION CODE',
                            style: TextStyle(color: AppTheme.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 6),
                          Text(widget.reward['code'],
                            style: const TextStyle(
                              color: AppTheme.gold, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 3)),
                          const SizedBox(height: 4),
                          Text(_copied ? '✓ Copied!' : 'Tap to copy',
                            style: TextStyle(
                              color: _copied ? const Color(0xFF22C55E) : AppTheme.muted,
                              fontSize: 11)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _showRedeemSheet(context),
                      icon: const Icon(Icons.qr_code, size: 18),
                      label: const Text('REDEEM NOW'),
                    ),
                  ),
                ],
              ),
            ),
          ],

          if (isRedeemed)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppTheme.border, width: 0.5)),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
              ),
              child: const Center(
                child: Text('Redeemed', style: TextStyle(color: AppTheme.muted, fontSize: 13)),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (status) {
      case 'ACTIVE': color = const Color(0xFF22C55E); label = 'ACTIVE'; break;
      case 'REDEEMED': color = AppTheme.muted; label = 'REDEEMED'; break;
      case 'EXPIRED': color = Colors.redAccent; label = 'EXPIRED'; break;
      default: color = AppTheme.muted; label = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withAlpha(50)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
    );
  }
}
