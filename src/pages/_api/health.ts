// Liveness for the fleet's readiness gate. No dependencies are touched.
export const GET = async () =>
  new Response(JSON.stringify({ ok: true, app: 'unanswered' }), {
    headers: { 'Content-Type': 'application/json' },
  });

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
