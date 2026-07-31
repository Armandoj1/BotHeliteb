/** Simulates network latency for the mock service layer. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Random latency inside a range — makes mocked UI feel like a real backend. */
export function randomDelay(min = 240, max = 720): Promise<void> {
  return delay(min + Math.random() * (max - min));
}
