import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/question_model.dart';
import '../services/cache_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  late Future<List<QuestionModel>> _historyFuture;

  @override
  void initState() {
    super.initState();
    _historyFuture = CacheService.instance.loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('History')),
      body: FutureBuilder<List<QuestionModel>>(
        future: _historyFuture,
        builder: (BuildContext context, AsyncSnapshot<List<QuestionModel>> snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final items = snapshot.data ?? <QuestionModel>[];
          if (items.isEmpty) {
            return const Center(child: Text('No history yet'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (BuildContext context, int index) {
              final item = items[index];
              final date = DateFormat('dd MMM yyyy, hh:mm a').format(item.createdAt);

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        item.question,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(item.answer),
                      const SizedBox(height: 8),
                      Text(
                        item.score == null ? 'Score: -' : 'Score: ${item.score}/3',
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        date,
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
