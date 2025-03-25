<template>
  <div class="sound-options">
    <h3>Notification Sound</h3>
    <div class="sound-selection">
      <div v-for="sound in availableSounds" :key="sound.file" class="sound-option">
        <input
          type="radio"
          :id="sound.file"
          name="soundOption"
          :value="sound.file"
          v-model="selectedSound"
          @change="updateSound"
        />
        <label :for="sound.file">{{ sound.name }}</label>
        <button @click="previewSound(sound.file)" class="preview-button">Preview</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getSoundConfig, saveSoundConfig } from '../config/sound_config';

export default {
  name: 'SoundOptions',
  setup() {
    const selectedSound = ref('notification.mp3');
    const availableSounds = [
      { name: 'Default', file: 'notification.mp3' },
      { name: 'Usagi Ura', file: 'usagi_ura.mp3' }
    ];

    onMounted(() => {
      const config = getSoundConfig();
      selectedSound.value = config.soundFile;
    });

    const updateSound = () => {
      saveSoundConfig({ soundFile: selectedSound.value });
    };

    const previewSound = (soundFile) => {
      new Audio(chrome.runtime.getURL(soundFile)).play();
    };

    return {
      selectedSound,
      availableSounds,
      updateSound,
      previewSound
    };
  }
};
</script>

<style scoped>
.sound-options {
  margin: 20px 0;
}

.sound-selection {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sound-option {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-button {
  margin-left: 10px;
  padding: 2px 8px;
  font-size: 0.8em;
}
</style>
