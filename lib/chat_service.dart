import 'dart:convert';
import 'package:http/http.dart' as http;

Future<String> sendMessage(String message) async {
  // Using 127.0.0.1 for local FastAPI server
  final response = await http.post(
    Uri.parse("http://127.0.0.1:8000/chat"),
    headers: {"Content-Type": "application/json"},
    body: jsonEncode({"message": message}),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    return data["reply"] ?? "No response";
  } else {
    return "Server error";
  }
}
