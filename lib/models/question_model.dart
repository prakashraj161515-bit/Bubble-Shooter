enum InputMode {
  camera,
  gallery,
  text,
  voice,
}

class QuestionModel {
  QuestionModel({
    required this.id,
    required this.question,
    required this.answer,
    required this.createdAt,
    this.score,
  });

  final String id;
  final String question;
  final String answer;
  final int? score;
  final DateTime createdAt;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'question': question,
      'answer': answer,
      'score': score,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory QuestionModel.fromJson(Map<String, dynamic> json) {
    return QuestionModel(
      id: json['id'] as String? ?? '',
      question: json['question'] as String? ?? '',
      answer: json['answer'] as String? ?? '',
      score: (json['score'] as num?)?.toInt(),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}

class McqQuestion {
  McqQuestion({
    required this.question,
    required this.options,
    required this.correctIndex,
  });

  final String question;
  final List<String> options;
  final int correctIndex;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'question': question,
      'options': options,
      'correctIndex': correctIndex,
    };
  }

  factory McqQuestion.fromJson(Map<String, dynamic> json) {
    final rawOptions = (json['options'] as List<dynamic>? ?? <dynamic>[])
        .map((dynamic option) => option.toString())
        .toList();

    return McqQuestion(
      question: json['question'] as String? ?? '',
      options: rawOptions,
      correctIndex: (json['correctIndex'] as num?)?.toInt() ?? 0,
    );
  }
}
