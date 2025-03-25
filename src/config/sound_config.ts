export interface SoundConfig {
    soundFile: string;
}

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
    soundFile: 'notification.mp3'
};

export function getSoundConfig(): SoundConfig {
    const storedConfig = localStorage.getItem('soundConfig');
    if (storedConfig) {
        return JSON.parse(storedConfig);
    }
    return DEFAULT_SOUND_CONFIG;
}

export function saveSoundConfig(config: SoundConfig): void {
    localStorage.setItem('soundConfig', JSON.stringify(config));
}
