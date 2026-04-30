import 'package:flutter/material.dart';

import '../models/question_model.dart';
import '../services/ai_service.dart';
import 'result_summary_screen.dart';

class McqScreen extends StatefulWidget {
  const McqScreen({
    super.key,
    required this.question,
    required this.answer,
  });

  final String question;
  final String answer;

  @override
  State<McqScreen> createState() => _McqScreenState();
}

class _McqScreenState extends State<McqScreen> {
  final List<String> _difficultyLevels = <String>['Easy', 'Medium', 'Hard'];

  List<McqQuestion> _mcqs = <McqQuestion>[];
  List<int?> _selectedAnswers = <int?>[];
  String _difficulty = 'Easy';
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadMcqs();
  }

  Future<void> _loadMcqs() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final items = await AiService.instance.generateMcqs(
        question: widget.question,
        answer: widget.answer,
        difficulty: _difficulty,
      );

      setState(() {
        _mcqs = items;
        _selectedAnswers = List<int?>.filled(items.length, null);
      });
    } on StudyException catch (error) {
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Server busy, please try again';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _submitQuiz() {
    if (_mcqs.isEmpty) {
      return;
    }

    final score = _selectedAnswers.asMap().entries.fold<int>(
      0,
      (total, entry) =>
          total +
          (entry.value == _mcqs[entry.key].correctIndex ? 1 : 0),
    );

    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ResultSummaryScreen(
          baseQuestion: widget.question,
          baseAnswer: widget.answer,
          mcqs: _mcqs,
          selectedAnswers: _selectedAnswers,
          score: score,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('MCQ Practice')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: <Widget>[
            DropdownButtonFormField<String>(
              value: _difficulty,
              decoration: const InputDecoration(
                labelText: 'Difficulty',
                border: OutlineInputBorder(),
              ),
              items: _difficultyLevels
                  .map(
                    (String level) => DropdownMenuItem<String>(
                      value: level,
                      child: Text(level),
                    ),
                  )
                  .toList(),
              onChanged: (String? value) {
                if (value == null) {
                  return;
                }

                setState(() {
                  _difficulty = value;
                });
                _loadMcqs();
              },
            ),
            const SizedBox(height: 16),
            Expanded(
              child: _buildContent(),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton(
                onPressed: _mcqs.isEmpty || _isLoading ? null : _submitQuiz,
                child: const Text('Submit'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _loadMcqs,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: _mcqs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (BuildContext context, int index) {
        final mcq = _mcqs[index];

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  '${index + 1}. ${mcq.question}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                ...List<Widget>.generate(mcq.options.length, (int optionIndex) {
                  return RadioListTile<int>(
                    contentPadding: EdgeInsets.zero,
                    title: Text(mcq.options[optionIndex]),
                    value: optionIndex,
                    groupValue: _selectedAnswers[index],
                    onChanged: (int? value) {
                      setState(() {
                        _selectedAnswers[index] = value;
                      });
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }
}
