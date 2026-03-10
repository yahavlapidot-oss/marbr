import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'api_client.dart';
import 'notifications_service.dart';

class DeviceService {
  static final DeviceService _instance = DeviceService._();
  factory DeviceService() => _instance;
  DeviceService._();

  static const _storage = FlutterSecureStorage();

  /// Call this after login to register the device with FCM token + location
  Future<void> registerDevice() async {
    try {
      final deviceId = await _getOrCreateDeviceId();
      final fcmToken = await NotificationsService().requestPermissionAndGetToken();
      final position = await _getLocationIfAllowed();

      await createDio().post('/devices/register', data: {
        'deviceId': deviceId,
        'platform': Platform.isIOS ? 'ios' : 'android',
        if (fcmToken != null) 'fcmToken': fcmToken,
        if (position != null) 'lat': position.latitude,
        if (position != null) 'lng': position.longitude,
        'appVersion': '1.0.0',
      });

      // Re-register whenever the FCM token rotates
      NotificationsService().onTokenRefresh((_) => registerDevice());
    } catch (_) {
      // Non-fatal — device registration failing shouldn't break the app
    }
  }

  Future<String> _getOrCreateDeviceId() async {
    var id = await _storage.read(key: 'deviceId');
    if (id == null) {
      id = DateTime.now().millisecondsSinceEpoch.toString() +
          Platform.operatingSystem;
      await _storage.write(key: 'deviceId', value: id);
    }
    return id;
  }

  Future<Position?> _getLocationIfAllowed() async {
    try {
      // Check permission without prompting — we only send location if already granted
      final status = await Permission.locationWhenInUse.status;
      if (!status.isGranted) return null;

      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) return null;

      return Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.low),
      ).timeout(const Duration(seconds: 5));
    } catch (_) {
      return null;
    }
  }

  /// Ask for location permission (call from a relevant UI moment, e.g. home screen)
  Future<bool> requestLocationPermission() async {
    final status = await Permission.locationWhenInUse.request();
    return status.isGranted;
  }
}
