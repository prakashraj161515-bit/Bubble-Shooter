using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;

public class LevelMap : MonoBehaviour
{
    public GameObject levelButtonPrefab;
    public Transform contentParent;
    public int totalLevels = 6000;

    void Start()
    {
        PopulateMap();
    }

    void PopulateMap()
    {
        for (int i = 1; i <= 100; i++)
        {
            GameObject btn = Instantiate(levelButtonPrefab, contentParent);
            LevelButton levelBtn = btn.GetComponent<LevelButton>();
            
            // Logic for level types
            if (i % 15 == 0) levelBtn.SetType(LevelType.Gift);
            else if (i % 50 == 0) levelBtn.SetType(LevelType.Boss);
            else levelBtn.SetType(LevelType.Normal);

            levelBtn.SetLevelNumber(i);
            btn.GetComponent<Button>().onClick.AddListener(() => LoadLevel(i));
        }
    }

    void LoadLevel(int level)
    {
        PlayerPrefs.SetInt("CurrentLevel", level);
        UnityEngine.SceneManagement.SceneManager.LoadScene("GameplayScene");
    }
}
