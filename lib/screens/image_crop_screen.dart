import 'dart:io';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';

class ImageCropScreen extends StatefulWidget {
  final String imagePath;

  const ImageCropScreen({super.key, required this.imagePath});

  @override
  State<ImageCropScreen> createState() => _ImageCropScreenState();
}

class _ImageCropScreenState extends State<ImageCropScreen> {
  Rect? _selection;
  Offset? _startPoint;
  bool _isProcessing = false;

  final GlobalKey _imageKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Select Region'),
        actions: [
          if (_selection != null)
            TextButton(
              onPressed: _isProcessing ? null : _cropAndReturn,
              child: _isProcessing
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Crop & Read', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: Center(
        child: GestureDetector(
          onPanStart: (details) {
            setState(() {
              _startPoint = details.localPosition;
              _selection = Rect.fromPoints(_startPoint!, _startPoint!);
            });
          },
          onPanUpdate: (details) {
            setState(() {
              _selection = Rect.fromPoints(_startPoint!, details.localPosition);
            });
          },
          onPanEnd: (details) {
            _startPoint = null;
          },
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.file(
                File(widget.imagePath),
                key: _imageKey,
                fit: BoxFit.contain,
              ),
              if (_selection != null)
                CustomPaint(
                  painter: SelectionPainter(selection: _selection!),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _cropAndReturn() async {
    if (_selection == null) return;
    
    setState(() {
      _isProcessing = true;
    });

    try {
      // Get rendered image size and position
      final RenderBox renderBox = _imageKey.currentContext!.findRenderObject() as RenderBox;
      final viewSize = renderBox.size;
      
      // Load original image to get its dimensions
      final bytes = await File(widget.imagePath).readAsBytes();
      final originalImage = img.decodeImage(bytes);
      
      if (originalImage == null) {
        throw Exception("Could not decode image");
      }

      // Calculate scale and offset because of BoxFit.contain
      final double scale = min(
        viewSize.width / originalImage.width,
        viewSize.height / originalImage.height,
      );
      
      final double drawWidth = originalImage.width * scale;
      final double drawHeight = originalImage.height * scale;
      
      final double dx = (viewSize.width - drawWidth) / 2;
      final double dy = (viewSize.height - drawHeight) / 2;

      // Adjust selection rect to image coordinates
      final left = (_selection!.left - dx) / scale;
      final top = (_selection!.top - dy) / scale;
      final right = (_selection!.right - dx) / scale;
      final bottom = (_selection!.bottom - dy) / scale;

      // Clamp to image bounds
      final cropX = left.clamp(0, originalImage.width).toInt();
      final cropY = top.clamp(0, originalImage.height).toInt();
      final cropWidth = (right - left).clamp(0, originalImage.width - cropX).toInt();
      final cropHeight = (bottom - top).clamp(0, originalImage.height - cropY).toInt();

      if (cropWidth <= 0 || cropHeight <= 0) {
        throw Exception("Invalid crop area");
      }

      // Perform crop
      final cropped = img.copyCrop(
        originalImage,
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      );

      // Save to temporary file
      final tempDir = await getTemporaryDirectory();
      final targetPath = '${tempDir.path}/cropped_${DateTime.now().millisecondsSinceEpoch}.jpg';
      
      final croppedBytes = img.encodeJpg(cropped);
      await File(targetPath).writeAsBytes(croppedBytes);

      if (mounted) {
        Navigator.pop(context, targetPath);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error cropping image: $e')),
        );
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }
}

class SelectionPainter extends CustomPainter {
  final Rect selection;

  SelectionPainter({required this.selection});

  @override
  void paint(Canvas canvas, Size size) {
    // Darken the unselected area
    final backgroundPaint = Paint()..color = Colors.black54;
    final path = Path.combine(
      PathOperation.difference,
      Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
      Path()..addRect(selection),
    );
    canvas.drawPath(path, backgroundPaint);

    // Draw selection border
    final borderPaint = Paint()
      ..color = Colors.blue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawRect(selection, borderPaint);
    
    // Draw corner handles
    final handlePaint = Paint()..color = Colors.blue;
    const double handleSize = 10;
    
    canvas.drawRect(Rect.fromCenter(center: selection.topLeft, width: handleSize, height: handleSize), handlePaint);
    canvas.drawRect(Rect.fromCenter(center: selection.topRight, width: handleSize, height: handleSize), handlePaint);
    canvas.drawRect(Rect.fromCenter(center: selection.bottomLeft, width: handleSize, height: handleSize), handlePaint);
    canvas.drawRect(Rect.fromCenter(center: selection.bottomRight, width: handleSize, height: handleSize), handlePaint);
  }

  @override
  bool shouldRepaint(covariant SelectionPainter oldDelegate) {
    return oldDelegate.selection != selection;
  }
}
