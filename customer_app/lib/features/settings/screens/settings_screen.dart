import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
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
                  _tile(Icons.person_outline, 'Edit Profile', onTap: () {}),
                  _divider(),
                  _tile(Icons.lock_outline, 'Change Password', onTap: () {}),
                ],
              ),
            ),

            const SizedBox(height: 20),
            _sectionLabel('ABOUT'),
            _card(
              child: Column(
                children: [
                  _tile(Icons.info_outline, 'Version', trailing: const Text('1.0.0',
                    style: TextStyle(color: AppTheme.muted, fontSize: 13))),
                  _divider(),
                  _tile(Icons.description_outlined, 'Terms of Service', onTap: () {}),
                  _divider(),
                  _tile(Icons.privacy_tip_outlined, 'Privacy Policy', onTap: () {}),
                ],
              ),
            ),

            const SizedBox(height: 20),
            _card(
              child: _tile(
                Icons.logout,
                'Sign Out',
                color: Colors.redAccent,
                onTap: () async {
                  await const FlutterSecureStorage().deleteAll();
                  if (context.mounted) context.go('/login');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(text,
        style: const TextStyle(color: AppTheme.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: child,
    );
  }

  Widget _divider() => const Divider(height: 0.5, thickness: 0.5, color: AppTheme.border, indent: 52);

  Widget _tile(IconData icon, String label, {
    VoidCallback? onTap,
    Widget? trailing,
    Color? color,
  }) {
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
