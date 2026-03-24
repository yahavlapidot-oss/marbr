import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

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

// ── QR Scan Sheet ─────────────────────────────────────────────────────────────

class _SnakeScanSheet extends ConsumerStatefulWidget {
  final String campaignId;
  final VoidCallback onSuccess;
  const _SnakeScanSheet({required this.campaignId, required this.onSuccess});

  @override
  ConsumerState<_SnakeScanSheet> createState() => _SnakeScanSheetState();
}

class _SnakeScanSheetState extends ConsumerState<_SnakeScanSheet> {
  final _ctrl = MobileScannerController();
  bool _processing = false;
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null) return;

    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    setState(() { _processing = true; _error = null; });
    _ctrl.stop();

    try {
      await createDio().post('/entries', data: {
        'campaignId': code,
        'method': 'QR_SCAN',
        'code': code,
      });
      widget.onSuccess();
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg = data is Map ? data['message']?.toString() : null;
      String errorMsg = t('code_error');
      if (msg != null) {
        if (msg.contains('not active')) {
          errorMsg = t('not_active');
        } else if (msg.contains('Entry limit') || msg.contains('already')) {
          // Already has an entry — let them play
          widget.onSuccess();
          return;
        } else if (msg.contains('venue')) {
          errorMsg = t('must_be_at_venue');
        } else {
          errorMsg = msg;
        }
      }
      setState(() { _processing = false; _error = errorMsg; });
      _ctrl.start();
    } catch (_) {
      final locale = ref.read(localeProvider);
      setState(() { _processing = false; _error = AppL10n.of(locale, 'went_wrong'); });
      _ctrl.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    return Container(
      height: MediaQuery.of(context).size.height * 0.72,
      decoration: const BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: Stack(
          children: [
            // Camera
            MobileScanner(controller: _ctrl, onDetect: _onDetect),

            // Dark overlay with cutout
            CustomPaint(
              size: MediaQuery.of(context).size,
              painter: _ScanOverlay(),
            ),

            // Header
            Positioned(
              top: 0, left: 0, right: 0,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t('scan_to_play'),
                              style: const TextStyle(color: Colors.white, fontSize: 18,
                                  fontWeight: FontWeight.w800)),
                            const SizedBox(height: 2),
                            Text(t('point_camera_bar'),
                              style: const TextStyle(color: Colors.white60, fontSize: 13)),
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Container(
                          width: 36, height: 36,
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(30),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.close, color: Colors.white, size: 18),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Scan frame + status
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 220, height: 220,
                    child: Stack(
                      children: [
                        _corner(0), _corner(1), _corner(2), _corner(3),
                        if (_processing)
                          const Center(
                            child: CircularProgressIndicator(
                                color: AppTheme.gold, strokeWidth: 2)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (_error != null)
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 32),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withAlpha(220),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.error_outline, color: Colors.white, size: 16),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(_error!,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              textAlign: TextAlign.center),
                          ),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(140),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        t('show_bartender'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _corner(int pos) {
    const s = 26.0;
    const stroke = 3.0;
    const color = AppTheme.gold;
    final positions = [
      [true, true, false, false],   // TL: top, left
      [true, false, false, true],   // TR: top, right
      [false, true, true, false],   // BL: bottom, left
      [false, false, true, true],   // BR: bottom, right
    ];
    final p = positions[pos];
    return Positioned(
      top: p[0] ? 0 : null,
      bottom: p[2] ? 0 : null,
      left: p[1] ? 0 : null,
      right: p[3] ? 0 : null,
      child: CustomPaint(
        size: const Size(s, s),
        painter: _CornerPaint(pos: pos, color: color, stroke: stroke),
      ),
    );
  }
}

class _ScanOverlay extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const cutout = 220.0;
    final cx = size.width / 2;
    final cy = size.height / 2;
    final rect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx, cy), width: cutout, height: cutout),
      const Radius.circular(12),
    );
    final paint = Paint()..color = Colors.black.withAlpha(150);
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()..addRRect(rect),
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(_) => false;
}

class _CornerPaint extends CustomPainter {
  final int pos;
  final Color color;
  final double stroke;
  const _CornerPaint({required this.pos, required this.color, required this.stroke});

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    const r = Radius.circular(4);
    final w = size.width;
    final h = size.height;
    final rv = r.x;
    switch (pos) {
      case 0:
        canvas.drawPath(Path()
          ..moveTo(0, h)..lineTo(0, rv)..arcToPoint(Offset(rv, 0), radius: r)..lineTo(w, 0), p);
        break;
      case 1:
        canvas.drawPath(Path()
          ..moveTo(0, 0)..lineTo(w - rv, 0)..arcToPoint(Offset(w, rv), radius: r)..lineTo(w, h), p);
        break;
      case 2:
        canvas.drawPath(Path()
          ..moveTo(w, h)..lineTo(rv, h)..arcToPoint(Offset(0, h - rv), radius: r)..lineTo(0, 0), p);
        break;
      case 3:
        canvas.drawPath(Path()
          ..moveTo(w, 0)..lineTo(w, h - rv)..arcToPoint(Offset(w - rv, h), radius: r), p);
        canvas.drawPath(Path()
          ..moveTo(0, h)..lineTo(w - rv, h)..arcToPoint(Offset(w, h - rv), radius: r, clockwise: false), p);
        break;
    }
  }

  @override
  bool shouldRepaint(_) => false;
}

// ── Screen ────────────────────────────────────────────────────────────────────

class SnakeCampaignScreen extends ConsumerStatefulWidget {
  final String campaignId;
  const SnakeCampaignScreen({super.key, required this.campaignId});

  @override
  ConsumerState<SnakeCampaignScreen> createState() => _SnakeCampaignScreenState();
}

class _SnakeCampaignScreenState extends ConsumerState<SnakeCampaignScreen> {
  Future<void> _openScanner(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SnakeScanSheet(
        campaignId: widget.campaignId,
        onSuccess: () {
          Navigator.of(context).pop(); // close the sheet
          context.push('/game/snake/${widget.campaignId}/play').then((_) {
            ref.invalidate(snakeLeaderboardProvider(widget.campaignId));
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

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
          data: (c) => Text(c['name'] ?? t('snake_game')),
          orElse: () => Text(t('snake_game')),
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
                          Row(children: [
                            const Text('🐍', style: TextStyle(fontSize: 22)),
                            const SizedBox(width: 8),
                            Text(t('snake_leaderboard'),
                              style: const TextStyle(color: AppTheme.gold, fontSize: 16, fontWeight: FontWeight.w700)),
                          ]),
                          const SizedBox(height: 8),
                          Text(
                            t('snake_rules'),
                            style: const TextStyle(color: AppTheme.subtle, fontSize: 13, height: 1.5),
                          ),
                          const SizedBox(height: 12),
                          campaign.maybeWhen(
                            data: (c) {
                              final endsAt = c['endsAt'] != null ? DateTime.tryParse(c['endsAt']) : null;
                              if (endsAt == null) return const SizedBox.shrink();
                              final left = endsAt.difference(DateTime.now());
                              if (left.isNegative) {
                                return Text(t('campaign_ended'), style: const TextStyle(color: AppTheme.muted, fontSize: 12));
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
                        Text('LEADERBOARD',
                          style: const TextStyle(color: AppTheme.subtle, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
                        const Spacer(),
                        leaderboard.maybeWhen(
                          data: (lb) => Text(
                            '${lb['totalPlayers']} ${t('players')}',
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
                        child: Text(t('could_not_load_lb'), style: const TextStyle(color: AppTheme.muted)),
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
                                        Text(t('your_score'), style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
                                        Text('${myScore['score']} ${t('pts')} · ${myScore['foodEaten']} ${t('foods_eaten')}',
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
                              Padding(
                                padding: const EdgeInsets.all(32),
                                child: Text(t('no_scores'),
                                  style: const TextStyle(color: AppTheme.muted),
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
                                          Text('${entry['foodEaten']} ${t('foods_eaten')}',
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
                        : () => _openScanner(context, ref),
                    icon: Text(alreadyPlayed ? '✓' : '🐍',
                        style: const TextStyle(fontSize: 18)),
                    label: Text(alreadyPlayed ? t('already_played') : t('scan_to_play_btn')),
                  ),
                ),
              );
            },
            orElse: () => Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _openScanner(context, ref),
                  icon: const Text('🐍', style: TextStyle(fontSize: 18)),
                  label: Text(t('scan_to_play_btn')),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
