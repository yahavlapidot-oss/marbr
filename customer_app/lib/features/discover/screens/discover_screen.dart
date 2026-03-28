import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme.dart';
import '../../../core/location_service.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';
import '../../campaigns/providers/campaigns_provider.dart';
import '../../campaigns/widgets/campaign_card.dart';
import '../widgets/campaign_map_view.dart';
import '../providers/businesses_provider.dart';

class DiscoverScreen extends ConsumerStatefulWidget {
  const DiscoverScreen({super.key});

  @override
  ConsumerState<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends ConsumerState<DiscoverScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  bool _mapMode = false;
  bool _locationPromptDismissed = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _filter(List<dynamic> all) {
    final q = _query.trim().toLowerCase();
    final typed = all.cast<Map<String, dynamic>>();
    if (q.isEmpty) return typed;
    return typed.where((c) {
      final name = (c['name'] as String? ?? '').toLowerCase();
      final venue = (c['business']?['name'] as String? ?? '').toLowerCase();
      return name.contains(q) || venue.contains(q);
    }).toList();
  }

  Future<void> _requestLocation() async {
    await ref.read(locationProvider.notifier).requestAndGetLocation();
    // Re-fetch campaigns with new location
    final pos = ref.read(locationProvider);
    ref.invalidate(activeCampaignsProvider(pos));
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final userPosition = ref.watch(locationProvider);
    final campaigns = ref.watch(activeCampaignsProvider(userPosition));
    final businesses = ref.watch(nearbyBusinessesProvider(userPosition));

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        child: Column(
          children: [
            // Header + search + toggle
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              t('discover'),
                              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                    color: AppTheme.white,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.5,
                                  ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              userPosition != null
                                  ? t('campaigns_near')
                                  : t('all_live'),
                              style: const TextStyle(color: AppTheme.subtle, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      // List / Map toggle
                      Container(
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _ToggleButton(
                              icon: Icons.list,
                              active: !_mapMode,
                              onTap: () => setState(() => _mapMode = false),
                            ),
                            _ToggleButton(
                              icon: Icons.map_outlined,
                              active: _mapMode,
                              onTap: () => setState(() => _mapMode = true),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _searchController,
                    onChanged: (v) => setState(() => _query = v),
                    style: const TextStyle(color: AppTheme.white, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: t('search_ph'),
                      hintStyle: const TextStyle(color: AppTheme.muted, fontSize: 14),
                      prefixIcon: const Icon(Icons.search, color: AppTheme.muted, size: 20),
                      suffixIcon: _query.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close, color: AppTheme.muted, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _query = '');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: AppTheme.surface,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.gold, width: 1.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: campaigns.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2),
                ),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, color: AppTheme.muted, size: 40),
                      const SizedBox(height: 12),
                      Text(t('could_not_load'),
                          style: const TextStyle(
                              color: AppTheme.subtle,
                              fontSize: 15,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(t('pull_retry'),
                          style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => ref.invalidate(activeCampaignsProvider(userPosition)),
                        child: Text(t('retry'), style: const TextStyle(color: AppTheme.gold)),
                      ),
                    ],
                  ),
                ),
                data: (all) {
                  final list = _filter(all);

                  if (_mapMode) {
                    return businesses.when(
                      loading: () => const Center(
                        child: CircularProgressIndicator(
                            color: AppTheme.gold, strokeWidth: 2),
                      ),
                      error: (_, _) => CampaignMapView(
                        campaigns: list,
                        userPosition: userPosition,
                      ),
                      data: (bizList) => CampaignMapView(
                        campaigns: bizList,
                        userPosition: userPosition,
                      ),
                    );
                  }

                  if (list.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.search_off, color: AppTheme.muted, size: 48),
                          const SizedBox(height: 12),
                          Text(
                            _query.isNotEmpty
                                ? '${t('no_results')} "$_query"'
                                : t('no_campaigns_nearby'),
                            style: const TextStyle(
                                color: AppTheme.subtle,
                                fontSize: 15,
                                fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _query.isNotEmpty
                                ? t('try_different')
                                : t('check_back'),
                            style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                          ),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    color: AppTheme.gold,
                    onRefresh: () async =>
                        ref.invalidate(activeCampaignsProvider(userPosition)),
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      itemCount: list.length +
                          (_shouldShowLocationPrompt(userPosition) ? 1 : 0),
                      itemBuilder: (_, i) {
                        // Location permission banner at top of list
                        if (i == 0 && _shouldShowLocationPrompt(userPosition)) {
                          return _LocationPromptCard(
                            onAllow: _requestLocation,
                            onDismiss: () =>
                                setState(() => _locationPromptDismissed = true),
                            locationPrompt: t('location_prompt'),
                            locationSub: t('location_sub'),
                            allowLabel: t('allow'),
                          );
                        }
                        final offset =
                            _shouldShowLocationPrompt(userPosition) ? 1 : 0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: CampaignCard(campaign: list[i - offset]),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _shouldShowLocationPrompt(Object? position) =>
      position == null && !_locationPromptDismissed;
}

// ─────────────────────────────────────────────────────────────
// Location permission banner
// ─────────────────────────────────────────────────────────────

class _LocationPromptCard extends StatefulWidget {
  final Future<void> Function() onAllow;
  final VoidCallback onDismiss;
  final String locationPrompt;
  final String locationSub;
  final String allowLabel;
  const _LocationPromptCard({
    required this.onAllow,
    required this.onDismiss,
    required this.locationPrompt,
    required this.locationSub,
    required this.allowLabel,
  });

  @override
  State<_LocationPromptCard> createState() => _LocationPromptCardState();
}

class _LocationPromptCardState extends State<_LocationPromptCard> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.gold.withAlpha(60)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppTheme.gold.withAlpha(20),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.near_me, color: AppTheme.gold, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.locationPrompt,
                    style: const TextStyle(
                        color: AppTheme.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(widget.locationSub,
                    style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            style: TextButton.styleFrom(
              backgroundColor: AppTheme.gold,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            onPressed: _loading
                ? null
                : () async {
                    setState(() => _loading = true);
                    await widget.onAllow();
                    if (mounted) setState(() => _loading = false);
                  },
            child: _loading
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.black))
                : Text(widget.allowLabel,
                    style:
                        const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: widget.onDismiss,
            child: const Icon(Icons.close, size: 16, color: AppTheme.muted),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// List / Map toggle button
// ─────────────────────────────────────────────────────────────

class _ToggleButton extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const _ToggleButton(
      {required this.icon, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppTheme.gold : Colors.transparent,
          borderRadius: BorderRadius.circular(9),
        ),
        child: Icon(icon, size: 18,
            color: active ? Colors.black : AppTheme.muted),
      ),
    );
  }
}
