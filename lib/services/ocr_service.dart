import 'dart:io';

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:path_provider/path_provider.dart';

class OcrService {
  OcrService._();

  static final OcrService instance = OcrService._();

  final TextRecognizer _textRecognizer =
      TextRecognizer(script: TextRecognitionScript.latin);

  Future<String> extractText(String imagePath) async {
    final compressedPath = await _compressImage(imagePath);
    final inputImage = InputImage.fromFilePath(compressedPath ?? imagePath);
    final result = await _textRecognizer.processImage(inputImage);
    return result.text.trim();
  }

  Future<String?> _compressImage(String imagePath) async {
    final tempDir = await getTemporaryDirectory();
    final targetPath =
        '${tempDir.path}/${DateTime.now().millisecondsSinceEpoch}.jpg';

    final compressed = await FlutterImageCompress.compressAndGetFile(
      imagePath,
      targetPath,
      quality: 65,
      minWidth: 1280,
      minHeight: 1280,
    );

    if (compressed == null) {
      return null;
    }

    return File(compressed.path).path;
  }

  Future<void> dispose() async {
    await _textRecognizer.close();
  }
}
