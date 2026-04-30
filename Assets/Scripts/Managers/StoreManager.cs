using UnityEngine;
using System;

public class StoreManager : MonoBehaviour
{
    public static StoreManager Instance;

    private const string AD_FREE_EXPIRY_KEY = "AdFreeExpiryTicks";

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    // Tiers mapping
    // Tier 1: ₹59 -> 100 coins + 7 days ad-free
    // Tier 2: ₹99 -> 200 coins + items + 15 days ad-free
    // Tier 3: ₹189 -> 400 coins + items + 30 days ad-free
    // Tier 4: ₹699 -> 1600 coins + items + 120 days ad-free

    public void PurchaseTier1()
    {
        EconomyManager.Instance.AddCoins(100);
        AddAdFreeDays(7);
    }

    public void PurchaseTier2()
    {
        EconomyManager.Instance.AddCoins(200);
        // Grant items logic here
        AddAdFreeDays(15);
    }

    public void PurchaseTier3()
    {
        EconomyManager.Instance.AddCoins(400);
        // Grant items logic here
        AddAdFreeDays(30);
    }

    public void PurchaseTier4()
    {
        EconomyManager.Instance.AddCoins(1600);
        // Grant items logic here
        AddAdFreeDays(120);
    }

    private void AddAdFreeDays(int days)
    {
        DateTime currentExpiry = GetAdFreeExpiry();
        DateTime newExpiry;

        if (currentExpiry > DateTime.UtcNow)
        {
            newExpiry = currentExpiry.AddDays(days);
        }
        else
        {
            newExpiry = DateTime.UtcNow.AddDays(days);
        }

        PlayerPrefs.SetString(AD_FREE_EXPIRY_KEY, newExpiry.Ticks.ToString());
        PlayerPrefs.Save();
        Debug.Log($"Ad-Free extended until: {newExpiry}");
    }

    private DateTime GetAdFreeExpiry()
    {
        string ticksStr = PlayerPrefs.GetString(AD_FREE_EXPIRY_KEY, "0");
        if (long.TryParse(ticksStr, out long ticks))
        {
            return new DateTime(ticks, DateTimeKind.Utc);
        }
        return DateTime.MinValue;
    }

    public bool IsAdFreeActive()
    {
        return GetAdFreeExpiry() > DateTime.UtcNow;
    }

    public string GetRemainingAdFreeTime()
    {
        DateTime expiry = GetAdFreeExpiry();
        if (expiry > DateTime.UtcNow)
        {
            TimeSpan diff = expiry - DateTime.UtcNow;
            return $"Ad-Free: {diff.Days} days left";
        }
        return "Ad-Free: Not Active";
    }
}
