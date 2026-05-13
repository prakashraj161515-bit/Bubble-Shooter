namespace BubbleShooter
{
    public sealed class FireballMeter
    {
        public int Combo { get; private set; }
        public bool IsReady => Combo >= GameConstants.FireballComboRequirement;

        public void RegisterPop()
        {
            Combo++;
        }

        public void RegisterMiss()
        {
            Combo = 0;
        }

        public void Reset()
        {
            Combo = 0;
        }
    }
}
