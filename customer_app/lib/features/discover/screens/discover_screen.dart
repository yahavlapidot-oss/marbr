import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme.dart';
import '../../campaigns/providers/campaigns_provider.dart';
import '../../campaigns/widgets/campaign_card.dart';

class DiscoverScreen extends ConsumerStatefulWidget {
  const DiscoverScreen({super.key});

  @override
  ConsumerState<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends ConsumerState<DiscoverScreen> {
  final _searchController = TextEditingController();
  String _query = '';

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
        child: RefreshIndicator(
          color: AppTheme.gold,
          onRefresh: () => ref.refresh(activeCampaignsProvider.future),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Discover',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: AppTheme.white,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        )),
                      const SizedBox(height: 4),
                      const Text('All live campaigns near you',
                        style: TextStyle(color: AppTheme.subtle, fontSize: 13)),
                      const SizedBox(height: 20),
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
              ),

              campaigns.when(
                loading: () => const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
                ),
                error: (e, _) => SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.wifi_off, color: AppTheme.muted, size: 40),
                        const SizedBox(height: 12),
                        const Text('Could not load campaigns',
                          style: TextStyle(color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        const Text('Pull down to retry',
                          style: TextStyle(color: AppTheme.muted, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
                data: (all) {
                  final list = _filter(all);
                  if (list.isEmpty) {
                    return SliverFillRemaining(
                      child: Center(
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
                                color: AppTheme.subtle, fontSize: 15, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _query.isNotEmpty ? 'Try a different search term' : 'Check back soon',
                              style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (_, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: CampaignCard(campaign: list[i] as Map<String, dynamic>),
                        ),
                        childCount: list.length,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
