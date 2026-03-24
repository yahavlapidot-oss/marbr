import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

/// Holds the user's current position (null if unknown / denied).
final locationProvider = StateNotifierProvider<LocationNotifier, Position?>((ref) {
  return LocationNotifier();
});

class LocationNotifier extends StateNotifier<Position?> {
  LocationNotifier() : super(null);

  /// Request location permission and retrieve the current position.
  /// Returns true if a position was obtained.
  Future<bool> requestAndGetLocation() async {
    try {
      final status = await Permission.locationWhenInUse.status;

      if (status.isPermanentlyDenied) {
        // User permanently denied — open app settings so they can re-enable
        await openAppSettings();
        return false;
      }

      if (!status.isGranted) {
        final result = await Permission.locationWhenInUse.request();
        if (!result.isGranted) return false;
      }

      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) return false;

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.low),
      ).timeout(const Duration(seconds: 8));

      state = position;
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Check current permission status without prompting.
  Future<LocationPermissionStatus> checkStatus() async {
    final status = await Permission.locationWhenInUse.status;
    if (status.isGranted) return LocationPermissionStatus.granted;
    if (status.isPermanentlyDenied) return LocationPermissionStatus.permanentlyDenied;
    return LocationPermissionStatus.notDetermined;
  }
}

enum LocationPermissionStatus { granted, notDetermined, permanentlyDenied }
