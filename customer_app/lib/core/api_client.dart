import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _baseUrl = 'http://10.0.2.2:3000/api/v1'; // Android emulator → localhost
// Use 'http://localhost:3000/api/v1' for iOS simulator

final _storage = FlutterSecureStorage();

Dio createDio() {
  final dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'accessToken');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        try {
          final refreshToken = await _storage.read(key: 'refreshToken');
          if (refreshToken == null) return handler.next(error);
          final res = await Dio(BaseOptions(baseUrl: _baseUrl))
              .post('/auth/refresh', data: {'refreshToken': refreshToken});
          await _storage.write(key: 'accessToken', value: res.data['accessToken']);
          await _storage.write(key: 'refreshToken', value: res.data['refreshToken']);
          final retryOptions = error.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer ${res.data['accessToken']}';
          final retryResponse = await dio.fetch(retryOptions);
          return handler.resolve(retryResponse);
        } catch (_) {
          await _storage.deleteAll();
        }
      }
      handler.next(error);
    },
  ));

  return dio;
}

final dioProvider = Provider<Dio>((ref) => createDio());
