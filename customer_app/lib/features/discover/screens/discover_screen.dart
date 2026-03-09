import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme.dart';
import '../../campaigns/providers/campaigns_provider.dart';
import '../../campaigns/widgets/campaign_card.dart';

class DiscoverScreen extends ConsumerWidget {
  const DiscoverScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaigns = ref.watch(activeCampaignsProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.gold,
          onRefresh: () => ref.refresh(activeCampaignsProvider.future),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Discover',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: AppTheme.white,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        )),
                      const SizedBox(height: 4),
                      const Text('All live campaigns near you',
                        style: TextStyle(color: AppTheme.subtle, fontSize: 13)),
                      const SizedBox(height: 20),
                      // Search bar placeholder
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.search, color: AppTheme.muted, size: 18),
                            SizedBox(width: 10),
                            Text('Search campaigns or venues...',
                              style: TextStyle(color: AppTheme.muted, fontSize: 14)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              campaigns.when(
                loading: () => const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
                ),
                error: (e, _) => SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.wifi_off, color: AppTheme.muted, size: 40),
                        const SizedBox(height: 12),
                        const Text('Could not load campaigns',
                          style: TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        const Text('Pull down to retry',
                          style: TextStyle(color: AppTheme.muted, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
                data: (list) => list.isEmpty
                    ? const SliverFillRemaining(
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.explore_outlined, color: AppTheme.muted, size: 48),
                              SizedBox(height: 12),
                              Text('No campaigns right now',
                                style: TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
                              SizedBox(height: 4),
                              Text('Check back soon',
                                style: TextStyle(color: AppTheme.muted, fontSize: 13)),
                            ],
                          ),
                        ),
                      )
                    : SliverPadding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (_, i) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: CampaignCard(campaign: list[i] as Map<String, dynamic>),
                            ),
                            childCount: list.length,
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
