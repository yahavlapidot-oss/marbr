import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
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

  Future<void> _sendOtp() async {
    final target = _targetCtrl.text.trim();
    if (target.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      final res = await createDio().post('/auth/otp/send', data: {'target': target});
      final devCode = res.data['devCode'] as String?;
      if (mounted) context.push('/otp', extra: {'target': target, 'devCode': devCode});
    } catch (e) {
      setState(() => _error = 'Failed to send OTP. Try again.');
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
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error = 'Invalid email or password.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              Row(
                children: [
                  const Icon(Icons.sports_bar, color: AppTheme.amber, size: 36),
                  const SizedBox(width: 10),
                  Text('MrBar', style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    color: AppTheme.white,
                    fontWeight: FontWeight.w800,
                  )),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Real-time promos. Instant wins.\nRedeem on the spot.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppTheme.muted),
              ),
              const Spacer(),

              // Toggle
              Row(
                children: [
                  _TabBtn(label: 'Phone / OTP', selected: !_usePassword, onTap: () => setState(() => _usePassword = false)),
                  const SizedBox(width: 8),
                  _TabBtn(label: 'Email & Password', selected: _usePassword, onTap: () => setState(() => _usePassword = true)),
                ],
              ),
              const SizedBox(height: 16),

              Text(
                _usePassword ? 'Email' : 'Phone or email',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppTheme.subtle),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _targetCtrl,
                keyboardType: _usePassword ? TextInputType.emailAddress : TextInputType.phone,
                style: const TextStyle(color: AppTheme.white),
                decoration: InputDecoration(
                  hintText: _usePassword ? 'you@example.com' : '+972 50 000 0000',
                  prefixIcon: Icon(_usePassword ? Icons.email_outlined : Icons.phone, color: AppTheme.muted),
                ),
              ),

              if (_usePassword) ...[
                const SizedBox(height: 12),
                Text('Password', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppTheme.subtle)),
                const SizedBox(height: 8),
                TextField(
                  controller: _passwordCtrl,
                  obscureText: true,
                  style: const TextStyle(color: AppTheme.white),
                  decoration: const InputDecoration(
                    hintText: '••••••••',
                    prefixIcon: Icon(Icons.lock_outline, color: AppTheme.muted),
                  ),
                ),
              ],

              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : (_usePassword ? _loginWithPassword : _sendOtp),
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : Text(_usePassword ? 'Sign In' : 'Send OTP'),
                ),
              ),
              const SizedBox(height: 32),
            ],
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
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppTheme.amber.withAlpha(25) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? AppTheme.amber : const Color(0xFF2a2a3a)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppTheme.amber : AppTheme.muted,
            fontSize: 13,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
