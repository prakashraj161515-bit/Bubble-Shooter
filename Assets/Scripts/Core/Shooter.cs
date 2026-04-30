using UnityEngine;
using System.Collections.Generic;

public class Shooter : MonoBehaviour
{
    public static Shooter Instance;

    [Header("Shooting Settings")]
    public float shootForce = 15f;
    public Transform shootPoint;
    public GameObject bubblePrefab;
    public LineRenderer trajectoryLine;

    [Header("Ball Management")]
    public int currentBalls = 60;
    public BubbleColor currentBallColor;
    public BubbleColor nextBallColor;
    
    private bool isShooting = false;
    private int comboCount = 0;

    void Awake()
    {
        Instance = this;
    }

    void Start()
    {
        InitializeBalls(1); // Default to level 1
    }

    public void InitializeBalls(int level)
    {
        // Difficulty Curve: 1-50 (60 balls), 800+ (40 balls)
        if (level <= 50) currentBalls = 60;
        else if (level >= 800) currentBalls = 40;
        else
        {
            // Linear interpolation
            float t = (float)(level - 50) / (800 - 50);
            currentBalls = Mathf.RoundToInt(Mathf.Lerp(60, 40, t));
        }
        
        PrepareNextBall();
    }

    void Update()
    {
        if (isShooting) return;

        HandleAiming();
        if (Input.GetMouseButtonUp(0))
        {
            Shoot();
        }
    }

    private void HandleAiming()
    {
        Vector3 mousePos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        mousePos.z = 0;
        Vector2 direction = (mousePos - shootPoint.position).normalized;

        if (direction.y < 0.2f) direction.y = 0.2f; // Prevent shooting downwards/sideways too much

        // Trajectory Line
        trajectoryLine.positionCount = 3;
        trajectoryLine.SetPosition(0, shootPoint.position);
        
        // Simple 1-bounce trajectory for preview
        RaycastHit2D hit = Physics2D.Raycast(shootPoint.position, direction, 20f);
        if (hit.collider != null && hit.collider.CompareTag("Wall"))
        {
            Vector2 reflectDir = Vector2.Reflect(direction, hit.normal);
            trajectoryLine.SetPosition(1, hit.point);
            trajectoryLine.SetPosition(2, hit.point + reflectDir * 2f);
        }
        else
        {
            trajectoryLine.SetPosition(1, (Vector2)shootPoint.position + direction * 20f);
            trajectoryLine.SetPosition(2, (Vector2)shootPoint.position + direction * 20f);
        }
    }

    private void Shoot()
    {
        if (currentBalls <= 0) return;

        isShooting = true;
        currentBalls--;
        
        GameObject ball = Instantiate(bubblePrefab, shootPoint.position, Quaternion.identity);
        Rigidbody2D rb = ball.GetComponent<Rigidbody2D>();
        Bubble bScript = ball.GetComponent<Bubble>();
        
        // Setup ball as projectile
        bScript.SetColor(currentBallColor, GridManager.Instance.bubbleSprites[(int)currentBallColor]);
        
        Vector3 mousePos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
        Vector2 direction = (mousePos - shootPoint.position).normalized;
        if (direction.y < 0.2f) direction.y = 0.2f;

        rb.velocity = direction * shootForce;
        
        PrepareNextBall();
        isShooting = false;
    }

    private void PrepareNextBall()
    {
        currentBallColor = nextBallColor;
        nextBallColor = (BubbleColor)Random.Range(0, 5); // 5 basic colors
        // Update UI
    }

    public void ExchangeBall()
    {
        BubbleColor temp = currentBallColor;
        currentBallColor = nextBallColor;
        nextBallColor = temp;
        // Update UI
    }

    public void OnPopSuccess()
    {
        comboCount++;
        if (comboCount >= 6)
        {
            // Fireball Ready!
            Debug.Log("Fireball Ready");
        }
    }

    public void OnMiss()
    {
        comboCount = 0;
    }
}
