// Minimal Worker entry point required by vitest-pool-workers
export default {
  fetch(): Response {
    return new Response('test');
  },
};
