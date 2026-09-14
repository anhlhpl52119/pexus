<script setup lang="ts">
import { HashIcon } from "@lucide/vue";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton v-for="r in $router.getRoutes()" :key="r.name" :is-active="r.name === $route.name" as-child>
            <RouterLink :to="r.path">
              <component :is="r.meta.icon || HashIcon" />
              <span>{{ r.name }}</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
