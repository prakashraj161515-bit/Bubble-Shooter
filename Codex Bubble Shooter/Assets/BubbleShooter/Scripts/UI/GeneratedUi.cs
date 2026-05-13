using System;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace BubbleShooter
{
    public sealed class GradientPanel : Graphic
    {
        public Color Top = new Color(0.86f, 0.26f, 1f);
        public Color Bottom = new Color(0.22f, 0.04f, 0.52f);

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            var rect = rectTransform.rect;
            vh.AddVert(new Vector3(rect.xMin, rect.yMin), Bottom, Vector2.zero);
            vh.AddVert(new Vector3(rect.xMin, rect.yMax), Top, Vector2.zero);
            vh.AddVert(new Vector3(rect.xMax, rect.yMax), Top, Vector2.zero);
            vh.AddVert(new Vector3(rect.xMax, rect.yMin), Bottom, Vector2.zero);
            vh.AddTriangle(0, 1, 2);
            vh.AddTriangle(2, 3, 0);
        }
    }

    public static class GeneratedUi
    {
        private static Font defaultFont;

        public static Canvas CreateCanvas(string name)
        {
            EnsureEventSystem();
            var root = new GameObject(name);
            var canvas = root.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = root.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight = 0.55f;
            root.AddComponent<GraphicRaycaster>();

            var background = new GameObject("Purple Gradient");
            background.transform.SetParent(root.transform, false);
            var gradient = background.AddComponent<GradientPanel>();
            gradient.raycastTarget = false;
            Stretch(gradient.rectTransform);
            return canvas;
        }

        public static Text Text(Transform parent, string value, int size, FontStyle style = FontStyle.Bold, TextAnchor anchor = TextAnchor.MiddleCenter)
        {
            var go = new GameObject("Text");
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<Text>();
            text.text = value;
            text.font = Font();
            text.fontSize = size;
            text.fontStyle = style;
            text.alignment = anchor;
            text.color = Color.white;
            text.resizeTextForBestFit = true;
            text.resizeTextMinSize = Mathf.Max(14, size / 2);
            text.resizeTextMaxSize = size;
            return text;
        }

        public static Button Button(Transform parent, string label, Action clicked)
        {
            var go = new GameObject(label + " Button");
            go.transform.SetParent(parent, false);
            var image = go.AddComponent<Image>();
            image.color = new Color(1f, 0.78f, 0.16f);
            var button = go.AddComponent<Button>();
            button.targetGraphic = image;
            button.onClick.AddListener(() => clicked?.Invoke());

            var text = Text(go.transform, label, 42, FontStyle.Bold);
            text.color = new Color(0.25f, 0.05f, 0.35f);
            Stretch(text.rectTransform);
            return button;
        }

        public static Image Panel(Transform parent, Color color)
        {
            var go = new GameObject("Panel");
            go.transform.SetParent(parent, false);
            var image = go.AddComponent<Image>();
            image.color = color;
            return image;
        }

        public static RectTransform Place(RectTransform rect, float x, float y, float width, float height)
        {
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = new Vector2(x, y);
            rect.sizeDelta = new Vector2(width, height);
            return rect;
        }

        public static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        public static void Top(RectTransform rect, float height)
        {
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = new Vector2(0f, height);
        }

        public static Sprite CircleSprite(Color color, int pixels = 128)
        {
            var texture = new Texture2D(pixels, pixels, TextureFormat.RGBA32, false);
            var center = new Vector2((pixels - 1) * 0.5f, (pixels - 1) * 0.5f);
            var radius = pixels * 0.48f;
            for (var y = 0; y < pixels; y++)
            {
                for (var x = 0; x < pixels; x++)
                {
                    var distance = Vector2.Distance(new Vector2(x, y), center);
                    if (distance > radius)
                    {
                        texture.SetPixel(x, y, Color.clear);
                        continue;
                    }

                    var shine = Mathf.Clamp01(1f - distance / radius);
                    var pixel = Color.Lerp(color * 0.75f, Color.white, shine * 0.45f);
                    pixel.a = 1f;
                    texture.SetPixel(x, y, pixel);
                }
            }

            texture.Apply();
            return Sprite.Create(texture, new Rect(0, 0, pixels, pixels), new Vector2(0.5f, 0.5f), pixels);
        }

        public static Color ToUnityColor(BubbleColor color)
        {
            switch (color)
            {
                case BubbleColor.Red: return new Color(1f, 0.18f, 0.28f);
                case BubbleColor.Yellow: return new Color(1f, 0.86f, 0.12f);
                case BubbleColor.Green: return new Color(0.15f, 0.88f, 0.32f);
                case BubbleColor.Cyan: return new Color(0.06f, 0.85f, 0.95f);
                case BubbleColor.Blue: return new Color(0.2f, 0.34f, 1f);
                case BubbleColor.Pink: return new Color(1f, 0.3f, 0.76f);
                case BubbleColor.Orange: return new Color(1f, 0.48f, 0.12f);
                case BubbleColor.Rainbow: return Color.white;
                default: return new Color(0.62f, 0.18f, 1f);
            }
        }

        private static Font Font()
        {
            if (defaultFont == null)
            {
                defaultFont = Resources.GetBuiltinResource<Font>("Arial.ttf");
            }

            return defaultFont;
        }

        private static void EnsureEventSystem()
        {
            if (EventSystem.current != null)
            {
                return;
            }

            var eventSystem = new GameObject("EventSystem");
            eventSystem.AddComponent<EventSystem>();
            eventSystem.AddComponent<StandaloneInputModule>();
        }
    }
}
