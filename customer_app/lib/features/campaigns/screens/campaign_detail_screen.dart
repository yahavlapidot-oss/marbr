import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';
import '../../../core/date_time_utils.dart';
import '../providers/campaigns_provider.dart';

class CampaignDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const CampaignDetailScreen({super.key, required this.id});

  @override
  ConsumerState<CampaignDetailScreen> createState() => _CampaignDetailScreenState();
}

class _CampaignDetailScreenState extends ConsumerState<CampaignDetailScreen> {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    // Auto-refresh campaign data every 30s (entry count, status, enrollment state)
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        ref.invalidate(campaignProvider(widget.id));
        ref.invalidate(activeCampaignEnrollmentProvider);
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final id = widget.id;
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final campaign = ref.watch(campaignProvider(id));
    final enrolledLocally = ref.watch(enrolledCampaignIdsProvider).contains(id);
    final activeEnrollment = ref.watch(activeCampaignEnrollmentProvider).valueOrNull;
    final enrolledViaActive = activeEnrollment?['id'] == id;

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
        title: Text(t('campaign')),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, size: 20),
            onPressed: () {},
          ),
        ],
      ),
      body: campaign.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.muted))),
        data: (c) {
          final rewards = c['rewards'] as List? ?? [];
          final entries = c['_count']?['entries'] ?? 0;
          final endsAt = (c['endsAt'] as String?)?.toLocalDateTime();
          final status = c['status'] as String? ?? '';
          final isEnded = status == 'ENDED' || status == 'CANCELLED';
          final isEnrolled = enrolledLocally || enrolledViaActive || c['myEntry'] != null;

          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Venue
                      if (c['business']?['name'] != null)
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: Row(children: [
                                if (c['business']['logoUrl'] != null)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: Image.network(
                                      c['business']['logoUrl'],
                                      width: 16, height: 16,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, e, _) =>
                                        const Icon(Icons.location_on_outlined, color: AppTheme.subtle, size: 13),
                                    ),
                                  )
                                else
                                  const Icon(Icons.location_on_outlined, color: AppTheme.subtle, size: 13),
                                const SizedBox(width: 4),
                                Text(c['business']['name'],
                                  style: const TextStyle(color: AppTheme.subtle, fontSize: 12)),
                              ]),
                            ),
                            const SizedBox(width: 8),
                            if (isEnded)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: AppTheme.muted.withAlpha(20),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppTheme.muted.withAlpha(50)),
                                ),
                                child: Text(t('campaign_ended').toUpperCase(),
                                  style: const TextStyle(color: AppTheme.muted, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                              )
                            else
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF22C55E).withAlpha(20),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFF22C55E).withAlpha(50)),
                                ),
                                child: Row(children: [
                                  Container(width: 6, height: 6,
                                    decoration: const BoxDecoration(color: Color(0xFF22C55E), shape: BoxShape.circle)),
                                  const SizedBox(width: 5),
                                  Text(t('live_event').toUpperCase(),
                                    style: const TextStyle(color: Color(0xFF22C55E), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                                ]),
                              ),
                          ],
                        ),
                      const SizedBox(height: 20),

                      // Title
                      Text(c['name'] ?? '',
                        style: const TextStyle(
                          color: AppTheme.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                          height: 1.2,
                        )),
                      if (c['description'] != null) ...[
                        const SizedBox(height: 8),
                        Text(c['description'],
                          style: const TextStyle(color: AppTheme.subtle, fontSize: 14, height: 1.5)),
                      ],
                      const SizedBox(height: 32),

                      // Circular countdown
                      if (endsAt != null)
                        Center(child: _CountdownTimer(endsAt: endsAt, t: t)),

                      const SizedBox(height: 32),

                      // Stats row
                      Row(
                        children: [
                          _StatBox(icon: Icons.confirmation_number_outlined, value: '$entries', label: t('tickets')),
                          const SizedBox(width: 12),
                          _StatBox(icon: Icons.card_giftcard_outlined, value: '${rewards.length}', label: t('prizes')),
                        ],
                      ),
                      const SizedBox(height: 28),

                      // Prizes
                      if (rewards.isNotEmpty) ...[
                        Text(t('prizes'),
                          style: const TextStyle(color: AppTheme.subtle, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
                        const SizedBox(height: 12),
                        ...rewards.map((r) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.card,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppTheme.gold.withAlpha(50)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 40, height: 40,
                                decoration: BoxDecoration(
                                  color: AppTheme.gold.withAlpha(20),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.emoji_events, color: AppTheme.gold, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(r['name'] ?? '',
                                      style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w700)),
                                    if (r['description'] != null)
                                      Text(r['description'],
                                        style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                                  ],
                                ),
                              ),
                              if (r['inventory'] != null)
                                Text('${r['inventory'] - (r['allocated'] ?? 0)} left',
                                  style: const TextStyle(color: AppTheme.gold, fontSize: 12, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        )),
                        const SizedBox(height: 8),
                      ],
                    ],
                  ),
                ),
              ),

              // Bottom CTA
              Container(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                decoration: const BoxDecoration(
                  color: AppTheme.bg,
                  border: Border(top: BorderSide(color: AppTheme.border, width: 0.5)),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: isEnded
                    ? _EndedBanner(t: t)
                    : isEnrolled
                      ? _EnrolledBanner(t: t)
                      : c['type'] == 'SNAKE'
                        ? ElevatedButton.icon(
                            onPressed: () => context.push('/game/snake/$id'),
                            icon: const Text('🐍', style: TextStyle(fontSize: 18)),
                            label: Text(t('play_snake')),
                          )
                        : c['type'] == 'POINT_GUESS'
                        ? ElevatedButton.icon(
                            onPressed: () => context.push('/game/point-guess/$id'),
                            icon: const Text('🔢', style: TextStyle(fontSize: 18)),
                            label: Text(t('point_guess_title')),
                          )
                        : ElevatedButton.icon(
                            onPressed: () => context.push('/scan'),
                            icon: const Icon(Icons.qr_code_scanner, size: 20),
                            label: Text(t('scan_qr')),
                          ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _EnrolledBanner extends ConsumerWidget {
  final String Function(String) t;
  const _EnrolledBanner({required this.t});

  Future<void> _confirmLeave(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1a1a24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(t('leave_campaign'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
        content: Text(t('leave_confirm'), style: const TextStyle(color: Color(0xFF9b9bae), height: 1.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t('stay'), style: const TextStyle(color: Color(0xFF9b9bae))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(t('leave'), style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await createDio().delete('/entries/active');
      ref.read(enrolledCampaignIdsProvider.notifier).update((_) => {});
      ref.invalidate(activeCampaignEnrollmentProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF22C55E).withAlpha(15),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF22C55E).withAlpha(60)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 18),
                const SizedBox(width: 8),
                Text(t('already_enrolled'),
                  style: const TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.w700, fontSize: 15)),
              ],
            ),
          ),
        ),
        const SizedBox(width: 10),
        GestureDetector(
          onTap: () => _confirmLeave(context, ref),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.redAccent.withAlpha(20),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.redAccent.withAlpha(60)),
            ),
            child: Text(t('leave'),
              style: const TextStyle(color: Colors.redAccent, fontSize: 14, fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }
}

class _EndedBanner extends StatelessWidget {
  final String Function(String) t;
  const _EndedBanner({required this.t});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.lock_outline, color: AppTheme.muted, size: 18),
          const SizedBox(width: 8),
          Text(t('campaign_ended'),
            style: const TextStyle(color: AppTheme.muted, fontWeight: FontWeight.w600, fontSize: 15)),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  const _StatBox({required this.icon, required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppTheme.gold, size: 22),
            const SizedBox(height: 6),
            Text(value, style: const TextStyle(color: AppTheme.white, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 10, letterSpacing: 1)),
          ],
        ),
      ),
    );
  }
}

class _CountdownTimer extends StatefulWidget {
  final DateTime endsAt;
  final String Function(String) t;
  const _CountdownTimer({required this.endsAt, required this.t});

  @override
  State<_CountdownTimer> createState() => _CountdownTimerState();
}

class _CountdownTimerState extends State<_CountdownTimer> {
  late Timer _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _remaining = widget.endsAt.difference(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _remaining = widget.endsAt.difference(DateTime.now()));
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_remaining.isNegative) {
      return Text(widget.t('campaign_ended'), style: const TextStyle(color: AppTheme.muted));
    }

    final totalMinutes = _remaining.inMinutes;
    final seconds = _remaining.inSeconds % 60;
    final progress = _remaining.inSeconds / (60 * 60);

    return Column(
      children: [
        Text(widget.t('time_remaining'),
          style: const TextStyle(color: AppTheme.subtle, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
        const SizedBox(height: 16),
        SizedBox(
          width: 180,
          height: 180,
          child: Stack(
            alignment: Alignment.center,
            children: [
              CustomPaint(
                size: const Size(180, 180),
                painter: _CircularProgressPainter(progress: progress.clamp(0, 1)),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${totalMinutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
                    style: const TextStyle(
                      color: AppTheme.white,
                      fontSize: 40,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -1,
                    ),
                  ),
                  Text(
                      '${widget.t('closing_at')} ${_formatTime(widget.endsAt)}',
                      style: const TextStyle(color: AppTheme.muted, fontSize: 11),
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatTime(DateTime dt) {
    final local = dt.toLocal();
    final h = local.hour;
    final m = local.minute.toString().padLeft(2, '0');
    final period = h >= 12 ? 'PM' : 'AM';
    final hour = h > 12 ? h - 12 : (h == 0 ? 12 : h);
    return '$hour:$m $period';
  }
}

class _CircularProgressPainter extends CustomPainter {
  final double progress;
  const _CircularProgressPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;
    const strokeWidth = 4.0;

    // Track
    final trackPaint = Paint()
      ..color = AppTheme.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawCircle(center, radius, trackPaint);

    // Progress
    final progressPaint = Paint()
      ..color = AppTheme.gold
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(_CircularProgressPainter old) => old.progress != progress;
}
