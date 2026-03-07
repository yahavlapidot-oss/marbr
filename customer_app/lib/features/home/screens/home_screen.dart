import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';
import '../../campaigns/widgets/campaign_card.dart';

final activeCampaignsProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await createDio().get('/campaigns/active');
  return res.data as List;
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaigns = ref.watch(activeCampaignsProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.amber,
          onRefresh: () => ref.refresh(activeCampaignsProvider.future),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.sports_bar, color: AppTheme.amber, size: 28),
                          const SizedBox(width: 8),
                          Text('MrBar', style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: AppTheme.white,
                            fontWeight: FontWeight.w800,
                          )),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('Active campaigns near you', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.muted)),
                      const SizedBox(height: 20),

                      // Quick scan CTA
                      GestureDetector(
                        onTap: () => context.go('/scan'),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.qr_code_scanner, color: Colors.black, size: 28),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text('Scan & Enter', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w700, fontSize: 16)),
                                  Text('Scan your purchase code to participate', style: TextStyle(color: Colors.black54, fontSize: 12)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),

              campaigns.when(
                loading: () => const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator(color: AppTheme.amber)),
                ),
                error: (e, _) => SliverFillRemaining(
                  child: Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
                ),
                data: (list) => list.isEmpty
                    ? const SliverFillRemaining(
                        child: Center(child: Text('No active campaigns right now', style: TextStyle(color: AppTheme.muted))),
                      )
                    : SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (_, i) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: CampaignCard(campaign: list[i]),
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
