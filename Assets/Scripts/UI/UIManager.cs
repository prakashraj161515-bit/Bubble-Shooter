using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;

public class UIManager : MonoBehaviour
{
    public static UIManager Instance;

    [Header("Main Screens")]
    public GameObject mainMenu;
    public GameObject levelMap;
    public GameObject gameplayUI;
    public GameObject storeScreen;
    public GameObject settingsPopup;
    public GameObject winLosePopup;

    [Header("Top Bar Stats")]
    public Text coinsText;
    public Text heartsText;
    public Image progressBar;

    [Header("Gameplay UI")]
    public Text ballCountText;
    public Image fireballChargeBar;
    public GameObject fireballReadyEffect;

    void Awake()
    {
        Instance = this;
    }

    public void ShowScreen(string screenName)
    {
        mainMenu.SetActive(screenName == "Main");
        levelMap.SetActive(screenName == "Map");
        gameplayUI.SetActive(screenName == "Game");
        storeScreen.SetActive(screenName == "Store");
    }

    public void UpdateStats(int coins, int hearts)
    {
        coinsText.text = coins.ToString();
        heartsText.text = hearts.ToString();
    }

    public void UpdateBallCount(int count)
    {
        ballCountText.text = count.ToString();
    }

    public void SetFireballCharge(float fillAmount)
    {
        fireballChargeBar.fillAmount = fillAmount;
        fireballReadyEffect.SetActive(fillAmount >= 1.0f);
    }

    public void OpenPopup(GameObject popup)
    {
        popup.SetActive(true);
        // Play smooth scale-in animation logic here
    }

    public void ClosePopup(GameObject popup)
    {
        popup.SetActive(false);
    }
}
