using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance;

    public int level = 1;
    public int ballsRemaining;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    void Start()
    {
        SetBalls();
    }

    // Rules: Level 1-50 (60 balls), 800+ (40 balls fixed)
    public void SetBalls()
    {
        if (level <= 50) ballsRemaining = 60;
        else if (level <= 200) ballsRemaining = 55;
        else if (level <= 400) ballsRemaining = 50;
        else if (level <= 800) ballsRemaining = 45;
        else ballsRemaining = 40;
        
        // Update UI when balls are set
        // UIManager.Instance.UpdateBallCount(ballsRemaining);
    }

    public void UseBall()
    {
        ballsRemaining--;
        // UIManager.Instance.UpdateBallCount(ballsRemaining);

        if (ballsRemaining <= 0)
        {
            // Triggers UI with BOTH options (10 coins -> 5 balls, Watch ad -> 5 balls)
            AdManager.Instance.ShowOutOfBalls();
        }
    }

    // Rule: Reset balls on retry
    public void RetryLevel()
    {
        SetBalls();
        // Reset board logic here
    }

    // Rule: Reset balls on next level
    public void NextLevel()
    {
        level++;
        SetBalls();
        // Load next level board logic here
    }
}
