using UnityEngine;

namespace BubbleShooter
{
    public sealed class AudioService
    {
        private readonly AudioSource source;
        private readonly AudioClip popClip;
        private readonly AudioClip fireballClip;
        private readonly AudioClip bombClip;

        public AudioService()
        {
            var go = new GameObject("AudioService");
            Object.DontDestroyOnLoad(go);
            source = go.AddComponent<AudioSource>();
            popClip = MakeTone("Pop", 740f, 0.08f, 0.35f);
            fireballClip = MakeTone("Fireball", 180f, 0.24f, 0.45f);
            bombClip = MakeNoise("Bomb", 0.36f, 0.55f);
        }

        public void Pop() => Play(popClip);
        public void Fireball() => Play(fireballClip);
        public void Bomb() => Play(bombClip);

        private void Play(AudioClip clip)
        {
            if (GameServices.Save.Data.SfxEnabled)
            {
                source.PlayOneShot(clip);
            }
        }

        private static AudioClip MakeTone(string name, float frequency, float seconds, float volume)
        {
            const int sampleRate = 44100;
            var sampleCount = Mathf.RoundToInt(sampleRate * seconds);
            var samples = new float[sampleCount];
            for (var i = 0; i < sampleCount; i++)
            {
                var t = i / (float)sampleRate;
                var envelope = 1f - i / (float)sampleCount;
                samples[i] = Mathf.Sin(t * frequency * Mathf.PI * 2f) * envelope * volume;
            }

            var clip = AudioClip.Create(name, sampleCount, 1, sampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private static AudioClip MakeNoise(string name, float seconds, float volume)
        {
            const int sampleRate = 44100;
            var sampleCount = Mathf.RoundToInt(sampleRate * seconds);
            var samples = new float[sampleCount];
            var seed = 7;
            for (var i = 0; i < sampleCount; i++)
            {
                seed = GameMath.StableHash(seed + i);
                var envelope = 1f - i / (float)sampleCount;
                samples[i] = (((seed % 2000) / 1000f) - 1f) * envelope * volume;
            }

            var clip = AudioClip.Create(name, sampleCount, 1, sampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }
    }
}
