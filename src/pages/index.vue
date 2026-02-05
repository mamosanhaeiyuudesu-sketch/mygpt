<script setup lang="ts">
definePageMeta({
  middleware: () => navigateTo('/chat', { replace: true })
});
</script>
