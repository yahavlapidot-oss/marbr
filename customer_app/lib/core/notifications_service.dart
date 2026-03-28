import 'dart:async';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// Background message handler — must be top-level function
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  // No-op: flutter_local_notifications shows it automatically on iOS
}

class NotificationsService {
  static final NotificationsService _instance = NotificationsService._();
  factory NotificationsService() => _instance;
  NotificationsService._();

  final _fcm = FirebaseMessaging.instance;
  final _localNotifications = FlutterLocalNotificationsPlugin();

  // Emits campaignId when the backend signals the campaign has ended
  final _campaignEndedController = StreamController<String>.broadcast();
  Stream<String> get onCampaignEnded => _campaignEndedController.stream;

  /// Called once from main() after Firebase.initializeApp()
  Future<void> init() async {
    // Register background handler
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);

    // Local notifications channel (Android + iOS foreground)
    const androidChannel = AndroidNotificationChannel(
      'mrbar_campaigns',
      'MrBar Campaigns',
      description: 'Live campaign notifications from nearby bars',
      importance: Importance.high,
    );

    final android = AndroidInitializationSettings('@mipmap/ic_launcher');
    final ios = DarwinInitializationSettings(
      requestAlertPermission: false, // we request manually below
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _localNotifications.initialize(
      InitializationSettings(android: android, iOS: ios),
    );

    if (Platform.isAndroid) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(androidChannel);
    }

    // Handle foreground FCM messages
    FirebaseMessaging.onMessage.listen((message) {
      _handleDataMessage(message);

      final notification = message.notification;
      if (notification == null) return;

      _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            androidChannel.id,
            androidChannel.name,
            channelDescription: androidChannel.description,
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
      );
    });
  }

  void _handleDataMessage(RemoteMessage message) {
    final type = message.data['type'] as String?;
    final campaignId = message.data['campaignId'] as String?;
    if (campaignId != null &&
        (type == 'campaign_ended' || type == 'campaign_winner')) {
      _campaignEndedController.add(campaignId);
    }
  }

  /// Request permission and return FCM token (null if denied)
  Future<String?> requestPermissionAndGetToken() async {
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      return null;
    }

    // On iOS, get APNs token first (required for FCM on iOS)
    if (Platform.isIOS) {
      await _fcm.getAPNSToken();
    }

    return _fcm.getToken();
  }

  /// Listen for token refreshes and re-register
  void onTokenRefresh(void Function(String token) callback) {
    _fcm.onTokenRefresh.listen(callback);
  }
}
