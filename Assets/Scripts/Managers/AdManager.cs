using UnityEngine;

public class AdManager : MonoBehaviour
{
    public static AdManager Instance;

    int adsThisLevel = 0;
    private const int MAX_ADS_PER_LEVEL = 2;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    public void ResetAds()
    {
        adsThisLevel = 0;
    }

    // Checking if we can show Interstitial Ad based on rules
    public void ShowInterstitial()
    {
        // Rule: Disable interstitial ads if ad-free active
        if (StoreManager.Instance != null && StoreManager.Instance.IsAdFreeActive())
        {
            Debug.Log("Ad-free active. Skipping ad.");
            return;
        }

        // Rule: Max 2 ads per level
        if (adsThisLevel < MAX_ADS_PER_LEVEL)
        {
            Debug.Log("Showing Interstitial Ad");
            adsThisLevel++;
        }
    }

    public void ShowOutOfBalls()
    {
        // Rule: When balls finish, MUST show BOTH: 10 coins -> 5 balls, Watch ad -> 5 balls
        Debug.Log("Show options: 10 coins OR watch ad for 5 balls");
        // UIManager.Instance.ShowOutOfBallsPopup(); // Triggers the UI popup
    }

    // Added smart parameters (isNearWin, isStuck) based on your strict rules
    public void RewardAd(bool isNearWin = false, bool isStuck = false)
    {
        // Rule: Rewarded ads give ONLY ONE item randomly
        int rand;

        // Smart logic: If near win -> increase chance of 5 balls
        // If stuck -> increase chance of power-ups
        if (isNearWin)
        {
            // 60% chance for balls (case 4), 40% for others
            rand = Random.Range(0, 100) < 60 ? 4 : Random.Range(0, 4);
        }
        else if (isStuck)
        {
            // 80% chance for power-ups (0-3), 20% for balls
            rand = Random.Range(0, 100) < 80 ? Random.Range(0, 4) : 4;
        }
        else
        {
            rand = Random.Range(0, 5); // Normal distribution
        }

        switch (rand)
        {
            case 0:
                Debug.Log("Reward: Fireball");
                // Give fireball logic
                break;
            case 1:
                Debug.Log("Reward: Bomb");
                // Give bomb logic
                break;
            case 2:
                Debug.Log("Reward: Rainbow");
                // Give rainbow logic
                break;
            case 3:
                Debug.Log("Reward: Exchange");
                // Give exchange logic
                break;
            case 4:
                Debug.Log("Reward: 5 Balls");
                if (GameManager.Instance != null)
                {
                    GameManager.Instance.ballsRemaining += 5;
                    // UIManager.Instance.UpdateBallCount(GameManager.Instance.ballsRemaining);
                }
                break;
        }
    }
}
