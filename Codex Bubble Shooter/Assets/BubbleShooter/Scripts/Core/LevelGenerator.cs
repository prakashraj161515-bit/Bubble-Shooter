using UnityEngine;

namespace BubbleShooter
{
    public static class LevelGenerator
    {
        public const int BoardColumns = 10;

        public static int GetBallCount(int levelNumber)
        {
            var level = Mathf.Clamp(levelNumber, 1, GameConstants.TotalLevels);
            if (level <= 50)
            {
                return 60;
            }

            if (level >= 800)
            {
                return 40;
            }

            const float span = 800f - 51f;
            var t = Mathf.Clamp01((level - 51f) / span);
            return Mathf.RoundToInt(Mathf.Lerp(60f, 40f, t));
        }

        public static int GetGiftIntervalAfterLevel(int levelNumber)
        {
            return 10 + GameMath.StableHash(levelNumber * 9176 + 31) % 6;
        }

        public static LevelData Generate(int levelNumber)
        {
            var level = Mathf.Clamp(levelNumber, 1, GameConstants.TotalLevels);
            var data = new LevelData
            {
                LevelNumber = level,
                BallCount = GetBallCount(level),
                ColorCount = Mathf.Clamp(3 + level / 180, 3, 8),
                StartingRows = Mathf.Clamp(5 + level / 120, 5, 13)
            };

            for (var row = 0; row < data.StartingRows; row++)
            {
                var rowFill = Mathf.Clamp01(0.96f - level * 0.00004f - row * 0.015f);
                for (var column = 0; column < BoardColumns; column++)
                {
                    var holeRoll = GameMath.StableHash(level * 4099 + row * 193 + column * 71) % 1000;
                    var preserveTopSupport = row < 2;
                    if (!preserveTopSupport && holeRoll > Mathf.RoundToInt(rowFill * 1000f))
                    {
                        continue;
                    }

                    var color = (BubbleColor)(GameMath.StableHash(level * 997 + row * 113 + column * 37) % data.ColorCount);
                    data.Bubbles.Add(new BubbleCell(row, column, color));
                }
            }

            return data;
        }
    }
}
