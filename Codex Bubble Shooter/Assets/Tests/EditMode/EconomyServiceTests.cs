using System;
using NUnit.Framework;
using UnityEngine;

namespace BubbleShooter.Tests
{
    public sealed class EconomyServiceTests
    {
        private SaveService save;
        private EconomyService economy;

        [SetUp]
        public void SetUp()
        {
            PlayerPrefs.DeleteKey("bubble_shooter_save_v1");
            save = new SaveService();
            save.ResetAll();
            economy = new EconomyService(save);
        }

        [Test]
        public void FreeSpinRefreshesEveryTwentyFourHours()
        {
            var now = new DateTime(2026, 4, 30, 10, 0, 0, DateTimeKind.Utc);

            Assert.IsNotNull(economy.Spin(now, true));
            Assert.IsFalse(economy.CanFreeSpin(now.AddHours(23)));
            Assert.IsTrue(economy.CanFreeSpin(now.AddHours(24)));
        }

        [Test]
        public void MissionsDoNotRefreshBeforeCompletion()
        {
            var medium = save.Data.Missions.Find(mission => mission.Tier == MissionTier.Medium);
            var color = medium.TargetColor;
            save.Data.HighestUnlockedLevel = 300;
            save.Save();
            save.Load();

            var loaded = save.Data.Missions.Find(mission => mission.Tier == MissionTier.Medium);
            Assert.AreEqual(color, loaded.TargetColor);
            Assert.IsFalse(loaded.Completed);
        }

        [Test]
        public void AdFreeDisablesInterstitialWindow()
        {
            save.Data.AdFreeUntilUtc = new DateTime(2026, 5, 2, 0, 0, 0, DateTimeKind.Utc).ToString("O");

            Assert.IsTrue(economy.IsAdFreeActive(new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc)));
            Assert.IsFalse(economy.IsAdFreeActive(new DateTime(2026, 5, 3, 0, 0, 0, DateTimeKind.Utc)));
        }
    }
}
