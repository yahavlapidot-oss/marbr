import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

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

  String _parseError(DioException e, String Function(String) t) {
    final data = e.response?.data;
    final msg = data is Map ? data['message']?.toString() : null;
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return t('timeout');
    }
    if (e.type == DioExceptionType.connectionError) {
      return t('no_connection');
    }
    return msg ?? t('went_wrong');
  }

  Future<void> _sendOtp() async {
    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) {
      setState(() => _error = t('phone_required'));
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await createDio().post('/auth/otp/send', data: {'target': phone});
      final devCode = res.data['devCode'] as String?;
      if (mounted) context.push('/otp', extra: {'target': phone, 'devCode': devCode});
    } on DioException catch (e) {
      setState(() => _error = _parseError(e, t));
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
                Text(
                  t('tagline'),
                  style: const TextStyle(color: AppTheme.muted, fontSize: 15, height: 1.5),
                ),

                const Spacer(flex: 3),

                Text(
                  t('enter_phone'),
                  style: const TextStyle(
                    color: AppTheme.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  t('phone_sub'),
                  style: const TextStyle(color: AppTheme.muted, fontSize: 14, height: 1.4),
                ),
                const SizedBox(height: 20),

                TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: AppTheme.white, fontSize: 16),
                  decoration: InputDecoration(
                    hintText: t('phone_ph'),
                    prefixIcon: const Icon(Icons.phone_outlined, color: AppTheme.muted, size: 20),
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
                        : Text(t('continue_btn')),
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
