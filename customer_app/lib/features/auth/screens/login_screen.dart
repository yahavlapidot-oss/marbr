import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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

  Future<void> _sendOtp() async {
    final target = _phoneCtrl.text.trim();
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
              Text('Your phone number', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppTheme.subtle)),
              const SizedBox(height: 8),
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: AppTheme.white),
                decoration: const InputDecoration(
                  hintText: '+972 50 000 0000',
                  prefixIcon: Icon(Icons.phone, color: AppTheme.muted),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _sendOtp,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : const Text('Send OTP'),
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
