using System.Collections.Generic;
using UnityEngine;

namespace BubbleShooter
{
    public sealed class PopResult
    {
        public readonly List<Vector2Int> Matched = new List<Vector2Int>();
        public readonly List<Vector2Int> Dropped = new List<Vector2Int>();
        public readonly Dictionary<BubbleColor, int> PoppedByColor = new Dictionary<BubbleColor, int>();
        public bool BombActivated => Dropped.Count >= GameConstants.BombDropMinimum && Dropped.Count <= GameConstants.BombDropMaximum;
    }

    public sealed class BubbleBoard
    {
        private readonly Dictionary<Vector2Int, BubbleColor> cells = new Dictionary<Vector2Int, BubbleColor>();
        private readonly Vector2Int[] evenNeighbors =
        {
            new Vector2Int(-1, -1), new Vector2Int(-1, 0), new Vector2Int(0, -1),
            new Vector2Int(0, 1), new Vector2Int(1, -1), new Vector2Int(1, 0)
        };
        private readonly Vector2Int[] oddNeighbors =
        {
            new Vector2Int(-1, 0), new Vector2Int(-1, 1), new Vector2Int(0, -1),
            new Vector2Int(0, 1), new Vector2Int(1, 0), new Vector2Int(1, 1)
        };

        public int Count => cells.Count;
        public IReadOnlyDictionary<Vector2Int, BubbleColor> Cells => cells;

        public void Clear() => cells.Clear();

        public void Load(LevelData data)
        {
            Clear();
            foreach (var bubble in data.Bubbles)
            {
                cells[new Vector2Int(bubble.Row, bubble.Column)] = bubble.Color;
            }
        }

        public bool HasBubble(Vector2Int coordinate) => cells.ContainsKey(coordinate);

        public BubbleColor GetColor(Vector2Int coordinate) => cells[coordinate];

        public void SetBubble(Vector2Int coordinate, BubbleColor color)
        {
            cells[coordinate] = color;
        }

        public bool RemoveBubble(Vector2Int coordinate)
        {
            return cells.Remove(coordinate);
        }

        public IEnumerable<Vector2Int> GetNeighbors(Vector2Int coordinate)
        {
            var offsets = coordinate.x % 2 == 0 ? evenNeighbors : oddNeighbors;
            foreach (var offset in offsets)
            {
                yield return coordinate + offset;
            }
        }

        public PopResult ResolveShot(Vector2Int coordinate, BubbleColor shotColor, bool isFireball)
        {
            SetBubble(coordinate, shotColor);
            var result = new PopResult();

            if (isFireball)
            {
                foreach (var neighbor in GetNeighbors(coordinate))
                {
                    if (cells.ContainsKey(neighbor))
                    {
                        result.Matched.Add(neighbor);
                    }
                }
                result.Matched.Add(coordinate);
            }
            else
            {
                result.Matched.AddRange(FindMatchGroup(coordinate, shotColor));
                if (result.Matched.Count < 3)
                {
                    result.Matched.Clear();
                    return result;
                }
            }

            foreach (var matched in result.Matched)
            {
                TrackColor(result, matched);
                cells.Remove(matched);
            }

            result.Dropped.AddRange(RemoveUnsupported());
            foreach (var dropped in result.Dropped)
            {
                TrackColor(result, dropped);
            }
            return result;
        }

        public List<Vector2Int> FindMatchGroup(Vector2Int start, BubbleColor shotColor)
        {
            var group = new List<Vector2Int>();
            if (!cells.TryGetValue(start, out var color))
            {
                return group;
            }

            var target = shotColor == BubbleColor.Rainbow ? color : shotColor;
            var frontier = new Queue<Vector2Int>();
            var visited = new HashSet<Vector2Int>();
            frontier.Enqueue(start);
            visited.Add(start);

            while (frontier.Count > 0)
            {
                var current = frontier.Dequeue();
                if (!cells.TryGetValue(current, out var currentColor))
                {
                    continue;
                }

                if (!Matches(target, currentColor, shotColor))
                {
                    continue;
                }

                group.Add(current);
                foreach (var neighbor in GetNeighbors(current))
                {
                    if (visited.Add(neighbor))
                    {
                        frontier.Enqueue(neighbor);
                    }
                }
            }

            return group;
        }

        public List<Vector2Int> RemoveUnsupported()
        {
            var supported = new HashSet<Vector2Int>();
            var frontier = new Queue<Vector2Int>();

            foreach (var pair in cells)
            {
                if (pair.Key.x == 0)
                {
                    frontier.Enqueue(pair.Key);
                    supported.Add(pair.Key);
                }
            }

            while (frontier.Count > 0)
            {
                var current = frontier.Dequeue();
                foreach (var neighbor in GetNeighbors(current))
                {
                    if (cells.ContainsKey(neighbor) && supported.Add(neighbor))
                    {
                        frontier.Enqueue(neighbor);
                    }
                }
            }

            var dropped = new List<Vector2Int>();
            foreach (var pair in cells)
            {
                if (!supported.Contains(pair.Key))
                {
                    dropped.Add(pair.Key);
                }
            }

            foreach (var coordinate in dropped)
            {
                cells.Remove(coordinate);
            }

            return dropped;
        }

        public Vector2Int FindNearestOpenSlot(Vector2 position, float cellRadius)
        {
            var row = Mathf.Max(0, Mathf.RoundToInt(-position.y / (cellRadius * 1.7f)));
            var offset = row % 2 == 0 ? 0f : cellRadius * 0.88f;
            var column = Mathf.Clamp(Mathf.RoundToInt((position.x + 4.4f - offset) / (cellRadius * 1.76f)), 0, LevelGenerator.BoardColumns - 1);
            var candidate = new Vector2Int(row, column);
            if (!HasBubble(candidate))
            {
                return candidate;
            }

            var best = candidate;
            var bestDistance = float.MaxValue;
            for (var r = Mathf.Max(0, row - 2); r <= row + 2; r++)
            {
                for (var c = 0; c < LevelGenerator.BoardColumns; c++)
                {
                    var probe = new Vector2Int(r, c);
                    if (HasBubble(probe))
                    {
                        continue;
                    }

                    var distance = Vector2.Distance(position, CoordinateToWorld(probe, cellRadius));
                    if (distance < bestDistance)
                    {
                        bestDistance = distance;
                        best = probe;
                    }
                }
            }

            return best;
        }

        public Vector2 CoordinateToWorld(Vector2Int coordinate, float cellRadius)
        {
            var x = -4.4f + coordinate.y * cellRadius * 1.76f + (coordinate.x % 2 == 0 ? 0f : cellRadius * 0.88f);
            var y = 3.7f - coordinate.x * cellRadius * 1.7f;
            return new Vector2(x, y);
        }

        private static bool Matches(BubbleColor target, BubbleColor current, BubbleColor shotColor)
        {
            return current == target || current == BubbleColor.Rainbow || shotColor == BubbleColor.Rainbow;
        }

        private void TrackColor(PopResult result, Vector2Int coordinate)
        {
            if (!cells.TryGetValue(coordinate, out var color) || color == BubbleColor.Rainbow)
            {
                return;
            }

            result.PoppedByColor.TryGetValue(color, out var amount);
            result.PoppedByColor[color] = amount + 1;
        }
    }
}
