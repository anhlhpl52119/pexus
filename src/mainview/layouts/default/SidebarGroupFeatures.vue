<script setup lang="ts">
import { MessageCirclePlus, Settings } from "@lucide/vue";
import { nanoid } from "nanoid";
import { useRouter } from "vue-router";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const router = useRouter();

function startNewChat() {
  router.push({
    name: "chat",
    query: { new: nanoid() },
  });
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton @click="startNewChat">
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
</template>
