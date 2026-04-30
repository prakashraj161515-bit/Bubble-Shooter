import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../models/question_model.dart';
import '../services/ai_service.dart';
import '../services/ocr_service.dart';
import 'image_crop_screen.dart';
import 'result_screen.dart';

class InputScreen extends StatefulWidget {
  const InputScreen({
    super.key,
    required this.initialMode,
  });

  final InputMode initialMode;

  @override
  State<InputScreen> createState() => _InputScreenState();
}

class _InputScreenState extends State<InputScreen> {
  final TextEditingController _textController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  final SpeechToText _speechToText = SpeechToText();

  bool _isLoading = false;
  bool _isListening = false;
  String? _statusMessage;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handleInitialMode();
    });
  }

  @override
  void dispose() {
    _speechToText.stop();
    _textController.dispose();
    super.dispose();
  }

  Future<void> _handleInitialMode() async {
    switch (widget.initialMode) {
      case InputMode.camera:
        await _pickAndReadImage(ImageSource.camera);
        break;
      case InputMode.gallery:
        await _pickAndReadImage(ImageSource.gallery);
        break;
      case InputMode.voice:
        await _startVoiceInput();
        break;
      case InputMode.text:
        break;
    }
  }

  Future<void> _pickAndReadImage(ImageSource source) async {
    try {
      setState(() {
        _isLoading = true;
        _statusMessage = 'Reading image...';
        _errorMessage = null;
      });

      final XFile? file = await _imagePicker.pickImage(source: source);
      if (file == null) {
        setState(() {
          _isLoading = false;
          _statusMessage = null;
        });
        return;
      }

      if (!mounted) return;

      final croppedPath = await Navigator.push<String?>(
        context,
        MaterialPageRoute(
          builder: (context) => ImageCropScreen(imagePath: file.path),
        ),
      );

      if (croppedPath == null) {
        setState(() {
          _isLoading = false;
          _statusMessage = null;
        });
        return;
      }

      final extractedText = await OcrService.instance.extractText(croppedPath);
      _textController.text = extractedText;

      setState(() {
        _isLoading = false;
        _statusMessage = extractedText.isEmpty ? 'No text found' : 'Text ready';
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
        _statusMessage = null;
        _errorMessage = 'Could not read the image';
      });
    }
  }

  Future<void> _startVoiceInput() async {
    final available = await _speechToText.initialize();
    if (!available) {
      setState(() {
        _errorMessage = 'Voice input is not available';
      });
      return;
    }

    setState(() {
      _isListening = true;
      _errorMessage = null;
    });

    await _speechToText.listen(
      onResult: (result) {
        setState(() {
          _textController.text = result.recognizedWords;
        });
      },
    );
  }

  Future<void> _stopVoiceInput() async {
    await _speechToText.stop();
    setState(() {
      _isListening = false;
    });
  }

  Future<void> _solveQuestion() async {
    final question = _textController.text.trim();
    if (question.isEmpty) {
      setState(() {
        _errorMessage = 'Enter a question first';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _statusMessage = 'Getting answer...';
    });

    try {
      final result = await AiService.instance.solveQuestion(question);
      if (!mounted) {
        return;
      }

      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ResultScreen(
            question: question,
            initialResult: result,
          ),
        ),
      );
    } on StudyException catch (error) {
      if (!mounted) {
        return;
      }

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
          _statusMessage = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Input'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isLoading
                        ? null
                        : () => _pickAndReadImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_outlined),
                    label: const Text('Scan'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isLoading
                        ? null
                        : () => _pickAndReadImage(ImageSource.gallery),
                    icon: const Icon(Icons.upload_file_outlined),
                    label: const Text('Upload'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isListening ? _stopVoiceInput : _startVoiceInput,
                    icon: Icon(
                      _isListening ? Icons.mic_off_outlined : Icons.mic_none,
                    ),
                    label: Text(_isListening ? 'Stop Voice' : 'Voice Input'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: TextField(
                controller: _textController,
                maxLines: null,
                expands: true,
                decoration: const InputDecoration(
                  hintText: 'Type or paste your question here',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_statusMessage != null)
              Text(
                _statusMessage!,
                style: TextStyle(color: Colors.grey.shade700),
              ),
            if (_errorMessage != null) ...<Widget>[
              const SizedBox(height: 6),
              Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
              if (!_isLoading)
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: _solveQuestion,
                    child: const Text('Retry'),
                  ),
                ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              height: 52,
              child: FilledButton(
                onPressed: _isLoading ? null : _solveQuestion,
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Solve'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
