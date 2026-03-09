import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final snakeCampaignProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await createDio().get('/campaigns/$id');
  return Map<String, dynamic>.from(res.data);
});

final snakeLeaderboardProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await createDio().get('/game/snake/$id/leaderboard');
  return Map<String, dynamic>.from(res.data);
});

// ── Screen ────────────────────────────────────────────────────────────────────

class SnakeCampaignScreen extends ConsumerStatefulWidget {
  final String campaignId;
  const SnakeCampaignScreen({super.key, required this.campaignId});

  @override
  ConsumerState<SnakeCampaignScreen> createState() => _SnakeCampaignScreenState();
}

class _SnakeCampaignScreenState extends ConsumerState<SnakeCampaignScreen> {
  @override
  Widget build(BuildContext context) {
    final campaign = ref.watch(snakeCampaignProvider(widget.campaignId));
    final leaderboard = ref.watch(snakeLeaderboardProvider(widget.campaignId));

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
        title: campaign.maybeWhen(
          data: (c) => Text(c['name'] ?? 'Snake Game'),
          orElse: () => const Text('Snake Game'),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.gold,
              onRefresh: () async {
                ref.invalidate(snakeLeaderboardProvider(widget.campaignId));
                await ref.read(snakeLeaderboardProvider(widget.campaignId).future);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Info card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.gold.withAlpha(15),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.gold.withAlpha(60)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(children: [
                            Text('🐍', style: TextStyle(fontSize: 22)),
                            SizedBox(width: 8),
                            Text('Snake Leaderboard',
                              style: TextStyle(color: AppTheme.gold, fontSize: 16, fontWeight: FontWeight.w700)),
                          ]),
                          const SizedBox(height: 8),
                          const Text(
                            'One game per player. Top scorers when the campaign ends win the prize. Eat as many apples as you can!',
                            style: TextStyle(color: AppTheme.subtle, fontSize: 13, height: 1.5),
                          ),
                          const SizedBox(height: 12),
                          campaign.maybeWhen(
                            data: (c) {
                              final endsAt = c['endsAt'] != null ? DateTime.tryParse(c['endsAt']) : null;
                              if (endsAt == null) return const SizedBox.shrink();
                              final left = endsAt.difference(DateTime.now());
                              if (left.isNegative) {
                                return const Text('Campaign ended', style: TextStyle(color: AppTheme.muted, fontSize: 12));
                              }
                              final label = left.inHours > 0
                                  ? '${left.inHours}h ${left.inMinutes % 60}m left'
                                  : '${left.inMinutes}m ${left.inSeconds % 60}s left';
                              return Row(children: [
                                const Icon(Icons.timer_outlined, color: AppTheme.gold, size: 14),
                                const SizedBox(width: 4),
                                Text(label, style: const TextStyle(color: AppTheme.gold, fontSize: 12, fontWeight: FontWeight.w600)),
                              ]);
                            },
                            orElse: () => const SizedBox.shrink(),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 28),

                    // Leaderboard
                    Row(
                      children: [
                        const Text('LEADERBOARD',
                          style: TextStyle(color: AppTheme.subtle, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
                        const Spacer(),
                        leaderboard.maybeWhen(
                          data: (lb) => Text(
                            '${lb['totalPlayers']} players',
                            style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                          ),
                          orElse: () => const SizedBox.shrink(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    leaderboard.when(
                      loading: () => const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2),
                        ),
                      ),
                      error: (e, _) => Center(
                        child: Text('Could not load leaderboard', style: const TextStyle(color: AppTheme.muted)),
                      ),
                      data: (lb) {
                        final entries = lb['leaderboard'] as List? ?? [];
                        final myScore = lb['myScore'] as Map<String, dynamic>?;

                        return Column(
                          children: [
                            if (myScore != null) ...[
                              Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: AppTheme.gold.withAlpha(15),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppTheme.gold.withAlpha(80)),
                                ),
                                child: Row(children: [
                                  const Icon(Icons.person, color: AppTheme.gold, size: 18),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Your score', style: TextStyle(color: AppTheme.muted, fontSize: 11)),
                                        Text('${myScore['score']} pts · ${myScore['foodEaten']} foods',
                                          style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w700)),
                                      ],
                                    ),
                                  ),
                                  Text('#${myScore['rank']}',
                                    style: const TextStyle(color: AppTheme.gold, fontSize: 22, fontWeight: FontWeight.w800)),
                                ]),
                              ),
                            ],

                            if (entries.isEmpty)
                              const Padding(
                                padding: EdgeInsets.all(32),
                                child: Text('No scores yet. Be the first!',
                                  style: TextStyle(color: AppTheme.muted),
                                  textAlign: TextAlign.center,
                                ),
                              )
                            else
                              ...entries.asMap().entries.map((e) {
                                final idx = e.key;
                                final entry = e.value as Map<String, dynamic>;
                                final rank = entry['rank'] as int;
                                final rankStr = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '#$rank';
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: idx == 0 ? AppTheme.gold.withAlpha(10) : AppTheme.card,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: idx == 0 ? AppTheme.gold.withAlpha(50) : AppTheme.border,
                                    ),
                                  ),
                                  child: Row(children: [
                                    SizedBox(
                                      width: 32,
                                      child: Text(rankStr,
                                        style: TextStyle(
                                          fontSize: rank <= 3 ? 20 : 14,
                                          fontWeight: FontWeight.w700,
                                          color: AppTheme.subtle,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(entry['name'] ?? 'Anonymous',
                                            style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w600)),
                                          Text('${entry['foodEaten']} foods eaten',
                                            style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                                        ],
                                      ),
                                    ),
                                    Text('${entry['score']}',
                                      style: const TextStyle(color: AppTheme.gold, fontWeight: FontWeight.w800, fontSize: 16)),
                                  ]),
                                );
                              }),
                          ],
                        );
                      },
                    ),

                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ),

          // Bottom CTA
          leaderboard.maybeWhen(
            data: (lb) {
              final alreadyPlayed = lb['myScore'] != null;
              return Container(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                decoration: const BoxDecoration(
                  color: AppTheme.bg,
                  border: Border(top: BorderSide(color: AppTheme.border, width: 0.5)),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: alreadyPlayed
                        ? null
                        : () => context.push('/game/snake/${widget.campaignId}/play').then((_) {
                            ref.invalidate(snakeLeaderboardProvider(widget.campaignId));
                          }),
                    icon: const Text('🐍', style: TextStyle(fontSize: 18)),
                    label: Text(alreadyPlayed ? 'ALREADY PLAYED' : 'PLAY NOW'),
                  ),
                ),
              );
            },
            orElse: () => Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => context.push('/game/snake/${widget.campaignId}/play'),
                  icon: const Text('🐍', style: TextStyle(fontSize: 18)),
                  label: const Text('PLAY NOW'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
