using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace BubbleShooter
{
    public sealed class GameplayController : MonoBehaviour
    {
        private const float BubbleRadius = 0.39f;
        private readonly BubbleBoard board = new BubbleBoard();
        private readonly FireballMeter fireballMeter = new FireballMeter();
        private readonly Dictionary<Vector2Int, GameObject> bubbleViews = new Dictionary<Vector2Int, GameObject>();
        private readonly Dictionary<BubbleColor, Sprite> sprites = new Dictionary<BubbleColor, Sprite>();
        private readonly Dictionary<BubbleColor, int> poppedByColor = new Dictionary<BubbleColor, int>();
        private Camera cameraRef;
        private Text ballsText;
        private Text powerText;
        private Text levelText;
        private GameObject projectile;
        private BubbleColor currentColor;
        private BubbleColor nextColor;
        private int ballsRemaining;
        private bool shotMoving;
        private bool usingFireball;
        private bool usingBomb;
        private int interstitialsThisLevel;
        private int interstitialCap;
        private Vector2 shotVelocity;
        private Vector2 shooterPosition = new Vector2(0f, -4.55f);

        public static void Create()
        {
            var go = new GameObject("GameplayController");
            go.AddComponent<GameplayController>();
        }

        private void Start()
        {
            cameraRef = Camera.main;
            if (cameraRef == null)
            {
                var cameraObject = new GameObject("Main Camera");
                cameraRef = cameraObject.AddComponent<Camera>();
                cameraObject.tag = "MainCamera";
            }

            cameraRef.orthographic = true;
            cameraRef.orthographicSize = 5.7f;
            cameraRef.backgroundColor = new Color(0.18f, 0.02f, 0.36f);
            BuildSprites();
            BuildHud();
            StartLevel(GameServices.Save.Data.CurrentLevel);
        }

        private void Update()
        {
            if (shotMoving)
            {
                MoveProjectile();
                return;
            }

            if (Input.GetMouseButtonUp(0))
            {
                var world = cameraRef.ScreenToWorldPoint(Input.mousePosition);
                TryShoot(world);
            }
        }

        private void StartLevel(int level)
        {
            ClearViews();
            poppedByColor.Clear();
            var data = LevelGenerator.Generate(level);
            board.Load(data);
            ballsRemaining = data.BallCount;
            interstitialsThisLevel = 0;
            interstitialCap = 1 + GameMath.StableHash(level * 531) % 2;
            fireballMeter.Reset();
            usingFireball = false;
            usingBomb = false;
            currentColor = PickShotColor(level * 3);
            nextColor = PickShotColor(level * 5 + 1);
            RenderBoard();
            RenderShooter();
            RefreshHud();

            if (level == 1)
            {
                ShowPopup("Tutorial", "Aim, bounce off walls, and match 3 bubbles.\nPower-ups sit at the bottom.", "Play", null);
            }
        }

        private void TryShoot(Vector2 target)
        {
            if (ballsRemaining <= 0 || target.y <= shooterPosition.y + 0.6f)
            {
                return;
            }

            var direction = (target - shooterPosition).normalized;
            if (direction.y < 0.15f)
            {
                direction.y = 0.15f;
                direction.Normalize();
            }

            ballsRemaining--;
            shotVelocity = direction * 9.5f;
            projectile = CreateBubbleView(currentColor, shooterPosition, "Shot");
            shotMoving = true;
            RefreshHud();
        }

        private void MoveProjectile()
        {
            var position = (Vector2)projectile.transform.position + shotVelocity * Time.deltaTime;
            if (position.x < -4.85f || position.x > 4.85f)
            {
                position.x = Mathf.Clamp(position.x, -4.85f, 4.85f);
                shotVelocity.x *= -1f;
            }

            var shouldSnap = position.y >= 4.1f;
            if (!shouldSnap)
            {
                foreach (var bubble in bubbleViews.Values)
                {
                    if (Vector2.Distance(position, bubble.transform.position) <= BubbleRadius * 1.72f)
                    {
                        shouldSnap = true;
                        break;
                    }
                }
            }

            if (shouldSnap)
            {
                SnapProjectile(position);
            }
            else
            {
                projectile.transform.position = position;
            }
        }

        private void SnapProjectile(Vector2 position)
        {
            shotMoving = false;
            Destroy(projectile);
            var slot = board.FindNearestOpenSlot(position, BubbleRadius);
            if (usingBomb)
            {
                board.SetBubble(slot, currentColor);
                PopBomb(slot);
            }
            else
            {
                var result = board.ResolveShot(slot, currentColor, usingFireball);
                ApplyPopResult(result);
            }

            AdvanceShotQueue();
            if (usingFireball)
            {
                fireballMeter.Reset();
            }
            usingFireball = false;
            usingBomb = false;
            RenderBoard();
            RefreshHud();
            CheckEndState();
        }

        private void ApplyPopResult(PopResult result)
        {
            if (result.Matched.Count == 0)
            {
                fireballMeter.RegisterMiss();
                return;
            }

            fireballMeter.RegisterPop();
            TrackColor(result.PoppedByColor);

            GameServices.Audio.Pop();
            if (usingFireball)
            {
                GameServices.Audio.Fireball();
            }

            if (result.BombActivated)
            {
                GameServices.Save.Data.AddPowerUp(PowerUpType.Bomb, 1);
                GameServices.Audio.Bomb();
            }
        }

        private void PopBomb(Vector2Int center)
        {
            var removed = new List<Vector2Int> { center };
            removed.AddRange(board.GetNeighbors(center));
            foreach (var coordinate in removed)
            {
                if (board.HasBubble(coordinate))
                {
                    TrackColor(coordinate);
                }
            }

            foreach (var coordinate in removed)
            {
                if (board.HasBubble(coordinate))
                {
                    board.RemoveBubble(coordinate);
                }
            }

            foreach (var dropped in board.RemoveUnsupported())
            {
                TrackColor(dropped);
            }

            fireballMeter.RegisterPop();
            GameServices.Audio.Bomb();
        }

        private void CheckEndState()
        {
            GameServices.Economy.TrackPoppedBubbles(poppedByColor);
            if (board.Count == 0)
            {
                var stars = ballsRemaining > 20 ? 3 : ballsRemaining > 8 ? 2 : 1;
                var level = GameServices.Save.Data.CurrentLevel;
                GameServices.Economy.CompleteLevel(level, stars);
                var gift = GameServices.Economy.ClaimGiftIfReady(level);
                var message = gift == null ? $"Level cleared\nStars {stars}" : $"Level cleared\nGift: {RewardText(gift)}";
                ShowPopup("You Win", message, "Next", () =>
                {
                    MaybeShowInterstitial();
                    SceneManager.LoadScene("Gameplay");
                });
                return;
            }

            if (ballsRemaining <= 0)
            {
                ShowOutOfBalls();
            }
        }

        private void ShowOutOfBalls()
        {
            var popup = CreatePopup("Out of Balls", "Need 5 more balls?");
            AddPopupButton(popup, "10 Coins", -115, () =>
            {
                if (GameServices.Economy.BuyExtraBalls())
                {
                    ballsRemaining += GameConstants.ExtraBallsAmount;
                    Destroy(popup);
                    RefreshHud();
                }
            });
            AddPopupButton(popup, "Watch Ad", 15, () =>
            {
                GameServices.Monetization.ShowRewarded(success =>
                {
                    if (success)
                    {
                        ballsRemaining += GameConstants.ExtraBallsAmount;
                        Destroy(popup);
                        RefreshHud();
                    }
                });
            });
            AddPopupButton(popup, "Retry", -245, () =>
            {
                Destroy(popup);
                StartLevel(GameServices.Save.Data.CurrentLevel);
            });
        }

        private void MaybeShowInterstitial()
        {
            if (interstitialsThisLevel < interstitialCap && !GameServices.Economy.IsAdFreeActive(System.DateTime.UtcNow))
            {
                interstitialsThisLevel++;
                GameServices.Monetization.ShowInterstitial(null);
            }
        }

        private void AdvanceShotQueue()
        {
            currentColor = nextColor;
            nextColor = PickShotColor(GameServices.Save.Data.CurrentLevel * 11 + ballsRemaining * 17);
        }

        private BubbleColor PickShotColor(int seed)
        {
            var colorCount = LevelGenerator.Generate(GameServices.Save.Data.CurrentLevel).ColorCount;
            return (BubbleColor)(GameMath.StableHash(seed + ballsRemaining) % colorCount);
        }

        private void TrackColor(Vector2Int coordinate)
        {
            if (!board.Cells.TryGetValue(coordinate, out var color) || color == BubbleColor.Rainbow)
            {
                return;
            }

            poppedByColor.TryGetValue(color, out var count);
            poppedByColor[color] = count + 1;
        }

        private void TrackColor(Dictionary<BubbleColor, int> colors)
        {
            foreach (var pair in colors)
            {
                poppedByColor.TryGetValue(pair.Key, out var count);
                poppedByColor[pair.Key] = count + pair.Value;
            }
        }

        private void RenderBoard()
        {
            ClearViews();
            foreach (var bubble in board.Cells)
            {
                var position = board.CoordinateToWorld(bubble.Key, BubbleRadius);
                bubbleViews[bubble.Key] = CreateBubbleView(bubble.Value, position, $"Bubble {bubble.Key.x},{bubble.Key.y}");
            }

            RenderShooter();
        }

        private void RenderShooter()
        {
            CreateBubbleView(currentColor, shooterPosition, "Current Bubble");
            CreateBubbleView(nextColor, shooterPosition + new Vector2(1.0f, -0.1f), "Next Bubble").transform.localScale = Vector3.one * 0.72f;
        }

        private GameObject CreateBubbleView(BubbleColor color, Vector2 position, string name)
        {
            var go = new GameObject(name);
            go.transform.position = position;
            go.transform.localScale = Vector3.one * (BubbleRadius * 2f);
            var renderer = go.AddComponent<SpriteRenderer>();
            renderer.sprite = sprites[color];
            renderer.sortingOrder = 2;
            return go;
        }

        private void ClearViews()
        {
            foreach (var view in bubbleViews.Values)
            {
                if (view != null)
                {
                    Destroy(view);
                }
            }

            bubbleViews.Clear();
            foreach (var view in GameObject.FindGameObjectsWithTag("Untagged"))
            {
                if (view.name == "Current Bubble" || view.name == "Next Bubble")
                {
                    Destroy(view);
                }
            }
        }

        private void BuildSprites()
        {
            for (var i = 0; i <= (int)BubbleColor.Rainbow; i++)
            {
                var color = (BubbleColor)i;
                sprites[color] = GeneratedUi.CircleSprite(GeneratedUi.ToUnityColor(color));
            }
        }

        private void BuildHud()
        {
            var canvas = GeneratedUi.CreateCanvas("ScreenRoot");
            var top = GeneratedUi.Panel(canvas.transform, new Color(0.12f, 0f, 0.2f, 0.5f));
            GeneratedUi.Top(top.rectTransform, 170);
            levelText = GeneratedUi.Text(top.transform, "", 34, FontStyle.Bold, TextAnchor.MiddleLeft);
            GeneratedUi.Place(levelText.rectTransform, -270, -8, 430, 88);
            ballsText = GeneratedUi.Text(top.transform, "", 42);
            GeneratedUi.Place(ballsText.rectTransform, 160, -8, 300, 88);
            var back = GeneratedUi.Button(top.transform, "Menu", () => SceneManager.LoadScene("MainMenu"));
            GeneratedUi.Place(back.GetComponent<RectTransform>(), 410, -8, 180, 76);
            powerText = GeneratedUi.Text(canvas.transform, "", 30);
            GeneratedUi.Place(powerText.rectTransform, 0, -835, 1000, 66);

            AddPowerButton(canvas, "Fire", -390, () =>
            {
                if (fireballMeter.IsReady || GameServices.Save.Data.SpendPowerUp(PowerUpType.Fireball))
                {
                    usingFireball = true;
                    RefreshHud();
                }
            });
            AddPowerButton(canvas, "Bomb", -130, () =>
            {
                if (GameServices.Save.Data.SpendPowerUp(PowerUpType.Bomb))
                {
                    usingBomb = true;
                    RefreshHud();
                }
            });
            AddPowerButton(canvas, "Rainbow", 130, () =>
            {
                if (GameServices.Save.Data.SpendPowerUp(PowerUpType.Rainbow))
                {
                    currentColor = BubbleColor.Rainbow;
                    RenderBoard();
                    RefreshHud();
                }
            });
            AddPowerButton(canvas, "Swap", 390, () =>
            {
                if (GameServices.Save.Data.SpendPowerUp(PowerUpType.Exchange))
                {
                    (currentColor, nextColor) = (nextColor, currentColor);
                    RenderBoard();
                    RefreshHud();
                }
            });
        }

        private void AddPowerButton(Canvas canvas, string label, float x, System.Action clicked)
        {
            var button = GeneratedUi.Button(canvas.transform, label, () => clicked.Invoke());
            GeneratedUi.Place(button.GetComponent<RectTransform>(), x, -735, 220, 88);
        }

        private void RefreshHud()
        {
            levelText.text = $"Level {GameServices.Save.Data.CurrentLevel}";
            ballsText.text = $"Balls {ballsRemaining}";
            var save = GameServices.Save.Data;
            var ready = fireballMeter.IsReady ? "READY" : $"{fireballMeter.Combo}/6";
            powerText.text = $"Fire {save.Fireballs} ({ready})   Bomb {save.Bombs}   Rainbow {save.Rainbows}   Swap {save.Exchanges}";
            GameServices.Save.Save();
        }

        private GameObject CreatePopup(string title, string body)
        {
            var canvas = GameObject.Find("ScreenRoot").GetComponent<Canvas>();
            var panel = GeneratedUi.Panel(canvas.transform, new Color(0.22f, 0.03f, 0.38f, 0.94f));
            GeneratedUi.Place(panel.rectTransform, 0, 0, 850, 720);
            var titleText = GeneratedUi.Text(panel.transform, title, 58);
            GeneratedUi.Place(titleText.rectTransform, 0, 230, 760, 90);
            var bodyText = GeneratedUi.Text(panel.transform, body, 36);
            GeneratedUi.Place(bodyText.rectTransform, 0, 80, 720, 210);
            return panel.gameObject;
        }

        private void ShowPopup(string title, string body, string buttonLabel, System.Action clicked)
        {
            var popup = CreatePopup(title, body);
            AddPopupButton(popup, buttonLabel, -190, () =>
            {
                Destroy(popup);
                clicked?.Invoke();
            });
        }

        private void AddPopupButton(GameObject popup, string label, float y, System.Action clicked)
        {
            var button = GeneratedUi.Button(popup.transform, label, clicked);
            GeneratedUi.Place(button.GetComponent<RectTransform>(), 0, y, 360, 92);
        }

        private static string RewardText(Reward reward)
        {
            return reward.Kind == RewardKind.PowerUp ? $"{reward.Amount} {reward.PowerUp}" : $"{reward.Amount} coins";
        }
    }
}
