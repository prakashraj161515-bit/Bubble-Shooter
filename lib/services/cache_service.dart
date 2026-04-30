import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/question_model.dart';

class CacheService {
  CacheService._();

  static final CacheService instance = CacheService._();

  static const String _answerCacheKey = 'answer_cache';
  static const String _historyKey = 'history_records';
  static const int maxHistoryRecords = 20;

  late SharedPreferences _preferences;

  Future<void> init() async {
    _preferences = await SharedPreferences.getInstance();
  }

  String normalizeQuestion(String value) {
    return value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
  }

  Future<String?> getCachedAnswer(String question) async {
    final encoded = _preferences.getString(_answerCacheKey);
    if (encoded == null || encoded.isEmpty) {
      return null;
    }

    final Map<String, dynamic> map =
        jsonDecode(encoded) as Map<String, dynamic>;
    return map[normalizeQuestion(question)] as String?;
  }

  Future<void> cacheAnswer({
    required String question,
    required String answer,
  }) async {
    final encoded = _preferences.getString(_answerCacheKey);
    final Map<String, dynamic> map = encoded == null || encoded.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(encoded) as Map<String, dynamic>;

    map[normalizeQuestion(question)] = answer;
    await _preferences.setString(_answerCacheKey, jsonEncode(map));
  }

  Future<List<QuestionModel>> loadHistory() async {
    final encoded = _preferences.getString(_historyKey);
    if (encoded == null || encoded.isEmpty) {
      return <QuestionModel>[];
    }

    final List<dynamic> raw = jsonDecode(encoded) as List<dynamic>;
    return raw
        .map((dynamic item) =>
            QuestionModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveHistory(QuestionModel item) async {
    final history = await loadHistory();
    history.insert(0, item);

    final trimmed = history.take(maxHistoryRecords).toList();
    final encoded = jsonEncode(
      trimmed.map((QuestionModel record) => record.toJson()).toList(),
    );

    await _preferences.setString(_historyKey, encoded);
    await _saveHistoryToFirestore(item);
  }

  Future<void> _saveHistoryToFirestore(QuestionModel item) async {
    if (Firebase.apps.isEmpty) {
      return;
    }

    try {
      await FirebaseFirestore.instance
          .collection('study_history')
          .doc(item.id)
          .set(item.toJson());
    } catch (_) {
      // Local history remains the source of truth when cloud sync is unavailable.
    }
  }
}
