import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme.dart';

class CampaignCard extends StatelessWidget {
  final Map<String, dynamic> campaign;
  const CampaignCard({super.key, required this.campaign});

  @override
  Widget build(BuildContext context) {
    final business = campaign['business'] as Map<String, dynamic>?;
    final endsAt = campaign['endsAt'] != null ? DateTime.tryParse(campaign['endsAt']) : null;
    final timeLeft = endsAt != null ? endsAt.difference(DateTime.now()) : Duration.zero;
    final isUrgent = timeLeft.inMinutes < 30 && !timeLeft.isNegative;

    String timeLabel = '';
    if (endsAt != null) {
      if (timeLeft.isNegative) {
        timeLabel = 'Ended';
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
                    const Text('LIVE EVENT',
                      style: TextStyle(color: Color(0xFF22C55E), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1)),
                  ],
                ),
                const Spacer(),
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
                        const Text('Play Now',
                          style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w800)),
                      ] else
                        const Text('Enter Now',
                          style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w800)),
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
