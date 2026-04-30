using UnityEngine;
using System;

public class EconomyManager : MonoBehaviour
{
    public static EconomyManager Instance;

    public int coins;
    
    private const string COIN_KEY = "UserCoins";
    private const string LAST_SPIN_KEY = "LastSpinTime";

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
        
        LoadCoins();
    }

    private void LoadCoins()
    {
        coins = PlayerPrefs.GetInt(COIN_KEY, 100); // 100 default coins
    }

    private void SaveCoins()
    {
        PlayerPrefs.SetInt(COIN_KEY, coins);
        PlayerPrefs.Save();
    }

    public bool SpendCoins(int amount)
    {
        if (coins >= amount)
        {
            coins -= amount;
            SaveCoins();
            return true;
        }
        return false;
    }

    public void AddCoins(int amount)
    {
        coins += amount;
        SaveCoins();
    }

    // Rules: 60% -> 2-4 coins, 30% -> power-up, 10% -> 10 coins
    public int SpinReward()
    {
        int rand = UnityEngine.Random.Range(0, 100);

        if (rand < 60) return UnityEngine.Random.Range(2, 5); // 2, 3, or 4
        else if (rand < 90) return -1; // -1 represents power-up
        else return 10;
    }

    // Checking if 24 hours have passed for a free spin
    public bool CanSpinFree()
    {
        string lastSpin = PlayerPrefs.GetString(LAST_SPIN_KEY, string.Empty);
        if (string.IsNullOrEmpty(lastSpin)) return true;

        DateTime lastTime = DateTime.Parse(lastSpin);
        return (DateTime.Now - lastTime).TotalHours >= 24;
    }

    // Called when a spin actually happens
    public void RecordSpin()
    {
        PlayerPrefs.SetString(LAST_SPIN_KEY, DateTime.Now.ToString());
        PlayerPrefs.Save();
    }
}
