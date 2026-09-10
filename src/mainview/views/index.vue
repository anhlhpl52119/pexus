<script setup lang="ts">
import type { ChatStatus, SourceUrlUIPart, ToolUIPart, UIMessage } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Check, CopyIcon, FolderOpenIcon, LoaderCircleIcon, XIcon } from "@lucide/vue";
import { getToolName, isStaticToolUIPart } from "ai";
import { multiply, round } from "es-toolkit/compat";
import { computed, onMounted, ref } from "vue";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputProvider,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAIStream } from "@/composables/useAIStream";
import { electroview } from "@/electroview";

interface Model {
  id: string;
  name: string;
  chef: string;
  owner: string;
  providers: string[];
  pricing: {
    input: number;
    output: number;
    input_cache_write: number | null;
    input_cache_read: number | null;
  };
}

const { conversation, loading, error: streamError, submit, initialize, approvalDialogOpen, pendingApproval, handleApproval } = useAIStream();
const status = computed<ChatStatus>(() =>
  loading.value ? "streaming" : "ready",
);
const messages = computed(() => conversation.value);
const lastMessageId = computed(() => messages.value.at(-1)?.id ?? null);
const lastAssistantMessageId = computed(() => {
  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    const current = messages.value[index];
    if (current && current.role === "assistant")
      return current.id;
  }
  return null;
});

const open = ref(false);
const selectedModel = ref<string>("inclusionai/ling-3.0-flash-fin-free");

const supportedModels = ref<Model[]>([]);

const selectedModelData = computed(() => supportedModels.value.find(m => m.id === selectedModel.value));
const chefs = computed(() => Array.from(new Set(supportedModels.value.map(model => model.chef))));

const selectedWorkspace = ref<string | null>(null);
const directoryPickerOpen = ref(false);
const directoryPickerError = ref<string | null>(null);

function normalizeDirectoryPath(path: string) {
  const normalized = path.replace(/[\\/]+$/, "");
  return normalized || path.slice(0, 1);
}

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

async function handleSubmit(message: PromptInputMessage) {
  await submit(message.text, selectedModel.value, selectedWorkspace.value);
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

function handlePromptError(error: { code: string; message: string }) {
  console.error(`Input error (${error.code})`, error.message);
}

const promptInput = usePromptInputProvider({
  onSubmit: handleSubmit,
  onError: handlePromptError,
});

const hasPendingInput = computed(() => {
  return Boolean(promptInput.textInput.value.trim()) || promptInput.files.value.length > 0;
});

const submitDisabled = computed(() => !hasPendingInput.value || status.value === "streaming");

function getSourceUrlParts(message: UIMessage) {
  return message.parts.filter((part): part is SourceUrlUIPart => part.type === "source-url");
}

function isStaticToolPart(part: UIMessage["parts"][number]): part is ToolUIPart {
  return isStaticToolUIPart(part);
}

function shouldShowActions(message: UIMessage, partIndex: number) {
  if (message.role !== "assistant")
    return false;
  if (lastAssistantMessageId.value !== message.id)
    return false;
  return isLastTextPart(message, partIndex);
}

function isLastTextPart(message: UIMessage, partIndex: number) {
  for (let index = partIndex + 1; index < message.parts.length; index += 1) {
    const nextPart = message.parts[index];
    if (nextPart && nextPart.type === "text")
      return false;
  }
  return true;
}

function isReasoningStreaming(message: UIMessage, partIndex: number) {
  return status.value === "streaming"
    && message.id === lastMessageId.value
    && partIndex === message.parts.length - 1;
}

async function copyToClipboard(text: string) {
  if (!text)
    return;

  if (typeof navigator === "undefined" || !navigator.clipboard)
    return;

  try {
    await navigator.clipboard.writeText(text);
  }
  catch (error) {
    console.error("Failed to copy to clipboard", error);
  }
}

function handleSelect(id: string) {
  selectedModel.value = id;
  open.value = false;
}

const isAwaitingResponse = computed(() => {
  return loading.value && conversation.value.at(-1)?.role === "user";
});

onMounted(async () => {
  try {
    await initialize();
    const { data: models } = await fetch("https://ai-gateway.vercel.sh/v1/models")
      .then(res => res.json());

    const conversionRate = 1_000_000;
    // filter language model https://vercel.com/docs/ai-gateway/models-and-providers#filtering-models-by-type
    const textModels: Model[] = models
      .filter((m: any) => m.type === "language") // filter `language model`
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        chef: m.owned_by,
        owner: m.owned_by,
        providers: [],
        pricing: {
          input: round(multiply(conversionRate, Number(m.pricing.input)), 2),
          output: round(multiply(conversionRate, Number(m.pricing.output)), 2),
          input_cache_read: round(multiply(conversionRate, Number(m.pricing.input_cache_read)), 2),
          input_cache_write: round(multiply(conversionRate, Number(m.pricing.input_cache_write)), 2),
        },
      }));

    supportedModels.value = textModels.slice();
    const hasDefaultModel = textModels.some(m => m.id === selectedModel.value);
    if (hasDefaultModel) {
      return;
    }
    if (textModels.length > 0)
      selectedModel.value = textModels[0].id;
  }
  catch (err) {
    console.error(err);
  }
});
</script>

<template>
  <div class="flex h-full flex-col">
    <Conversation class="h-full">
      <ConversationContent class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div
          v-if="conversation.length === 0"
          class="flex min-h-[min(28rem,60vh)] flex-col items-center justify-center text-center"
        >
          <div class="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderOpenIcon class="size-6" />
          </div>
          <h1 class="text-lg font-semibold tracking-tight">
            Eureka!
          </h1>
        </div>

        <div
          v-for="message in conversation"
          :key="message.id"
        >
          <Sources
            v-if="message.role === 'assistant' && getSourceUrlParts(message).length > 0"
          >
            <SourcesTrigger :count="getSourceUrlParts(message).length" />
            <SourcesContent
              v-for="(source, index) in getSourceUrlParts(message)"
              :key="`${message.id}-source-${index}`"
            >
              <Source
                :href="source.url"
                :title="source.title ?? source.url"
              />
            </SourcesContent>
          </Sources>
          <template
            v-for="(part, partIndex) in message.parts"
            :key="`${message.id}-${partIndex}`"
          >
            <Message
              v-if="part.type === 'text'"
              :from="message.role"
            >
              <div>
                <MessageContent>
                  <MessageResponse :content="part.text" />
                </MessageContent>

                <MessageActions v-if="shouldShowActions(message, partIndex)">
                  <MessageAction
                    label="Copy"
                    @click="copyToClipboard(part.text)"
                  >
                    <CopyIcon class="size-3" />
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>

            <Reasoning
              v-else-if="part.type === 'reasoning'"
              class="w-full"
              :is-streaming="isReasoningStreaming(message, partIndex)"
            >
              <ReasoningTrigger />
              <ReasoningContent :content="part.text" />
            </Reasoning>

            <Tool v-else-if="part.type === 'dynamic-tool'">
              <ToolHeader
                :state="part.state"
                :title="part.toolName"
                type="dynamic-tool"
                :tool-name="part.toolName"
              />
              <ToolContent>
                <ToolInput :input="part.input" />
                <ToolOutput v-if="part.state === 'output-available'" :error-text="part.errorText" :output="part.output" />
              </ToolContent>
            </Tool>

            <Tool v-else-if="isStaticToolPart(part)">
              <ToolHeader
                :state="part.state"
                :title="getToolName(part)"
                :type="part.type"
              />
              <ToolContent>
                <ToolInput :input="part.input" />
                <ToolOutput v-if="part.state === 'output-available'" :error-text="part.errorText" :output="part.output" />
              </ToolContent>
            </Tool>
          </template>
        </div>

        <div
          v-if="isAwaitingResponse"
          class="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <Loader class="size-4" />
          <span>Starting the agent…</span>
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>

    <div class="sticky bottom-0 z-10 mx-auto w-full max-w-3xl shrink-0 border-t bg-background/95 px-4 pb-4 pt-2 backdrop-blur sm:px-6">
      <p
        v-if="streamError"
        class="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        role="alert"
        aria-live="assertive"
      >
        {{ streamError }}
      </p>

      <div class="bg-secondary p-2 rounded-t-lg">
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
      </div>

      <PromptInput>
        <PromptInputBody>
          <PromptInputTextarea />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools class="min-w-0 flex-1 flex-wrap">
            <!-- Workspace Selector -->
            <ModelSelector v-model:open="open">
              <ModelSelectorTrigger>
                <Button
                  class="w-50 min-w-0 justify-between"
                  variant="outline"
                  type="button"
                  :disabled="supportedModels.length === 0"
                >
                  <ModelSelectorLogo v-if="selectedModelData?.owner" :provider="selectedModelData.owner" />
                  <ModelSelectorName class="min-w-0 truncate">
                    {{ selectedModelData?.name ?? (supportedModels.length ? "Select model" : "Loading models…") }}
                  </ModelSelectorName>
                </Button>
              </ModelSelectorTrigger>

              <ModelSelectorContent>
                <ModelSelectorInput placeholder="Search models..." />

                <ModelSelectorList>
                  <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>

                  <ModelSelectorGroup
                    v-for="chef in chefs"
                    :key="chef"
                    :heading="chef"
                  >
                    <ModelSelectorItem
                      v-for="model in supportedModels.filter(m => m.chef === chef)"
                      :key="model.id"
                      :value="model.id"
                      @select="handleSelect(model.id)"
                    >
                      <ModelSelectorLogo :provider="model.owner" />
                      <ModelSelectorName>{{ model.name }}</ModelSelectorName>
                      <!-- <ModelSelectorLogoGroup>
                      <ModelSelectorLogo
                        v-for="provider in model.providers"
                        :key="provider"
                        :provider="provider"
                      />
                    </ModelSelectorLogoGroup> -->
                      <div class="text-xs opacity-20">
                        {{ model.pricing.input }}$ / {{ model.pricing.output }}$
                      </div>
                      <Check v-if="selectedModel === model.id" class="ml-auto size-4" />
                      <div v-else class="ml-auto size-4" />
                    </ModelSelectorItem>
                  </ModelSelectorGroup>
                </ModelSelectorList>
              </ModelSelectorContent>
            </ModelSelector>
          </PromptInputTools>

          <PromptInputSubmit
            :disabled="submitDisabled"
            :status="status"
          />
        </PromptInputFooter>
      </PromptInput>
    </div>

    <!-- Approval Dialog -->
    <Dialog v-model:open="approvalDialogOpen">
      <DialogContent>
        <DialogTitle>Confirm Destructive Command</DialogTitle>
        <DialogDescription>
          This command appears to be destructive. Please confirm before proceeding.
        </DialogDescription>
        <div class="bg-muted rounded-md p-4 font-mono text-sm">
          {{ pendingApproval?.command }}
        </div>
        <DialogFooter>
          <Button variant="outline" @click="handleApproval(false)">
            Deny
          </Button>
          <Button variant="default" @click="handleApproval(true)">
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
