import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'screens/home_screen.dart';
import 'services/cache_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Local cache is required for instant repeats and history.
  await CacheService.instance.init();

  // Firebase stays optional so the app can still run without setup.
  try {
    await Firebase.initializeApp();
  } catch (_) {
    // Ignore startup failures when Firebase files are not configured yet.
  }

  runApp(const AIStudyHelperApp());
}

class AIStudyHelperApp extends StatelessWidget {
  const AIStudyHelperApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AI Study Helper',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        scaffoldBackgroundColor: Colors.grey.shade50,
        useMaterial3: true,
        cardTheme: const CardTheme(
          margin: EdgeInsets.zero,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
          ),
        ),
      ),
      home: const HomeScreen(),
    );
  }
}
