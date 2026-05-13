using NUnit.Framework;

namespace BubbleShooter.Tests
{
    public sealed class FireballMeterTests
    {
        [Test]
        public void FireballReadiesAtSixPopsAndResetsOnMiss()
        {
            var meter = new FireballMeter();
            for (var i = 0; i < 5; i++)
            {
                meter.RegisterPop();
            }

            Assert.IsFalse(meter.IsReady);
            meter.RegisterPop();
            Assert.IsTrue(meter.IsReady);
            meter.RegisterMiss();
            Assert.AreEqual(0, meter.Combo);
            Assert.IsFalse(meter.IsReady);
        }
    }
}
