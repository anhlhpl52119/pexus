<script setup lang="ts">
import type { UIMessage } from "ai";
import { nanoid } from "nanoid";
import { computed } from "vue";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  MessageContent,
} from "@/components/ai-elements/message";

const props = defineProps<{
  parts: UIMessage["parts"];
}>();

const attachments = computed(() => props.parts.filter(p => p.type === "file"));
</script>

<template>
  <!-- Attachments -->
  <Attachments
    v-if="attachments.length > 0"
    class="mb-2"
    variant="grid"
  >
    <Attachment
      v-for="(attachment, atmIdx) in attachments"
      :key="atmIdx"
      :data="{ id: nanoid(), ...attachment }"
    >
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  </Attachments>

  <template v-for="(part, partIdx) in props.parts" :key="partIdx">
    <!-- text -->
    <MessageContent v-if="part.type === 'text'">
      {{ part.text }}
    </MessageContent>
  </template>
</template>
