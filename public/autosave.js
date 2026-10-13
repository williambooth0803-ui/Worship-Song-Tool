import { workspaceSignature } from "./saving.js";

// One writer at a time. Edits during a request are sent in the next request;
// failures pause the queue until an explicit retry or a meaningful online event.
export class AutosaveQueue {
  constructor({ save, onState = () => {}, delay = 1000 }) {
    this.save = save; this.onState = onState; this.delay = delay;
    this.enabled = false; this.generation = 0; this.pending = null;
    this.running = null; this.timer = null; this.phase = "paused";
  }
  reset(enabled = false) {
    clearTimeout(this.timer); this.generation++; this.enabled = enabled;
    this.pending = null; this.phase = enabled ? "idle" : "paused";
  }
  enqueue(workspace) {
    if (!this.enabled) return;
    this.pending = structuredClone(workspace);
    if (["error", "conflict"].includes(this.phase)) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.delay);
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.running) { await this.running; if (this.enabled && this.pending && !["error", "conflict"].includes(this.phase)) return this.flush(); return; }
    if (!this.enabled || !this.pending || ["error", "conflict"].includes(this.phase)) return;
    const generation = this.generation, snapshot = this.pending;
    this.pending = null; this.phase = "saving"; this.onState({ phase: "saving", snapshot });
    this.running = (async () => {
      try {
        const saved = await this.save(snapshot);
        if (generation !== this.generation) return;
        this.phase = "idle"; this.onState({ phase: "saved", snapshot: saved?.workspace || snapshot, originalSnapshot: snapshot, signature: workspaceSignature(saved?.workspace || snapshot) });
      } catch (error) {
        if (generation !== this.generation) return;
        this.pending ||= snapshot;
        this.phase = error.name === "WorkspaceConflictError" ? "conflict" : "error";
        this.onState({ phase: this.phase, error });
      }
    })();
    await this.running; this.running = null;
    if (generation === this.generation && this.phase === "idle" && this.pending) return this.flush();
  }
  retry() {
    if (this.phase === "conflict") return;
    this.phase = "idle";
    return this.flush();
  }
}
