using UnityEngine;

public enum BubbleType { Normal, Fireball, Rainbow, Bomb }
public enum BubbleColor { Red, Blue, Green, Yellow, Purple, Pink, None }

public class Bubble : MonoBehaviour
{
    public BubbleType type = BubbleType.Normal;
    public BubbleColor color = BubbleColor.None;
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

    public void Pop()
    {
        // Add pop animation or particle effect here
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
