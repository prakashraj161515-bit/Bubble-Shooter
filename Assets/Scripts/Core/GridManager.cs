using UnityEngine;
using System.Collections.Generic;

public class GridManager : MonoBehaviour
{
    public static GridManager Instance;

    [Header("Grid Settings")]
    public int columns = 11;
    public int rows = 15;
    public float bubbleSpacing = 1.0f;
    public float rowSpacing = 0.866f; // sqrt(3)/2 for hex grid

    [Header("Prefabs")]
    public GameObject bubblePrefab;
    public Sprite[] bubbleSprites; // Match with BubbleColor enum

    private Bubble[,] grid;
    private Transform gridParent;

    void Awake()
    {
        Instance = this;
        grid = new Bubble[columns, 50]; // Sufficiently large for scrolling levels
        gridParent = new GameObject("GridParent").transform;
    }

    public void GenerateLevel(int levelNumber)
    {
        ClearGrid();
        
        // Procedural Generation Logic for 6000 levels
        Random.InitState(levelNumber);
        
        int rowsToFill = Mathf.Min(8 + (levelNumber / 100), 20); // Levels get taller
        int colorCount = Mathf.Min(3 + (levelNumber / 500), 6); // More colors as levels progress

        for (int y = 0; y < rowsToFill; y++)
        {
            for (int x = 0; x < GetColumnsInRow(y); x++)
            {
                // Simple pattern: don't fill everything
                if (Random.value > 0.2f)
                {
                    SpawnBubbleAt(x, y, (BubbleColor)Random.Range(0, colorCount));
                }
            }
        }
    }

    private void SpawnBubbleAt(int x, int y, BubbleColor color)
    {
        Vector2 pos = GetWorldPosition(x, y);
        GameObject obj = Instantiate(bubblePrefab, pos, Quaternion.identity, gridParent);
        Bubble bubble = obj.GetComponent<Bubble>();
        bubble.SetColor(color, bubbleSprites[(int)color]);
        bubble.FixToGrid(pos);
        grid[x, y] = bubble;
    }

    public Vector2 GetWorldPosition(int x, int y)
    {
        float xPos = x * bubbleSpacing;
        if (y % 2 != 0)
        {
            xPos += bubbleSpacing * 0.5f; // Stagger odd rows
        }
        float yPos = -y * rowSpacing;
        return (Vector2)transform.position + new Vector2(xPos, yPos);
    }

    public int GetColumnsInRow(int y)
    {
        return (y % 2 == 0) ? columns : columns - 1;
    }

    public void ClearGrid()
    {
        foreach (Transform child in gridParent)
        {
            Destroy(child.gameObject);
        }
        grid = new Bubble[columns, 50];
    }

    // Grid neighbor logic for matching
    public List<Bubble> GetNeighbors(int x, int y)
    {
        List<Bubble> neighbors = new List<Bubble>();
        int[,] offsets;

        if (y % 2 == 0) // Even row offsets
        {
            offsets = new int[,] { {1,0}, {-1,0}, {0,1}, {0,-1}, {-1,1}, {-1,-1} };
        }
        else // Odd row offsets
        {
            offsets = new int[,] { {1,0}, {-1,0}, {0,1}, {0,-1}, {1,1}, {1,-1} };
        }

        for (int i = 0; i < 6; i++)
        {
            int nx = x + offsets[i, 0];
            int ny = y + offsets[i, 1];

            if (nx >= 0 && nx < GetColumnsInRow(ny) && ny >= 0 && ny < 50)
            {
                if (grid[nx, ny] != null)
                    neighbors.Add(grid[nx, ny]);
            }
        }
        return neighbors;
    }
}
