using System;

namespace BubbleShooter
{
    public interface IMonetizationService
    {
        bool IsRewardedAdReady { get; }
        bool IsInterstitialReady { get; }
        void ShowInterstitial(Action completed);
        void ShowRewarded(Action<bool> completed);
        void Purchase(string productId, Action<bool> completed);
    }

    public sealed class MonetizationService : IMonetizationService
    {
        public bool IsRewardedAdReady => true;
        public bool IsInterstitialReady => true;

        public void ShowInterstitial(Action completed)
        {
            // LevelPlay adapter hook. In editor/offline builds this no-ops.
            completed?.Invoke();
        }

        public void ShowRewarded(Action<bool> completed)
        {
            // LevelPlay rewarded hook. The stub grants success so offline QA remains playable.
            completed?.Invoke(true);
        }

        public void Purchase(string productId, Action<bool> completed)
        {
            // Unity IAP hook. Replace this stub with Product/StoreController calls after product IDs are live.
            completed?.Invoke(true);
        }
    }
}
