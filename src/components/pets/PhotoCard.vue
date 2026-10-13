<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :type="interactive ? 'button' : undefined"
    class="photocard text-left"
    :class="isActive ? 'photocard--active' : size === 'small' ? 'photocard--idle' : ''"
    :style="{ '--tilt': isActive ? '0deg' : `${tilt}deg` }"
    :aria-pressed="interactive ? isActive : undefined"
    :aria-label="interactive ? alt : undefined"
    @click="interactive && emit('select')"
  >
    <span v-if="size === 'large'" class="tape" aria-hidden="true" />
    <div class="overflow-hidden rounded-xl">
      <img
        :src="src"
        :alt="alt"
        class="photocard-img"
        :loading="size === 'large' ? 'eager' : 'lazy'"
      />
    </div>
    <p v-if="caption" class="photocard-caption">{{ caption }}</p>
  </component>
</template>

<script setup>
defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  caption: { type: String, default: '' },
  tilt: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false },
  size: { type: String, default: 'small' },
  interactive: { type: Boolean, default: false }
})
const emit = defineEmits(['select'])
</script>
