using System;
using System.Collections.Generic;
using UnityEngine;

namespace BubbleShooter
{
    public enum BubbleColor
    {
        Red,
        Yellow,
        Green,
        Cyan,
        Blue,
        Purple,
        Pink,
        Orange,
        Rainbow
    }

    public enum PowerUpType
    {
        Fireball,
        Bomb,
        Rainbow,
        Exchange,
        ExtraBalls
    }

    public enum MissionTier
    {
        Easy,
        Medium,
        Hard
    }

    public enum RewardKind
    {
        Coins,
        PowerUp,
        ExtraBalls
    }

    [Serializable]
    public struct BubbleCell
    {
        public int Row;
        public int Column;
        public BubbleColor Color;

        public BubbleCell(int row, int column, BubbleColor color)
        {
            Row = row;
            Column = column;
            Color = color;
        }
    }

    [Serializable]
    public sealed class LevelData
    {
        public int LevelNumber;
        public int BallCount;
        public int ColorCount;
        public int StartingRows;
        public readonly List<BubbleCell> Bubbles = new List<BubbleCell>();
    }

    [Serializable]
    public sealed class Reward
    {
        public RewardKind Kind;
        public PowerUpType PowerUp;
        public int Amount;

        public static Reward Coins(int amount) => new Reward { Kind = RewardKind.Coins, Amount = amount };
        public static Reward Item(PowerUpType type, int amount = 1) => new Reward { Kind = RewardKind.PowerUp, PowerUp = type, Amount = amount };
        public static Reward Balls(int amount) => new Reward { Kind = RewardKind.ExtraBalls, Amount = amount };
    }

    public static class GameConstants
    {
        public const int TotalLevels = 6000;
        public const int FireballComboRequirement = 6;
        public const int BombDropMinimum = 7;
        public const int BombDropMaximum = 9;
        public const int PowerUpCoinCost = 10;
        public const int ExtraBallsCoinCost = 10;
        public const int ExtraBallsAmount = 5;
        public const int FreeSpinHours = 24;
        public const int ExtraSpinCoinCost = 5;
        public const int EasyStarTarget = 15;
        public const int MediumColorPopTarget = 1000;
        public const int HardColorPopTarget = 1600;
    }

    public static class GameMath
    {
        public static int StableHash(int seed)
        {
            unchecked
            {
                var x = (uint)seed;
                x ^= x >> 16;
                x *= 0x7feb352d;
                x ^= x >> 15;
                x *= 0x846ca68b;
                x ^= x >> 16;
                return (int)(x & 0x7fffffff);
            }
        }

        public static T Pick<T>(IReadOnlyList<T> items, int seed)
        {
            if (items == null || items.Count == 0)
            {
                throw new ArgumentException("Cannot pick from an empty list.");
            }

            return items[StableHash(seed) % items.Count];
        }
    }
}
