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

const SUBMITTING_TIMEOUT = 200;
const STREAMING_TIMEOUT = 2000;

const models = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude 4 Opus",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
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

    const folder = await rpc.request.selectWd();
    if (folder)
      selectedWorkspace.value = folder;
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
  const hasText = !!message.text;
  const hasAttachments = message.files?.length > 0;

  if (!hasText && !hasAttachments) {
    return;
  }

  status.value = "submitted";

  console.log("Submitting message:", message);

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
                  v-for="chef in ['OpenAI', 'Anthropic', 'Google']"
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
