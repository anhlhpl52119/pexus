<script setup lang="ts">
import type { UIMessage } from "ai";
import { MessageSquare } from "@lucide/vue";
import { nanoid } from "nanoid";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { ChatMessage } from "@/components/fragments/chat-message";
import { ChatPromptInput } from "@/components/fragments/chat-prompt-input";

interface Messages {
  id: string;
  role: "user" | "assistant";
  parts: UIMessage["parts"];
  metadata?: any;
}

const conversation: Messages[] = [
  {
    id: nanoid(),
    role: "user",
    parts: [
      {
        type: "text",
        text: "Please help me analyze these images",
      },
      {
        type: "file",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
        mediaType: "image/jpeg",
        filename: "palace-of-fine-arts.jpg",
      },
      {
        type: "file",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
        mediaType: "application/pdf",
        filename: "vue-compositions-guide.pdf",
      },
    ],
  },
  {
    id: nanoid(),
    role: "assistant",
    parts: [
      {
        type: "reasoning",
        text: `[electrobun] Child process spawned with PID 33159
[electrobun] [LAUNCHER] Loaded identifier: vueapp.electrobun.dev, name: Pexus-dev, channel: dev
[electrobun] [LAUNCHER] Loading app code from flat files
[electrobun] Server started at http://localhost:50000
[electrobun] HMR enabled: Using Vite dev server at http://localhost:5173
[electrobun] 🌐 Bun started!! `,
      },
      {
        type: "text",
        text: `let's me prepare the images...`,
      },
      {
        type: "file",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
        mediaType: "image/jpeg",
        filename: "palace-of-fine-arts.jpg",
      },
      {
        type: "text",
        text: `The Vue Composition API is a modern way to write components in Vue 3. It replaces the Options API’s data, methods, and computed properties with a single \`setup()\` function.

Here are the most common composables:

- **ref()** — creates reactive primitive values
- **reactive()** — makes entire objects reactive
- **computed()** — creates derived reactive values
- **watch()** — runs side effects on data changes
- **onMounted()** — lifecycle hook for when a component is mounted

## Most Popular Composables

| Composable | Purpose |
|-------------|----------|
| ref | Reactive primitive values |
| reactive | Reactive objects |
| computed | Derived reactive values |
| watch | React to data changes |
| onMounted | Run code when component mounts |
| onUnmounted | Cleanup logic when destroyed |

Here's a simple example:

\`\`\`vue
<script setup>
import { ref, onMounted } from 'vue'

const count = ref(0)

onMounted(() => {
  console.log('Component mounted!')
})
<\/script>

<template>
  <button @click="count++">Clicked {{ count }} times</button>
</template>
\`\`\`

Which specific composable would you like to learn more about?`,
      },
    ],
  },
];
</script>

<template>
  <div class="flex h-full flex-col">
    <Conversation class="relative size-full">
      <ConversationContent>
        <!-- Empty -->
        <ConversationEmptyState
          v-if="conversation.length === 0"
          title="Start a conversation"
          description="Messages will appear here as the conversation progresses."
        >
          <template #icon>
            <MessageSquare class="size-6" />
          </template>
        </ConversationEmptyState>

        <!-- messages -->
        <div v-for="msg in conversation" :key="msg.id" class="flex flex-col gap-4">
          <ChatMessage class="flex-col" :msg-id="msg.id" :parts="msg.parts" :role="msg.role" />
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
    <div class="sticky bottom-0 z-5 mx-auto w-full max-w-3xl shrink-0 pb-4 bg-background/75 backdrop-blur sm:px-0">
      <ChatPromptInput />
    </div>
  </div>
</template>
