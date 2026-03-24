import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/device_service.dart';
import '../../../core/router.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String target;
  final String? devCode;
  const OtpScreen({super.key, required this.target, this.devCode});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _otpCtrl = TextEditingController();
  final _storage = const FlutterSecureStorage();
  bool _loading = false;
  String? _error;
  int _resendCooldown = 0;
  Timer? _cooldownTimer;
  int _attempts = 0;
  static const _maxAttempts = 5;

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

  Future<void> _confirmBack() async {
    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: Text(t('leave_verification'), style: const TextStyle(color: AppTheme.white)),
        content: Text(t('code_invalid'),
          style: const TextStyle(color: AppTheme.subtle)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(t('stay'))),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(t('leave'), style: const TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
    if (leave == true && mounted) context.pop();
  }

  Future<void> _resend() async {
    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    setState(() { _loading = true; _error = null; _attempts = 0; _otpCtrl.clear(); });
    try {
      await createDio().post('/auth/otp/send', data: {'target': widget.target});
      _startCooldown(60);
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg = data is Map ? data['message']?.toString() : null;
      setState(() => _error = msg ?? t('went_wrong'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final code = _otpCtrl.text.trim();
    if (code.length != 6) return;
    if (_attempts >= _maxAttempts) return;
    setState(() { _loading = true; _error = null; });
    try {
      final res = await createDio().post('/auth/otp/verify', data: {
        'target': widget.target,
        'code': code,
      });
      await _storage.write(key: 'accessToken', value: res.data['accessToken']);
      await _storage.write(key: 'refreshToken', value: res.data['refreshToken']);
      final isNewUser = res.data['isNewUser'] == true;
      if (mounted) {
        if (isNewUser) {
          // New user — ask for their name before logging in
          context.push('/setup-name');
        } else {
          ref.read(authNotifierProvider).setToken(res.data['accessToken'] as String);
          // Register device for push notifications (fire and forget)
          DeviceService().registerDevice();
        }
      }
    } on DioException catch (e) {
      _attempts++;
      final data = e.response?.data;
      final msg = data is Map ? data['message']?.toString() ?? '' : '';
      final remaining = _maxAttempts - _attempts;
      String errorMsg;
      if (_attempts >= _maxAttempts) {
        errorMsg = t('too_many');
        _otpCtrl.clear();
      } else if (msg.toLowerCase().contains('expired')) {
        errorMsg = t('code_expired_otp');
      } else if (e.type == DioExceptionType.connectionError) {
        errorMsg = t('no_connection');
      } else if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
        errorMsg = t('timeout');
      } else {
        final attemptsWord = remaining == 1 ? t('attempt_left') : t('attempts_left');
        errorMsg = '${t('incorrect_code')} $remaining $attemptsWord.';
      }
      setState(() => _error = errorMsg);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: _confirmBack,
        ),
        title: Text(t('verify')),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 16),
            Text(t('verify_title'),
              style: const TextStyle(color: AppTheme.white, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(t('enter_code'),
              style: const TextStyle(color: AppTheme.muted, fontSize: 14)),
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
              enabled: _attempts < _maxAttempts,
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
                onPressed: (_loading || _attempts >= _maxAttempts) ? null : _verify,
                child: _loading
                    ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : Text(t('verify_btn')),
              ),
            ),

            const SizedBox(height: 20),
            Center(
              child: _resendCooldown > 0
                  ? Text('${t('resend_in')} ${_resendCooldown}s',
                      style: const TextStyle(color: AppTheme.muted, fontSize: 13))
                  : TextButton(
                      onPressed: _loading ? null : _resend,
                      child: Text(t('resend_code'),
                        style: const TextStyle(color: AppTheme.gold, fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
