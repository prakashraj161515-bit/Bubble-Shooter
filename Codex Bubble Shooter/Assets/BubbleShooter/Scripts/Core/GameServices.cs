namespace BubbleShooter
{
    public static class GameServices
    {
        public static SaveService Save { get; private set; }
        public static EconomyService Economy { get; private set; }
        public static IMonetizationService Monetization { get; private set; }
        public static AudioService Audio { get; private set; }

        public static void Initialize()
        {
            if (Save != null)
            {
                return;
            }

            Save = new SaveService();
            Economy = new EconomyService(Save);
            Monetization = new MonetizationService();
            Audio = new AudioService();
        }
    }
}
