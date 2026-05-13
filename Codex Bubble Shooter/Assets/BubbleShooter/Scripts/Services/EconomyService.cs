using System;
using System.Collections.Generic;

namespace BubbleShooter
{
    public sealed class EconomyService
    {
        private readonly SaveService saveService;
        private readonly List<PowerUpType> rewardItems = new List<PowerUpType>
        {
            PowerUpType.Fireball,
            PowerUpType.Bomb,
            PowerUpType.Rainbow,
            PowerUpType.Exchange
        };

        public EconomyService(SaveService saveService)
        {
            this.saveService = saveService;
        }

        public PlayerSaveData Data => saveService.Data;

        public bool IsAdFreeActive(DateTime nowUtc)
        {
            return DateTime.TryParse(Data.AdFreeUntilUtc, out var untilUtc) && untilUtc > nowUtc;
        }

        public bool CanClaimDailyLogin(DateTime nowUtc)
        {
            return !DateTime.TryParse(Data.LastDailyLoginUtc, out var lastUtc) || lastUtc.Date < nowUtc.Date;
        }

        public Reward ClaimDailyLogin(DateTime nowUtc)
        {
            if (!CanClaimDailyLogin(nowUtc))
            {
                return Reward.Coins(0);
            }

            Data.LastDailyLoginUtc = nowUtc.ToString("O");
            var reward = Reward.Coins(3 + GameMath.StableHash(nowUtc.DayOfYear) % 2);
            ApplyReward(reward);
            saveService.Save();
            return reward;
        }

        public bool CanFreeSpin(DateTime nowUtc)
        {
            if (!DateTime.TryParse(Data.LastFreeSpinUtc, out var lastUtc))
            {
                return true;
            }

            return nowUtc - lastUtc >= TimeSpan.FromHours(GameConstants.FreeSpinHours);
        }

        public Reward Spin(DateTime nowUtc, bool useFreeSpin)
        {
            if (useFreeSpin)
            {
                if (!CanFreeSpin(nowUtc))
                {
                    return null;
                }

                Data.LastFreeSpinUtc = nowUtc.ToString("O");
            }
            else if (!SpendCoins(GameConstants.ExtraSpinCoinCost))
            {
                return null;
            }

            var roll = GameMath.StableHash(nowUtc.DayOfYear * 10000 + nowUtc.Hour * 100 + nowUtc.Minute) % 100;
            Reward reward;
            if (roll < 62)
            {
                reward = Reward.Coins(2 + roll % 3);
            }
            else if (roll < 68)
            {
                reward = Reward.Coins(10);
            }
            else
            {
                reward = Reward.Item(rewardItems[roll % rewardItems.Count]);
            }

            ApplyReward(reward);
            saveService.Save();
            return reward;
        }

        public Reward ClaimGiftIfReady(int completedLevel)
        {
            if (completedLevel < Data.NextGiftLevel)
            {
                return null;
            }

            var roll = GameMath.StableHash(completedLevel * 227 + Data.Coins) % 100;
            var reward = roll < 82
                ? Reward.Item(rewardItems[roll % rewardItems.Count])
                : Reward.Coins(3 + roll % 2);
            Data.NextGiftLevel = completedLevel + LevelGenerator.GetGiftIntervalAfterLevel(completedLevel);
            ApplyReward(reward);
            saveService.Save();
            return reward;
        }

        public Reward GrantRewardedAdItem(int seed)
        {
            var roll = GameMath.StableHash(seed) % 5;
            var reward = roll == 4 ? Reward.Balls(GameConstants.ExtraBallsAmount) : Reward.Item(rewardItems[roll]);
            if (reward.Kind == RewardKind.PowerUp)
            {
                ApplyReward(reward);
            }

            saveService.Save();
            return reward;
        }

        public bool BuyPowerUp(PowerUpType type)
        {
            if (type == PowerUpType.ExtraBalls || !SpendCoins(GameConstants.PowerUpCoinCost))
            {
                return false;
            }

            Data.AddPowerUp(type, 1);
            saveService.Save();
            return true;
        }

        public bool BuyExtraBalls()
        {
            if (!SpendCoins(GameConstants.ExtraBallsCoinCost))
            {
                return false;
            }

            saveService.Save();
            return true;
        }

        public void CompleteLevel(int levelNumber, int stars)
        {
            Data.CurrentLevel = Math.Min(GameConstants.TotalLevels, levelNumber + 1);
            Data.HighestUnlockedLevel = Math.Max(Data.HighestUnlockedLevel, Data.CurrentLevel);
            Data.Stars += Math.Max(0, stars);
            UpdateEasyMission();
            saveService.Save();
        }

        public void TrackPoppedBubbles(Dictionary<BubbleColor, int> poppedByColor)
        {
            foreach (var mission in Data.Missions)
            {
                if (mission.Completed || mission.Tier == MissionTier.Easy)
                {
                    continue;
                }

                if (poppedByColor.TryGetValue(mission.TargetColor, out var amount))
                {
                    mission.Progress += amount;
                    var target = mission.Tier == MissionTier.Medium
                        ? GameConstants.MediumColorPopTarget
                        : GameConstants.HardColorPopTarget;
                    mission.Completed = mission.Progress >= target;
                }
            }

            saveService.Save();
        }

        public Reward[] ClaimMission(MissionTier tier)
        {
            var mission = Data.Missions.Find(candidate => candidate.Tier == tier);
            if (mission == null || !mission.Completed || mission.Claimed)
            {
                return Array.Empty<Reward>();
            }

            mission.Claimed = true;
            Reward[] rewards;
            switch (tier)
            {
                case MissionTier.Easy:
                    rewards = new[] { Reward.Coins(5) };
                    break;
                case MissionTier.Medium:
                    rewards = new[] { Reward.Item(PowerUpType.Bomb), Reward.Coins(4) };
                    break;
                default:
                    rewards = new[]
                    {
                        Reward.Item(PowerUpType.Bomb),
                        Reward.Item(PowerUpType.Fireball),
                        Reward.Item(PowerUpType.Rainbow),
                        Reward.Coins(5)
                    };
                    break;
            }

            foreach (var reward in rewards)
            {
                ApplyReward(reward);
            }

            saveService.Save();
            return rewards;
        }

        public void ApplyStoreBundle(string productId)
        {
            var now = DateTime.UtcNow;
            var currentUntil = DateTime.TryParse(Data.AdFreeUntilUtc, out var parsed) && parsed > now ? parsed : now;
            switch (productId)
            {
                case StoreCatalog.SmallPack:
                    Data.Coins += 100;
                    Data.AdFreeUntilUtc = currentUntil.AddDays(7).ToString("O");
                    break;
                case StoreCatalog.ValuePack:
                    Data.Coins += 200;
                    Data.AddPowerUp(PowerUpType.Bomb, 2);
                    Data.AddPowerUp(PowerUpType.Rainbow, 2);
                    Data.AddPowerUp(PowerUpType.Exchange, 2);
                    Data.AdFreeUntilUtc = currentUntil.AddDays(15).ToString("O");
                    break;
                case StoreCatalog.ProPack:
                    Data.Coins += 400;
                    Data.AddPowerUp(PowerUpType.Fireball, 3);
                    Data.AddPowerUp(PowerUpType.Bomb, 3);
                    Data.AddPowerUp(PowerUpType.Rainbow, 3);
                    Data.AddPowerUp(PowerUpType.Exchange, 3);
                    Data.AdFreeUntilUtc = currentUntil.AddDays(30).ToString("O");
                    break;
                case StoreCatalog.FullBundle:
                    Data.Coins += 1600;
                    Data.AddPowerUp(PowerUpType.Fireball, 12);
                    Data.AddPowerUp(PowerUpType.Bomb, 12);
                    Data.AddPowerUp(PowerUpType.Rainbow, 12);
                    Data.AddPowerUp(PowerUpType.Exchange, 12);
                    Data.AdFreeUntilUtc = currentUntil.AddDays(120).ToString("O");
                    break;
            }

            saveService.Save();
        }

        public bool SpendCoins(int amount)
        {
            if (Data.Coins < amount)
            {
                return false;
            }

            Data.Coins -= amount;
            return true;
        }

        private void ApplyReward(Reward reward)
        {
            if (reward == null)
            {
                return;
            }

            if (reward.Kind == RewardKind.Coins)
            {
                Data.Coins += reward.Amount;
            }
            else if (reward.Kind == RewardKind.PowerUp)
            {
                Data.AddPowerUp(reward.PowerUp, reward.Amount);
            }
        }

        private void UpdateEasyMission()
        {
            var mission = Data.Missions.Find(candidate => candidate.Tier == MissionTier.Easy);
            if (mission == null || mission.Completed)
            {
                return;
            }

            mission.Progress = Data.Stars;
            mission.Completed = mission.Progress >= GameConstants.EasyStarTarget;
        }
    }

    public static class StoreCatalog
    {
        public const string SmallPack = "coins_100_adfree_7d";
        public const string ValuePack = "coins_200_powerups_adfree_15d";
        public const string ProPack = "coins_400_powerups_adfree_30d";
        public const string FullBundle = "coins_1600_full_adfree_120d";
    }
}
