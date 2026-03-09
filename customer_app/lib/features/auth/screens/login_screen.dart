import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../../../core/router.dart';
import '../../../core/theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _targetCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _storage = const FlutterSecureStorage();
  bool _loading = false;
  String? _error;
  bool _usePassword = false;
  bool _obscure = true;

  String _parseError(DioException e) {
    final data = e.response?.data;
    final msg = data is Map ? data['message']?.toString() : null;
    final status = e.response?.statusCode;
    if (status == 401 || status == 403) {
      if (msg != null && msg.toLowerCase().contains('deactivated')) {
        return 'Your account has been deactivated. Contact support.';
      }
      return 'Invalid email or password.';
    }
    if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
      return 'Request timed out. Try again.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'No connection. Check your internet.';
    }
    return msg ?? 'Something went wrong. Try again.';
  }

  Future<void> _sendOtp() async {
    final target = _targetCtrl.text.trim();
    if (target.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      final res = await createDio().post('/auth/otp/send', data: {'target': target});
      final devCode = res.data['devCode'] as String?;
      if (mounted) context.push('/otp', extra: {'target': target, 'devCode': devCode});
    } on DioException catch (e) {
      setState(() => _error = _parseError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loginWithPassword() async {
    final email = _targetCtrl.text.trim();
    final password = _passwordCtrl.text;
    if (email.isEmpty || password.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      final res = await createDio().post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      await _storage.write(key: 'accessToken', value: res.data['accessToken']);
      await _storage.write(key: 'refreshToken', value: res.data['refreshToken']);
      if (mounted) ref.read(authNotifierProvider).setToken(res.data['accessToken'] as String);
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
            height: MediaQuery.of(context).size.height - MediaQuery.of(context).padding.top - 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(flex: 2),

                // Logo
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: AppTheme.gold.withAlpha(20),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.gold.withAlpha(60)),
                  ),
                  child: const Icon(Icons.sports_bar, color: AppTheme.gold, size: 28),
                ),
                const SizedBox(height: 20),
                Text('MrBar',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    color: AppTheme.white,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1,
                  )),
                const SizedBox(height: 8),
                const Text(
                  'Real-time promos. Instant wins.\nRedeem on the spot.',
                  style: TextStyle(color: AppTheme.muted, fontSize: 15, height: 1.5),
                ),

                const Spacer(flex: 3),

                // Tab selector
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      _TabBtn(label: 'Phone / OTP', selected: !_usePassword,
                        onTap: () => setState(() => _usePassword = false)),
                      _TabBtn(label: 'Email & Password', selected: _usePassword,
                        onTap: () => setState(() => _usePassword = true)),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Input: phone/email
                TextField(
                  controller: _targetCtrl,
                  keyboardType: _usePassword ? TextInputType.emailAddress : TextInputType.phone,
                  style: const TextStyle(color: AppTheme.white),
                  decoration: InputDecoration(
                    hintText: _usePassword ? 'you@example.com' : '+972 50 000 0000',
                    prefixIcon: Icon(
                      _usePassword ? Icons.email_outlined : Icons.phone_outlined,
                      color: AppTheme.muted, size: 20),
                  ),
                ),

                if (_usePassword) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordCtrl,
                    obscureText: _obscure,
                    style: const TextStyle(color: AppTheme.white),
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.muted, size: 20),
                      suffixIcon: GestureDetector(
                        onTap: () => setState(() => _obscure = !_obscure),
                        child: Icon(
                          _obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: AppTheme.muted, size: 20),
                      ),
                    ),
                  ),
                ],

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                      const SizedBox(width: 6),
                      Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                    ],
                  ),
                ],

                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : (_usePassword ? _loginWithPassword : _sendOtp),
                    child: _loading
                        ? const SizedBox(height: 20, width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                        : Text(_usePassword ? 'Sign In' : 'Send Code'),
                  ),
                ),

                const SizedBox(height: 16),
                Center(
                  child: GestureDetector(
                    onTap: () => context.go('/register'),
                    child: RichText(
                      text: const TextSpan(
                        text: "Don't have an account? ",
                        style: TextStyle(color: AppTheme.muted, fontSize: 14),
                        children: [
                          TextSpan(text: 'Sign up', style: TextStyle(color: AppTheme.gold, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
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

class _TabBtn extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _TabBtn({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: selected ? AppTheme.gold : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(label,
              style: TextStyle(
                color: selected ? Colors.black : AppTheme.subtle,
                fontSize: 13,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              )),
          ),
        ),
      ),
    );
  }
}
