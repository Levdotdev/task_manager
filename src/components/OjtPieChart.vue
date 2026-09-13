<template>
  <div class="progress-card">
    <svg viewBox="0 0 120 120" class="progress-ring" role="img" :aria-label="`${Math.round(completedFraction * 100)} percent of training hours completed`">
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--app-line)" stroke-width="8" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--ion-color-primary)" stroke-width="8" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="dashOffset" transform="rotate(-90 60 60)" />
      <text x="60" y="65" text-anchor="middle" class="ring-value">{{ Math.round(completedFraction * 100) }}%</text>
    </svg>
    <div class="progress-copy"><p class="progress-label">Your training progress</p><strong>{{ hoursRemaining.toLocaleString() }} <span>hrs left</span></strong><small>{{ rendered.toLocaleString() }} of {{ total.toLocaleString() }} hours completed</small></div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ hoursRemaining: number; total?: number }>();
const total = computed(() => props.total ?? 486);
const rendered = computed(() => Math.max(0, total.value - props.hoursRemaining));
const circumference = 2 * Math.PI * 50;
const completedFraction = computed(() => total.value > 0 ? Math.max(0, Math.min(1, rendered.value / total.value)) : 0);
const dashOffset = computed(() => circumference * (1 - completedFraction.value));
</script>
<style scoped>
.progress-card { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1px solid var(--app-line); border-radius: 15px; background: var(--app-bg); }
.progress-ring { width: 65px; height: 65px; flex-shrink: 0; }
.ring-value { font-size: 23px; font-weight: 650; fill: var(--app-text); }
.progress-copy { min-width: 0; }
.progress-label { margin: 0 0 7px; color: var(--app-muted); font-size: 10px; }
.progress-copy strong { display: block; font-size: 22px; font-weight: 650; letter-spacing: -.6px; }
.progress-copy strong span { font-size: 12px; font-weight: 400; letter-spacing: 0; color: var(--app-muted); }
.progress-copy small { display: block; margin-top: 5px; color: var(--app-muted); font-size: 9px; line-height: 1.6; }
</style>
