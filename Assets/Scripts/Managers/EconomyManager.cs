using UnityEngine;
using System;

public class EconomyManager : MonoBehaviour
{
    public static EconomyManager Instance;

    public int Coins { get private set; } = 0;
    private const string COIN_KEY = "UserCoins";
    private const string LAST_SPIN_KEY = "LastSpinTime";

    void Awake()
    {
        Instance = this;
        Coins = PlayerPrefs.GetInt(COIN_KEY, 100); // Start with 100 for tutorial
    }

    public void AddCoins(int amount)
    {
        Coins += amount;
        PlayerPrefs.SetInt(COIN_KEY, Coins);
        PlayerPrefs.Save();
    }

    public bool SpendCoins(int amount)
    {
        if (Coins >= amount)
        {
            Coins -= amount;
            PlayerPrefs.SetInt(COIN_KEY, Coins);
            PlayerPrefs.Save();
            return true;
        }
        return false;
    }

    public bool CanSpinFree()
    {
        string lastSpin = PlayerPrefs.GetString(LAST_SPIN_KEY, string.Empty);
        if (string.IsNullOrEmpty(lastSpin)) return true;

        DateTime lastTime = DateTime.Parse(lastSpin);
        return (DateTime.Now - lastTime).TotalHours >= 24;
    }

    public void SpinWheel()
    {
        if (!CanSpinFree())
        {
            if (!SpendCoins(5))
            {
                Debug.Log("Not enough coins for extra spin");
                return;
            }
        }
        else
        {
            PlayerPrefs.SetString(LAST_SPIN_KEY, DateTime.Now.ToString());
            PlayerPrefs.Save();
        }

        // Rewards probability: 60% -> 2-4 coins, 30% -> power-up, 10% -> 10 coins
        float rand = UnityEngine.Random.value;
        if (rand <= 0.60f)
        {
            int rewardCoins = UnityEngine.Random.Range(2, 5); // 2 to 4
            AddCoins(rewardCoins);
            Debug.Log($"Spin Reward: {rewardCoins} coins (Common)");
        }
        else if (rand <= 0.90f)
        {
            Debug.Log("Spin Reward: Power-up (Medium)");
            // Grant Power-up logic here
        }
        else
        {
            AddCoins(10);
            Debug.Log("Spin Reward: 10 coins (Rare)");
        }
    }
}
