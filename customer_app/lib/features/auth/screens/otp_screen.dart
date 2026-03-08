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
      appBar: AppBar(title: const Text('Verify')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 32),
            Text('Enter the 6-digit code sent to', style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppTheme.muted)),
            const SizedBox(height: 4),
            Text(widget.target, style: const TextStyle(color: AppTheme.white, fontWeight: FontWeight.w700, fontSize: 18)),
            if (widget.devCode != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.amber.withAlpha(30),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.amber.withAlpha(80)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.developer_mode, color: AppTheme.amber, size: 16),
                    const SizedBox(width: 8),
                    Text('Dev code: ${widget.devCode}', style: const TextStyle(color: AppTheme.amber, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 32),
            TextField(
              controller: _otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              style: const TextStyle(color: AppTheme.white, fontSize: 28, letterSpacing: 8),
              textAlign: TextAlign.center,
              decoration: const InputDecoration(counterText: '', hintText: '------'),
              onChanged: (v) { if (v.length == 6) _verify(); },
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _verify,
                child: _loading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Text('Verify'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
