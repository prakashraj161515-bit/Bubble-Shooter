# AI Study Helper

Simple Flutter app for:

- solving questions
- extracting text from images
- generating 3 MCQs
- reading answers aloud
- storing the last 20 history items

## Run

1. Make sure Flutter is installed and accessible outside protected folders.
2. Generate missing platform folders if this project was created from source files only:

```bash
flutter create .
```

3. Install packages:

```bash
flutter pub get
```

4. Run with secure backend values:

```bash
flutter run \
  --dart-define=AI_GATEWAY_URL=https://your-backend.example.com/ai/gemini \
  --dart-define=DEEPSEEK_GATEWAY_URL=https://your-backend.example.com/ai/deepseek \
  --dart-define=AI_GATEWAY_TOKEN=replace-me
```

## Notes

- The app does not hardcode API keys in the frontend.
- `AI_GATEWAY_URL` should call Gemini with `gemini-3.1-flash-lite`.
- `DEEPSEEK_GATEWAY_URL` is used as a fallback when Gemini fails.
- Firebase is optional at runtime. If Firebase is configured, history records can also sync to Firestore.
