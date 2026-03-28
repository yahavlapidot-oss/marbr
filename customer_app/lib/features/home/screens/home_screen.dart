import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/device_service.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';
import '../../campaigns/providers/campaigns_provider.dart';
import '../../campaigns/widgets/campaign_card.dart';


class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    // Ask for location permission once on first open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      DeviceService().requestLocationPermission().then((granted) {
        if (granted) DeviceService().registerDevice();
      });
    });
    // Auto-refresh campaigns every 60s so new/ended campaigns appear without pull-to-refresh
    _refreshTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (mounted) ref.invalidate(activeCampaignsProvider(null));
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    // Home screen loads campaigns without location filter (null position)
    final campaigns = ref.watch(activeCampaignsProvider(null));
    final enrollment = ref.watch(activeCampaignEnrollmentProvider);
    // enrolledIds is set synchronously on scan success — covers the gap while
    // activeCampaignEnrollmentProvider is refetching after invalidation.
    final hasEnrollment = enrollment.valueOrNull != null
        || ref.watch(enrolledCampaignIdsProvider).isNotEmpty;


    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.gold,
          onRefresh: () => ref.refresh(activeCampaignsProvider(null).future),
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
                              Text(t('live_campaigns'),
                                style: const TextStyle(color: AppTheme.subtle, fontSize: 13)),
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

                      // Scan CTA — hidden when already enrolled in a campaign
                      if (!hasEnrollment) ...[
                        GestureDetector(
                          onTap: () => context.push('/scan'),
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
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(t('scan_qr_enter'),
                                      style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 14, letterSpacing: 0.8)),
                                    const SizedBox(height: 2),
                                    Text(t('scan_purchase_code'),
                                      style: const TextStyle(color: Colors.black54, fontSize: 12)),
                                  ],
                                ),
                                const Spacer(),
                                const Icon(Icons.arrow_forward_ios, color: Colors.black54, size: 14),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 28),
                      ],

                      Text(t('live_now'),
                        style: const TextStyle(color: AppTheme.subtle, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
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
                        Text(t('could_not_load'),
                          style: const TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text(t('pull_retry'),
                          style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
                data: (list) => list.isEmpty
                    ? SliverFillRemaining(
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.local_bar_outlined, color: AppTheme.muted, size: 48),
                              const SizedBox(height: 12),
                              Text(t('no_live_campaigns'),
                                style: const TextStyle(color: AppTheme.muted, fontSize: 15)),
                              const SizedBox(height: 4),
                              Text(t('check_back'),
                                style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
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
