<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const defaultLayout = defineAsyncComponent(() => import("@/layouts/default/DefaultLayout.vue"));
const adminLayout = defineAsyncComponent(() => import("@/layouts/AdminLayout.vue"));

const layouts: Record<string, any> = {
  default: defaultLayout,
  admin: adminLayout,
};
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <!-- blank -->
    <component
      :is="Component"
      v-if="route.meta.layout === false"
    />

    <!-- layout -->

    <component
      :is="layouts[route.meta.layout as string || 'default']"
      v-else
    >
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </component>
  </RouterView>
</template>
