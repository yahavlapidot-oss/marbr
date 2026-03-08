import 'package:flutter/material.dart';

class AppTheme {
  static const gold = Color(0xFFF5C518);
  static const amber = Color(0xFFF5C518);
  static const bg = Color(0xFF0D0D0D);
  static const surface = Color(0xFF1A1A1A);
  static const card = Color(0xFF1E1E1E);
  static const border = Color(0xFF2C2C2C);
  static const muted = Color(0xFF5A5A5A);
  static const subtle = Color(0xFF8A8A8A);
  static const white = Color(0xFFF0F0F0);

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: bg,
        colorScheme: const ColorScheme.dark(
          primary: gold,
          onPrimary: Colors.black,
          surface: card,
          onSurface: white,
          outline: border,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: bg,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
          iconTheme: IconThemeData(color: white),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: surface,
          selectedItemColor: gold,
          unselectedItemColor: muted,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          unselectedLabelStyle: TextStyle(fontSize: 11),
        ),
        cardTheme: const CardThemeData(
          color: card,
          elevation: 0,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: border),
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
          margin: EdgeInsets.zero,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surface,
          hintStyle: const TextStyle(color: muted),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: gold, width: 1.5),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: gold,
            foregroundColor: Colors.black,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, letterSpacing: 0.5),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(foregroundColor: gold),
        ),
      );
}
