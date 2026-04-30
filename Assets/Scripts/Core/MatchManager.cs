using UnityEngine;
using System.Collections.Generic;

public class MatchManager : MonoBehaviour
{
    public static MatchManager Instance;

    void Awake() => Instance = this;

    public void ProcessHit(int x, int y, BubbleColor hitColor)
    {
        List<Bubble> matches = FindMatches(x, y, hitColor);

        if (matches.Count >= 3)
        {
            foreach (var b in matches) b.Pop();
            Shooter.Instance.OnPopSuccess();
            
            // Check for floating bubbles after popping
            CheckForFloatingBubbles();
        }
        else
        {
            Shooter.Instance.OnMiss();
        }
    }

    private List<Bubble> FindMatches(int startX, int startY, BubbleColor color)
    {
        List<Bubble> matches = new List<Bubble>();
        Queue<Bubble> toCheck = new Queue<Bubble>();
        HashSet<Bubble> visited = new HashSet<Bubble>();

        // Implementation of BFS/DFS to find all connected same-color bubbles
        // (Pseudocode logic for now, depends on grid array access)
        return matches; 
    }

    public void CheckForFloatingBubbles()
    {
        // 1. Mark all bubbles in Row 0 as 'Connected'
        // 2. Perform a graph traversal from all 'Connected' bubbles to find reachable ones
        // 3. Any bubble not reachable is an 'Island' and should be dropped
        
        int droppedCount = 0; // If 7-9, activate Bomb power-up
        if (droppedCount >= 7 && droppedCount <= 9)
        {
            // Activate Bomb logic
        }
    }
}
