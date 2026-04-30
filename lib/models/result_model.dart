import 'question_model.dart';

class ResultModel {
  ResultModel({
    required this.answer,
    required this.createdAt,
    this.detailedAnswer,
    this.provider = 'gemini',
    this.fromCache = false,
    this.mcqs = const <McqQuestion>[],
  });

  final String answer;
  final String? detailedAnswer;
  final String provider;
  final bool fromCache;
  final DateTime createdAt;
  final List<McqQuestion> mcqs;

  ResultModel copyWith({
    String? answer,
    String? detailedAnswer,
    String? provider,
    bool? fromCache,
    DateTime? createdAt,
    List<McqQuestion>? mcqs,
  }) {
    return ResultModel(
      answer: answer ?? this.answer,
      detailedAnswer: detailedAnswer ?? this.detailedAnswer,
      provider: provider ?? this.provider,
      fromCache: fromCache ?? this.fromCache,
      createdAt: createdAt ?? this.createdAt,
      mcqs: mcqs ?? this.mcqs,
    );
  }
}
