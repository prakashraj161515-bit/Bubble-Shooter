using UnityEngine;

public enum BubbleType { Normal, Fireball, Rainbow, Bomb, Rock, Chain, Jelly }
public enum BubbleColor { Red, Blue, Green, Yellow, Purple, Pink, None }

public class Bubble : MonoBehaviour
{
    public BubbleType type = BubbleType.Normal;
    public BubbleColor color = BubbleColor.None;
    public int chainHits = 1; // For Chain Ball
    public bool isLocked = false; 

    public SpriteRenderer spriteRenderer;
    private Rigidbody2D rb;
    private bool isFixed = false;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        spriteRenderer = GetComponent<SpriteRenderer>();
    }

    public void SetColor(BubbleColor newColor, Sprite sprite)
    {
        color = newColor;
        spriteRenderer.sprite = sprite;
    }

    public void FixToGrid(Vector2 position)
    {
        isFixed = true;
        rb.isKinematic = true;
        rb.velocity = Vector2.zero;
        transform.position = position;
    }

    public void HandleHit()
    {
        if (type == BubbleType.Rock) return; // Unbreakable
        
        if (type == BubbleType.Chain)
        {
            chainHits--;
            if (chainHits <= 0) type = BubbleType.Normal; // Unlock
            // Update sprite to show broken chain
            return;
        }

        if (type == BubbleType.Jelly)
        {
            // Jelly logic: stick instantly without bouncing (handled in physics)
        }
    }

    public void Pop()
    {
        if (type == BubbleType.Rock) return; // Rocks only drop
        Destroy(gameObject);
    }

    public void Drop()
    {
        isFixed = false;
        rb.isKinematic = false;
        rb.gravityScale = 2.0f;
        // Optional: Disable collision with other grid bubbles
        GetComponent<CircleCollider2D>().enabled = false;
        Destroy(gameObject, 2f);
    }
}
