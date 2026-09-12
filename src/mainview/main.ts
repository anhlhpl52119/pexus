import { useColorMode } from "@vueuse/core";
import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "@/App.vue";
import { setupRouter } from "./routers";
import "@/electroview";
import "@/styles/main.css";

useColorMode({
  modes: { dark: "dark" },
});

const pinia = createPinia();
const router = await setupRouter();

createApp(App)
  .use(pinia)
  .use(router)
  .mount("#app");
