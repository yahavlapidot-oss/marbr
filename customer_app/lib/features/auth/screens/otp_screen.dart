import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

class OtpScreen extends StatefulWidget {
  final String target;
  final String? devCode;
  const OtpScreen({super.key, required this.target, this.devCode});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpCtrl = TextEditingController();
  final _storage = const FlutterSecureStorage();
  bool _loading = false;
  String? _error;
  int _resendCooldown = 0;
  Timer? _cooldownTimer;

  @override
  void initState() {
    super.initState();
    _startCooldown(30);
  }

  @override
  void dispose() {
    _otpCtrl.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown(int seconds) {
    setState(() => _resendCooldown = seconds);
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_resendCooldown <= 1) {
        t.cancel();
        if (mounted) setState(() => _resendCooldown = 0);
      } else {
        if (mounted) setState(() => _resendCooldown--);
      }
    });
  }

  Future<void> _resend() async {
    setState(() { _loading = true; _error = null; });
    try {
      await createDio().post('/auth/otp/send', data: {'target': widget.target});
      _startCooldown(60);
    } catch (_) {
      setState(() => _error = 'Failed to resend. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final code = _otpCtrl.text.trim();
    if (code.length != 6) return;
    setState(() { _loading = true; _error = null; });
    try {
      final res = await createDio().post('/auth/otp/verify', data: {
        'target': widget.target,
        'code': code,
      });
      await _storage.write(key: 'accessToken', value: res.data['accessToken']);
      await _storage.write(key: 'refreshToken', value: res.data['refreshToken']);
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error = 'Invalid or expired code');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
        title: const Text('Verify'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 16),
            const Text('Check your messages',
              style: TextStyle(color: AppTheme.white, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Enter the 6-digit code sent to',
              style: TextStyle(color: AppTheme.muted, fontSize: 14)),
            const SizedBox(height: 4),
            Text(widget.target,
              style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w700, fontSize: 16)),

            if (widget.devCode != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.gold.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.gold.withAlpha(60)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.developer_mode, color: AppTheme.gold, size: 16),
                    const SizedBox(width: 8),
                    Text('Dev code: ${widget.devCode}',
                      style: const TextStyle(color: AppTheme.gold, fontWeight: FontWeight.w700, fontSize: 14)),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 36),

            TextField(
              controller: _otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              style: const TextStyle(color: AppTheme.white, fontSize: 32, letterSpacing: 12, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
              decoration: const InputDecoration(
                counterText: '',
                hintText: '------',
                hintStyle: TextStyle(color: AppTheme.muted, letterSpacing: 8, fontSize: 28),
              ),
              onChanged: (v) { if (v.length == 6) _verify(); },
            ),

            if (_error != null) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                  const SizedBox(width: 6),
                  Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                ],
              ),
            ],

            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _verify,
                child: _loading
                    ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Text('VERIFY CODE'),
              ),
            ),

            const SizedBox(height: 20),
            Center(
              child: _resendCooldown > 0
                  ? Text('Resend in ${_resendCooldown}s',
                      style: const TextStyle(color: AppTheme.muted, fontSize: 13))
                  : TextButton(
                      onPressed: _loading ? null : _resend,
                      child: const Text('Resend code',
                        style: TextStyle(color: AppTheme.gold, fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
