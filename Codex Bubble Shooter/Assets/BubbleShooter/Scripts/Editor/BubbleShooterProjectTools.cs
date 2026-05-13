#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace BubbleShooter.EditorTools
{
    public static class BubbleShooterProjectTools
    {
        private static readonly string[] ScenePaths =
        {
            "Assets/Scenes/Splash.unity",
            "Assets/Scenes/MainMenu.unity",
            "Assets/Scenes/LevelMap.unity",
            "Assets/Scenes/Gameplay.unity",
            "Assets/Scenes/Missions.unity",
            "Assets/Scenes/Spin.unity",
            "Assets/Scenes/Store.unity",
            "Assets/Scenes/Settings.unity"
        };

        [MenuItem("Bubble Shooter/Prepare Android Build")]
        public static void PrepareAndroidBuild()
        {
            EnsureScenes();
            EditorBuildSettings.scenes = BuildSceneList();
            PlayerSettings.productName = "Bubble Pop Quest";
            PlayerSettings.companyName = "Codex Games";
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.codexgames.bubblepopquest");
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false;
            PlayerSettings.allowedAutorotateToLandscapeRight = false;
            PlayerSettings.allowedAutorotateToPortrait = true;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel23;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);
            AssetDatabase.SaveAssets();
            Debug.Log("Bubble Shooter Android build settings prepared.");
        }

        [MenuItem("Bubble Shooter/Open First Scene")]
        public static void OpenFirstScene()
        {
            EnsureScenes();
            EditorSceneManager.OpenScene(ScenePaths[0]);
        }

        private static EditorBuildSettingsScene[] BuildSceneList()
        {
            var scenes = new EditorBuildSettingsScene[ScenePaths.Length];
            for (var i = 0; i < ScenePaths.Length; i++)
            {
                scenes[i] = new EditorBuildSettingsScene(ScenePaths[i], true);
            }

            return scenes;
        }

        private static void EnsureScenes()
        {
            Directory.CreateDirectory("Assets/Scenes");
            foreach (var scenePath in ScenePaths)
            {
                if (File.Exists(scenePath))
                {
                    continue;
                }

                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, scenePath);
            }
        }
    }
}
#endif
