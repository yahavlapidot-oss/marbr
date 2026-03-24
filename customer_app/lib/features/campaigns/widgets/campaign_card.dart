import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme.dart';
import '../../../core/l10n/app_l10n.dart';
import '../../../core/locale_provider.dart';

class _DistanceBadge extends StatelessWidget {
  final double meters;
  final String hereNowLabel;
  const _DistanceBadge({required this.meters, required this.hereNowLabel});

  String _distanceLabel() {
    if (meters < 100) return hereNowLabel;
    if (meters < 1000) return '~${meters.round()}m';
    return '~${(meters / 1000).toStringAsFixed(1)}km';
  }

  @override
  Widget build(BuildContext context) {
    final isHere = meters < 100;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: isHere ? const Color(0xFF22C55E).withAlpha(25) : AppTheme.gold.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.near_me, size: 10,
              color: isHere ? const Color(0xFF22C55E) : AppTheme.gold),
          const SizedBox(width: 3),
          Text(
            _distanceLabel(),
            style: TextStyle(
              color: isHere ? const Color(0xFF22C55E) : AppTheme.gold,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class CampaignCard extends ConsumerWidget {
  final Map<String, dynamic> campaign;
  const CampaignCard({super.key, required this.campaign});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    String t(String key) => AppL10n.of(locale, key);

    final business = campaign['business'] as Map<String, dynamic>?;
    final endsAt = campaign['endsAt'] != null ? DateTime.tryParse(campaign['endsAt']) : null;
    final timeLeft = endsAt != null ? endsAt.difference(DateTime.now()) : Duration.zero;
    final isUrgent = timeLeft.inMinutes < 30 && !timeLeft.isNegative;

    String timeLabel = '';
    if (endsAt != null) {
      if (timeLeft.isNegative) {
        timeLabel = t('ended');
      } else if (timeLeft.inMinutes < 60) {
        timeLabel = '${timeLeft.inMinutes}m left';
      } else if (timeLeft.inHours < 24) {
        timeLabel = '${timeLeft.inHours}h left';
      } else {
        timeLabel = '${timeLeft.inDays}d left';
      }
    }

    return GestureDetector(
      onTap: () => context.push('/campaign/${campaign['id']}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isUrgent ? AppTheme.gold.withAlpha(80) : AppTheme.border),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Live badge
                Row(
                  children: [
                    Container(
                      width: 7, height: 7,
                      decoration: const BoxDecoration(color: Color(0xFF22C55E), shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 5),
                    Text(t('live_event'),
                      style: const TextStyle(color: Color(0xFF22C55E), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1)),
                  ],
                ),
                const Spacer(),
                // Distance badge (only when server returns _distanceMeters)
                if (campaign['_distanceMeters'] != null && (campaign['_distanceMeters'] as num) != double.infinity) ...[
                  _DistanceBadge(
                    meters: (campaign['_distanceMeters'] as num).toDouble(),
                    hereNowLabel: t('here_now'),
                  ),
                  const SizedBox(width: 6),
                ],
                if (timeLabel.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isUrgent ? AppTheme.gold.withAlpha(20) : AppTheme.surface,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(children: [
                      Icon(Icons.timer_outlined, size: 11, color: isUrgent ? AppTheme.gold : AppTheme.subtle),
                      const SizedBox(width: 3),
                      Text(timeLabel, style: TextStyle(
                        color: isUrgent ? AppTheme.gold : AppTheme.subtle,
                        fontSize: 11, fontWeight: FontWeight.w600,
                      )),
                    ]),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Text(campaign['name'] ?? '',
              style: const TextStyle(color: AppTheme.white, fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
            if (campaign['description'] != null) ...[
              const SizedBox(height: 4),
              Text(campaign['description'],
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppTheme.subtle, fontSize: 13, height: 1.4)),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                if (business != null) ...[
                  if (business['logoUrl'] != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.network(
                        business['logoUrl'],
                        width: 20, height: 20,
                        fit: BoxFit.cover,
                        errorBuilder: (context, e, _) =>
                          const Icon(Icons.location_on_outlined, color: AppTheme.muted, size: 13),
                      ),
                    )
                  else
                    const Icon(Icons.location_on_outlined, color: AppTheme.muted, size: 13),
                  const SizedBox(width: 5),
                  if (business['name'] != null)
                    Text(business['name'], style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: AppTheme.gold,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (campaign['type'] == 'SNAKE') ...[
                        const Text('🐍', style: TextStyle(fontSize: 13)),
                        const SizedBox(width: 4),
                        Text(t('play_now'),
                          style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w800)),
                      ] else
                        Text(t('enter_now'),
                          style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
