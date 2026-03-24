import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme.dart';

class CampaignMapView extends StatefulWidget {
  final List<Map<String, dynamic>> campaigns;
  final Position? userPosition;

  const CampaignMapView({super.key, required this.campaigns, this.userPosition});

  @override
  State<CampaignMapView> createState() => _CampaignMapViewState();
}

class _CampaignMapViewState extends State<CampaignMapView> {
  final _mapController = MapController();
  Map<String, dynamic>? _selected;

  /// Extract all (campaign, branch) pairs that have lat/lng
  List<_CampaignPin> get _pins {
    final pins = <_CampaignPin>[];
    for (final c in widget.campaigns) {
      final branches = c['branches'] as List<dynamic>? ?? [];
      for (final b in branches) {
        final branch = b['branch'] as Map<String, dynamic>?;
        final lat = _toDouble(branch?['lat']);
        final lng = _toDouble(branch?['lng']);
        if (lat != null && lng != null) {
          pins.add(_CampaignPin(
            campaign: c,
            branch: branch!,
            point: LatLng(lat, lng),
          ));
        }
      }
    }
    return pins;
  }

  double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }

  LatLng get _center {
    // Prefer user's actual position as the map center
    if (widget.userPosition != null) {
      return LatLng(widget.userPosition!.latitude, widget.userPosition!.longitude);
    }
    final pins = _pins;
    if (pins.isEmpty) return const LatLng(32.0853, 34.7818); // Tel Aviv default
    final avgLat = pins.map((p) => p.point.latitude).reduce((a, b) => a + b) / pins.length;
    final avgLng = pins.map((p) => p.point.longitude).reduce((a, b) => a + b) / pins.length;
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
            Text('No campaigns with location data',
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
            onTap: (tapPos, point) => setState(() => _selected = null),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
              subdomains: const ['a', 'b', 'c', 'd'],
              userAgentPackageName: 'com.mrbar.customer_app',
            ),
            MarkerLayer(
              markers: pins.map((pin) {
                final isSelected = _selected?['id'] == pin.campaign['id'];
                return Marker(
                  point: pin.point,
                  width: isSelected ? 52 : 44,
                  height: isSelected ? 52 : 44,
                  child: GestureDetector(
                    onTap: () => setState(() => _selected = pin.campaign),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.gold : AppTheme.surface,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? AppTheme.gold : AppTheme.border,
                          width: isSelected ? 3 : 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: isSelected
                                ? AppTheme.gold.withValues(alpha: 0.4)
                                : Colors.black.withValues(alpha: 0.4),
                            blurRadius: isSelected ? 12 : 6,
                            spreadRadius: isSelected ? 2 : 0,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Icon(
                          Icons.local_bar,
                          color: isSelected ? Colors.black : AppTheme.gold,
                          size: isSelected ? 24 : 20,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            // User location pin — blue pulsing dot
            if (widget.userPosition != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: LatLng(widget.userPosition!.latitude, widget.userPosition!.longitude),
                    width: 22,
                    height: 22,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2.5),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF3B82F6).withValues(alpha: 0.5),
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
          bottom: _selected != null ? 148 : 8,
          right: 8,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Text(
              '© CartoDB © OpenStreetMap',
              style: TextStyle(color: Colors.white54, fontSize: 9),
            ),
          ),
        ),

        // Campaign bottom sheet when pin selected
        if (_selected != null)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _CampaignBottomCard(
              campaign: _selected!,
              onClose: () => setState(() => _selected = null),
            ),
          ),
      ],
    );
  }
}

class _CampaignPin {
  final Map<String, dynamic> campaign;
  final Map<String, dynamic> branch;
  final LatLng point;

  const _CampaignPin({required this.campaign, required this.branch, required this.point});
}

class _CampaignBottomCard extends StatelessWidget {
  final Map<String, dynamic> campaign;
  final VoidCallback onClose;

  const _CampaignBottomCard({required this.campaign, required this.onClose});

  String get _typeLabel {
    switch (campaign['type'] as String? ?? '') {
      case 'RAFFLE':
        return 'Raffle';
      case 'INSTANT_WIN':
        return 'Instant Win';
      case 'EVERY_N':
        return 'Every N';
      case 'WEIGHTED_ODDS':
        return 'Weighted Odds';
      default:
        return campaign['type'] ?? '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final logo = campaign['business']?['logoUrl'] as String?;
    final venue = campaign['business']?['name'] as String? ?? '';
    final entries = campaign['_count']?['entries'] ?? 0;

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 20, spreadRadius: 2),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Logo
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.border),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: logo != null
                      ? Image.network(logo, fit: BoxFit.cover, errorBuilder: (ctx, err, st) =>
                          const Icon(Icons.local_bar, color: AppTheme.gold, size: 20))
                      : const Icon(Icons.local_bar, color: AppTheme.gold, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        campaign['name'] ?? '',
                        style: const TextStyle(
                          color: AppTheme.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        venue,
                        style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
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
            const SizedBox(height: 12),
            Row(
              children: [
                _Chip(label: _typeLabel, icon: Icons.emoji_events_outlined),
                const SizedBox(width: 8),
                _Chip(label: '$entries entries', icon: Icons.people_outline),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.gold,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => context.push('/campaigns/${campaign['id']}'),
                child: const Text('View Campaign', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final IconData icon;

  const _Chip({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppTheme.gold),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(color: AppTheme.subtle, fontSize: 11, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
