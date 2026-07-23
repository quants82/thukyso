export function workerStatus(queueConnected: boolean) {
  return {
    status: queueConnected ? "ready" : "starting",
    phase: 1,
    queueConnected
  } as const;
}
