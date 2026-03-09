import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _baseUrl = 'https://marbr-production.up.railway.app/api/v1';

final _storage = FlutterSecureStorage();

Dio createDio() {
  final dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  bool isRefreshing = false;

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'accessToken');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401 && !isRefreshing) {
        isRefreshing = true;
        try {
          final refreshToken = await _storage.read(key: 'refreshToken');
          if (refreshToken == null) {
            await _storage.deleteAll();
            return handler.next(error);
          }
          final res = await Dio(BaseOptions(baseUrl: _baseUrl))
              .post('/auth/refresh', data: {'refreshToken': refreshToken});
          await _storage.write(key: 'accessToken', value: res.data['accessToken']);
          await _storage.write(key: 'refreshToken', value: res.data['refreshToken']);
          final retryOptions = error.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer ${res.data['accessToken']}';
          final retryResponse = await dio.fetch(retryOptions);
          isRefreshing = false;
          return handler.resolve(retryResponse);
        } catch (_) {
          isRefreshing = false;
          await _storage.deleteAll();
        }
      }
      handler.next(error);
    },
  ));

  return dio;
}

final dioProvider = Provider<Dio>((ref) => createDio());
