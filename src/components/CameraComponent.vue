<template>
    <ion-card>
        <ion-card-header>
            <ion-card-title>Camera</ion-card-title>
        </ion-card-header>

        <ion-card-content>
            <ion-button expand="block" @click="takePicture">
                <ion-icon slot="start" :icon="cameraIcon" /> Take Picture
            </ion-button>
            <ion-text v-if="errorMessage" color="danger">
                <p>{{ errorMessage }}</p>
            </ion-text>
        </ion-card-content>
    </ion-card>
</template>


<script setup lang="ts">
import { 
    IonButton, 
    IonCard, 
    IonCardContent, 
    IonCardHeader, 
    IonCardTitle,
    IonIcon,
    IonText,
} from '@ionic/vue';
import { camera as cameraIcon } from 'ionicons/icons';
import { Camera } from '@capacitor/camera';
import { ref } from 'vue';
const errorMessage = ref("");
const emit = defineEmits<{(event: 'photoCaptured', photo: string): void}>();
const takePicture = async () => {
    errorMessage.value = "";
    try {
        const photo = await Camera.takePhoto({
            quality: 90,
            saveToGallery: false
        });
        if(photo.webPath){
            emit('photoCaptured', photo.webPath);
        }
    } catch (error) {
        console.error(error);
        errorMessage.value = "Unable to capture photo";
    }
};
</script>