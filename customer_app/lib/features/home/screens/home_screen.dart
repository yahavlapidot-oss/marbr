import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/device_service.dart';
import '../../../core/theme.dart';
import '../../campaigns/providers/campaigns_provider.dart';
import '../../campaigns/widgets/campaign_card.dart';

final activeCampaignEnrollmentProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final res = await createDio().get('/entries/active');
  if (res.data == null) return null;
  return Map<String, dynamic>.from(res.data);
});

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Ask for location permission once on first open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      DeviceService().requestLocationPermission().then((granted) {
        if (granted) DeviceService().registerDevice();
      });
    });
  }

  // Ask for location permission once — improves nearby notification targeting
  void _requestLocationIfNeeded() {
    DeviceService().requestLocationPermission().then((granted) {
      if (granted) DeviceService().registerDevice();
    });
  }

  Future<void> _confirmLeave(BuildContext context, WidgetRef ref, String campaignName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1a1a24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Leave Campaign?', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
        content: Text(
          'Are you sure you want to leave "$campaignName"? You can join a different campaign afterwards.',
          style: const TextStyle(color: Color(0xFF9b9bae), height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Stay', style: TextStyle(color: Color(0xFF9b9bae))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Leave', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await createDio().delete('/entries/active');
      ref.invalidate(activeCampaignEnrollmentProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final campaigns = ref.watch(activeCampaignsProvider);
    final enrollment = ref.watch(activeCampaignEnrollmentProvider);

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

                      // Active campaign enrollment banner
                      enrollment.maybeWhen(
                        data: (active) {
                          if (active == null) return const SizedBox.shrink();
                          final name = active['name'] as String? ?? 'Campaign';
                          final type = active['type'] as String? ?? '';
                          return Container(
                            margin: const EdgeInsets.only(bottom: 20),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF22C55E).withAlpha(15),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFF22C55E).withAlpha(60)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 36, height: 36,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF22C55E).withAlpha(25),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Center(
                                    child: type == 'SNAKE'
                                        ? const Text('🐍', style: TextStyle(fontSize: 18))
                                        : const Icon(Icons.confirmation_number_outlined, color: Color(0xFF22C55E), size: 18),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Currently enrolled',
                                        style: TextStyle(color: Color(0xFF22C55E), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1)),
                                      Text(name,
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                                    ],
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () => _confirmLeave(context, ref, name),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: Colors.redAccent.withAlpha(20),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.redAccent.withAlpha(60)),
                                    ),
                                    child: const Text('Leave',
                                      style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.w700)),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                        orElse: () => const SizedBox.shrink(),
                      ),

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
