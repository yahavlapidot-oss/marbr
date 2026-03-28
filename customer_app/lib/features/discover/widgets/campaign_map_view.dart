import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme.dart';
import '../../../core/date_time_utils.dart';

// ─── Helpers ─────────────────────────────────────────────────────────────────

double? _toDouble(dynamic v) {
  if (v == null) return null;
  if (v is double) return v;
  if (v is int) return v.toDouble();
  if (v is String) return double.tryParse(v);
  return null;
}

String _distanceLabel(double meters) {
  if (meters < 100) return 'Here now';
  if (meters < 1000) return '~${meters.round()}m';
  return '~${(meters / 1000).toStringAsFixed(1)}km';
}

// ─── Map view ─────────────────────────────────────────────────────────────────

class CampaignMapView extends StatefulWidget {
  /// Each item is a business object from GET /businesses/discover.
  /// Shape: { id, name, logoUrl, address, city, lat, lng, campaigns[], _distanceMeters? }
  final List<Map<String, dynamic>> campaigns; // kept as 'campaigns' for compat with caller
  final Position? userPosition;

  const CampaignMapView({
    super.key,
    required this.campaigns,
    this.userPosition,
  });

  @override
  State<CampaignMapView> createState() => _CampaignMapViewState();
}

class _CampaignMapViewState extends State<CampaignMapView> {
  final _mapController = MapController();
  Map<String, dynamic>? _selected;

  List<Map<String, dynamic>> get _businesses => widget.campaigns;

  List<Map<String, dynamic>> get _pins =>
      _businesses.where((b) => _toDouble(b['lat']) != null && _toDouble(b['lng']) != null).toList();

  LatLng get _center {
    if (widget.userPosition != null) {
      return LatLng(widget.userPosition!.latitude, widget.userPosition!.longitude);
    }
    final pins = _pins;
    if (pins.isEmpty) return const LatLng(32.0853, 34.7818);
    final avgLat = pins.map((b) => _toDouble(b['lat'])!).reduce((a, b) => a + b) / pins.length;
    final avgLng = pins.map((b) => _toDouble(b['lng'])!).reduce((a, b) => a + b) / pins.length;
    return LatLng(avgLat, avgLng);
  }

  @override
  Widget build(BuildContext context) {
    final pins = _pins;

    if (pins.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.map_outlined, color: AppTheme.muted, size: 52),
            SizedBox(height: 16),
            Text('No businesses with location data',
                style: TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
            SizedBox(height: 4),
            Text('Check back soon', style: TextStyle(color: AppTheme.muted, fontSize: 13)),
          ],
        ),
      );
    }

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _center,
            initialZoom: 13.5,
            onTap: (_, _) => setState(() => _selected = null),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
              subdomains: const ['a', 'b', 'c', 'd'],
              userAgentPackageName: 'com.mrbar.customer_app',
            ),
            MarkerLayer(
              markers: pins.map((biz) {
                final lat = _toDouble(biz['lat'])!;
                final lng = _toDouble(biz['lng'])!;
                final isSelected = _selected?['id'] == biz['id'];
                final hasActiveCampaigns = (biz['campaigns'] as List?)?.isNotEmpty == true;

                return Marker(
                  point: LatLng(lat, lng),
                  width: isSelected ? 54 : 44,
                  height: isSelected ? 54 : 44,
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selected = biz);
                      _mapController.move(LatLng(lat, lng), 15);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.gold
                            : hasActiveCampaigns
                                ? AppTheme.surface
                                : AppTheme.bg,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected
                              ? AppTheme.gold
                              : hasActiveCampaigns
                                  ? AppTheme.gold.withAlpha(180)
                                  : AppTheme.border,
                          width: isSelected ? 3 : 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: isSelected
                                ? AppTheme.gold.withAlpha(100)
                                : hasActiveCampaigns
                                    ? AppTheme.gold.withAlpha(40)
                                    : Colors.black.withAlpha(80),
                            blurRadius: isSelected ? 14 : 6,
                            spreadRadius: isSelected ? 2 : 0,
                          ),
                        ],
                      ),
                      child: Center(
                        child: hasActiveCampaigns
                            ? Icon(
                                Icons.local_bar,
                                color: isSelected ? Colors.black : AppTheme.gold,
                                size: isSelected ? 24 : 20,
                              )
                            : Icon(
                                Icons.store_outlined,
                                color: isSelected ? Colors.black : AppTheme.muted,
                                size: isSelected ? 22 : 18,
                              ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            // User location — blue dot
            if (widget.userPosition != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: LatLng(
                      widget.userPosition!.latitude,
                      widget.userPosition!.longitude,
                    ),
                    width: 22,
                    height: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2.5),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF3B82F6).withAlpha(128),
                            blurRadius: 10,
                            spreadRadius: 3,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),

        // Attribution
        Positioned(
          bottom: _selected != null ? 200 : 8,
          right: 8,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.black.withAlpha(150),
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Text(
              '© CartoDB © OpenStreetMap',
              style: TextStyle(color: Colors.white54, fontSize: 9),
            ),
          ),
        ),

        // Business bottom card
        if (_selected != null)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _BusinessBottomCard(
              business: _selected!,
              onClose: () => setState(() => _selected = null),
            ),
          ),
      ],
    );
  }
}

// ─── Business bottom card ──────────────────────────────────────────────────────

class _BusinessBottomCard extends StatelessWidget {
  final Map<String, dynamic> business;
  final VoidCallback onClose;

  const _BusinessBottomCard({required this.business, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final logo = business['logoUrl'] as String?;
    final name = business['name'] as String? ?? '';
    final address = business['address'] as String?;
    final city = business['city'] as String?;
    final locationLine = [address, city].where((s) => s != null && s.isNotEmpty).join(', ');
    final dist = business['_distanceMeters'];
    final campaigns = (business['campaigns'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return Container(
      margin: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(120), blurRadius: 24, spreadRadius: 2),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Business header
            Row(
              children: [
                // Logo
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: logo != null
                      ? Image.network(logo, fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              const Icon(Icons.local_bar, color: AppTheme.gold, size: 22))
                      : const Icon(Icons.local_bar, color: AppTheme.gold, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: const TextStyle(
                              color: AppTheme.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      if (locationLine.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined,
                                size: 11, color: AppTheme.muted),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(locationLine,
                                  style: const TextStyle(
                                      color: AppTheme.muted, fontSize: 11),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                            ),
                          ],
                        ),
                      ],
                      if (dist != null && (dist as num) < double.infinity) ...[
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            const Icon(Icons.near_me, size: 11, color: AppTheme.gold),
                            const SizedBox(width: 3),
                            Text(
                              _distanceLabel(dist.toDouble()),
                              style: const TextStyle(
                                  color: AppTheme.gold,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTheme.muted, size: 18),
                  onPressed: onClose,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                ),
              ],
            ),

            const SizedBox(height: 14),
            const Divider(color: AppTheme.border, height: 1),
            const SizedBox(height: 12),

            // Campaigns section
            if (campaigns.isEmpty)
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: AppTheme.muted,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'No active campaigns right now',
                    style: TextStyle(color: AppTheme.muted, fontSize: 13),
                  ),
                ],
              )
            else ...[
              Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                        color: Color(0xFF22C55E), shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${campaigns.length} active campaign${campaigns.length > 1 ? 's' : ''}',
                    style: const TextStyle(
                        color: Color(0xFF22C55E),
                        fontSize: 12,
                        fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...campaigns.map((c) => _CampaignRow(campaign: c)),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── Campaign row inside business card ────────────────────────────────────────

class _CampaignRow extends StatelessWidget {
  final Map<String, dynamic> campaign;
  const _CampaignRow({required this.campaign});

  String get _typeEmoji {
    switch (campaign['type'] as String? ?? '') {
      case 'SNAKE':
        return '🐍';
      case 'POINT_GUESS':
        return '🔢';
      case 'EVERY_N':
        return '🎯';
      default:
        return '🎰';
    }
  }

  String _timeLeft() {
    final endsAt = (campaign['endsAt'] as String?)?.toLocalDateTime();
    if (endsAt == null) return '';
    final diff = endsAt.difference(DateTime.now());
    if (diff.isNegative) return '';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m left';
    if (diff.inHours < 24) return '${diff.inHours}h left';
    return '${diff.inDays}d left';
  }

  @override
  Widget build(BuildContext context) {
    final timeLeft = _timeLeft();
    final entries = (campaign['_count']?['entries'] as num?)?.toInt() ?? 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(_typeEmoji, style: const TextStyle(fontSize: 15)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  campaign['name'] ?? '',
                  style: const TextStyle(
                      color: AppTheme.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    Text(
                      '$entries entries',
                      style: const TextStyle(color: AppTheme.muted, fontSize: 11),
                    ),
                    if (timeLeft.isNotEmpty) ...[
                      const Text(' · ',
                          style: TextStyle(color: AppTheme.muted, fontSize: 11)),
                      Text(timeLeft,
                          style: const TextStyle(
                              color: AppTheme.gold,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => context.push('/campaign/${campaign['id']}'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.gold,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'View',
                style: TextStyle(
                    color: Colors.black,
                    fontSize: 12,
                    fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
