export function readPort(value: string | undefined, fallback: number): number {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Cổng cấu hình không hợp lệ");
  }
  return port;
}
