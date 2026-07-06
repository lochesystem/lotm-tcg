const TARGET_VOLUME = 0.42;
const FADE_MS = 700;

class BgmPlayer {
  private audio = new Audio();
  private currentUrl: string | null = null;
  private unlocked = false;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.audio.loop = true;
    this.audio.preload = 'auto';
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  isPlaying(): boolean {
    return this.currentUrl !== null && !this.audio.paused;
  }

  isPlayingUrl(url: string): boolean {
    return this.currentUrl === url && !this.audio.paused;
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      sessionStorage.setItem('lotm-bgm-unlocked', '1');
    } catch {
      /* private mode */
    }
  }

  restoreUnlock(): void {
    try {
      if (sessionStorage.getItem('lotm-bgm-unlocked') === '1') {
        this.unlocked = true;
      }
    } catch {
      /* ignore */
    }
  }

  private clearFade(): void {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private fadeTo(target: number, onDone?: () => void): void {
    this.clearFade();
    const start = this.audio.volume;
    const delta = target - start;
    if (Math.abs(delta) < 0.01) {
      this.audio.volume = target;
      onDone?.();
      return;
    }
    const started = performance.now();
    this.fadeTimer = setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / FADE_MS);
      this.audio.volume = start + delta * t;
      if (t >= 1) {
        this.clearFade();
        onDone?.();
      }
    }, 32);
  }

  async play(url: string): Promise<boolean> {
    if (!this.unlocked) return false;
    if (this.isPlayingUrl(url)) return true;

    const startNew = async (): Promise<boolean> => {
      this.currentUrl = url;
      this.audio.src = url;
      this.audio.volume = 0;
      try {
        await this.audio.play();
        this.fadeTo(TARGET_VOLUME);
        return true;
      } catch {
        this.audio.pause();
        this.currentUrl = null;
        return false;
      }
    };

    if (this.isPlaying()) {
      return new Promise((resolve) => {
        this.fadeTo(0, () => {
          this.audio.pause();
          void startNew().then(resolve);
        });
      });
    }

    return startNew();
  }

  pause(): void {
    this.fadeTo(0, () => {
      this.audio.pause();
      this.currentUrl = null;
    });
  }
}

export const bgmPlayer = new BgmPlayer();
