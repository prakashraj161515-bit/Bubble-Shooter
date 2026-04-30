using UnityEngine;
using System;

public class StoreManager : MonoBehaviour
{
    public static StoreManager Instance;

    long adFreeExpiry;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    // --- IAP Tiers as per exact rules ---

    // ₹59 -> 100 coins + 7 days ad-free
    public void PurchaseTier1()
    {
        if (EconomyManager.Instance != null) EconomyManager.Instance.AddCoins(100);
        BuyPack(7);
        Debug.Log("Purchased Tier 1: 100 coins + 7 days ad-free");
    }

    // ₹99 -> 200 coins + items + 15 days ad-free
    public void PurchaseTier2()
    {
        if (EconomyManager.Instance != null) EconomyManager.Instance.AddCoins(200);
        // Add items logic here (e.g., power-ups)
        BuyPack(15);
        Debug.Log("Purchased Tier 2: 200 coins + items + 15 days ad-free");
    }

    // ₹189 -> 400 coins + items + 30 days ad-free
    public void PurchaseTier3()
    {
        if (EconomyManager.Instance != null) EconomyManager.Instance.AddCoins(400);
        // Add items logic here
        BuyPack(30);
        Debug.Log("Purchased Tier 3: 400 coins + items + 30 days ad-free");
    }

    // ₹699 -> 1600 coins + items + 120 days ad-free
    public void PurchaseTier4()
    {
        if (EconomyManager.Instance != null) EconomyManager.Instance.AddCoins(1600);
        // Add items logic here
        BuyPack(120);
        Debug.Log("Purchased Tier 4: 1600 coins + items + 120 days ad-free");
    }

    // --- Core Ad-Free Logic ---

    public void BuyPack(int days)
    {
        DateTime expiry;

        // If already ad-free, extend the time. Otherwise, start from UtcNow.
        if (IsAdFree())
        {
            long ticks = Convert.ToInt64(PlayerPrefs.GetString("adfree"));
            expiry = new DateTime(ticks).AddDays(days);
        }
        else
        {
            expiry = DateTime.UtcNow.AddDays(days);
        }
        
        adFreeExpiry = expiry.Ticks;
        PlayerPrefs.SetString("adfree", adFreeExpiry.ToString());
        PlayerPrefs.Save();
    }

    public bool IsAdFree()
    {
        if (!PlayerPrefs.HasKey("adfree")) return false;

        long ticks = Convert.ToInt64(PlayerPrefs.GetString("adfree"));
        DateTime expiry = new DateTime(ticks);

        return DateTime.UtcNow < expiry;
    }

    // Rule: Show remaining time
    public string GetRemainingAdFreeTime()
    {
        if (!IsAdFree()) return "Ad-Free: Not Active";

        long ticks = Convert.ToInt64(PlayerPrefs.GetString("adfree"));
        DateTime expiry = new DateTime(ticks);
        TimeSpan diff = expiry - DateTime.UtcNow;

        return $"Ad-Free: {diff.Days} days left";
    }
}
