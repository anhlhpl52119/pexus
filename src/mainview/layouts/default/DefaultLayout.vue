<script setup lang="ts">
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import appIconUrl from "../../../../assets/icon.png";
import SidebarGroupFeatures from "./SidebarGroupFeatures.vue";
import SidebarGroupPagesNavigation from "./SidebarGroupPagesNavigation.vue";
import SidebarGroupProjects from "./SidebarGroupProjects.vue";
import SidebarGroupRecentConversations from "./SidebarGroupRecentConversations.vue";
</script>

<template>
  <SidebarProvider>
    <!-- side bar header -->
    <Sidebar collapsible="icon" variant="floating">
      <!-- Header -->
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="App">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg">
                <img :src="appIconUrl" alt="Pexus app icon" class="size-full">
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">Pexus Era</span>
                <span class="truncate text-xs">Pexus</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <!-- main features -->
        <SidebarGroupFeatures />

        <!-- Projects -->
        <SidebarGroupProjects />

        <!-- Recents -->
        <SidebarGroupRecentConversations />

        <!-- Navigation -->
        <SidebarGroupPagesNavigation />
      </SidebarContent>
    </Sidebar>

    <SidebarInset>
      <header class="sticky top-0 z-2 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear supports-backdrop-filter:bg-background/80 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          Chat
        </div>
      </header>
      <div class="flex flex-1 flex-col gap-4 px-4">
        <div class="min-h-screen flex-1 md:min-h-min">
          <slot />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
