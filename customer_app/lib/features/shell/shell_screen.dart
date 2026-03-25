import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../core/l10n/app_l10n.dart';
import '../../core/locale_provider.dart';

class ShellScreen extends ConsumerWidget {
  final Widget child;
  const ShellScreen({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final location = GoRouterState.of(context).matchedLocation;

    int selectedIndex = 0;
    if (location.startsWith('/discover')) selectedIndex = 1;
    if (location.startsWith('/scan')) selectedIndex = 2;
    if (location.startsWith('/rewards')) selectedIndex = 3;
    if (location.startsWith('/profile')) selectedIndex = 4;

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surface,
          border: Border(top: BorderSide(color: AppTheme.border, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: selectedIndex,
          backgroundColor: AppTheme.surface,
          selectedItemColor: AppTheme.gold,
          unselectedItemColor: AppTheme.muted,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          onTap: (i) {
            switch (i) {
              case 0: context.go('/home'); break;
              case 1: context.go('/discover'); break;
              case 2: context.push('/scan'); break;
              case 3: context.go('/rewards'); break;
              case 4: context.go('/profile'); break;
            }
          },
          items: [
            BottomNavigationBarItem(icon: const Icon(Icons.home_outlined), activeIcon: const Icon(Icons.home), label: t('home')),
            BottomNavigationBarItem(icon: const Icon(Icons.explore_outlined), activeIcon: const Icon(Icons.explore), label: t('discover')),
            BottomNavigationBarItem(icon: const Icon(Icons.qr_code_scanner), label: t('scan')),
            BottomNavigationBarItem(icon: const Icon(Icons.emoji_events_outlined), activeIcon: const Icon(Icons.emoji_events), label: t('my_wins')),
            BottomNavigationBarItem(icon: const Icon(Icons.person_outline), activeIcon: const Icon(Icons.person), label: t('profile')),
          ],
        ),
      ),
    );
  }
}
