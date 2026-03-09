import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

// ── Game constants ────────────────────────────────────────────────────────────

const int _kCols = 20;
const int _kRows = 20;

/// Speed intervals in ms by foods eaten milestone
int _intervalMs(int foodEaten) {
  if (foodEaten < 5) return 350;
  if (foodEaten < 10) return 280;
  if (foodEaten < 15) return 220;
  if (foodEaten < 20) return 170;
  return 130;
}

/// Score formula (must match backend)
int _computeScore(int foodEaten) => foodEaten * (foodEaten + 1) * 5;

// ── Direction ─────────────────────────────────────────────────────────────────

enum Dir { up, down, left, right }

extension DirExt on Dir {
  Offset get delta {
    switch (this) {
      case Dir.up: return const Offset(0, -1);
      case Dir.down: return const Offset(0, 1);
      case Dir.left: return const Offset(-1, 0);
      case Dir.right: return const Offset(1, 0);
    }
  }

  bool get isOpposite {
    return false; // checked in state
  }

  Dir get opposite {
    switch (this) {
      case Dir.up: return Dir.down;
      case Dir.down: return Dir.up;
      case Dir.left: return Dir.right;
      case Dir.right: return Dir.left;
    }
  }
}

// ── Game state ────────────────────────────────────────────────────────────────

enum Phase { starting, playing, over, submitting, submitted }

class _GameState {
  final List<Offset> snake; // head first
  final Offset food;
  final Dir dir;
  final int foodEaten;
  final Phase phase;
  final int startMs;
  final int? endMs;
  // Submit result
  final int? rank;
  final int? totalPlayers;
  final String? error;

  const _GameState({
    required this.snake,
    required this.food,
    required this.dir,
    required this.foodEaten,
    required this.phase,
    required this.startMs,
    this.endMs,
    this.rank,
    this.totalPlayers,
    this.error,
  });

  int get score => _computeScore(foodEaten);
  int get durationMs => (endMs ?? DateTime.now().millisecondsSinceEpoch) - startMs;

  _GameState copyWith({
    List<Offset>? snake,
    Offset? food,
    Dir? dir,
    int? foodEaten,
    Phase? phase,
    int? endMs,
    int? rank,
    int? totalPlayers,
    String? error,
  }) {
    return _GameState(
      snake: snake ?? this.snake,
      food: food ?? this.food,
      dir: dir ?? this.dir,
      foodEaten: foodEaten ?? this.foodEaten,
      phase: phase ?? this.phase,
      startMs: startMs,
      endMs: endMs ?? this.endMs,
      rank: rank ?? this.rank,
      totalPlayers: totalPlayers ?? this.totalPlayers,
      error: error ?? this.error,
    );
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

class SnakeGameScreen extends ConsumerStatefulWidget {
  final String campaignId;
  const SnakeGameScreen({super.key, required this.campaignId});

  @override
  ConsumerState<SnakeGameScreen> createState() => _SnakeGameScreenState();
}

class _SnakeGameScreenState extends ConsumerState<SnakeGameScreen> {
  late _GameState _gs;
  Timer? _timer;
  String? _gameToken;
  final _rng = math.Random();

  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    _init();
  }

  @override
  void dispose() {
    _timer?.cancel();
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  Offset _randomFood(List<Offset> snake) {
    Offset food;
    do {
      food = Offset(_rng.nextInt(_kCols).toDouble(), _rng.nextInt(_kRows).toDouble());
    } while (snake.contains(food));
    return food;
  }

  void _init() {
    final startSnake = [
      const Offset(10, 10),
      const Offset(9, 10),
      const Offset(8, 10),
    ];
    _gs = _GameState(
      snake: startSnake,
      food: _randomFood(startSnake),
      dir: Dir.right,
      foodEaten: 0,
      phase: Phase.starting,
      startMs: DateTime.now().millisecondsSinceEpoch,
    );
    _startSession();
  }

  Future<void> _startSession() async {
    try {
      final res = await createDio().post('/game/snake/${widget.campaignId}/start');
      _gameToken = res.data['gameToken'] as String;
      if (mounted) {
        setState(() {
          _gs = _gs.copyWith(
            phase: Phase.playing,
            // Reset startMs now that we have the token
          );
        });
        _startTick();
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

  void _startTick() {
    _timer?.cancel();
    _timer = Timer.periodic(Duration(milliseconds: _intervalMs(_gs.foodEaten)), (_) => _tick());
  }

  void _tick() {
    if (_gs.phase != Phase.playing) return;

    final head = _gs.snake.first;
    final delta = _gs.dir.delta;
    final next = Offset(
      (head.dx + delta.dx + _kCols) % _kCols,
      (head.dy + delta.dy + _kRows) % _kRows,
    );

    // Collision with body
    if (_gs.snake.contains(next)) {
      _endGame();
      return;
    }

    final ateFood = next == _gs.food;
    final List<Offset> newSnake = [next, ..._gs.snake];
    if (!ateFood) newSnake.removeLast();

    final newFoodEaten = _gs.foodEaten + (ateFood ? 1 : 0);
    final newFood = ateFood ? _randomFood(newSnake) : _gs.food;

    setState(() {
      _gs = _gs.copyWith(
        snake: newSnake,
        food: newFood,
        foodEaten: newFoodEaten,
        phase: Phase.playing,
      );
    });

    // Adjust speed when crossing threshold
    if (ateFood) {
      _startTick();
    }
  }

  void _endGame() {
    _timer?.cancel();
    final endMs = DateTime.now().millisecondsSinceEpoch;
    setState(() {
      _gs = _gs.copyWith(phase: Phase.submitting, endMs: endMs);
    });
    _submitScore();
  }

  Future<void> _submitScore() async {
    if (_gameToken == null) {
      setState(() { _gs = _gs.copyWith(phase: Phase.over, error: 'No game token — cannot submit.'); });
      return;
    }
    try {
      final res = await createDio().post('/game/snake/${widget.campaignId}/submit', data: {
        'gameToken': _gameToken,
        'score': _gs.score,
        'foodEaten': _gs.foodEaten,
        'durationMs': _gs.durationMs,
      });
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
          _gs = _gs.copyWith(phase: Phase.over, error: 'Score submit failed: ${e.toString()}');
        });
      }
    }
  }

  void _changeDir(Dir newDir) {
    if (_gs.phase != Phase.playing) return;
    if (newDir == _gs.dir.opposite) return; // can't reverse
    setState(() { _gs = _gs.copyWith(dir: newDir); });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                // Score bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white54, size: 20),
                        onPressed: () => context.pop(),
                      ),
                      const Spacer(),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('${_gs.score}',
                            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -1)),
                          Text('🍎 ${_gs.foodEaten}',
                            style: const TextStyle(color: Colors.white54, fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),

                // Game board
                Expanded(
                  child: GestureDetector(
                    onVerticalDragEnd: (d) {
                      if (d.primaryVelocity! < 0) _changeDir(Dir.up);
                      if (d.primaryVelocity! > 0) _changeDir(Dir.down);
                    },
                    onHorizontalDragEnd: (d) {
                      if (d.primaryVelocity! < 0) _changeDir(Dir.left);
                      if (d.primaryVelocity! > 0) _changeDir(Dir.right);
                    },
                    child: AspectRatio(
                      aspectRatio: _kCols / _kRows,
                      child: CustomPaint(
                        painter: _SnakePainter(
                          snake: _gs.snake,
                          food: _gs.food,
                          cols: _kCols,
                          rows: _kRows,
                        ),
                      ),
                    ),
                  ),
                ),

                // Direction buttons
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Column(
                    children: [
                      _DirButton(icon: Icons.keyboard_arrow_up, onTap: () => _changeDir(Dir.up)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _DirButton(icon: Icons.keyboard_arrow_left, onTap: () => _changeDir(Dir.left)),
                          const SizedBox(width: 60),
                          _DirButton(icon: Icons.keyboard_arrow_right, onTap: () => _changeDir(Dir.right)),
                        ],
                      ),
                      _DirButton(icon: Icons.keyboard_arrow_down, onTap: () => _changeDir(Dir.down)),
                    ],
                  ),
                ),
              ],
            ),

            // Starting overlay
            if (_gs.phase == Phase.starting)
              _Overlay(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2),
                    SizedBox(height: 16),
                    Text('Starting game...', style: TextStyle(color: Colors.white, fontSize: 16)),
                  ],
                ),
              ),

            // Game over / submitted overlay
            if (_gs.phase == Phase.over || _gs.phase == Phase.submitting || _gs.phase == Phase.submitted)
              _Overlay(
                child: Container(
                  margin: const EdgeInsets.all(24),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1a1a24),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.gold.withAlpha(60)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_gs.phase == Phase.submitting) ...[
                        const CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2),
                        const SizedBox(height: 16),
                        const Text('Submitting score...', style: TextStyle(color: Colors.white70)),
                      ] else if (_gs.phase == Phase.submitted) ...[
                        const Text('🐍', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 8),
                        const Text('GAME OVER',
                          style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 1)),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _ResultStat(label: 'SCORE', value: '${_gs.score}'),
                            _ResultStat(label: 'FOODS', value: '${_gs.foodEaten}'),
                            if (_gs.rank != null) _ResultStat(label: 'RANK', value: '#${_gs.rank}'),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (_gs.totalPlayers != null)
                          Text('out of ${_gs.totalPlayers} players',
                            style: const TextStyle(color: Colors.white38, fontSize: 12)),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () => context.pop(),
                            child: const Text('BACK TO LEADERBOARD'),
                          ),
                        ),
                      ] else ...[
                        // Error phase
                        const Text('⚠️', style: TextStyle(fontSize: 40)),
                        const SizedBox(height: 12),
                        Text(
                          _gs.error ?? 'Something went wrong',
                          style: const TextStyle(color: Colors.white70, fontSize: 14),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton(
                          onPressed: () => context.pop(),
                          child: const Text('BACK'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Painter ───────────────────────────────────────────────────────────────────

class _SnakePainter extends CustomPainter {
  final List<Offset> snake;
  final Offset food;
  final int cols;
  final int rows;

  const _SnakePainter({
    required this.snake,
    required this.food,
    required this.cols,
    required this.rows,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cellW = size.width / cols;
    final cellH = size.height / rows;
    const gap = 1.0;

    // Grid background
    final bgPaint = Paint()..color = const Color(0xFF0d0d14);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    // Draw grid lines (subtle)
    final gridPaint = Paint()..color = const Color(0xFF1a1a24);
    for (int x = 0; x <= cols; x++) {
      canvas.drawLine(Offset(x * cellW, 0), Offset(x * cellW, size.height), gridPaint);
    }
    for (int y = 0; y <= rows; y++) {
      canvas.drawLine(Offset(0, y * cellH), Offset(size.width, y * cellH), gridPaint);
    }

    // Draw food
    final foodPaint = Paint()..color = const Color(0xFFEF4444);
    final foodRect = Rect.fromLTWH(
      food.dx * cellW + gap,
      food.dy * cellH + gap,
      cellW - gap * 2,
      cellH - gap * 2,
    );
    canvas.drawRRect(RRect.fromRectAndRadius(foodRect, const Radius.circular(3)), foodPaint);

    // Draw snake
    for (int i = 0; i < snake.length; i++) {
      final seg = snake[i];
      final isHead = i == 0;
      final snakePaint = Paint()
        ..color = isHead ? AppTheme.gold : Color.lerp(AppTheme.gold, const Color(0xFF22C55E), i / snake.length.toDouble())!;

      final rect = Rect.fromLTWH(
        seg.dx * cellW + gap,
        seg.dy * cellH + gap,
        cellW - gap * 2,
        cellH - gap * 2,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(3)),
        snakePaint,
      );
    }
  }

  @override
  bool shouldRepaint(_SnakePainter old) =>
      old.snake != snake || old.food != food;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _Overlay extends StatelessWidget {
  final Widget child;
  const _Overlay({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withAlpha(180),
      alignment: Alignment.center,
      child: child,
    );
  }
}

class _ResultStat extends StatelessWidget {
  final String label;
  final String value;
  const _ResultStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
          style: const TextStyle(color: AppTheme.gold, fontSize: 28, fontWeight: FontWeight.w800)),
        Text(label,
          style: const TextStyle(color: Colors.white38, fontSize: 10, letterSpacing: 1.5)),
      ],
    );
  }
}

class _DirButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _DirButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: const Color(0xFF1a1a24),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF2a2a38)),
        ),
        child: Icon(icon, color: Colors.white70, size: 28),
      ),
    );
  }
}
