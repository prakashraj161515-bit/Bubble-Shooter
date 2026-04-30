# Premium Bubble Shooter - Unity Project (From Scratch)

This project is a fully functional 2D Bubble Shooter for Android, built strictly according to custom requirements.

## 🚀 All Features Implemented

### 1. Gameplay & Mechanics
- **Match 3 System**: Recursive search for matching colors.
- **Physics**: Wall bounce shooting and hexagonal grid snapping.
- **Drop System**: Bubbles drop when their connection to the ceiling is severed.
- **No Floating Bubbles**: All bubbles are arranged in proper rows with no hanging gaps.

### 2. Level & Ball System
- **Ball Count Curve**: 
  - Level 1-50: 60 Balls.
  - Level 51-200: 55-50 Balls.
  - Level 201-400: 50-45 Balls.
  - Level 401-800: 45-40 Balls.
  - Level 800+: 40 Balls (Fixed).
- **Reset Logic**: Balls reset on retry and next level.

### 3. Special Bubbles & Power-ups
- **Rock Ball**: Direct hits do nothing; must be dropped.
- **Chain Ball**: Must be hit to unlock before it can be popped.
- **Jelly Ball**: No-bounce physics; sticks instantly.
- **Fireball**: Charges at exactly **6 combos**; resets on miss.
- **Bomb**: Triggers when **9 bubbles** fall together.
- **Rainbow/Exchange**: Functional wildcard and swap systems.

### 4. Economy & Missions
- **Gifts/Spin/Daily**: Main sources of coins (3-4 coins per reward).
- **Missions**: 
  - Medium: 1000 pops of fixed color.
  - Hard: 1600 pops of fixed color.
  - No refresh until completion.
- **Store**: Pricing from ₹59 to ₹699 with Ad-free periods.

## 🛠️ How to Build
1. Open the project in **Unity 2021+**.
2. Switch Platform to **Android**.
3. Use the provided [PurpleGradient.shader](Assets/Materials/PurpleGradient.shader) for UI panels.
4. Ensure `GridManager` is in the scene to handle procedural level generation.

## 📁 File Structure
- `Assets/Scripts/Core`: Main gameplay logic.
- `Assets/Scripts/Managers`: Economy, Missions, and Ads handlers.
- `Assets/Scripts/UI`: Screen management and Level Map.
- `Assets/Materials`: Custom shaders for premium visuals.

**Fully working project - Not a demo.**
