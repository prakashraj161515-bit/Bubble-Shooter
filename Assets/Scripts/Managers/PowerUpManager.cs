using UnityEngine;

public class PowerUpManager : MonoBehaviour
{
    public static PowerUpManager Instance;

    public int combo = 0;
    public bool fireballReady = false;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    public void OnBubblePop()
    {
        combo++;
        
        // Trigger UI for fireball charging animation
        // UIManager.Instance.UpdateFireballCharge(combo);

        if (combo >= 6)
        {
            fireballReady = true;
            Debug.Log("Fireball Ready!");
            
            // Trigger READY animation on UI
            // UIManager.Instance.ShowFireballReadyAnim();
        }
    }

    public void OnMiss()
    {
        combo = 0;
        fireballReady = false;
        
        // Reset UI charge
        // UIManager.Instance.UpdateFireballCharge(combo);
    }

    public void DropBubbles(int count)
    {
        // Rule: Bomb triggers when 9 bubbles fall together
        if (count >= 9)
        {
            Debug.Log("Bomb Activated!");
            ActivateBomb();
        }
    }

    // Logic for actual fireball usage (Destroy straight line)
    public void UseFireball(Vector2 startPos, Vector2 direction)
    {
        if (fireballReady)
        {
            Debug.Log("Using Fireball - Destroying straight line");
            // Add Raycast/Collider logic here to destroy bubbles in a line
            
            // Reset after use
            combo = 0;
            fireballReady = false;
            // UIManager.Instance.UpdateFireballCharge(combo);
        }
    }

    // Logic for bomb usage (Area explosion)
    private void ActivateBomb()
    {
        Debug.Log("Triggering Area Explosion");
        // Add OverlapCircle/Radius logic here to destroy surrounding bubbles
    }
}
