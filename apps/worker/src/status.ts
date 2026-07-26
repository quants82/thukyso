export function workerStatus(queueConnected: boolean) {
  return {
    status: queueConnected ? "ready" : "starting",
    phase: 5,
    queueConnected
  } as const;
}
