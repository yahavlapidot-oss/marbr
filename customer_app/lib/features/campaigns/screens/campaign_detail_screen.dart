import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

final campaignProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await createDio().get('/campaigns/$id');
  return Map<String, dynamic>.from(res.data);
});

class CampaignDetailScreen extends ConsumerWidget {
  final String id;
  const CampaignDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaign = ref.watch(campaignProvider(id));

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
        title: const Text('Campaign'),
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
          final endsAt = c['endsAt'] != null ? DateTime.tryParse(c['endsAt']) : null;

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
                                const Icon(Icons.location_on_outlined, color: AppTheme.subtle, size: 13),
                                const SizedBox(width: 4),
                                Text(c['business']['name'],
                                  style: const TextStyle(color: AppTheme.subtle, fontSize: 12)),
                              ]),
                            ),
                            const SizedBox(width: 8),
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
                                const Text('LIVE EVENT',
                                  style: TextStyle(color: Color(0xFF22C55E), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
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
                        Center(child: _CountdownTimer(endsAt: endsAt)),

                      const SizedBox(height: 32),

                      // Stats row
                      Row(
                        children: [
                          _StatBox(icon: Icons.confirmation_number_outlined, value: '$entries', label: 'TICKETS'),
                          const SizedBox(width: 12),
                          _StatBox(icon: Icons.card_giftcard_outlined, value: '${rewards.length}', label: 'PRIZES'),
                        ],
                      ),
                      const SizedBox(height: 28),

                      // Prizes
                      if (rewards.isNotEmpty) ...[
                        const Text('PRIZES',
                          style: TextStyle(color: AppTheme.subtle, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
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
                  child: ElevatedButton.icon(
                    onPressed: () => context.go('/scan'),
                    icon: const Icon(Icons.qr_code_scanner, size: 20),
                    label: const Text('SCAN QR TO ENTER'),
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
  const _CountdownTimer({required this.endsAt});

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
      return const Text('Campaign ended', style: TextStyle(color: AppTheme.muted));
    }

    final totalMinutes = _remaining.inMinutes;
    final seconds = _remaining.inSeconds % 60;
    final progress = _remaining.inSeconds / (60 * 60);

    return Column(
      children: [
        const Text('TIME REMAINING',
          style: TextStyle(color: AppTheme.subtle, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
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
                      'Closing at ${_formatTime(widget.endsAt)}',
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
    final h = dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
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
