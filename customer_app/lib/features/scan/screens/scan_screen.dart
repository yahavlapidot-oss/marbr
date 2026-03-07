import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../../../core/theme.dart';

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final MobileScannerController _ctrl = MobileScannerController();
  bool _processing = false;
  String? _result;
  bool _success = false;

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null) return;

    setState(() { _processing = true; _result = null; });
    _ctrl.stop();

    try {
      // code format: <campaignId>:<token>
      final parts = code.split(':');
      final campaignId = parts.isNotEmpty ? parts[0] : code;

      final res = await createDio().post('/entries', data: {
        'campaignId': campaignId,
        'method': 'QR_SCAN',
        'code': code,
      });

      final reward = res.data['reward'];
      setState(() {
        _success = true;
        _result = reward != null
            ? '🎉 You won: ${reward['reward']?['name'] ?? 'a reward'}!'
            : '✅ Entry recorded! Good luck!';
      });
    } catch (e) {
      setState(() {
        _success = false;
        _result = 'Could not process this code. Try again.';
      });
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) {
        setState(() { _processing = false; _result = null; });
        _ctrl.start();
      }
    }
  }

  void _reset() {
    setState(() { _processing = false; _result = null; _success = false; });
    _ctrl.start();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('Scan to Enter'),
        iconTheme: const IconThemeData(color: AppTheme.white),
      ),
      body: _result != null
          ? _resultView()
          : Stack(
              children: [
                MobileScanner(controller: _ctrl, onDetect: _onDetect),
                // Overlay frame
                Center(
                  child: Container(
                    width: 260,
                    height: 260,
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.amber, width: 3),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 60,
                  left: 0, right: 0,
                  child: Center(
                    child: Text(
                      'Point at the QR code on the receipt',
                      style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _resultView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _success ? Icons.check_circle : Icons.error_outline,
              color: _success ? const Color(0xFF22C55E) : Colors.redAccent,
              size: 80,
            ),
            const SizedBox(height: 20),
            Text(
              _result!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.white, fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 32),
            ElevatedButton(onPressed: _reset, child: const Text('Scan Again')),
          ],
        ),
      ),
    );
  }
}
