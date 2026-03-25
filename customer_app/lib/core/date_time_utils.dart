/// Extension for parsing API UTC ISO timestamps.
///
/// All timestamps from the backend are UTC (Z suffix).
/// This extension converts them to the device's local timezone automatically.
extension ApiDateTime on String {
  /// Parses a UTC ISO timestamp from the API and returns it in local time.
  /// Returns null if the string is empty or cannot be parsed.
  DateTime? toLocalDateTime() => DateTime.tryParse(this)?.toLocal();
}
