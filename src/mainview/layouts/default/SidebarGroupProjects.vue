<script setup lang="ts">
import { ChevronRight, FolderOpen, Plus } from "@lucide/vue";
import Collapsible from "@/components/ui/collapsible/Collapsible.vue";
import CollapsibleContent from "@/components/ui/collapsible/CollapsibleContent.vue";
import CollapsibleTrigger from "@/components/ui/collapsible/CollapsibleTrigger.vue";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
</script>

<template>
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
</template>
