using UnityEngine;
using System;

public class AdManager : MonoBehaviour
{
    public static AdManager Instance;

    private int adsShownThisLevel = 0;
    private const int MAX_ADS_PER_LEVEL = 2;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    public void OnLevelStart()
    {
        adsShownThisLevel = 0;
    }

    public void ShowInterstitialAd()
    {
        if (StoreManager.Instance.IsAdFreeActive())
        {
            Debug.Log("Ad-free active. Skipping interstitial.");
            return;
        }

        if (adsShownThisLevel < MAX_ADS_PER_LEVEL)
        {
            Debug.Log("Showing Interstitial Ad");
            adsShownThisLevel++;
        }
    }

    public void ShowRewardedAd(bool isNearWin, bool isStuck, Action<string> onRewardEarned)
    {
        // Mock ad show
        Debug.Log("Showing Rewarded Ad");
        
        string reward = DetermineSmartReward(isNearWin, isStuck);
        onRewardEarned?.Invoke(reward);
    }

    private string DetermineSmartReward(bool isNearWin, bool isStuck)
    {
        // Give ONLY ONE reward randomly: (fireball / bomb / rainbow / exchange / 5 balls)
        float rand = UnityEngine.Random.value;

        if (isNearWin)
        {
            // Increase chance of 5 balls
            if (rand < 0.6f) return "5_balls";
            else if (rand < 0.7f) return "fireball";
            else if (rand < 0.8f) return "bomb";
            else if (rand < 0.9f) return "rainbow";
            else return "exchange";
        }
        else if (isStuck)
        {
            // Increase chance of power-ups
            if (rand < 0.25f) return "fireball";
            else if (rand < 0.5f) return "bomb";
            else if (rand < 0.75f) return "rainbow";
            else if (rand < 0.9f) return "exchange";
            else return "5_balls";
        }
        else
        {
            // Normal distribution
            if (rand < 0.2f) return "fireball";
            else if (rand < 0.4f) return "bomb";
            else if (rand < 0.6f) return "rainbow";
            else if (rand < 0.8f) return "exchange";
            else return "5_balls";
        }
    }

    public void OnBallsFinishedUI()
    {
        // Triggers UI with BOTH options
        Debug.Log("Balls Finished UI triggered. Options:");
        Debug.Log("1. Spend 10 coins -> 5 balls");
        Debug.Log("2. Watch Ad -> 5 balls");
        
        // UI logic to show these buttons goes here (handled by UIManager)
    }
}
