import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';
import '../../campaigns/providers/campaigns_provider.dart';

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final MobileScannerController _ctrl = MobileScannerController();
  bool _processing = false;
  String? _result;
  String? _subtitle;
  bool _success = false;
  bool _won = false;
  bool _isConflict = false;

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null) return;

    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    setState(() { _processing = true; _result = null; _subtitle = null; _isConflict = false; });
    _ctrl.stop();

    try {
      final res = await createDio().post('/entries', data: {
        'campaignId': code,
        'method': 'QR_SCAN',
        'code': code,
      });

      final reward = res.data['reward'];
      final campaignData = res.data['campaign'] as Map<String, dynamic>?;
      final campaignName = campaignData?['name'] as String?;
      final campaignType = campaignData?['type'] as String?;
      final campaignId = campaignData?['id'] as String?;
      final rewardName = reward?['reward']?['name'] as String?;

      // Mark enrolled locally for instant UI feedback; refresh server-side providers
      if (campaignId != null) {
        ref.read(enrolledCampaignIdsProvider.notifier)
            .update((s) => {...s, campaignId});
        ref.invalidate(campaignProvider(campaignId));
        ref.invalidate(activeCampaignEnrollmentProvider);
      }

      // SNAKE campaigns: navigate to snake screen instead of showing generic result
      if (campaignType == 'SNAKE' && campaignId != null) {
        _reset();
        if (mounted) context.push('/game/snake/$campaignId');
        return;
      }

      setState(() {
        _success = true;
        _won = reward != null;
        _result = reward != null ? t('you_won') : t('youre_in');
        _subtitle = reward != null
            ? rewardName ?? 'You got a reward!'
            : campaignName ?? t('good_luck');
      });
    } catch (e) {
      String msg = t('code_error');
      bool isConflict = false;
      if (e is DioException) {
        final data = e.response?.data;
        final serverMsg = data is Map ? data['message']?.toString() : null;
        if (serverMsg != null) {
          if (serverMsg.contains('invalid or expired')) {
            msg = t('code_expired');
          } else if (serverMsg.contains('Entry limit')) {
            msg = t('already_entered');
          } else if (serverMsg.contains('venue')) {
            msg = t('must_be_at_venue');
          } else if (serverMsg.contains('not active')) {
            msg = t('not_active');
          } else if (serverMsg.contains('already participating')) {
            msg = serverMsg;
            isConflict = true;
          } else {
            msg = serverMsg;
          }
        }
      }
      setState(() {
        _success = false;
        _won = false;
        _isConflict = isConflict;
        _result = isConflict ? t('already_in_campaign') : t('oops');
        _subtitle = msg;
      });
      if (!isConflict) {
        await Future.delayed(const Duration(seconds: 3));
        if (mounted) {
          setState(() { _processing = false; _result = null; _subtitle = null; });
          _ctrl.start();
        }
      }
    }
  }

  Future<void> _leaveAndReset() async {
    try {
      await createDio().delete('/entries/active');
    } catch (_) {}
    _reset();
  }

  void _reset() {
    setState(() { _processing = false; _result = null; _subtitle = null; _success = false; _won = false; _isConflict = false; });
    _ctrl.start();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: _result != null ? _resultView() : _scanView(),
    );
  }

  Widget _scanView() {
    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    return Stack(
      children: [
        // Full-screen scanner
        MobileScanner(controller: _ctrl, onDetect: _onDetect),

        // Dark overlay with cutout effect
        CustomPaint(
          size: MediaQuery.of(context).size,
          painter: _ScanOverlayPainter(),
        ),

        // Top header
        Positioned(
          top: 0, left: 0, right: 0,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(120),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.close, color: Colors.white, size: 18),
                    ),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(t('scan_title'),
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _ctrl.toggleTorch(),
                    icon: Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(120),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.flashlight_on_outlined, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Scan frame
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 240, height: 240,
                child: Stack(
                  children: [
                    // Corner decorations
                    ..._corners(),
                    // Scanning line animation
                    if (_processing)
                      const Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(150),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  t('point_camera'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _corners() {
    const size = 28.0;
    const stroke = 3.0;
    const color = AppTheme.gold;
    const r = Radius.circular(4);

    return [
      // Top-left
      Positioned(top: 0, left: 0, child: CustomPaint(size: const Size(size, size),
        painter: _CornerPainter(corner: 0, color: color, stroke: stroke, r: r))),
      // Top-right
      Positioned(top: 0, right: 0, child: CustomPaint(size: const Size(size, size),
        painter: _CornerPainter(corner: 1, color: color, stroke: stroke, r: r))),
      // Bottom-left
      Positioned(bottom: 0, left: 0, child: CustomPaint(size: const Size(size, size),
        painter: _CornerPainter(corner: 2, color: color, stroke: stroke, r: r))),
      // Bottom-right
      Positioned(bottom: 0, right: 0, child: CustomPaint(size: const Size(size, size),
        painter: _CornerPainter(corner: 3, color: color, stroke: stroke, r: r))),
    ];
  }

  Widget _resultView() {
    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final iconColor = _won
        ? AppTheme.gold
        : _success
            ? const Color(0xFF22C55E)
            : _isConflict
                ? Colors.orangeAccent
                : Colors.redAccent;
    final icon = _won
        ? Icons.emoji_events
        : _success
            ? Icons.check_circle_outline
            : _isConflict
                ? Icons.swap_horiz_outlined
                : Icons.error_outline;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                color: iconColor.withAlpha(20),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 52),
            ),
            const SizedBox(height: 28),
            Text(
              _result ?? '',
              style: TextStyle(
                color: _won ? AppTheme.gold : AppTheme.white,
                fontSize: 26,
                fontWeight: FontWeight.w800,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              _subtitle ?? '',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.subtle, fontSize: 15, height: 1.5),
            ),
            const SizedBox(height: 48),
            if (_isConflict) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _leaveAndReset,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.orangeAccent.withAlpha(200)),
                  child: Text(t('leave_and_scan')),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _reset,
                  child: Text(t('cancel')),
                ),
              ),
            ] else if (_success) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.pop(),
                  child: Text(t('done')),
                ),
              ),
            ] else
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _reset,
                  icon: const Icon(Icons.qr_code_scanner, size: 18),
                  label: Text(t('scan_again')),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const cutoutSize = 240.0;
    final cx = size.width / 2;
    final cy = size.height / 2;
    final left = cx - cutoutSize / 2;
    final top = cy - cutoutSize / 2;
    final cutout = RRect.fromRectAndRadius(
      Rect.fromLTWH(left, top, cutoutSize, cutoutSize),
      const Radius.circular(12),
    );

    final paint = Paint()..color = Colors.black.withAlpha(150);
    final full = Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final hole = Path()..addRRect(cutout);
    canvas.drawPath(Path.combine(PathOperation.difference, full, hole), paint);
  }

  @override
  bool shouldRepaint(_) => false;
}

class _CornerPainter extends CustomPainter {
  final int corner; // 0=TL, 1=TR, 2=BL, 3=BR
  final Color color;
  final double stroke;
  final Radius r;
  const _CornerPainter({required this.corner, required this.color, required this.stroke, required this.r});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;

    final w = size.width;
    final h = size.height;
    final rv = r.x;

    switch (corner) {
      case 0: // TL
        canvas.drawPath(Path()
          ..moveTo(0, h)..lineTo(0, rv)..arcToPoint(Offset(rv, 0), radius: r)..lineTo(w, 0), paint);
        break;
      case 1: // TR
        canvas.drawPath(Path()
          ..moveTo(0, 0)..lineTo(w - rv, 0)..arcToPoint(Offset(w, rv), radius: r)..lineTo(w, h), paint);
        break;
      case 2: // BL
        canvas.drawPath(Path()
          ..moveTo(w, h)..lineTo(rv, h)..arcToPoint(Offset(0, h - rv), radius: r)..lineTo(0, 0), paint);
        break;
      case 3: // BR
        canvas.drawPath(Path()
          ..moveTo(0, h)..lineTo(w, h - rv + rv)..arcToPoint(Offset(w - rv, h), radius: r, clockwise: false)..lineTo(0, h), paint);
        canvas.drawPath(Path()
          ..moveTo(w, 0)..lineTo(w, h - rv)..arcToPoint(Offset(w - rv, h), radius: r), paint);
        break;
    }
  }

  @override
  bool shouldRepaint(_) => false;
}
