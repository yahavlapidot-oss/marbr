import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme.dart';
import '../../campaigns/providers/campaigns_provider.dart';
import '../../campaigns/widgets/campaign_card.dart';
import '../widgets/campaign_map_view.dart';

class DiscoverScreen extends ConsumerStatefulWidget {
  const DiscoverScreen({super.key});

  @override
  ConsumerState<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends ConsumerState<DiscoverScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  bool _mapMode = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<dynamic> _filter(List<dynamic> all) {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return all;
    return all.where((c) {
      final name = (c['name'] as String? ?? '').toLowerCase();
      final venue = (c['business']?['name'] as String? ?? '').toLowerCase();
      return name.contains(q) || venue.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final campaigns = ref.watch(activeCampaignsProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        child: Column(
          children: [
            // Header + search + toggle (always visible)
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
                              'Discover',
                              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                    color: AppTheme.white,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.5,
                                  ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'All live campaigns near you',
                              style: TextStyle(color: AppTheme.subtle, fontSize: 13),
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
                  // Search bar
                  TextField(
                    controller: _searchController,
                    onChanged: (v) => setState(() => _query = v),
                    style: const TextStyle(color: AppTheme.white, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Search campaigns or venues…',
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
                      const Text(
                        'Could not load campaigns',
                        style: TextStyle(
                            color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      const Text('Pull down to retry',
                          style: TextStyle(color: AppTheme.muted, fontSize: 13)),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => ref.refresh(activeCampaignsProvider.future),
                        child: const Text('Retry', style: TextStyle(color: AppTheme.gold)),
                      ),
                    ],
                  ),
                ),
                data: (all) {
                  final list = _filter(all).cast<Map<String, dynamic>>();

                  if (_mapMode) {
                    return CampaignMapView(campaigns: list);
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
                                ? 'No results for "$_query"'
                                : 'No campaigns right now',
                            style: const TextStyle(
                                color: AppTheme.subtle,
                                fontSize: 15,
                                fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _query.isNotEmpty
                                ? 'Try a different search term'
                                : 'Check back soon',
                            style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                          ),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    color: AppTheme.gold,
                    onRefresh: () => ref.refresh(activeCampaignsProvider.future),
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      itemCount: list.length,
                      itemBuilder: (_, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: CampaignCard(campaign: list[i]),
                      ),
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
}

class _ToggleButton extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const _ToggleButton({required this.icon, required this.active, required this.onTap});

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
        child: Icon(
          icon,
          size: 18,
          color: active ? Colors.black : AppTheme.muted,
        ),
      ),
    );
  }
}
