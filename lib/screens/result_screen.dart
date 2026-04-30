import 'package:flutter/material.dart';

import '../models/question_model.dart';
import '../models/result_model.dart';
import '../services/ai_service.dart';
import '../services/cache_service.dart';
import '../services/tts_service.dart';
import 'mcq_screen.dart';

class ResultScreen extends StatefulWidget {
  const ResultScreen({
    super.key,
    required this.question,
    required this.initialResult,
  });

  final String question;
  final ResultModel initialResult;

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  late ResultModel _result;
  bool _isLoadingDetail = false;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _result = widget.initialResult;
  }

  Future<void> _loadDetails() async {
    setState(() {
      _isLoadingDetail = true;
      _errorMessage = null;
    });

    try {
      final details = await AiService.instance.explainAnswer(
        question: widget.question,
        answer: _result.answer,
      );

      setState(() {
        _result = _result.copyWith(detailedAnswer: details);
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
          _isLoadingDetail = false;
        });
      }
    }
  }

  Future<void> _saveHistory({int? score}) async {
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final record = QuestionModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      question: widget.question,
      answer: _result.answer,
      score: score,
      createdAt: DateTime.now(),
    );

    await CacheService.instance.saveHistory(record);

    if (!mounted) {
      return;
    }

    setState(() {
      _isSaving = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Saved to history')),
    );
  }

  Future<void> _openMcqs() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => McqScreen(
          question: widget.question,
          answer: _result.answer,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Result')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: <Widget>[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text(
                      'Answer',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(_result.answer),
                    if (_result.fromCache) ...<Widget>[
                      const SizedBox(height: 8),
                      Text(
                        'Instant result from cache',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (_result.detailedAnswer != null) ...<Widget>[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Text(
                        'In Details',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(_result.detailedAnswer!),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: <Widget>[
                FilledButton(
                  onPressed: _isLoadingDetail ? null : _loadDetails,
                  child: _isLoadingDetail
                      ? const Text('Loading...')
                      : const Text('In Details'),
                ),
                OutlinedButton.icon(
                  onPressed: () => TtsService.instance.speak(
                    _result.detailedAnswer ?? _result.answer,
                  ),
                  icon: const Icon(Icons.volume_up_outlined),
                  label: const Text('Voice'),
                ),
                OutlinedButton.icon(
                  onPressed: _isSaving ? null : () => _saveHistory(),
                  icon: const Icon(Icons.save_alt_outlined),
                  label: const Text('Save to History'),
                ),
                OutlinedButton.icon(
                  onPressed: _openMcqs,
                  icon: const Icon(Icons.quiz_outlined),
                  label: const Text('Generate MCQs'),
                ),
              ],
            ),
            if (_errorMessage != null) ...<Widget>[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.red),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _loadDetails,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
