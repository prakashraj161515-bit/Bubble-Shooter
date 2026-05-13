using NUnit.Framework;

namespace BubbleShooter.Tests
{
    public sealed class LevelGeneratorTests
    {
        [TestCase(1, 60)]
        [TestCase(50, 60)]
        [TestCase(51, 60)]
        [TestCase(799, 40)]
        [TestCase(800, 40)]
        [TestCase(6000, 40)]
        public void BallCountMatchesDesignedCurve(int level, int expected)
        {
            Assert.AreEqual(expected, LevelGenerator.GetBallCount(level));
        }

        [Test]
        public void GiftIntervalsStayBetweenTenAndFifteenLevels()
        {
            for (var level = 1; level <= 6000; level += 137)
            {
                var interval = LevelGenerator.GetGiftIntervalAfterLevel(level);
                Assert.GreaterOrEqual(interval, 10);
                Assert.LessOrEqual(interval, 15);
            }
        }
    }
}
