using UnityEngine;

public class MissionManager : MonoBehaviour
{
    public static MissionManager Instance;

    [System.Serializable]
    public class Mission
    {
        public string type; // Easy, Medium, Hard
        public int targetCount;
        public int currentCount;
        public BubbleColor targetColor;
        public bool isCompleted;
    }

    public Mission easyMission;
    public Mission mediumMission;
    public Mission hardMission;

    void Awake()
    {
        Instance = this;
        LoadMissions();
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

    private void CompleteMission(Mission m)
    {
        m.isCompleted = true;
        // Grant Rewards logic here
        Debug.Log("Mission Completed: " + m.type);
    }

    private void LoadMissions()
    {
        // Load from PlayerPrefs
        // If empty, initialize new ones
    }

    private void SaveMissions()
    {
        // Save to PlayerPrefs
    }
}
