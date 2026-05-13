using System;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace BubbleShooter
{
    public sealed class AppBootstrap : MonoBehaviour
    {
        private const string BootstrapName = "BubbleShooterApp";

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        public static void Boot()
        {
            GameServices.Initialize();
            if (GameObject.Find(BootstrapName) != null)
            {
                return;
            }

            var go = new GameObject(BootstrapName);
            DontDestroyOnLoad(go);
            go.AddComponent<AppBootstrap>();
        }

        private void Awake()
        {
            SceneManager.sceneLoaded += OnSceneLoaded;
        }

        private void OnDestroy()
        {
            SceneManager.sceneLoaded -= OnSceneLoaded;
        }

        private void Start()
        {
            BuildForScene(SceneManager.GetActiveScene().name);
        }

        private void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            BuildForScene(scene.name);
        }

        private void BuildForScene(string sceneName)
        {
            var existing = GameObject.Find("ScreenRoot");
            if (existing != null)
            {
                Destroy(existing);
            }

            if (sceneName == "Gameplay")
            {
                GameplayController.Create();
                return;
            }

            var canvas = GeneratedUi.CreateCanvas("ScreenRoot");
            switch (sceneName)
            {
                case "Splash": BuildSplash(canvas); break;
                case "LevelMap": BuildLevelMap(canvas); break;
                case "Missions": BuildMissions(canvas); break;
                case "Spin": BuildSpin(canvas); break;
                case "Store": BuildStore(canvas); break;
                case "Settings": BuildSettings(canvas); break;
                default: BuildMainMenu(canvas); break;
            }
        }

        private void BuildSplash(Canvas canvas)
        {
            var title = GeneratedUi.Text(canvas.transform, "Bubble Pop Quest", 86);
            GeneratedUi.Place(title.rectTransform, 0, 180, 900, 150);
            var subtitle = GeneratedUi.Text(canvas.transform, "Loading...", 36, FontStyle.Bold);
            GeneratedUi.Place(subtitle.rectTransform, 0, -30, 420, 90);
            Invoke(nameof(OpenMainMenu), 3f);
        }

        private void BuildMainMenu(Canvas canvas)
        {
            var save = GameServices.Save.Data;
            var title = GeneratedUi.Text(canvas.transform, "Bubble Pop Quest", 82);
            GeneratedUi.Place(title.rectTransform, 0, 470, 940, 150);
            var coins = GeneratedUi.Text(canvas.transform, $"Coins {save.Coins}   Stars {save.Stars}", 38);
            GeneratedUi.Place(coins.rectTransform, 0, 335, 760, 70);
            AddMenuButton(canvas, "Play", -5, () => SceneManager.LoadScene("Gameplay"));
            AddMenuButton(canvas, "Level Map", -175, () => SceneManager.LoadScene("LevelMap"));
            AddMenuButton(canvas, "Missions", -345, () => SceneManager.LoadScene("Missions"));
            var daily = GeneratedUi.Button(canvas.transform, "Daily Gift", () =>
            {
                GameServices.Economy.ClaimDailyLogin(DateTime.UtcNow);
                SceneManager.LoadScene("MainMenu");
            });
            GeneratedUi.Place(daily.GetComponent<RectTransform>(), 0, -505, 430, 88);
            daily.interactable = GameServices.Economy.CanClaimDailyLogin(DateTime.UtcNow);
            AddFooterButton(canvas, "Spin", -315, () => SceneManager.LoadScene("Spin"));
            AddFooterButton(canvas, "Store", 0, () => SceneManager.LoadScene("Store"));
            AddFooterButton(canvas, "Settings", 315, () => SceneManager.LoadScene("Settings"));
        }

        private void BuildLevelMap(Canvas canvas)
        {
            var save = GameServices.Save.Data;
            Header(canvas, "Level Map");
            var scroll = GeneratedUi.Panel(canvas.transform, new Color(1f, 1f, 1f, 0.08f));
            GeneratedUi.Place(scroll.rectTransform, 0, -60, 940, 1260);
            var start = Mathf.Max(1, save.HighestUnlockedLevel - 12);
            for (var i = 0; i < 24; i++)
            {
                var level = start + i;
                var button = GeneratedUi.Button(scroll.transform, level.ToString(), () =>
                {
                    GameServices.Save.Data.CurrentLevel = level;
                    GameServices.Save.Save();
                    SceneManager.LoadScene("Gameplay");
                });
                var x = -330 + i % 4 * 220;
                var y = 480 - i / 4 * 190;
                GeneratedUi.Place(button.GetComponent<RectTransform>(), x, y, 150, 120);
                button.interactable = level <= save.HighestUnlockedLevel;
            }
            BackButton(canvas);
        }

        private void BuildMissions(Canvas canvas)
        {
            Header(canvas, "Missions");
            var y = 370;
            foreach (var mission in GameServices.Save.Data.Missions)
            {
                var target = mission.Tier == MissionTier.Easy
                    ? GameConstants.EasyStarTarget
                    : mission.Tier == MissionTier.Medium ? GameConstants.MediumColorPopTarget : GameConstants.HardColorPopTarget;
                var label = mission.Tier == MissionTier.Easy
                    ? $"Easy: Collect stars {mission.Progress}/{target}"
                    : $"{mission.Tier}: Pop {mission.TargetColor} {mission.Progress}/{target}";
                var text = GeneratedUi.Text(canvas.transform, label, 36, FontStyle.Bold);
                GeneratedUi.Place(text.rectTransform, 0, y, 880, 100);
                var tier = mission.Tier;
                var button = GeneratedUi.Button(canvas.transform, mission.Claimed ? "Claimed" : "Claim", () =>
                {
                    GameServices.Economy.ClaimMission(tier);
                    SceneManager.LoadScene("Missions");
                });
                GeneratedUi.Place(button.GetComponent<RectTransform>(), 0, y - 100, 320, 90);
                button.interactable = mission.Completed && !mission.Claimed;
                y -= 300;
            }
            BackButton(canvas);
        }

        private void BuildSpin(Canvas canvas)
        {
            Header(canvas, "Spin");
            var status = GeneratedUi.Text(canvas.transform, "1 free spin every 24 hours", 38);
            GeneratedUi.Place(status.rectTransform, 0, 310, 850, 100);
            var result = GeneratedUi.Text(canvas.transform, "", 42);
            GeneratedUi.Place(result.rectTransform, 0, -30, 850, 140);
            var freeButton = GeneratedUi.Button(canvas.transform, "Free Spin", () =>
            {
                var reward = GameServices.Economy.Spin(DateTime.UtcNow, true);
                result.text = RewardLabel(reward);
            });
            GeneratedUi.Place(freeButton.GetComponent<RectTransform>(), 0, 135, 520, 115);
            freeButton.interactable = GameServices.Economy.CanFreeSpin(DateTime.UtcNow);
            var paidButton = GeneratedUi.Button(canvas.transform, "Spin - 5 Coins", () =>
            {
                var reward = GameServices.Economy.Spin(DateTime.UtcNow, false);
                result.text = RewardLabel(reward);
            });
            GeneratedUi.Place(paidButton.GetComponent<RectTransform>(), 0, -210, 560, 115);
            BackButton(canvas);
        }

        private void BuildStore(Canvas canvas)
        {
            Header(canvas, "Store");
            var products = new[]
            {
                ("₹59", "100 coins + 7 days ad-free", StoreCatalog.SmallPack),
                ("₹99", "200 coins + power-ups + 15 days ad-free", StoreCatalog.ValuePack),
                ("₹189", "400 coins + power-ups + 30 days ad-free", StoreCatalog.ProPack),
                ("₹699", "1600 coins + full bundle + 120 days ad-free", StoreCatalog.FullBundle)
            };
            for (var i = 0; i < products.Length; i++)
            {
                var product = products[i];
                var text = GeneratedUi.Text(canvas.transform, $"{product.Item1}\n{product.Item2}", 34);
                GeneratedUi.Place(text.rectTransform, 0, 395 - i * 230, 860, 100);
                var buy = GeneratedUi.Button(canvas.transform, "Buy", () =>
                {
                    GameServices.Monetization.Purchase(product.Item3, success =>
                    {
                        if (success) GameServices.Economy.ApplyStoreBundle(product.Item3);
                    });
                });
                GeneratedUi.Place(buy.GetComponent<RectTransform>(), 0, 305 - i * 230, 280, 82);
            }
            AddCoinPowerButton(canvas, "Fire 10", -390, PowerUpType.Fireball);
            AddCoinPowerButton(canvas, "Bomb 10", -130, PowerUpType.Bomb);
            AddCoinPowerButton(canvas, "Rainbow 10", 130, PowerUpType.Rainbow);
            AddCoinPowerButton(canvas, "Swap 10", 390, PowerUpType.Exchange);
            var adReward = GeneratedUi.Button(canvas.transform, "Reward Ad Item", () =>
            {
                GameServices.Monetization.ShowRewarded(success =>
                {
                    if (success) GameServices.Economy.GrantRewardedAdItem(System.DateTime.UtcNow.Millisecond);
                });
            });
            GeneratedUi.Place(adReward.GetComponent<RectTransform>(), 0, -650, 500, 82);
            BackButton(canvas);
        }

        private void BuildSettings(Canvas canvas)
        {
            Header(canvas, "Settings");
            AddMenuButton(canvas, GameServices.Save.Data.SfxEnabled ? "SFX On" : "SFX Off", 140, () =>
            {
                GameServices.Save.Data.SfxEnabled = !GameServices.Save.Data.SfxEnabled;
                GameServices.Save.Save();
                SceneManager.LoadScene("Settings");
            });
            AddMenuButton(canvas, "Reset Save", -40, () =>
            {
                GameServices.Save.ResetAll();
                SceneManager.LoadScene("Settings");
            });
            BackButton(canvas);
        }

        private static string RewardLabel(Reward reward)
        {
            if (reward == null)
            {
                return "Not available";
            }

            return reward.Kind == RewardKind.PowerUp
                ? $"Won {reward.Amount} {reward.PowerUp}"
                : $"Won {reward.Amount} {reward.Kind}";
        }

        private void Header(Canvas canvas, string title)
        {
            var text = GeneratedUi.Text(canvas.transform, title, 70);
            GeneratedUi.Place(text.rectTransform, 0, 780, 850, 130);
        }

        private void AddMenuButton(Canvas canvas, string label, float y, Action action)
        {
            var button = GeneratedUi.Button(canvas.transform, label, action);
            GeneratedUi.Place(button.GetComponent<RectTransform>(), 0, y, 600, 120);
        }

        private void AddFooterButton(Canvas canvas, string label, float x, Action action)
        {
            var button = GeneratedUi.Button(canvas.transform, label, action);
            GeneratedUi.Place(button.GetComponent<RectTransform>(), x, -760, 260, 95);
        }

        private void AddCoinPowerButton(Canvas canvas, string label, float x, PowerUpType type)
        {
            var button = GeneratedUi.Button(canvas.transform, label, () =>
            {
                GameServices.Economy.BuyPowerUp(type);
                SceneManager.LoadScene("Store");
            });
            GeneratedUi.Place(button.GetComponent<RectTransform>(), x, -535, 220, 74);
        }

        private void BackButton(Canvas canvas)
        {
            var button = GeneratedUi.Button(canvas.transform, "Back", OpenMainMenu);
            GeneratedUi.Place(button.GetComponent<RectTransform>(), 0, -780, 300, 90);
        }

        private void OpenMainMenu()
        {
            SceneManager.LoadScene("MainMenu");
        }
    }
}
