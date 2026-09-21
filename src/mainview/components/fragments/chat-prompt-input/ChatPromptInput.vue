<script setup lang="ts">
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { CheckIcon, FolderOpenIcon, GlobeIcon, XIcon } from "@lucide/vue";
import { computed, ref } from "vue";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

import { Button } from "@/components/ui/button";
import { electroview } from "@/electroview";

type ChatPromptInputMessage = PromptInputMessage & {
  modelId: string;
  workingDir: string | null;
};

const emit = defineEmits<{
  submit: [message: ChatPromptInputMessage];
}>();

const SUBMITTING_TIMEOUT = 200;
const STREAMING_TIMEOUT = 2000;

const models = [
  {
    id: "inclusionai/ling-3.0-flash-fin-free",
    name: "Ling 3.0 Flash (Free)",
    chef: "Novita AI",
    chefSlug: "inclusionai",
    providers: ["novita-ai"],
  },
  {
    id: "poolside/laguna-s-2.1-free",
    name: "Laguna S 2.1 Free",
    chef: "Poolside",
    chefSlug: "poolside",
    providers: ["poolside"],
  },
  {
    id: "deepseek/deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    chef: "Deepseek",
    chefSlug: "deepseek",
    providers: ["alibaba-cloud, baseten, boundless, deepInfra, deepSeek, fireworks"],
  },
  {
    id: "zai/glm-5.3-flash",
    name: "GLM 5.3 Flash",
    chef: "Z.AI",
    chefSlug: "zai",
    providers: ["zai", "azure"],
  },
  {
    id: "inception/mercury-2.5",
    name: "Mercury 2.5",
    chef: "Inception",
    chefSlug: "inception",
    providers: ["inception"],
  },
];

const modelId = ref<string>(models[0].id);
const modelSelectorOpen = ref(false);
const directoryPickerOpen = ref(false);
const selectedWorkspace = ref<string | null>(null);
const directoryPickerError = ref<string | null>(null);

const status = ref<"submitted" | "streaming" | "ready" | "error">("ready");
const selectedModelData = computed(() => models.find(m => m.id === modelId.value));

const selectedWorkspacePath = computed(() => {
  if (!selectedWorkspace.value)
    return null;

  return normalizeDirectoryPath(selectedWorkspace.value);
});

const selectedWorkspaceName = computed(() => {
  if (!selectedWorkspacePath.value)
    return "";

  const pathParts = selectedWorkspacePath.value.split(/[\\/]/).filter(Boolean);
  return pathParts.at(-1) ?? selectedWorkspacePath.value;
});

function normalizeDirectoryPath(path: string) {
  const normalized = path.replace(/[\\/]+$/, "");
  return normalized || path.slice(0, 1);
}

async function openDirectory() {
  if (directoryPickerOpen.value)
    return;

  directoryPickerOpen.value = true;
  directoryPickerError.value = null;

  try {
    const rpc = electroview.rpc;
    if (!rpc)
      throw new Error("The directory picker is unavailable.");

    const result = await rpc.request.openSystemExplorer({
      allowsMultipleSelection: false,
      canChooseFiles: false,
      canChooseDirectory: true,
      startingFolder: "~/Document",
    });
    if (result.ok) {
      [selectedWorkspace.value] = result.data;
    }
  }
  catch (error) {
    console.error("Failed to open directory", error);
    directoryPickerError.value = error instanceof Error
      ? error.message
      : "Could not select a directory.";
  }
  finally {
    directoryPickerOpen.value = false;
  }
}

function clearDirectory() {
  selectedWorkspace.value = null;
  directoryPickerError.value = null;
}

function handleSubmit(message: PromptInputMessage) {
  const hasText = !!message.text.trim();

  if (!hasText) {
    return;
  }

  status.value = "submitted";

  emit("submit", {
    ...message,
    modelId: modelId.value,
    workingDir: selectedWorkspace.value,
  });

  setTimeout(() => {
    status.value = "streaming";
  }, SUBMITTING_TIMEOUT);

  setTimeout(() => {
    status.value = "ready";
  }, STREAMING_TIMEOUT);
}
</script>

<template>
  <PromptInputProvider
    @submit="handleSubmit"
  >
    <PromptInput
      multiple
      global-drop class="w-full"
    >
      <PromptInputBody>
        <PromptInputTextarea />
      </PromptInputBody>

      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>

          <PromptInputButton>
            <GlobeIcon :size="16" />
            <span>Search</span>
          </PromptInputButton>

          <Button
            class="h-8 max-w-fit min-w-0 justify-start gap-1 rounded-full px-3 text-left"
            variant="outline"
            type="button"
            :disabled="directoryPickerOpen"
            :title="selectedWorkspacePath ?? 'Choose a working directory'"
            :aria-label="selectedWorkspacePath
              ? `Working directory: ${selectedWorkspacePath}`
              : 'Choose a working directory'"
            @click="openDirectory"
          >
            <FolderOpenIcon class="size-4 shrink-0" />
            <span class="min-w-0 truncate text-xs font-medium">
              {{ selectedWorkspaceName || "Choose folder" }}
            </span>

            <div v-if="selectedWorkspace" class="p-1/2 hover:bg-slate-500 rounded-full" @click.stop="clearDirectory">
              <XIcon class="size-4 cursor-pointer" />
            </div>
          </Button>

          <ModelSelector v-model:open="modelSelectorOpen">
            <ModelSelectorTrigger as-child>
              <PromptInputButton>
                <ModelSelectorLogo
                  v-if="selectedModelData?.chefSlug"
                  :provider="selectedModelData.chefSlug"
                />
                <ModelSelectorName v-if="selectedModelData?.name">
                  {{ selectedModelData.name }}
                </ModelSelectorName>
              </PromptInputButton>
            </ModelSelectorTrigger>

            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search models..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>

                <ModelSelectorGroup
                  v-for="chef in ['Novita AI', 'Poolside', 'Deepseek', 'Inception', 'Z.AI']"
                  :key="chef"
                  :heading="chef"
                >
                  <ModelSelectorItem
                    v-for="m in models.filter((item) => item.chef === chef)"
                    :key="m.id"
                    :value="m.id"
                    @select="() => {
                      modelId = m.id;
                      modelSelectorOpen = false;
                    }"
                  >
                    <ModelSelectorLogo :provider="m.chefSlug" />
                    <ModelSelectorName>{{ m.name }}</ModelSelectorName>

                    <ModelSelectorLogoGroup>
                      <ModelSelectorLogo
                        v-for="provider in m.providers"
                        :key="provider"
                        :provider="provider"
                      />
                    </ModelSelectorLogoGroup>

                    <CheckIcon v-if="modelId === m.id" class="ml-auto size-4" />
                    <div v-else class="ml-auto size-4" />
                  </ModelSelectorItem>
                </ModelSelectorGroup>
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        </PromptInputTools>

        <PromptInputSubmit :status="status" />
      </PromptInputFooter>
    </PromptInput>
  </PromptInputProvider>
</template>
