import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  String _parseError(DioException e) {
    final data = e.response?.data;
    final msg = data is Map ? data['message']?.toString() : null;
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Request timed out. Try again.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'No connection. Check your internet.';
    }
    return msg ?? 'Something went wrong. Try again.';
  }

  Future<void> _sendOtp() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) {
      setState(() => _error = 'Please enter your phone number');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await createDio().post('/auth/otp/send', data: {'target': phone});
      final devCode = res.data['devCode'] as String?;
      if (mounted) context.push('/otp', extra: {'target': phone, 'devCode': devCode});
    } on DioException catch (e) {
      setState(() => _error = _parseError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: SizedBox(
            height: MediaQuery.of(context).size.height -
                MediaQuery.of(context).padding.top - 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(flex: 2),

                // Logo
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppTheme.gold.withAlpha(20),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.gold.withAlpha(60)),
                  ),
                  child: const Icon(Icons.sports_bar, color: AppTheme.gold, size: 28),
                ),
                const SizedBox(height: 20),
                Text(
                  'MrBar',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        color: AppTheme.white,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                      ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Real-time promos. Instant wins.\nRedeem on the spot.',
                  style: TextStyle(color: AppTheme.muted, fontSize: 15, height: 1.5),
                ),

                const Spacer(flex: 3),

                const Text(
                  'Enter your phone number',
                  style: TextStyle(
                    color: AppTheme.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  "We'll send you a one-time code to sign in or create your account.",
                  style: TextStyle(color: AppTheme.muted, fontSize: 14, height: 1.4),
                ),
                const SizedBox(height: 20),

                TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: AppTheme.white, fontSize: 16),
                  decoration: const InputDecoration(
                    hintText: '+972 50 000 0000',
                    prefixIcon: Icon(Icons.phone_outlined, color: AppTheme.muted, size: 20),
                  ),
                  onSubmitted: (_) => _sendOtp(),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _sendOtp,
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.black),
                          )
                        : const Text('Continue'),
                  ),
                ),

                const Spacer(flex: 2),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
