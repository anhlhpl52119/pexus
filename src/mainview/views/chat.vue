<script setup lang="ts">
import type { UIMessage } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { MessageSquare } from "@lucide/vue";
import { watch } from "vue";
import { useRoute } from "vue-router";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { ChatMessage } from "@/components/fragments/chat-message";
import { ChatPromptInput } from "@/components/fragments/chat-prompt-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAIStream } from "@/composables/useAIStream";

interface NewChatPrompt extends PromptInputMessage {
  modelId: string;
  workingDir: string | null;
}

const route = useRoute();
const {
  conversation,
  error: streamError,
  submit,
  reset,
  approvalDialogOpen,
  pendingApproval,
  handleApproval,
} = useAIStream({ createOnFirstSubmit: true });

async function handleSubmit(message: NewChatPrompt) {
  await submit(message.text, message.modelId, message.workingDir);
}

watch(
  () => route.query.new,
  (newValue, oldValue) => {
    if (route.name === "chat" && newValue !== oldValue) {
      void reset();
    }
  },
);
</script>

<template>
  <div class="flex h-full flex-col">
    <Conversation class="relative size-full">
      <ConversationContent class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <ConversationEmptyState
          v-if="conversation.length === 0"
          title="Start a conversation"
          description="Ask anything to get started."
        >
          <template #icon>
            <MessageSquare class="size-6" />
          </template>
        </ConversationEmptyState>

        <div v-for="message in conversation" :key="message.id" class="flex flex-col gap-4">
          <ChatMessage
            class="flex-col"
            :msg-id="message.id"
            :parts="message.parts"
            :role="message.role as UIMessage['role']"
          />
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
      <ChatPromptInput
        :key="String(route.query.new ?? 'new-chat')"
        @submit="handleSubmit"
      />
    </div>

    <Dialog v-model:open="approvalDialogOpen">
      <DialogContent>
        <DialogTitle>Confirm Destructive Command</DialogTitle>
        <DialogDescription>
          This command appears to be destructive. Please confirm before proceeding.
        </DialogDescription>
        <div class="rounded-md bg-muted p-4 font-mono text-sm">
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
