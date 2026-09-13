<template>
  <div class="camera-control">
    <button class="camera-button" type="button" :disabled="disabled || capturing" @click="takePicture"><ion-icon :icon="cameraOutline" aria-hidden="true" />{{ capturing ? 'Opening camera…' : 'Take a photo' }}</button>
    <p v-if="errorMessage" class="camera-error" role="alert">{{ errorMessage }}</p>
  </div>
</template>
<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { cameraOutline } from 'ionicons/icons';
import { Camera } from '@capacitor/camera';
import { ref } from 'vue';
defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ (event: 'photoCaptured', photo: string): void }>();
const errorMessage = ref('');
const capturing = ref(false);
async function takePicture() {
  errorMessage.value = '';
  capturing.value = true;
  try {
    const photo = await Camera.takePhoto({ quality: 90, saveToGallery: false });
    if (photo.webPath) emit('photoCaptured', photo.webPath);
  } catch { errorMessage.value = 'No photo was captured. You can try again.'; }
  finally { capturing.value = false; }
}
</script>
<style scoped>
.camera-button { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 46px; padding: 12px; border: 1px dashed var(--app-line); border-radius: 12px; background: var(--app-bg); color: var(--app-muted); font-size: 12px; }
.camera-button ion-icon { flex-shrink: 0; font-size: 18px; }
.camera-button:hover:not(:disabled) { border-color: var(--ion-color-primary); color: var(--ion-color-primary); }
.camera-error { margin: 8px 0 0; color: var(--app-danger-text); font-size: 11px; line-height: 1.5; }
</style>
