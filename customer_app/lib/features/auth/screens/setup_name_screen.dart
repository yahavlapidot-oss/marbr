import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/api_client.dart';
import '../../../core/device_service.dart';
import '../../../core/router.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

class SetupNameScreen extends ConsumerStatefulWidget {
  const SetupNameScreen({super.key});

  @override
  ConsumerState<SetupNameScreen> createState() => _SetupNameScreenState();
}

class _SetupNameScreenState extends ConsumerState<SetupNameScreen> {
  final _nameCtrl = TextEditingController();
  final _storage = const FlutterSecureStorage();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final locale = ref.read(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = t('name_required'));
      return;
    }
    if (name.split(' ').where((w) => w.isNotEmpty).length < 2) {
      setState(() => _error = t('name_too_short'));
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final token = await _storage.read(key: 'accessToken');
      final dio = createDio();
      dio.options.headers['Authorization'] = 'Bearer $token';
      await dio.patch('/me', data: {'fullName': name});

      if (mounted) {
        ref.read(authNotifierProvider).setToken(token!);
        DeviceService().registerDevice();
      }
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg = data is Map ? data['message']?.toString() : null;
      setState(() { _loading = false; _error = msg ?? AppL10n.of(ref.read(localeProvider), 'went_wrong'); });
    } catch (e) {
      setState(() { _loading = false; _error = AppL10n.of(ref.read(localeProvider), 'went_wrong'); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(flex: 2),

              // Icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppTheme.gold.withAlpha(20),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.gold.withAlpha(60)),
                ),
                child: const Icon(Icons.waving_hand, color: AppTheme.gold, size: 32),
              ),
              const SizedBox(height: 24),

              Text(
                t('whats_name'),
                style: const TextStyle(
                  color: AppTheme.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                t('name_sub'),
                style: const TextStyle(color: AppTheme.muted, fontSize: 15, height: 1.4),
              ),

              const Spacer(flex: 2),

              TextField(
                controller: _nameCtrl,
                autofocus: true,
                textCapitalization: TextCapitalization.words,
                style: const TextStyle(color: AppTheme.white, fontSize: 18),
                decoration: InputDecoration(
                  hintText: t('name_ph'),
                  prefixIcon: const Icon(Icons.person_outline, color: AppTheme.muted, size: 22),
                  errorText: _error,
                  errorMaxLines: 2,
                ),
                onSubmitted: (_) => _save(),
              ),

              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _save,
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                        )
                      : Text(t('lets_go')),
                ),
              ),

              const Spacer(flex: 3),
            ],
          ),
        ),
      ),
    );
  }
}
