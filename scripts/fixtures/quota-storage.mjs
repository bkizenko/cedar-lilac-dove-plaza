/** Atomic Web Storage adapter: UTF16 key/value units; rejected writes never
 * remove or change old keys. Deliberately offers no eviction API to callers. */
export class QuotaStorage {
  constructor(limit) {
    this.limit = limit;
    this.values = new Map([["unrelated-setting", "keep"]]);
    this.writes = [];
    this.failures = [];
    this.failKey = null;
  }
  getItem(key) {
    return this.values.get(String(key)) ?? null;
  }
  setItem(key, value) {
    key = String(key);
    value = String(value);
    const next = new Map(this.values);
    next.set(key, value);
    const bytes = [...next].reduce((n, [k, v]) => n + 2 * (k.length + v.length), 0);
    this.writes.push(key);
    if (key === this.failKey || bytes > this.limit) {
      this.failures.push({ key, attemptedBytes: bytes });
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    this.values = next;
  }
  bytes() {
    return [...this.values].reduce((n, [k, v]) => n + 2 * (k.length + v.length), 0);
  }
}
