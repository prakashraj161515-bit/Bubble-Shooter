using UnityEngine;
using System;
using System.Collections.Generic;

[System.Serializable]
public class Mission
{
    public enum MissionType { Easy, Medium, Hard }
    public MissionType type;
    public BubbleColor targetColor;
    public int currentCount;
    public int targetCount;
    public bool isCompleted;
}

public class MissionManager : MonoBehaviour
{
    public static MissionManager Instance;

    public Mission easyMission;
    public Mission mediumMission;
    public Mission hardMission;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
        LoadMissions();
    }

    private void LoadMissions()
    {
        if (easyMission == null || easyMission.isCompleted) 
        {
            easyMission = new Mission { type = Mission.MissionType.Easy, targetCount = 15, currentCount = 0, isCompleted = false };
        }
        
        if (mediumMission == null || mediumMission.isCompleted)
        {
            mediumMission = new Mission { type = Mission.MissionType.Medium, targetCount = 1000, currentCount = 0, isCompleted = false, targetColor = GetRandomColor() };
        }

        if (hardMission == null || hardMission.isCompleted)
        {
            hardMission = new Mission { type = Mission.MissionType.Hard, targetCount = 1600, currentCount = 0, isCompleted = false, targetColor = GetRandomColor() };
        }
    }

    public void TrackProgress(BubbleColor color, int amount)
    {
        if (mediumMission != null && !mediumMission.isCompleted && color == mediumMission.targetColor)
        {
            mediumMission.currentCount += amount;
            if (mediumMission.currentCount >= 1000) CompleteMission(mediumMission);
        }
        
        if (hardMission != null && !hardMission.isCompleted && color == hardMission.targetColor)
        {
            hardMission.currentCount += amount;
            if (hardMission.currentCount >= 1600) CompleteMission(hardMission);
        }
        SaveMissions();
    }

    public void TrackStars(int amount)
    {
        if (easyMission != null && !easyMission.isCompleted)
        {
            easyMission.currentCount += amount;
            if (easyMission.currentCount >= 15) CompleteMission(easyMission);
        }
        SaveMissions();
    }

    private void CompleteMission(Mission m)
    {
        m.isCompleted = true;
        m.currentCount = m.targetCount;
        
        if (m.type == Mission.MissionType.Easy)
        {
            EconomyManager.Instance.AddCoins(5);
        }
        else if (m.type == Mission.MissionType.Medium)
        {
            EconomyManager.Instance.AddCoins(4);
            // Give 1 bomb
        }
        else if (m.type == Mission.MissionType.Hard)
        {
            EconomyManager.Instance.AddCoins(5);
            // Give 1 bomb, 1 fireball, 1 rainbow
        }

        Debug.Log($"Mission {m.type} Completed!");
    }

    public string GetProgressString(Mission.MissionType type)
    {
        if (type == Mission.MissionType.Easy) return $"Stars: {easyMission.currentCount} / {easyMission.targetCount}";
        if (type == Mission.MissionType.Medium) return $"{mediumMission.targetColor} bubbles: {mediumMission.currentCount} / {mediumMission.targetCount}";
        if (type == Mission.MissionType.Hard) return $"{hardMission.targetColor} bubbles: {hardMission.currentCount} / {hardMission.targetCount}";
        return "";
    }

    private BubbleColor GetRandomColor()
    {
        Array values = Enum.GetValues(typeof(BubbleColor));
        return (BubbleColor)values.GetValue(UnityEngine.Random.Range(0, values.Length - 1));
    }

    private void SaveMissions() { /* Save logic */ }
}
