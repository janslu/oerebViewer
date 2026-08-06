<template>
  <button
    class="p-2 bg-[rgba(var(--color-background-primary),0.9)] text-theme-primary rounded-sm"
    @click="$emit('clicked')"
  >
    <slot />
  </button>
</template>
