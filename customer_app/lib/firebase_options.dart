// Generated from GoogleService-Info.plist + google-services.json
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        return ios;
      default:
        return android;
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBa-Uppi0kSZQzQfkTCLWIzdsEKPdgFCQM',
    appId: '1:856803828836:android:88f350493150e738bcab71',
    messagingSenderId: '856803828836',
    projectId: 'mrbar-3ddae',
    storageBucket: 'mrbar-3ddae.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAUNX_xq1woiAVFLocRSD0XKBPLDJUUsuE',
    appId: '1:856803828836:ios:19a8ca06abe00da5bcab71',
    messagingSenderId: '856803828836',
    projectId: 'mrbar-3ddae',
    storageBucket: 'mrbar-3ddae.firebasestorage.app',
    iosBundleId: 'com.mrbar.customerApp',
  );
}
