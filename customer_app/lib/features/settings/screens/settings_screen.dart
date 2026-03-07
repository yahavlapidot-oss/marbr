import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

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
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          _SectionHeader('Notifications'),
          SwitchListTile(
            title: const Text('Push Notifications', style: TextStyle(color: Colors.white)),
            subtitle: const Text('Receive alerts for campaigns and wins', style: TextStyle(color: Colors.white54, fontSize: 13)),
            value: _pushEnabled,
            activeColor: const Color(0xFFf59e0b),
            onChanged: (v) => setState(() => _pushEnabled = v),
          ),
          const Divider(height: 1, color: Color(0xFF2a2a3a)),
          _SectionHeader('Account'),
          ListTile(
            leading: const Icon(Icons.person_outline, color: Colors.white54),
            title: const Text('Edit Profile', style: TextStyle(color: Colors.white)),
            trailing: const Icon(Icons.chevron_right, color: Colors.white38),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.lock_outline, color: Colors.white54),
            title: const Text('Change Password', style: TextStyle(color: Colors.white)),
            trailing: const Icon(Icons.chevron_right, color: Colors.white38),
            onTap: () {},
          ),
          const Divider(height: 1, color: Color(0xFF2a2a3a)),
          _SectionHeader('About'),
          ListTile(
            leading: const Icon(Icons.info_outline, color: Colors.white54),
            title: const Text('Version', style: TextStyle(color: Colors.white)),
            trailing: const Text('1.0.0', style: TextStyle(color: Colors.white38)),
          ),
          ListTile(
            leading: const Icon(Icons.description_outlined, color: Colors.white54),
            title: const Text('Terms of Service', style: TextStyle(color: Colors.white)),
            trailing: const Icon(Icons.chevron_right, color: Colors.white38),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined, color: Colors.white54),
            title: const Text('Privacy Policy', style: TextStyle(color: Colors.white)),
            trailing: const Icon(Icons.chevron_right, color: Colors.white38),
            onTap: () {},
          ),
          const Divider(height: 1, color: Color(0xFF2a2a3a)),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.redAccent),
            title: const Text('Log Out', style: TextStyle(color: Colors.redAccent)),
            onTap: () async {
              const storage = FlutterSecureStorage();
              await storage.deleteAll();
              if (context.mounted) context.go('/login');
            },
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          color: Color(0xFFf59e0b),
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}
