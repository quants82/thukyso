export function workerStatus(queueConnected: boolean) {
  return {
    status: queueConnected ? "ready" : "starting",
    phase: 4,
    queueConnected
  } as const;
}
