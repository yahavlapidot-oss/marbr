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
          color: AppTheme.gold,
          onRefresh: () => ref.refresh(activeCampaignsProvider.future),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('MrBar',
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  color: AppTheme.white,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.5,
                                )),
                              const SizedBox(height: 2),
                              const Text('Live campaigns near you',
                                style: TextStyle(color: AppTheme.subtle, fontSize: 13)),
                            ],
                          ),
                          GestureDetector(
                            onTap: () => context.push('/notifications'),
                            child: Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: const Icon(Icons.notifications_none, color: AppTheme.subtle, size: 22),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Scan CTA
                      GestureDetector(
                        onTap: () => context.go('/scan'),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF5C518), Color(0xFFD4A017)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFF5C518).withAlpha(60),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: Colors.black.withAlpha(30),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.qr_code_scanner, color: Colors.black, size: 24),
                              ),
                              const SizedBox(width: 14),
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('SCAN QR TO ENTER',
                                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 14, letterSpacing: 0.8)),
                                  SizedBox(height: 2),
                                  Text('Scan your purchase code to participate',
                                    style: TextStyle(color: Colors.black54, fontSize: 12)),
                                ],
                              ),
                              const Spacer(),
                              const Icon(Icons.arrow_forward_ios, color: Colors.black54, size: 14),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),

                      const Text('LIVE NOW',
                        style: TextStyle(color: AppTheme.subtle, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),

              campaigns.when(
                loading: () => const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
                ),
                error: (e, _) => SliverFillRemaining(
                  child: Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
                ),
                data: (list) => list.isEmpty
                    ? const SliverFillRemaining(
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.local_bar_outlined, color: AppTheme.muted, size: 48),
                              SizedBox(height: 12),
                              Text('No live campaigns right now',
                                style: TextStyle(color: AppTheme.muted, fontSize: 15)),
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
