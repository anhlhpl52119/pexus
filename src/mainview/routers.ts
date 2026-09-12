import type { Router } from "vue-router";
import { GalleryVerticalEnd } from "@lucide/vue";
import { markRaw } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import "@/electroview";
import "@/styles/main.css";

export async function setupRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: "home", path: "/", component: () => import("@/views/index.vue") },
      { name: "chat", path: "/chat", component: () => import("@/views/chat.vue") },
      { name: "debug", path: "/debug", component: () => import("@/views/debug.vue") },
      { name: "blank", path: "/blank", component: () => import("@/views/blank.vue"), meta: { layout: false, icon: markRaw(GalleryVerticalEnd) } },
    ],
  });
  return router;
}
