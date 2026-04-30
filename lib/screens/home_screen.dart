import 'package:flutter/material.dart';

import '../models/question_model.dart';
import 'history_screen.dart';
import 'input_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Study Helper'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const SizedBox(height: 12),
            const Text(
              'Choose how you want to ask your question.',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            _HomeButton(
              label: 'Scan',
              icon: Icons.camera_alt_outlined,
              onTap: () => _openInput(context, InputMode.camera),
            ),
            const SizedBox(height: 12),
            _HomeButton(
              label: 'Upload',
              icon: Icons.photo_library_outlined,
              onTap: () => _openInput(context, InputMode.gallery),
            ),
            const SizedBox(height: 12),
            _HomeButton(
              label: 'Enter Text',
              icon: Icons.edit_note_outlined,
              onTap: () => _openInput(context, InputMode.text),
            ),
            const SizedBox(height: 12),
            _HomeButton(
              label: 'Voice Input',
              icon: Icons.mic_none_rounded,
              onTap: () => _openInput(context, InputMode.voice),
            ),
            const SizedBox(height: 12),
            _HomeButton(
              label: 'History',
              icon: Icons.history,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const HistoryScreen(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openInput(BuildContext context, InputMode mode) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => InputScreen(initialMode: mode),
      ),
    );
  }
}

class _HomeButton extends StatelessWidget {
  const _HomeButton({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: FilledButton.icon(
        onPressed: onTap,
        icon: Icon(icon),
        label: Text(label),
      ),
    );
  }
}
