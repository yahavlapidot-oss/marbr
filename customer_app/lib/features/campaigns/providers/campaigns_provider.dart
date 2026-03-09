import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';

final activeCampaignsProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await createDio().get('/campaigns/active');
  return res.data as List;
});
