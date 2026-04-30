import 'package:flutter/material.dart';

import '../models/question_model.dart';
import '../services/cache_service.dart';

class ResultSummaryScreen extends StatefulWidget {
  const ResultSummaryScreen({
    super.key,
    required this.baseQuestion,
    required this.baseAnswer,
    required this.mcqs,
    required this.selectedAnswers,
    required this.score,
  });

  final String baseQuestion;
  final String baseAnswer;
  final List<McqQuestion> mcqs;
  final List<int?> selectedAnswers;
  final int score;

  @override
  State<ResultSummaryScreen> createState() => _ResultSummaryScreenState();
}

class _ResultSummaryScreenState extends State<ResultSummaryScreen> {
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    _saveSummary();
  }

  Future<void> _saveSummary() async {
    final record = QuestionModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      question: widget.baseQuestion,
      answer: widget.baseAnswer,
      score: widget.score,
      createdAt: DateTime.now(),
    );

    await CacheService.instance.saveHistory(record);
    if (!mounted) {
      return;
    }

    setState(() {
      _saved = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.mcqs.length;
    final percentage = total == 0 ? 0 : ((widget.score / total) * 100).round();
    final remark = percentage > 80 ? 'Good' : 'Improve';

    return Scaffold(
      appBar: AppBar(title: const Text('Quiz Result')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Score: ${widget.score}/$total',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text('Percentage: $percentage%'),
                  const SizedBox(height: 8),
                  Text('Remark: $remark'),
                  if (_saved) ...<Widget>[
                    const SizedBox(height: 8),
                    Text(
                      'Saved to history',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ...List<Widget>.generate(widget.mcqs.length, (int index) {
            final mcq = widget.mcqs[index];
            final selectedIndex = widget.selectedAnswers[index];
            final isCorrect = selectedIndex == mcq.correctIndex;

            if (isCorrect) {
              return const SizedBox.shrink();
            }

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        mcq.question,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Correct answer: ${mcq.options[mcq.correctIndex]}',
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
