import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/api_client.dart';

/// Fetches all businesses that have a mapped location, with their active campaigns.
/// Used by the map view in the Discover screen.
final nearbyBusinessesProvider =
    FutureProvider.family<List<Map<String, dynamic>>, Position?>(
  (ref, position) async {
    final dio = createDio();
    final params = <String, dynamic>{};
    if (position != null) {
      params['lat'] = position.latitude;
      params['lng'] = position.longitude;
    }
    final res = await dio.get(
      '/businesses/discover',
      queryParameters: params.isNotEmpty ? params : null,
    );
    return (res.data as List<dynamic>).cast<Map<String, dynamic>>();
  },
);
