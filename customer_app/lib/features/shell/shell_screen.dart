import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';

class ShellScreen extends StatelessWidget {
  final Widget child;
  const ShellScreen({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
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
              case 2: context.go('/scan'); break;
              case 3: context.go('/rewards'); break;
              case 4: context.go('/profile'); break;
            }
          },
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.explore_outlined), activeIcon: Icon(Icons.explore), label: 'Discover'),
            BottomNavigationBarItem(icon: Icon(Icons.qr_code_scanner), label: 'Scan'),
            BottomNavigationBarItem(icon: Icon(Icons.emoji_events_outlined), activeIcon: Icon(Icons.emoji_events), label: 'My Wins'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
          ],
        ),
      ),
    );
  }
}
