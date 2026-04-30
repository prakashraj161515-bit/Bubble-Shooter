using UnityEngine;
using System;

public class MissionManager : MonoBehaviour
{
    public static MissionManager Instance;

    // We keep your variables for the current active color mission (which can serve as Medium/Hard)
    // But we expand it slightly to handle all strict rules (Easy, Medium, Hard)
    
    [Header("Easy Mission: Collect Stars")]
    public int easyTarget = 15;
    public int easyProgress = 0;
    public bool easyCompleted = false;

    [Header("Medium Mission: Pop Color")]
    public int mediumTarget = 1000;
    public int mediumProgress = 0;
    public string mediumColor;
    public bool mediumCompleted = false;

    [Header("Hard Mission: Pop Color")]
    public int hardTarget = 1600;
    public int hardProgress = 0;
    public string hardColor;
    public bool hardCompleted = false;

    private readonly string[] colors = { "Red", "Blue", "Green", "Yellow", "Purple" };

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
        
        LoadMissions();
    }

    void Start()
    {
        // Only assign colors if the mission is new or just refreshed
        if (string.IsNullOrEmpty(mediumColor) || mediumCompleted)
        {
            mediumColor = AssignColor();
            mediumProgress = 0;
            mediumCompleted = false;
        }

        if (string.IsNullOrEmpty(hardColor) || hardCompleted)
        {
            hardColor = AssignColor();
            hardProgress = 0;
            hardCompleted = false;
        }

        SaveMissions();
    }

    string AssignColor()
    {
        return colors[UnityEngine.Random.Range(0, colors.Length)];
    }

    // Call this when a star is collected
    public void AddStarProgress(int amount = 1)
    {
        if (!easyCompleted)
        {
            easyProgress += amount;
            if (easyProgress >= easyTarget)
            {
                CompleteMission("Easy");
            }
            SaveMissions();
        }
    }

    // Call this when bubbles are popped
    public void AddProgress(string hitColor, int amount = 1)
    {
        if (!mediumCompleted && hitColor == mediumColor)
        {
            mediumProgress += amount;
            if (mediumProgress >= mediumTarget)
            {
                CompleteMission("Medium");
            }
        }

        if (!hardCompleted && hitColor == hardColor)
        {
            hardProgress += amount;
            if (hardProgress >= hardTarget)
            {
                CompleteMission("Hard");
            }
        }

        SaveMissions();
    }

    void CompleteMission(string difficulty)
    {
        Debug.Log($"Mission Complete: {difficulty}");

        if (difficulty == "Easy")
        {
            easyCompleted = true;
            // Reward: 5 coins
            if (EconomyManager.Instance != null) EconomyManager.Instance.AddCoins(5);
        }
        else if (difficulty == "Medium")
        {
            mediumCompleted = true;
            // Reward: 1 bomb + 4 coins
            if (EconomyManager.Instance != null) EconomyManager.Instance.AddCoins(4);
            // Grant Bomb logic
        }
        else if (difficulty == "Hard")
        {
            hardCompleted = true;
            // Reward: 1 bomb + 1 fireball + 1 rainbow + 5 coins
            if (EconomyManager.Instance != null) EconomyManager.Instance.AddCoins(5);
            // Grant Bomb, Fireball, Rainbow logic
        }

        SaveMissions();
    }

    // Persistence Logic to ensure missions don't refresh until completed
    private void SaveMissions()
    {
        PlayerPrefs.SetInt("EasyProgress", easyProgress);
        PlayerPrefs.SetInt("EasyCompleted", easyCompleted ? 1 : 0);

        PlayerPrefs.SetInt("MediumProgress", mediumProgress);
        PlayerPrefs.SetString("MediumColor", mediumColor);
        PlayerPrefs.SetInt("MediumCompleted", mediumCompleted ? 1 : 0);

        PlayerPrefs.SetInt("HardProgress", hardProgress);
        PlayerPrefs.SetString("HardColor", hardColor);
        PlayerPrefs.SetInt("HardCompleted", hardCompleted ? 1 : 0);

        PlayerPrefs.Save();
    }

    private void LoadMissions()
    {
        easyProgress = PlayerPrefs.GetInt("EasyProgress", 0);
        easyCompleted = PlayerPrefs.GetInt("EasyCompleted", 0) == 1;

        mediumProgress = PlayerPrefs.GetInt("MediumProgress", 0);
        mediumColor = PlayerPrefs.GetString("MediumColor", "");
        mediumCompleted = PlayerPrefs.GetInt("MediumCompleted", 0) == 1;

        hardProgress = PlayerPrefs.GetInt("HardProgress", 0);
        hardColor = PlayerPrefs.GetString("HardColor", "");
        hardCompleted = PlayerPrefs.GetInt("HardCompleted", 0) == 1;
    }
}
