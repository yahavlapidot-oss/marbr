import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

// ── Constants ─────────────────────────────────────────────────────────────────

const int _kCols = 15;
const int _kRows = 15;

/// Tick interval in ms (lower = faster). Starts aggressive, gets brutal.
int _intervalMs(int foodEaten) {
  if (foodEaten < 3) return 250;
  if (foodEaten < 7) return 200;
  if (foodEaten < 12) return 160;
  if (foodEaten < 18) return 130;
  return 100;
}

int _computeScore(int foodEaten) => foodEaten * (foodEaten + 1) * 5;

// ── Direction ─────────────────────────────────────────────────────────────────

enum Dir { up, down, left, right }

extension DirExt on Dir {
  Offset get delta {
    switch (this) {
      case Dir.up:    return const Offset(0, -1);
      case Dir.down:  return const Offset(0, 1);
      case Dir.left:  return const Offset(-1, 0);
      case Dir.right: return const Offset(1, 0);
    }
  }

  Dir get opposite {
    switch (this) {
      case Dir.up:    return Dir.down;
      case Dir.down:  return Dir.up;
      case Dir.left:  return Dir.right;
      case Dir.right: return Dir.left;
    }
  }
}

// ── Game state ────────────────────────────────────────────────────────────────

enum Phase { starting, playing, over, submitting, submitted }

class _GameState {
  final List<Offset> snake; // head first, in grid coords
  final Offset food;
  final Dir dir;      // direction used last tick
  final Dir nextDir;  // queued direction for next tick
  final int foodEaten;
  final Phase phase;
  final int startMs;
  final int? endMs;
  final int? rank;
  final int? totalPlayers;
  final String? error;

  const _GameState({
    required this.snake,
    required this.food,
    required this.dir,
    required this.nextDir,
    required this.foodEaten,
    required this.phase,
    required this.startMs,
    this.endMs,
    this.rank,
    this.totalPlayers,
    this.error,
  });

  int get score => _computeScore(foodEaten);
  int get durationMs =>
      (endMs ?? DateTime.now().millisecondsSinceEpoch) - startMs;

  _GameState copyWith({
    List<Offset>? snake,
    Offset? food,
    Dir? dir,
    Dir? nextDir,
    int? foodEaten,
    Phase? phase,
    int? endMs,
    int? rank,
    int? totalPlayers,
    String? error,
  }) => _GameState(
    snake: snake ?? this.snake,
    food: food ?? this.food,
    dir: dir ?? this.dir,
    nextDir: nextDir ?? this.nextDir,
    foodEaten: foodEaten ?? this.foodEaten,
    phase: phase ?? this.phase,
    startMs: startMs,
    endMs: endMs ?? this.endMs,
    rank: rank ?? this.rank,
    totalPlayers: totalPlayers ?? this.totalPlayers,
    error: error ?? this.error,
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

class SnakeGameScreen extends ConsumerStatefulWidget {
  final String campaignId;
  const SnakeGameScreen({super.key, required this.campaignId});

  @override
  ConsumerState<SnakeGameScreen> createState() => _SnakeGameScreenState();
}

class _SnakeGameScreenState extends ConsumerState<SnakeGameScreen>
    with TickerProviderStateMixin {
  late _GameState _gs;
  late final Ticker _ticker;
  late final AnimationController _deathAnim;

  String? _gameToken;
  final _rng = math.Random();

  // Smooth interpolation: lerp between prev and curr positions each frame
  List<Offset> _prevSnake = [];
  List<Offset> _currSnake = [];
  Offset _prevFood = Offset.zero;
  Offset _currFood = Offset.zero;
  double _progress = 0.0; // 0 → 1 between ticks
  int _lastTickUs = 0; // microseconds (from Ticker.elapsed) at last game tick

  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    _deathAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _ticker = createTicker(_onTick);
    _init();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _deathAnim.dispose();
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  // ── Game setup ─────────────────────────────────────────────────────────────

  Offset _randomFood(List<Offset> snake) {
    Offset food;
    do {
      food = Offset(
        _rng.nextInt(_kCols).toDouble(),
        _rng.nextInt(_kRows).toDouble(),
      );
    } while (snake.contains(food));
    return food;
  }

  void _init() {
    final startSnake = [
      const Offset(8, 7),
      const Offset(7, 7),
      const Offset(6, 7),
    ];
    final food = _randomFood(startSnake);
    _gs = _GameState(
      snake: startSnake,
      food: food,
      dir: Dir.right,
      nextDir: Dir.right,
      foodEaten: 0,
      phase: Phase.starting,
      startMs: DateTime.now().millisecondsSinceEpoch,
    );
    _prevSnake = List.from(startSnake);
    _currSnake = List.from(startSnake);
    _prevFood = food;
    _currFood = food;
    _startSession();
  }

  Future<void> _startSession() async {
    try {
      final res =
          await createDio().post('/game/snake/${widget.campaignId}/start');
      _gameToken = res.data['gameToken'] as String;
      if (mounted) {
        _lastTickUs = 0; // will be set on first ticker frame
        setState(() {
          _gs = _gs.copyWith(phase: Phase.playing);
        });
        _ticker.start();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _gs = _gs.copyWith(phase: Phase.over, error: _friendlyError(e));
        });
      }
    }
  }

  String _friendlyError(dynamic e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('already played') || msg.contains('conflict')) {
      return 'You have already played this campaign.';
    }
    if (msg.contains('not active')) return 'Campaign is not active.';
    return 'Could not start game. Try again.';
  }

  // ── Game loop (Ticker-driven, ~60fps) ──────────────────────────────────────

  void _onTick(Duration elapsed) {
    if (_gs.phase != Phase.playing) return;

    final nowUs = elapsed.inMicroseconds;
    if (_lastTickUs == 0) {
      // First frame: initialise reference time; first game tick in `_intervalMs` ms
      _lastTickUs = nowUs;
    }

    final intervalUs = _intervalMs(_gs.foodEaten) * 1000;
    final sinceLastUs = nowUs - _lastTickUs;

    if (sinceLastUs >= intervalUs) {
      _lastTickUs = nowUs;
      _prevSnake = List.from(_currSnake);
      _prevFood = _currFood;
      _progress = 0.0;
      _doGameTick();
    } else {
      setState(() {
        _progress = sinceLastUs / intervalUs;
      });
    }
  }

  void _doGameTick() {
    if (_gs.phase != Phase.playing) return;

    final gs = _gs;
    final dir = gs.nextDir;
    final head = gs.snake.first;
    final delta = dir.delta;
    final next = Offset(head.dx + delta.dx, head.dy + delta.dy);

    // Wall collision → instant death
    if (next.dx < 0 || next.dx >= _kCols || next.dy < 0 || next.dy >= _kRows) {
      _endGame();
      return;
    }

    // Self collision (body without last tail which moves away)
    if (gs.snake.sublist(0, gs.snake.length - 1).contains(next)) {
      _endGame();
      return;
    }

    final ateFood = next == gs.food;
    final newSnake = [next, ...gs.snake];
    if (!ateFood) newSnake.removeLast();

    final newFoodEaten = gs.foodEaten + (ateFood ? 1 : 0);
    final newFood = ateFood ? _randomFood(newSnake) : gs.food;

    _currSnake = newSnake;
    _currFood = newFood;

    setState(() {
      _gs = gs.copyWith(
        snake: newSnake,
        food: newFood,
        dir: dir,
        foodEaten: newFoodEaten,
      );
    });
  }

  void _endGame() {
    _ticker.stop();
    final endMs = DateTime.now().millisecondsSinceEpoch;
    _deathAnim.forward(from: 0.0);
    setState(() {
      _gs = _gs.copyWith(phase: Phase.submitting, endMs: endMs);
    });
    _submitScore();
  }

  Future<void> _submitScore() async {
    if (_gameToken == null) {
      setState(() {
        _gs = _gs.copyWith(phase: Phase.over, error: 'No game token.');
      });
      return;
    }
    try {
      final res = await createDio()
          .post('/game/snake/${widget.campaignId}/submit', data: {
        'gameToken': _gameToken,
        'score': _gs.score,
        'foodEaten': _gs.foodEaten,
        'durationMs': _gs.durationMs,
      });
      // Let death flash finish before showing result card
      await Future.delayed(const Duration(milliseconds: 700));
      if (mounted) {
        setState(() {
          _gs = _gs.copyWith(
            phase: Phase.submitted,
            rank: res.data['rank'] as int?,
            totalPlayers: res.data['totalPlayers'] as int?,
          );
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _gs = _gs.copyWith(phase: Phase.over, error: 'Score submit failed.');
        });
      }
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  void _changeDir(Dir newDir) {
    if (_gs.phase != Phase.playing) return;
    if (newDir == _gs.dir.opposite) return; // cannot reverse
    setState(() {
      _gs = _gs.copyWith(nextDir: newDir);
    });
  }

  // ── Smooth interpolation helpers ──────────────────────────────────────────

  List<Offset> get _interpSnake {
    final t = _progress;
    final prev = _prevSnake;
    final curr = _currSnake;
    final len = math.max(prev.length, curr.length);
    final result = <Offset>[];
    for (int i = 0; i < len; i++) {
      if (i >= prev.length) {
        result.add(curr[i]);
      } else if (i >= curr.length) {
        result.add(prev[i]);
      } else {
        result.add(Offset.lerp(prev[i], curr[i], t)!);
      }
    }
    return result;
  }

  Offset get _interpFood => Offset.lerp(_prevFood, _currFood, _progress)!;

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF08080F),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                _buildHud(),
                Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onVerticalDragEnd: (d) {
                      if ((d.primaryVelocity ?? 0) < 0) _changeDir(Dir.up);
                      if ((d.primaryVelocity ?? 0) > 0) _changeDir(Dir.down);
                    },
                    onHorizontalDragEnd: (d) {
                      if ((d.primaryVelocity ?? 0) < 0) _changeDir(Dir.left);
                      if ((d.primaryVelocity ?? 0) > 0) _changeDir(Dir.right);
                    },
                    child: Center(
                      child: AspectRatio(
                        aspectRatio: _kCols / _kRows,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: CustomPaint(
                            painter: _SnakePainter(
                              snake: _interpSnake,
                              food: _interpFood,
                              progress: _progress,
                              cols: _kCols,
                              rows: _kRows,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                _buildDpad(),
              ],
            ),

            // Red death flash
            AnimatedBuilder(
              animation: _deathAnim,
              builder: (_, child) {
                final v = _deathAnim.value;
                if (v == 0) return const SizedBox.shrink();
                final alpha = v < 0.3
                    ? (v / 0.3) * 0.55
                    : ((1 - v) / 0.7) * 0.55;
                return Positioned.fill(
                  child: IgnorePointer(
                    child: Container(
                      color: Colors.red.withValues(alpha: alpha),
                    ),
                  ),
                );
              },
            ),

            // Starting overlay
            if (_gs.phase == Phase.starting)
              _buildFullOverlay(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2),
                    SizedBox(height: 16),
                    Text(
                      'Loading game…',
                      style: TextStyle(color: Colors.white54, fontSize: 14),
                    ),
                  ],
                ),
              ),

            // Result overlay
            if (_gs.phase == Phase.submitting ||
                _gs.phase == Phase.submitted ||
                _gs.phase == Phase.over)
              _buildResultOverlay(),
          ],
        ),
      ),
    );
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  Widget _buildHud() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Row(
        children: [
          _IconBtn(
            icon: Icons.close,
            onTap: () => context.pop(),
          ),
          const Spacer(),
          // Score chip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
            decoration: BoxDecoration(
              color: const Color(0xFF141420),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppTheme.gold.withValues(alpha: 0.35),
              ),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.gold.withValues(alpha: 0.08),
                  blurRadius: 12,
                  spreadRadius: 0,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${_gs.score}',
                  style: const TextStyle(
                    color: AppTheme.gold,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  '🍎 ×${_gs.foodEaten}',
                  style: const TextStyle(color: Colors.white30, fontSize: 12),
                ),
              ],
            ),
          ),
          const Spacer(),
          // Speed badge
          _SpeedBadge(food: _gs.foodEaten),
        ],
      ),
    );
  }

  // ── D-pad ──────────────────────────────────────────────────────────────────

  Widget _buildDpad() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20, top: 6),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _DpadBtn(icon: Icons.keyboard_arrow_up_rounded, onTap: () => _changeDir(Dir.up)),
          const SizedBox(height: 3),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _DpadBtn(icon: Icons.keyboard_arrow_left_rounded, onTap: () => _changeDir(Dir.left)),
              const SizedBox(width: 3),
              // D-pad centre
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: const Color(0xFF14141E),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF252535)),
                ),
                child: Center(
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: AppTheme.gold.withValues(alpha: 0.35),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 3),
              _DpadBtn(icon: Icons.keyboard_arrow_right_rounded, onTap: () => _changeDir(Dir.right)),
            ],
          ),
          const SizedBox(height: 3),
          _DpadBtn(icon: Icons.keyboard_arrow_down_rounded, onTap: () => _changeDir(Dir.down)),
        ],
      ),
    );
  }

  // ── Overlays ───────────────────────────────────────────────────────────────

  Widget _buildFullOverlay({required Widget child}) => Container(
        color: Colors.black.withValues(alpha: 0.75),
        alignment: Alignment.center,
        child: child,
      );

  Widget _buildResultOverlay() {
    return _buildFullOverlay(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: const Color(0xFF10101A),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: AppTheme.gold.withValues(alpha: 0.45)),
          boxShadow: [
            BoxShadow(
              color: AppTheme.gold.withValues(alpha: 0.12),
              blurRadius: 50,
              spreadRadius: 4,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_gs.phase == Phase.submitting) ...[
              const CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2),
              const SizedBox(height: 16),
              const Text('Submitting score…',
                  style: TextStyle(color: Colors.white38, fontSize: 13)),
            ] else if (_gs.phase == Phase.submitted) ...[
              const Text('🐍', style: TextStyle(fontSize: 56)),
              const SizedBox(height: 6),
              const Text(
                'GAME OVER',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 4,
                ),
              ),
              const SizedBox(height: 28),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _ResultStat(label: 'SCORE', value: '${_gs.score}', gold: true),
                  _ResultStat(label: 'FOOD', value: '${_gs.foodEaten}'),
                  if (_gs.rank != null)
                    _ResultStat(label: 'RANK', value: '#${_gs.rank}'),
                ],
              ),
              if (_gs.totalPlayers != null) ...[
                const SizedBox(height: 6),
                Text(
                  'out of ${_gs.totalPlayers} players',
                  style: const TextStyle(
                      color: Colors.white24, fontSize: 11, letterSpacing: 0.5),
                ),
              ],
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.gold,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  onPressed: () => context.pop(),
                  child: const Text(
                    'BACK TO LEADERBOARD',
                    style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                        letterSpacing: 0.8),
                  ),
                ),
              ),
            ] else ...[
              const Text('💀', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              Text(
                _gs.error ?? 'Something went wrong',
                style: const TextStyle(color: Colors.white54, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1C1C2A),
                    foregroundColor: Colors.white60,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  onPressed: () => context.pop(),
                  child: const Text('BACK'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Painter ───────────────────────────────────────────────────────────────────

class _SnakePainter extends CustomPainter {
  final List<Offset> snake; // interpolated, in grid coords
  final Offset food;        // interpolated, in grid coords
  final double progress;    // 0→1, used for pulsing effects
  final int cols;
  final int rows;

  const _SnakePainter({
    required this.snake,
    required this.food,
    required this.progress,
    required this.cols,
    required this.rows,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cw = size.width / cols;
    final ch = size.height / rows;

    _drawBackground(canvas, size);
    _drawGrid(canvas, size, cw, ch);
    _drawFood(canvas, cw, ch);
    if (snake.isNotEmpty) _drawSnake(canvas, size, cw, ch);
  }

  // ── Background ─────────────────────────────────────────────────────────────

  void _drawBackground(Canvas canvas, Size size) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        const Radius.circular(14),
      ),
      Paint()..color = const Color(0xFF0A0A12),
    );
  }

  // ── Grid dots (very subtle) ────────────────────────────────────────────────

  void _drawGrid(Canvas canvas, Size size, double cw, double ch) {
    final p = Paint()..color = const Color(0xFF181824);
    for (int x = 1; x < cols; x++) {
      for (int y = 1; y < rows; y++) {
        canvas.drawCircle(Offset(x * cw, y * ch), 1.2, p);
      }
    }
  }

  // ── Food ───────────────────────────────────────────────────────────────────

  void _drawFood(Canvas canvas, double cw, double ch) {
    final pulse = 1.0 + 0.09 * math.sin(progress * math.pi);
    final cx = (food.dx + 0.5) * cw;
    final cy = (food.dy + 0.5) * ch;
    final r = cw * 0.34 * pulse;

    // Outer ambient glow
    canvas.drawCircle(
      Offset(cx, cy),
      r * 2.6,
      Paint()
        ..color = const Color(0xFFEF4444).withValues(alpha: 0.10)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10),
    );

    // Mid glow ring
    canvas.drawCircle(
      Offset(cx, cy),
      r * 1.5,
      Paint()
        ..color = const Color(0xFFEF4444).withValues(alpha: 0.22)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5),
    );

    // Solid body with gradient
    canvas.drawCircle(
      Offset(cx, cy),
      r,
      Paint()
        ..shader = RadialGradient(
          colors: [const Color(0xFFFF7070), const Color(0xFFDC2626)],
          stops: const [0.0, 1.0],
        ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: r)),
    );

    // Specular highlight
    canvas.drawCircle(
      Offset(cx - r * 0.28, cy - r * 0.28),
      r * 0.28,
      Paint()..color = Colors.white.withValues(alpha: 0.55),
    );
  }

  // ── Snake ──────────────────────────────────────────────────────────────────

  void _drawSnake(Canvas canvas, Size size, double cw, double ch) {
    // Convert grid coords → pixel centers
    final px =
        snake.map((s) => Offset((s.dx + 0.5) * cw, (s.dy + 0.5) * ch)).toList();

    final strokeW = cw * 0.70;

    if (px.length > 1) {
      final path = _buildPath(px);

      // Ambient glow (wide, blurred)
      canvas.drawPath(
        path,
        Paint()
          ..color = AppTheme.gold.withValues(alpha: 0.25)
          ..strokeWidth = strokeW + 10
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round
          ..style = PaintingStyle.stroke
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10),
      );

      // Body fill — gold→green gradient along the whole board
      canvas.drawPath(
        path,
        Paint()
          ..shader = const LinearGradient(
            colors: [Color(0xFFF5C518), Color(0xFF16A34A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
          ..strokeWidth = strokeW
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round
          ..style = PaintingStyle.stroke,
      );
    } else {
      // Single segment fallback
      canvas.drawCircle(px[0], strokeW * 0.5, Paint()..color = AppTheme.gold);
    }

    // Head highlight
    final head = px.first;
    canvas.drawCircle(
      head,
      strokeW * 0.54,
      Paint()
        ..color = const Color(0xFFF5C518)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
    );
    canvas.drawCircle(
      head,
      strokeW * 0.50,
      Paint()..color = const Color(0xFFF5C518),
    );

    // Eyes
    if (px.length >= 2) {
      final dx = px[0].dx - px[1].dx;
      final dy = px[0].dy - px[1].dy;
      final len = math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        final fx = dx / len; // forward unit vector
        final fy = dy / len;
        final px_ = -fy;    // perpendicular unit vector
        final py_ = fx;

        final fwd = strokeW * 0.20;
        final side = strokeW * 0.22;
        final eyeR = strokeW * 0.11;

        for (final s in [-1.0, 1.0]) {
          final ex = head.dx + fx * fwd + px_ * s * side;
          final ey = head.dy + fy * fwd + py_ * s * side;
          canvas.drawCircle(Offset(ex, ey), eyeR, Paint()..color = Colors.black87);
          canvas.drawCircle(
            Offset(ex + eyeR * 0.3, ey - eyeR * 0.3),
            eyeR * 0.3,
            Paint()..color = Colors.white,
          );
        }
      }
    }
  }

  Path _buildPath(List<Offset> pts) {
    // Build path from tail → head so gradient reads head=gold
    final path = Path();
    path.moveTo(pts.last.dx, pts.last.dy);
    for (int i = pts.length - 2; i >= 0; i--) {
      path.lineTo(pts[i].dx, pts[i].dy);
    }
    return path;
  }

  @override
  bool shouldRepaint(_SnakePainter old) => true; // always repaint for smooth anim
}

// ── Small widgets ─────────────────────────────────────────────────────────────

class _IconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _IconBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFF14141E),
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: const Color(0xFF252535)),
          ),
          child: Icon(icon, color: Colors.white38, size: 18),
        ),
      );
}

class _SpeedBadge extends StatelessWidget {
  final int food;
  const _SpeedBadge({required this.food});

  String get _label {
    if (food < 3) return 'SLOW';
    if (food < 7) return 'MED';
    if (food < 12) return 'FAST';
    if (food < 18) return 'WILD';
    return 'MAX!';
  }

  Color get _color {
    if (food < 3) return Colors.white30;
    if (food < 7) return const Color(0xFF22C55E);
    if (food < 12) return const Color(0xFFF59E0B);
    if (food < 18) return const Color(0xFFEF4444);
    return const Color(0xFFDC2626);
  }

  @override
  Widget build(BuildContext context) => Container(
        width: 46,
        height: 38,
        decoration: BoxDecoration(
          color: const Color(0xFF14141E),
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: const Color(0xFF252535)),
        ),
        child: Center(
          child: Text(
            _label,
            style: TextStyle(
                color: _color, fontSize: 8, fontWeight: FontWeight.w900),
          ),
        ),
      );
}

class _DpadBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _DpadBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: const Color(0xFF14141E),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF252535)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Icon(icon, color: Colors.white54, size: 30),
        ),
      );
}

class _ResultStat extends StatelessWidget {
  final String label;
  final String value;
  final bool gold;
  const _ResultStat({required this.label, required this.value, this.gold = false});

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: gold ? AppTheme.gold : Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: const TextStyle(
                color: Colors.white30, fontSize: 10, letterSpacing: 1.5),
          ),
        ],
      );
}
