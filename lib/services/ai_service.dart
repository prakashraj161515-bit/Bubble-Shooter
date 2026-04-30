import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../models/question_model.dart';
import '../models/result_model.dart';
import 'cache_service.dart';

enum StudyErrorType {
  noInternet,
  serverBusy,
  backendNotConfigured,
}

class StudyException implements Exception {
  StudyException(this.type, this.message);

  final StudyErrorType type;
  final String message;
}

class AiService {
  AiService._();

  static final AiService instance = AiService._();

  static const Duration _timeout = Duration(seconds: 2);
  static const int _retryCount = 1;
  static const String _geminiModel = 'gemini-3.1-flash-lite';

  final String _geminiUrl = const String.fromEnvironment('AI_GATEWAY_URL');
  final String _deepSeekUrl =
      const String.fromEnvironment('DEEPSEEK_GATEWAY_URL');
  final String _gatewayToken =
      const String.fromEnvironment('AI_GATEWAY_TOKEN');

  Future<ResultModel> solveQuestion(String question) async {
    final cachedAnswer =
        await CacheService.instance.getCachedAnswer(question.trim());
    if (cachedAnswer != null && cachedAnswer.isNotEmpty) {
      return ResultModel(
        answer: cachedAnswer,
        provider: 'cache',
        fromCache: true,
        createdAt: DateTime.now(),
      );
    }

    final answer = await _requestShortAnswer(question);
    await CacheService.instance.cacheAnswer(question: question, answer: answer);

    return ResultModel(
      answer: answer,
      provider: 'gemini/deepseek',
      createdAt: DateTime.now(),
    );
  }

  Future<String> explainAnswer({
    required String question,
    required String answer,
  }) async {
    final prompt = '''
Question:
$question

Current short answer:
$answer

Rules:
- Answer in the same language as the question.
- Give a brief explanation only.
- Keep it clear and useful for a student.
''';

    return _requestText(prompt);
  }

  Future<List<McqQuestion>> generateMcqs({
    required String question,
    required String answer,
    required String difficulty,
  }) async {
    final prompt = '''
Based on the concept below, generate exactly 3 MCQs in JSON.

Question:
$question

Answer:
$answer

Difficulty: $difficulty

Rules:
- Same language as the original question.
- Return only valid JSON.
- Format:
[
  {
    "question": "text",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0
  }
]
''';

    final raw = await _requestText(prompt);
    final cleaned = _stripMarkdownCodeFences(raw);
    final decoded = jsonDecode(cleaned) as List<dynamic>;

    return decoded
        .map(
          (dynamic item) =>
              McqQuestion.fromJson(item as Map<String, dynamic>),
        )
        .where((McqQuestion mcq) => mcq.options.length == 4)
        .take(3)
        .toList();
  }

  Future<String> _requestShortAnswer(String question) async {
    final prompt = '''
Answer this student question.

Question:
$question

Rules:
- Answer in the same language as the question.
- Keep the answer short and clear.
- No unnecessary explanation.
''';

    return _requestText(prompt);
  }

  Future<String> _requestText(String prompt) async {
    if (_geminiUrl.isEmpty && _deepSeekUrl.isEmpty) {
      throw StudyException(
        StudyErrorType.backendNotConfigured,
        'Backend not configured. Add secure gateway URLs before using AI.',
      );
    }

    try {
      if (_geminiUrl.isNotEmpty) {
        return _withRetry(
          () => _callGateway(
            endpoint: _geminiUrl,
            provider: 'gemini',
            model: _geminiModel,
            prompt: prompt,
          ),
        );
      }
    } catch (_) {
      // Fall through to the fallback provider.
    }

    if (_deepSeekUrl.isEmpty) {
      throw StudyException(
        StudyErrorType.serverBusy,
        'Server busy, please try again',
      );
    }

    return _withRetry(
      () => _callGateway(
        endpoint: _deepSeekUrl,
        provider: 'deepseek',
        model: 'deepseek-chat',
        prompt: prompt,
      ),
    );
  }

  Future<String> _withRetry(Future<String> Function() action) async {
    for (int attempt = 0; attempt <= _retryCount; attempt++) {
      try {
        return await action();
      } on SocketException {
        throw StudyException(
          StudyErrorType.noInternet,
          'No internet connection',
        );
      } on TimeoutException {
      } on StudyException {
        rethrow;
      } catch (_) {
      }
    }

    throw StudyException(
      StudyErrorType.serverBusy,
      'Server busy, please try again',
    );
  }

  Future<String> _callGateway({
    required String endpoint,
    required String provider,
    required String model,
    required String prompt,
  }) async {
    final response = await http
        .post(
          Uri.parse(endpoint),
          headers: <String, String>{
            HttpHeaders.contentTypeHeader: 'application/json',
            if (_gatewayToken.isNotEmpty)
              HttpHeaders.authorizationHeader: 'Bearer $_gatewayToken',
          },
          body: jsonEncode(
            <String, dynamic>{
              'provider': provider,
              'model': model,
              'prompt': prompt,
            },
          ),
        )
        .timeout(_timeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StudyException(
        StudyErrorType.serverBusy,
        'Server busy, please try again',
      );
    }

    final dynamic data = jsonDecode(response.body);

    if (data is Map<String, dynamic>) {
      final text = _extractTextFromMap(data);
      if (text.isNotEmpty) {
        return text.trim();
      }
    }

    if (data is String && data.trim().isNotEmpty) {
      return data.trim();
    }

    throw StudyException(
      StudyErrorType.serverBusy,
      'Server busy, please try again',
    );
  }

  String _extractTextFromMap(Map<String, dynamic> data) {
    final direct = <String?>[
      data['answer'] as String?,
      data['text'] as String?,
      data['content'] as String?,
      data['output'] as String?,
    ].whereType<String>().firstWhere(
          (String value) => value.trim().isNotEmpty,
          orElse: () => '',
        );

    if (direct.isNotEmpty) {
      return direct;
    }

    final candidates = data['candidates'];
    if (candidates is List && candidates.isNotEmpty) {
      final first = candidates.first;
      if (first is Map<String, dynamic>) {
        final content = first['content'];
        if (content is Map<String, dynamic>) {
          final parts = content['parts'];
          if (parts is List) {
            return parts
                .map((dynamic item) {
                  if (item is Map<String, dynamic>) {
                    return item['text']?.toString() ?? '';
                  }
                  return '';
                })
                .join('\n');
          }
        }
      }
    }

    return '';
  }

  String _stripMarkdownCodeFences(String value) {
    return value
        .replaceAll('```json', '')
        .replaceAll('```', '')
        .trim();
  }
}
