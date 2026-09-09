/** Tracks the save this tab actually loaded/wrote, never a newer unseen save. */
export class StandaloneSaveGuard {
  constructor(public baseline: string | null, public paused = false) {}
  write(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, value: string): boolean {
    if (this.paused) return false;
    const external = storage.getItem(key);
    if (external !== this.baseline && external !== value) {
      this.paused = true;
      return false;
    }
    storage.setItem(key, value);
    this.baseline = value;
    return true;
  }
  /** Only an explicit campaign import/new-campaign action may replace an unseen save. */
  replace(storage: Pick<Storage, 'getItem'>, key: string) {
    this.baseline = storage.getItem(key);
    this.paused = false;
  }
}
