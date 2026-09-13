<script setup lang="ts">
import type { UIMessage } from "ai";
import {
  Message,
} from "@/components/ai-elements/message";
import AssistantMessage from "./AssistantMessage.vue";
import UserMessage from "./UserMessage.vue";

const props = defineProps<{
  msgId: string;
  role: UIMessage["role"];
  parts: UIMessage["parts"];
}>();
</script>

<template>
  <Message
    :key="msgId"
    :from="props.role"
  >
    <UserMessage v-if="props.role === 'user'" :parts="props.parts" />
    <AssistantMessage v-if="props.role === 'assistant'" :parts="props.parts" />
  </Message>
</template>
