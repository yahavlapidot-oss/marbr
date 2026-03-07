import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme.dart';

class CampaignCard extends StatelessWidget {
  final Map<String, dynamic> campaign;
  const CampaignCard({super.key, required this.campaign});

  @override
  Widget build(BuildContext context) {
    final type = (campaign['type'] as String? ?? '').replaceAll('_', ' ');
    final entries = campaign['_count']?['entries'] ?? 0;
    final business = campaign['business'] as Map<String, dynamic>?;

    return GestureDetector(
      onTap: () => context.push('/campaign/${campaign['id']}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          border: Border.all(color: AppTheme.border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.amber.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(type, style: const TextStyle(color: AppTheme.amber, fontSize: 11, fontWeight: FontWeight.w600)),
                ),
                const Spacer(),
                Container(
                  width: 8, height: 8,
                  decoration: const BoxDecoration(color: Color(0xFF22C55E), shape: BoxShape.circle),
                ),
                const SizedBox(width: 4),
                const Text('LIVE', style: TextStyle(color: Color(0xFF22C55E), fontSize: 11, fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              campaign['name'] ?? '',
              style: const TextStyle(color: AppTheme.white, fontSize: 17, fontWeight: FontWeight.w700),
            ),
            if (business != null) ...[
              const SizedBox(height: 4),
              Text(business['name'] ?? '', style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.people_outline, color: AppTheme.muted, size: 15),
                const SizedBox(width: 4),
                Text('$entries participants', style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.amber,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('Enter Now', style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
