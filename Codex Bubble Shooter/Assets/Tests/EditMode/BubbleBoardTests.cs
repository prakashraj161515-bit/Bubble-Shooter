using NUnit.Framework;
using UnityEngine;

namespace BubbleShooter.Tests
{
    public sealed class BubbleBoardTests
    {
        [Test]
        public void MatchThreeSameColorPops()
        {
            var board = new BubbleBoard();
            board.SetBubble(new Vector2Int(0, 0), BubbleColor.Red);
            board.SetBubble(new Vector2Int(0, 1), BubbleColor.Red);

            var result = board.ResolveShot(new Vector2Int(0, 2), BubbleColor.Red, false);

            Assert.AreEqual(3, result.Matched.Count);
            Assert.AreEqual(0, board.Count);
        }

        [Test]
        public void MissDoesNotPopMatch()
        {
            var board = new BubbleBoard();
            board.SetBubble(new Vector2Int(0, 0), BubbleColor.Red);

            var result = board.ResolveShot(new Vector2Int(0, 1), BubbleColor.Blue, false);

            Assert.AreEqual(0, result.Matched.Count);
            Assert.AreEqual(2, board.Count);
        }

        [Test]
        public void UnsupportedClusterDropsWhenSupportRemoved()
        {
            var board = new BubbleBoard();
            board.SetBubble(new Vector2Int(0, 0), BubbleColor.Red);
            board.SetBubble(new Vector2Int(1, 0), BubbleColor.Red);
            board.SetBubble(new Vector2Int(2, 0), BubbleColor.Blue);

            var result = board.ResolveShot(new Vector2Int(0, 1), BubbleColor.Red, false);

            Assert.AreEqual(3, result.Matched.Count);
            Assert.AreEqual(1, result.Dropped.Count);
            Assert.AreEqual(0, board.Count);
        }

        [Test]
        public void BombActivatesForSevenToNineDroppedBubbles()
        {
            var result = new PopResult();
            for (var i = 0; i < 8; i++)
            {
                result.Dropped.Add(new Vector2Int(i, 0));
            }

            Assert.IsTrue(result.BombActivated);
        }
    }
}
