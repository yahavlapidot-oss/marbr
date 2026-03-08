import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _pushEnabled = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: const Text('Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionLabel('NOTIFICATIONS'),
            _card(
              child: SwitchListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                title: const Text('Push Notifications',
                  style: TextStyle(color: AppTheme.white, fontSize: 15, fontWeight: FontWeight.w500)),
                subtitle: const Text('Campaigns, wins, and alerts',
                  style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                value: _pushEnabled,
                activeThumbColor: AppTheme.gold,
                onChanged: (v) => setState(() => _pushEnabled = v),
              ),
            ),
            const SizedBox(height: 20),
            _sectionLabel('ACCOUNT'),
            _card(
              child: Column(
                children: [
                  _tile(Icons.person_outline, 'Edit Profile',
                    onTap: () => showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: AppTheme.surface,
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                      builder: (_) => const _EditProfileSheet(),
                    )),
                  _divider(),
                  _tile(Icons.lock_outline, 'Change Password',
                    onTap: () => showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: AppTheme.surface,
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                      builder: (_) => const _ChangePasswordSheet(),
                    )),
                ],
              ),
            ),
            const SizedBox(height: 20),
            _sectionLabel('ABOUT'),
            _card(
              child: Column(
                children: [
                  _tile(Icons.info_outline, 'Version',
                    trailing: const Text('1.0.0', style: TextStyle(color: AppTheme.muted, fontSize: 13))),
                  _divider(),
                  _tile(Icons.description_outlined, 'Terms of Service', onTap: () {}),
                  _divider(),
                  _tile(Icons.privacy_tip_outlined, 'Privacy Policy', onTap: () {}),
                ],
              ),
            ),
            const SizedBox(height: 20),
            _card(
              child: _tile(Icons.logout, 'Sign Out', color: Colors.redAccent,
                onTap: () async {
                  await const FlutterSecureStorage().deleteAll();
                  if (context.mounted) context.go('/login');
                }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(text, style: const TextStyle(color: AppTheme.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
  );

  Widget _card({required Widget child}) => Container(
    decoration: BoxDecoration(
      color: AppTheme.card, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppTheme.border)),
    child: child,
  );

  Widget _divider() => const Divider(height: 0.5, thickness: 0.5, color: AppTheme.border, indent: 52);

  Widget _tile(IconData icon, String label, {VoidCallback? onTap, Widget? trailing, Color? color}) {
    final c = color ?? AppTheme.white;
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: color ?? AppTheme.subtle, size: 20),
      title: Text(label, style: TextStyle(color: c, fontSize: 15, fontWeight: FontWeight.w500)),
      trailing: trailing ?? (onTap != null
          ? Icon(Icons.chevron_right, color: color != null ? color.withAlpha(100) : AppTheme.muted, size: 18)
          : null),
    );
  }
}

class _EditProfileSheet extends StatefulWidget {
  const _EditProfileSheet();

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  final _nameCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _cityCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() { _saving = true; _error = null; });
    try {
      final data = <String, dynamic>{};
      if (_nameCtrl.text.trim().isNotEmpty) data['fullName'] = _nameCtrl.text.trim();
      if (_cityCtrl.text.trim().isNotEmpty) data['city'] = _cityCtrl.text.trim();
      await createDio().patch('/me', data: data);
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) setState(() { _saving = false; _error = 'Failed to update. Try again.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(
            color: AppTheme.border, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 20),
          const Text('Edit Profile',
            style: TextStyle(color: AppTheme.white, fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),
          const Text('Full Name', style: TextStyle(color: AppTheme.subtle, fontSize: 13)),
          const SizedBox(height: 8),
          TextField(controller: _nameCtrl, style: const TextStyle(color: AppTheme.white),
            decoration: const InputDecoration(hintText: 'Your name')),
          const SizedBox(height: 14),
          const Text('City', style: TextStyle(color: AppTheme.subtle, fontSize: 13)),
          const SizedBox(height: 8),
          TextField(controller: _cityCtrl, style: const TextStyle(color: AppTheme.white),
            decoration: const InputDecoration(hintText: 'Your city')),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(height: 20, width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                  : const Text('SAVE CHANGES'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet();

  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_newCtrl.text.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await createDio().patch('/me/password', data: {
        'currentPassword': _currentCtrl.text,
        'newPassword': _newCtrl.text,
      });
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) setState(() { _saving = false; _error = 'Incorrect current password.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(
            color: AppTheme.border, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 20),
          const Text('Change Password',
            style: TextStyle(color: AppTheme.white, fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),
          const Text('Current Password', style: TextStyle(color: AppTheme.subtle, fontSize: 13)),
          const SizedBox(height: 8),
          TextField(controller: _currentCtrl, obscureText: true, style: const TextStyle(color: AppTheme.white),
            decoration: const InputDecoration(hintText: '••••••••')),
          const SizedBox(height: 14),
          const Text('New Password', style: TextStyle(color: AppTheme.subtle, fontSize: 13)),
          const SizedBox(height: 8),
          TextField(controller: _newCtrl, obscureText: true, style: const TextStyle(color: AppTheme.white),
            decoration: const InputDecoration(hintText: '••••••••')),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(height: 20, width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                  : const Text('CHANGE PASSWORD'),
            ),
          ),
        ],
      ),
    );
  }
}
