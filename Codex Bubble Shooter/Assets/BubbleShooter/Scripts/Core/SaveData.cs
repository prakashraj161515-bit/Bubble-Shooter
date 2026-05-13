using System;
using System.Collections.Generic;
using UnityEngine;

namespace BubbleShooter
{
    [Serializable]
    public sealed class MissionState
    {
        public MissionTier Tier;
        public BubbleColor TargetColor;
        public int Progress;
        public bool Completed;
        public bool Claimed;
    }

    [Serializable]
    public sealed class PlayerSaveData
    {
        public int CurrentLevel = 1;
        public int HighestUnlockedLevel = 1;
        public int Coins;
        public int Stars;
        public int Fireballs;
        public int Bombs;
        public int Rainbows;
        public int Exchanges;
        public string LastDailyLoginUtc = string.Empty;
        public string LastFreeSpinUtc = string.Empty;
        public string AdFreeUntilUtc = string.Empty;
        public int NextGiftLevel = 12;
        public bool MusicEnabled = true;
        public bool SfxEnabled = true;
        public List<MissionState> Missions = new List<MissionState>();

        public int GetPowerUp(PowerUpType type)
        {
            switch (type)
            {
                case PowerUpType.Fireball: return Fireballs;
                case PowerUpType.Bomb: return Bombs;
                case PowerUpType.Rainbow: return Rainbows;
                case PowerUpType.Exchange: return Exchanges;
                default: return 0;
            }
        }

        public void AddPowerUp(PowerUpType type, int amount)
        {
            switch (type)
            {
                case PowerUpType.Fireball: Fireballs += amount; break;
                case PowerUpType.Bomb: Bombs += amount; break;
                case PowerUpType.Rainbow: Rainbows += amount; break;
                case PowerUpType.Exchange: Exchanges += amount; break;
            }
        }

        public bool SpendPowerUp(PowerUpType type)
        {
            if (GetPowerUp(type) <= 0)
            {
                return false;
            }

            AddPowerUp(type, -1);
            return true;
        }
    }

    public sealed class SaveService
    {
        private const string SaveKey = "bubble_shooter_save_v1";
        public PlayerSaveData Data { get; private set; }

        public SaveService()
        {
            Load();
        }

        public void Load()
        {
            var json = PlayerPrefs.GetString(SaveKey, string.Empty);
            Data = string.IsNullOrEmpty(json) ? CreateDefaultSave() : JsonUtility.FromJson<PlayerSaveData>(json);
            if (Data == null)
            {
                Data = CreateDefaultSave();
            }

            EnsureMissions();
        }

        public void Save()
        {
            EnsureMissions();
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(Data));
            PlayerPrefs.Save();
        }

        public void ResetAll()
        {
            Data = CreateDefaultSave();
            Save();
        }

        private PlayerSaveData CreateDefaultSave()
        {
            var data = new PlayerSaveData();
            data.NextGiftLevel = GameConstants.FreeSpinHours / 2;
            return data;
        }

        private void EnsureMissions()
        {
            if (Data.Missions == null)
            {
                Data.Missions = new List<MissionState>();
            }
            EnsureMission(MissionTier.Easy, BubbleColor.Red);
            EnsureMission(MissionTier.Medium, (BubbleColor)(GameMath.StableHash(Data.HighestUnlockedLevel + 77) % 8));
            EnsureMission(MissionTier.Hard, (BubbleColor)(GameMath.StableHash(Data.HighestUnlockedLevel + 277) % 8));
        }

        private void EnsureMission(MissionTier tier, BubbleColor color)
        {
            for (var i = 0; i < Data.Missions.Count; i++)
            {
                if (Data.Missions[i].Tier == tier)
                {
                    return;
                }
            }

            Data.Missions.Add(new MissionState { Tier = tier, TargetColor = color });
        }
    }
}
