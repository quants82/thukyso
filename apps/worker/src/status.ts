export function workerStatus() {
  return { status: "idle", phase: 0, queueConnected: false } as const;
}
