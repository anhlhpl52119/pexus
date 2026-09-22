import { useColorMode } from "@vueuse/core";
import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "@/App.vue";
import { initRPCBridge } from "./bridge/rpc-client";
import { setupRouter } from "./router";
import "@/styles/main.css";

useColorMode({
  modes: { dark: "dark" },
});

async function main() {
  const pinia = createPinia();
  const router = await setupRouter();
  initRPCBridge();
  createApp(App)
    .use(pinia)
    .use(router)
    .mount("#app");
}

main().catch(console.error);
