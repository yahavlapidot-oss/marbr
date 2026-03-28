import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../core/l10n/app_l10n.dart';
import '../../core/locale_provider.dart';
import '../../core/api_client.dart';
import '../../core/notifications_service.dart';
import '../campaigns/providers/campaigns_provider.dart';

class ShellScreen extends ConsumerStatefulWidget {
  final Widget child;
  const ShellScreen({super.key, required this.child});

  @override
  ConsumerState<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends ConsumerState<ShellScreen> {
  Timer? _pollTimer;
  StreamSubscription<String>? _fcmSub;
  // The campaign ID the user is currently enrolled in.
  // Set from build() (async provider) and immediately after scan (local provider).
  // Cleared when the campaign ends and the popup is triggered.
  String? _trackedCampaignId;
  bool _dialogShowing = false;

  @override
  void initState() {
    super.initState();

    // FCM real-time path: fires the moment the backend sends the push notification.
    _fcmSub = NotificationsService().onCampaignEnded.listen(_onFcmCampaignEnded);

    // Polling path: every 5s, directly check /entries/active.
    // The timer is self-contained — it reads the API directly and updates
    // _trackedCampaignId from the response so it doesn't depend solely on build().
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      if (!mounted || _dialogShowing) return;
      try {
        final res = await createDio().get('/entries/active');
        if (!mounted || _dialogShowing) return;

        // res.data is the campaign object (with .id) or null
        final newId = (res.data is Map) ? res.data['id'] as String? : null;

        debugPrint('[ShellScreen] poll: newId=$newId tracked=$_trackedCampaignId');

        if (newId != null) {
          // Still enrolled — update tracked ID from fresh server data.
          _trackedCampaignId = newId;
          ref.invalidate(activeCampaignEnrollmentProvider);
        } else if (_trackedCampaignId != null) {
          // Was enrolled, now null → campaign ended.
          final campaignId = _trackedCampaignId!;
          _trackedCampaignId = null;
          ref.read(enrolledCampaignIdsProvider.notifier).update((_) => {});
          ref.invalidate(activeCampaignEnrollmentProvider);
          debugPrint('[ShellScreen] campaign ended → showing dialog for $campaignId');
          _showResultDialog(campaignId);
        }
        // else: not enrolled before and not now — nothing to do.
      } catch (e) {
        debugPrint('[ShellScreen] poll error: $e');
      }
    });
  }

  @override
  void dispose() {
    _fcmSub?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }

  /// Called when an FCM data message announces the campaign ended.
  /// The campaignId comes from the FCM payload — reliable even before the
  /// poll timer fires.
  void _onFcmCampaignEnded(String campaignId) {
    debugPrint('[ShellScreen] FCM campaign ended: $campaignId');
    if (_dialogShowing || !mounted) return;
    _trackedCampaignId = null;
    ref.read(enrolledCampaignIdsProvider.notifier).update((_) => {});
    ref.invalidate(activeCampaignEnrollmentProvider);
    _showResultDialog(campaignId);
  }

  Future<void> _showResultDialog(String campaignId) async {
    if (_dialogShowing || !mounted) return;
    _dialogShowing = true;

    try {
      // Give the backend a moment to finish drawing winners before fetching.
      await Future.delayed(const Duration(seconds: 3));
      if (!mounted) return;

      // Fetch whether the user won.
      Map<String, dynamic>? myUserReward;
      try {
        final res = await createDio().get('/campaigns/$campaignId');
        myUserReward = res.data['myUserReward'] as Map<String, dynamic>?;
      } catch (_) {}

      if (!mounted) return;

      final locale = ref.read(localeProvider);
      String t(String key) => AppL10n.of(locale, key);

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        barrierColor: Colors.black.withAlpha(180),
        builder: (_) => _CampaignResultDialog(
          won: myUserReward != null,
          rewardName: myUserReward?['reward']?['name'] as String?,
          t: t,
          onViewReward: () {
            Navigator.of(context).pop();
            context.go('/rewards');
          },
          onGoHome: () {
            Navigator.of(context).pop();
            context.go('/home');
          },
        ),
      );
    } finally {
      _dialogShowing = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    // Seed _trackedCampaignId from the async server enrollment provider.
    final enrollment = ref.watch(activeCampaignEnrollmentProvider).valueOrNull;
    if (enrollment != null) {
      _trackedCampaignId = enrollment['id'] as String?;
      debugPrint('[ShellScreen] build: enrollment id=$_trackedCampaignId');
    }

    // Also seed from the local provider set immediately after a QR scan — this
    // covers the gap between a successful scan and the async provider resolving.
    final localIds = ref.watch(enrolledCampaignIdsProvider);
    if (localIds.isNotEmpty && _trackedCampaignId == null) {
      _trackedCampaignId = localIds.first;
      debugPrint('[ShellScreen] build: seeded from localIds=$localIds');
    }

    final isEnrolled = enrollment != null || localIds.isNotEmpty;
    final location = GoRouterState.of(context).matchedLocation;

    int selectedIndex = 0;
    if (location.startsWith('/discover')) selectedIndex = 1;
    if (location.startsWith('/scan')) selectedIndex = 2;
    if (location.startsWith('/rewards')) selectedIndex = 3;
    if (location.startsWith('/profile')) selectedIndex = 4;

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surface,
          border: Border(top: BorderSide(color: AppTheme.border, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: selectedIndex,
          backgroundColor: AppTheme.surface,
          selectedItemColor: AppTheme.gold,
          unselectedItemColor: AppTheme.muted,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          onTap: (i) {
            switch (i) {
              case 0: context.go('/home'); break;
              case 1: context.go('/discover'); break;
              case 2: if (!isEnrolled) context.push('/scan'); break;
              case 3: context.go('/rewards'); break;
              case 4: context.go('/profile'); break;
            }
          },
          items: [
            BottomNavigationBarItem(icon: const Icon(Icons.home_outlined), activeIcon: const Icon(Icons.home), label: t('home')),
            BottomNavigationBarItem(icon: const Icon(Icons.explore_outlined), activeIcon: const Icon(Icons.explore), label: t('discover')),
            BottomNavigationBarItem(
              icon: Icon(Icons.qr_code_scanner, color: isEnrolled ? AppTheme.border : null),
              label: t('scan'),
            ),
            BottomNavigationBarItem(icon: const Icon(Icons.emoji_events_outlined), activeIcon: const Icon(Icons.emoji_events), label: t('my_wins')),
            BottomNavigationBarItem(icon: const Icon(Icons.person_outline), activeIcon: const Icon(Icons.person), label: t('profile')),
          ],
        ),
      ),
    );
  }
}

// ─── Campaign result dialog ───────────────────────────────────────────────────

class _CampaignResultDialog extends StatelessWidget {
  final bool won;
  final String? rewardName;
  final String Function(String) t;
  final VoidCallback onViewReward;
  final VoidCallback onGoHome;

  const _CampaignResultDialog({
    required this.won,
    this.rewardName,
    required this.t,
    required this.onViewReward,
    required this.onGoHome,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Material(
          color: Colors.transparent,
          child: Container(
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: won ? AppTheme.gold.withAlpha(120) : AppTheme.border,
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: won
                      ? AppTheme.gold.withAlpha(40)
                      : Colors.black.withAlpha(80),
                  blurRadius: 40,
                  spreadRadius: 4,
                ),
              ],
            ),
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon ring
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: won
                        ? AppTheme.gold.withAlpha(25)
                        : AppTheme.surface,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: won
                          ? AppTheme.gold.withAlpha(100)
                          : AppTheme.border,
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      won ? '🎉' : '😊',
                      style: const TextStyle(fontSize: 38),
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                Text(
                  won ? t('result_won_title') : t('result_lost_title'),
                  style: TextStyle(
                    color: won ? AppTheme.gold : AppTheme.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 10),

                if (won && rewardName != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.gold.withAlpha(18),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.gold.withAlpha(60)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.emoji_events, color: AppTheme.gold, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          rewardName!,
                          style: const TextStyle(
                            color: AppTheme.gold,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],

                Text(
                  won ? t('result_won_sub') : t('result_lost_sub'),
                  style: const TextStyle(
                    color: AppTheme.subtle,
                    fontSize: 14,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 28),

                // Primary CTA
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: won ? onViewReward : onGoHome,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: won ? AppTheme.gold : AppTheme.surface,
                      foregroundColor: won ? Colors.black : AppTheme.white,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: won
                            ? BorderSide.none
                            : const BorderSide(color: AppTheme.border),
                      ),
                      elevation: 0,
                      textStyle: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    child: Text(won ? t('result_view_reward') : t('result_go_home')),
                  ),
                ),

                if (won) ...[
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: onGoHome,
                    child: Text(
                      t('result_go_home'),
                      style: const TextStyle(
                          color: AppTheme.muted,
                          fontSize: 13,
                          fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
