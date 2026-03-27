import 'dart:async';
import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

// ── Dot painter ───────────────────────────────────────────────────────────────

class _DotPainter extends CustomPainter {
  final List<Offset> positions;
  final double radius;
  const _DotPainter({required this.positions, this.radius = 2.8});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFF59E0B)
      ..style = PaintingStyle.fill;
    for (final pos in positions) {
      canvas.drawCircle(pos, radius, paint);
    }
  }

  @override
  bool shouldRepaint(_DotPainter old) => old.positions != positions;
}

// ── Game states ───────────────────────────────────────────────────────────────

enum _GameState { ready, playing, submitting, result }

// ── Screen ────────────────────────────────────────────────────────────────────

class PointGuessGameScreen extends ConsumerStatefulWidget {
  final String campaignId;
  const PointGuessGameScreen({super.key, required this.campaignId});

  @override
  ConsumerState<PointGuessGameScreen> createState() => _PointGuessGameScreenState();
}

class _PointGuessGameScreenState extends ConsumerState<PointGuessGameScreen>
    with SingleTickerProviderStateMixin {
  static const _totalSeconds = 15;
  static const _squareSize = 280.0;
  static const _dotRadius = 2.8;
  static const _minDots = 100;
  static const _maxDots = 200;
  static const _correctThreshold = 10; // within ±10 = "correct"

  late AnimationController _timerAnim;
  _GameState _state = _GameState.ready;
  late int _actualCount;
  late List<Offset> _dotPositions;
  int _remaining = _totalSeconds;
  Timer? _countdown;
  final _guessCtrl = TextEditingController();
  final _focusNode = FocusNode();
  int _userGuess = 0;
  int? _resultScore;
  String? _submitError;
  late int _startMs;

  @override
  void initState() {
    super.initState();
    _timerAnim = AnimationController(
      vsync: this,
      duration: const Duration(seconds: _totalSeconds),
    );
    _generateDots();
  }

  void _generateDots() {
    final rng = Random();
    _actualCount = _minDots + rng.nextInt(_maxDots - _minDots + 1);
    _dotPositions = List.generate(_actualCount, (_) => Offset(
      _dotRadius + rng.nextDouble() * (_squareSize - 2 * _dotRadius),
      _dotRadius + rng.nextDouble() * (_squareSize - 2 * _dotRadius),
    ));
  }

  void _startGame() {
    _startMs = DateTime.now().millisecondsSinceEpoch;
    setState(() {
      _state = _GameState.playing;
      _remaining = _totalSeconds;
    });
    _timerAnim
      ..reset()
      ..forward();
    _countdown = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() => _remaining--);
      if (_remaining <= 0) {
        t.cancel();
        _submit();
      }
    });
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) _focusNode.requestFocus();
    });
  }

  void _submit() {
    _countdown?.cancel();
    _timerAnim.stop();
    final guess = int.tryParse(_guessCtrl.text.trim()) ?? 0;
    final score = (100 - (guess - _actualCount).abs()).clamp(0, 100);
    final durationMs = DateTime.now().millisecondsSinceEpoch - _startMs;
    setState(() {
      _userGuess = guess;
      _resultScore = score;
      _state = _GameState.submitting;
    });
    _postScore(guess, score, durationMs);
  }

  Future<void> _postScore(int guess, int score, int durationMs) async {
    try {
      await createDio().post(
        '/game/point-guess/${widget.campaignId}/score',
        data: {
          'guess': guess,
          'actualCount': _actualCount,
          'score': score,
          'durationMs': durationMs,
        },
      );
    } on DioException catch (e) {
      final msg = e.response?.data is Map ? e.response!.data['message'] : null;
      if (mounted) setState(() => _submitError = msg?.toString());
    } catch (_) {}
    if (mounted) setState(() => _state = _GameState.result);
  }

  @override
  void dispose() {
    _countdown?.cancel();
    _timerAnim.dispose();
    _guessCtrl.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // ── build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(t('point_guess_title')),
      ),
      body: SafeArea(
        child: switch (_state) {
          _GameState.ready => _buildReady(t),
          _GameState.playing => _buildPlaying(t),
          _GameState.submitting => _buildSubmitting(t),
          _GameState.result => _buildResult(t),
        },
      ),
    );
  }

  // ── Ready screen ──────────────────────────────────────────────────────────

  Widget _buildReady(String Function(String) t) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: AppTheme.gold.withAlpha(25),
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.gold.withAlpha(80), width: 2),
              ),
              child: const Center(
                child: Text('🔢', style: TextStyle(fontSize: 36)),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              t('point_guess_title'),
              style: const TextStyle(
                color: AppTheme.white,
                fontSize: 26,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              t('point_guess_rules'),
              style: const TextStyle(color: AppTheme.subtle, fontSize: 14, height: 1.6),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.gold.withAlpha(18),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.gold.withAlpha(60)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.timer_outlined, color: AppTheme.gold, size: 16),
                  SizedBox(width: 6),
                  Text(
                    '15 seconds',
                    style: TextStyle(color: AppTheme.gold, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 36),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _startGame,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.gold,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 1),
                ),
                child: Text(t('point_guess_tap_start')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Playing screen ────────────────────────────────────────────────────────

  Widget _buildPlaying(String Function(String) t) {
    final progress = _remaining / _totalSeconds;
    final isUrgent = _remaining <= 5;

    return Column(
      children: [
        // Timer bar
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  AnimatedBuilder(
                    animation: _timerAnim,
                    builder: (_, _) {
                      return Text(
                        '$_remaining',
                        style: TextStyle(
                          color: isUrgent ? Colors.redAccent : AppTheme.gold,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                        ),
                      );
                    },
                  ),
                  const Icon(Icons.timer_outlined, color: AppTheme.muted, size: 18),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: AnimatedBuilder(
                  animation: _timerAnim,
                  builder: (_, _) => LinearProgressIndicator(
                    value: progress,
                    backgroundColor: AppTheme.border,
                    valueColor: AlwaysStoppedAnimation(
                      isUrgent ? Colors.redAccent : AppTheme.gold,
                    ),
                    minHeight: 6,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Dot square
        Center(
          child: Container(
            width: _squareSize,
            height: _squareSize,
            decoration: BoxDecoration(
              color: const Color(0xFF1a1a24),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border, width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.gold.withAlpha(30),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: CustomPaint(
                size: const Size(_squareSize, _squareSize),
                painter: _DotPainter(positions: _dotPositions, radius: _dotRadius),
              ),
            ),
          ),
        ),

        const SizedBox(height: 24),

        // Guess input
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Column(
            children: [
              Text(
                t('point_guess_enter_guess'),
                style: const TextStyle(color: AppTheme.muted, fontSize: 13),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _guessCtrl,
                focusNode: _focusNode,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppTheme.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
                decoration: InputDecoration(
                  hintText: '???',
                  hintStyle: TextStyle(color: AppTheme.muted.withAlpha(100), fontSize: 28),
                  filled: true,
                  fillColor: AppTheme.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.gold, width: 2),
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.gold,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    t('point_guess_submit'),
                    style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Submitting screen ─────────────────────────────────────────────────────

  Widget _buildSubmitting(String Function(String) t) {
    return const Center(
      child: CircularProgressIndicator(color: AppTheme.gold),
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────

  Widget _buildResult(String Function(String) t) {
    final score = _resultScore ?? 0;
    final diff = (_userGuess - _actualCount).abs();
    final isCorrect = diff <= _correctThreshold;
    final isClose = diff <= 20 && !isCorrect;

    final resultLabel = isCorrect
        ? t('point_guess_correct')
        : isClose
            ? t('point_guess_close')
            : t('point_guess_off');

    final resultColor = isCorrect
        ? const Color(0xFF22c55e)
        : isClose
            ? AppTheme.gold
            : Colors.redAccent;

    final resultEmoji = isCorrect ? '🎯' : isClose ? '🔥' : '😅';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 8),

          // Result badge
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
            decoration: BoxDecoration(
              color: resultColor.withAlpha(20),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: resultColor.withAlpha(80), width: 1.5),
            ),
            child: Column(
              children: [
                Text(resultEmoji, style: const TextStyle(fontSize: 48)),
                const SizedBox(height: 12),
                Text(
                  resultLabel,
                  style: TextStyle(
                    color: resultColor,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (_submitError != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _submitError!,
                    style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Stats grid
          Row(
            children: [
              Expanded(child: _statBox(t('point_guess_actual'), '$_actualCount', AppTheme.white)),
              const SizedBox(width: 12),
              Expanded(child: _statBox(t('point_guess_your_guess'), '$_userGuess',
                diff == 0 ? const Color(0xFF22c55e) : AppTheme.subtle)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _statBox(t('point_guess_off_by'), '${diff == 0 ? "0 ✓" : diff}',
                isCorrect ? const Color(0xFF22c55e) : isClose ? AppTheme.gold : Colors.redAccent)),
              const SizedBox(width: 12),
              Expanded(child: _statBox(t('point_guess_accuracy'), '$score / 100', AppTheme.gold)),
            ],
          ),

          const SizedBox(height: 28),

          // Accuracy bar
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${t('point_guess_accuracy')}: $score%',
                style: const TextStyle(color: AppTheme.muted, fontSize: 12),
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: score / 100,
                  backgroundColor: AppTheme.border,
                  valueColor: AlwaysStoppedAnimation(resultColor),
                  minHeight: 10,
                ),
              ),
            ],
          ),

          const SizedBox(height: 32),

          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.subtle,
                side: const BorderSide(color: AppTheme.border),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(t('point_guess_see_lb')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statBox(String label, String value, Color valueColor) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(color: valueColor, fontSize: 22, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}
