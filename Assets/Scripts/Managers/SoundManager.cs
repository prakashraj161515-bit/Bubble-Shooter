using UnityEngine;

public class SoundManager : MonoBehaviour
{
    public static SoundManager Instance;

    [Header("Audio Clips")]
    public AudioClip popSound;
    public AudioClip fireballSound;
    public AudioClip bombSound;
    public AudioClip rewardSound;

    private AudioSource audioSource;

    void Awake()
    {
        Instance = this;
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null) audioSource = gameObject.AddComponent<AudioSource>();
    }

    public void PlayPop() => audioSource.PlayOneShot(popSound);
    public void PlayFireball() => audioSource.PlayOneShot(fireballSound);
    public void PlayBomb() => audioSource.PlayOneShot(bombSound);
    public void PlayReward() => audioSource.PlayOneShot(rewardSound);

    // Note: No shoot sound as per user instructions
}
