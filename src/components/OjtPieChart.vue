<template>
  <div class="pie-wrapper">
    <svg viewBox="0 0 120 120" class="pie-svg">
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--ion-color-light)" stroke-width="16" />
      <circle
        cx="60" cy="60" r="50" fill="none"
        stroke="var(--ion-color-primary)" stroke-width="16" stroke-linecap="round"
        :stroke-dasharray="circumference" :stroke-dashoffset="dashOffset"
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="55" text-anchor="middle" class="pie-value">{{ hoursRemaining }}</text>
      <text x="60" y="72" text-anchor="middle" class="pie-label">of {{ total }} hrs</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ hoursRemaining: number; total?: number }>();
const total = computed(() => props.total ?? 486);
const radius = 50;
const circumference = 2 * Math.PI * radius;
const remainingFraction = computed(() => Math.max(0, Math.min(1, props.hoursRemaining / total.value)));
const dashOffset = computed(() => circumference * (1 - remainingFraction.value));
</script>

<style scoped>
.pie-wrapper { display: flex; justify-content: center; margin: 8px 0; }
.pie-svg { width: 140px; height: 140px; }
.pie-value { font-size: 18px; font-weight: 700; fill: var(--ion-color-dark); }
.pie-label { font-size: 9px; fill: var(--ion-color-medium); }
</style>