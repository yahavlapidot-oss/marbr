import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/api_client.dart';

/// Fetch active campaigns, optionally filtered by the user's position.
/// Pass null for [pos] to load all active campaigns without geo-filtering.
final activeCampaignsProvider =
    FutureProvider.family<List<dynamic>, Position?>((ref, pos) async {
  final res = await createDio().get('/campaigns/active', queryParameters: {
    if (pos != null) 'lat': pos.latitude,
    if (pos != null) 'lng': pos.longitude,
    if (pos != null) 'radius': 10000,
  });
  return res.data as List;
});
