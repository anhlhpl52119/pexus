<script setup lang="ts">
import { ChevronRight, FolderOpen, HashIcon, MessageCirclePlus, Plus, Settings } from "@lucide/vue";
import Collapsible from "@/components/ui/collapsible/Collapsible.vue";
import CollapsibleContent from "@/components/ui/collapsible/CollapsibleContent.vue";
import CollapsibleTrigger from "@/components/ui/collapsible/CollapsibleTrigger.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import SidebarMenuSub from "@/components/ui/sidebar/SidebarMenuSub.vue";
import SidebarSeparator from "@/components/ui/sidebar/SidebarSeparator.vue";
import appIconUrl from "../../../assets/icon.png";
</script>

<template>
  <SidebarProvider>
    <!-- side bar header -->
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="sdsd">
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

      <!-- side bar content -->
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <MessageCirclePlus />
                  <span class="text-trim-both">New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings />
                  <span class="text-trim-both">Config</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <!-- Projects -->
        <SidebarGroup>
          <SidebarGroupLabel>
            Projects
            <SidebarGroupAction>
              <Plus /> <span class="sr-only">Add Project</span>
            </SidebarGroupAction>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Collapsible default-open class="group/collapsible">
              <SidebarGroupLabel as-child>
                <CollapsibleTrigger class="group/label w-full text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <FolderOpen class="mr-1" />
                  path-to-1st-prj
                  <ChevronRight class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuSub>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <span>Conversation 1</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <span>Conversation 2</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenuSub>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <!-- Recents -->
        <SidebarGroup>
          <Collapsible default-open class="group/collapsible">
            <SidebarGroupLabel as-child>
              <CollapsibleTrigger class="group/label w-full text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                Recents
                <ChevronRight class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>

            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <span>Conversation 1</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <span>Conversation 2</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <!-- Navigation -->
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
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>

    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
        </div>
      </header>
      <!-- page content -->
      <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
