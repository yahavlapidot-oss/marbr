import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/router.dart';
import '../../../core/theme.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _storage = const FlutterSecureStorage();

  bool _useEmail = true;
  bool _obscure = true;
  bool _loading = false;
  bool _marketingConsent = false;
  String? _gender;
  DateTime? _dateOfBirth;
  String? _error;

  // Field-level errors
  String? _nameError;
  String? _contactError;
  String? _passwordError;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  bool _validate() {
    setState(() { _nameError = null; _contactError = null; _passwordError = null; });
    bool ok = true;
    if (_nameCtrl.text.trim().isEmpty) {
      setState(() => _nameError = 'Full name is required');
      ok = false;
    }
    final contact = _useEmail ? _emailCtrl.text.trim() : _phoneCtrl.text.trim();
    if (contact.isEmpty) {
      setState(() => _contactError = _useEmail ? 'Email is required' : 'Phone number is required');
      ok = false;
    } else if (_useEmail && !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(contact)) {
      setState(() => _contactError = 'Enter a valid email address');
      ok = false;
    }
    if (_passwordCtrl.text.isNotEmpty && _passwordCtrl.text.length < 8) {
      setState(() => _passwordError = 'Password must be at least 8 characters');
      ok = false;
    }
    return ok;
  }

  String _parseError(DioException e) {
    final data = e.response?.data;
    final msg = data is Map ? data['message']?.toString() : null;
    final status = e.response?.statusCode;
    if (status == 409) {
      if (msg != null && msg.toLowerCase().contains('phone')) return 'An account with this phone already exists';
      return 'An account with this email already exists';
    }
    if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
      return 'Request timed out. Try again.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'No connection. Check your internet.';
    }
    return msg ?? 'Registration failed. Try again.';
  }

  Future<void> _register() async {
    if (!_validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      final body = <String, dynamic>{
        'fullName': _nameCtrl.text.trim(),
        if (_useEmail) 'email': _emailCtrl.text.trim() else 'phone': _phoneCtrl.text.trim(),
        if (_passwordCtrl.text.isNotEmpty) 'password': _passwordCtrl.text,
        if (_dateOfBirth != null) 'dateOfBirth': _dateOfBirth!.toIso8601String(),
        if (_gender != null) 'gender': _gender,
        'marketingConsent': _marketingConsent,
      };
      final res = await createDio().post('/auth/register', data: body);
      await _storage.write(key: 'accessToken', value: res.data['accessToken']);
      await _storage.write(key: 'refreshToken', value: res.data['refreshToken']);
      if (mounted) ref.read(authNotifierProvider).setToken(res.data['accessToken'] as String);
    } on DioException catch (e) {
      setState(() { _loading = false; _error = _parseError(e); });
    } catch (_) {
      setState(() { _loading = false; _error = 'Something went wrong. Try again.'; });
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(2000),
      firstDate: DateTime(1920),
      lastDate: DateTime.now().subtract(const Duration(days: 365 * 13)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(primary: AppTheme.gold, surface: AppTheme.surface),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _dateOfBirth = picked);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.go('/login'),
        ),
        title: const Text('Create Account'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Join MrBar',
                style: TextStyle(color: AppTheme.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
              const SizedBox(height: 4),
              const Text('Create your account to start entering campaigns',
                style: TextStyle(color: AppTheme.muted, fontSize: 14, height: 1.4)),
              const SizedBox(height: 28),

              // Full name
              _label('Full Name *'),
              const SizedBox(height: 6),
              TextField(
                controller: _nameCtrl,
                style: const TextStyle(color: AppTheme.white),
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  hintText: 'Your full name',
                  prefixIcon: const Icon(Icons.person_outline, color: AppTheme.muted, size: 20),
                  errorText: _nameError,
                ),
              ),
              const SizedBox(height: 16),

              // Email / Phone toggle
              _label('Contact *'),
              const SizedBox(height: 6),
              Container(
                height: 40,
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  children: [
                    _tabBtn('Email', _useEmail, () => setState(() { _useEmail = true; _contactError = null; })),
                    _tabBtn('Phone', !_useEmail, () => setState(() { _useEmail = false; _contactError = null; })),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              if (_useEmail)
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: AppTheme.white),
                  decoration: InputDecoration(
                    hintText: 'you@example.com',
                    prefixIcon: const Icon(Icons.email_outlined, color: AppTheme.muted, size: 20),
                    errorText: _contactError,
                  ),
                )
              else
                TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: AppTheme.white),
                  decoration: InputDecoration(
                    hintText: '+972 50 000 0000',
                    prefixIcon: const Icon(Icons.phone_outlined, color: AppTheme.muted, size: 20),
                    errorText: _contactError,
                  ),
                ),
              const SizedBox(height: 16),

              // Password (optional)
              _label('Password (optional)'),
              const SizedBox(height: 6),
              TextField(
                controller: _passwordCtrl,
                obscureText: _obscure,
                style: const TextStyle(color: AppTheme.white),
                decoration: InputDecoration(
                  hintText: '••••••••  (min 8 chars)',
                  prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.muted, size: 20),
                  errorText: _passwordError,
                  suffixIcon: GestureDetector(
                    onTap: () => setState(() => _obscure = !_obscure),
                    child: Icon(
                      _obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: AppTheme.muted, size: 20),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Date of birth (optional)
              _label('Date of Birth (optional)'),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: _pickDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.cake_outlined, color: AppTheme.muted, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        _dateOfBirth != null
                            ? '${_dateOfBirth!.day}/${_dateOfBirth!.month}/${_dateOfBirth!.year}'
                            : 'Select date',
                        style: TextStyle(
                          color: _dateOfBirth != null ? AppTheme.white : AppTheme.muted,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Gender (optional)
              _label('Gender (optional)'),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _gender,
                    isExpanded: true,
                    dropdownColor: AppTheme.surface,
                    hint: const Text('Select gender', style: TextStyle(color: AppTheme.muted, fontSize: 15)),
                    style: const TextStyle(color: AppTheme.white, fontSize: 15),
                    items: const [
                      DropdownMenuItem(value: 'MALE', child: Text('Male')),
                      DropdownMenuItem(value: 'FEMALE', child: Text('Female')),
                      DropdownMenuItem(value: 'OTHER', child: Text('Other')),
                    ],
                    onChanged: (v) => setState(() => _gender = v),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Marketing consent
              GestureDetector(
                onTap: () => setState(() => _marketingConsent = !_marketingConsent),
                child: Row(
                  children: [
                    Container(
                      width: 22, height: 22,
                      decoration: BoxDecoration(
                        color: _marketingConsent ? AppTheme.gold : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: _marketingConsent ? AppTheme.gold : AppTheme.border, width: 1.5),
                      ),
                      child: _marketingConsent
                          ? const Icon(Icons.check, color: Colors.black, size: 14)
                          : null,
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Send me promotions, deals, and campaign alerts',
                        style: TextStyle(color: AppTheme.subtle, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.redAccent.withAlpha(20),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.redAccent.withAlpha(60)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13))),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _register,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : const Text('CREATE ACCOUNT'),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: GestureDetector(
                  onTap: () => context.go('/login'),
                  child: RichText(
                    text: const TextSpan(
                      text: 'Already have an account? ',
                      style: TextStyle(color: AppTheme.muted, fontSize: 14),
                      children: [
                        TextSpan(text: 'Sign in', style: TextStyle(color: AppTheme.gold, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(text,
    style: const TextStyle(color: AppTheme.subtle, fontSize: 13, fontWeight: FontWeight.w500));

  Widget _tabBtn(String label, bool selected, VoidCallback onTap) => Expanded(
    child: GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: selected ? AppTheme.gold : Colors.transparent,
          borderRadius: BorderRadius.circular(7),
        ),
        child: Center(
          child: Text(label, style: TextStyle(
            color: selected ? Colors.black : AppTheme.subtle,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          )),
        ),
      ),
    ),
  );
}
