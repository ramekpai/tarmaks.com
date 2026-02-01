
export class SteamRequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minDelay = 300; // 300ms default delay (burst mode)

  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      
      if (timeSinceLast < this.minDelay) {
        await new Promise(r => setTimeout(r, this.minDelay - timeSinceLast));
      }

      const task = this.queue.shift();
      if (task) {
        try {
          this.lastRequestTime = Date.now();
          await task();
        } catch (e) {
          console.error('Queue processing error', e);
        }
      }
    }

    this.isProcessing = false;
  }

  setDelay(ms: number) {
    this.minDelay = ms;
  }
}

export const steamQueue = new SteamRequestQueue();
