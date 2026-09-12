<script setup lang="ts">
import type { UIMessage } from "ai";
import { nanoid } from "nanoid";
import { ref } from "vue";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";

const conversation = ref<UIMessage[]>([{
  id: nanoid(),
  parts: "Hello, how are you?",
  role: "user",
}, {
  id: nanoid(),
  parts: "I'm good, thank you! How can I assist you today?",
  role: "assistant",
}, {
  id: nanoid(),
  parts: "I'm looking for information about your services.",
  role: "user",
}, {
  id: nanoid(),
  parts: "Sure! We offer a variety of AI solutions. What are you interested in?",
  role: "assistant",
}]);
</script>

<template>
  <div class="flex h-full flex-col">
    <Conversation class="relative size-full">
      <ConversationContent>
        <ConversationEmptyState
          v-if="conversation.length === 0"
          title="Start a conversation"
          description="Messages will appear here as the conversation progresses."
        >
          <template #icon>
            <MessageSquare class="size-6" />
          </template>
        </ConversationEmptyState>

        <template v-else>
          <Message
            v-for="msg in conversation"
            :key="msg.id" :from="msg.role"
          >
            <MessageContent>
              {{ msg.parts }}
            </MessageContent>
          </Message>
        </template>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  </div>
</template>
