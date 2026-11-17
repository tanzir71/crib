// In-memory UI state (not persisted).
export const ui = {
  picks: [],            // onboarding: chosen language codes, in order
  setupQueue: [],       // codes still to set up
  draft: null,          // language being set up
  session: null,        // active recall session
  lastResult: null,     // results of the last session
  toggles: { say: true, lit: false, hooks: false },
  q: '',                // search query
  qLang: 'all',
  show: null,           // full-screen phrase overlay
  cardEnglish: false,
  resetArmed: false,
  installPrompt: null,  // beforeinstallprompt event (Chromium)
  looping: null,        // sheet id currently playing
  loopIdx: -1,
  toast: null,
};

export const env = {
  standalone: () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  ios: () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  repo: () => {
    const h = location.hostname;
    if (h.endsWith('github.io')) {
      const owner = h.split('.')[0];
      const repo = location.pathname.split('/').filter(Boolean)[0] || `${owner}.github.io`;
      return `https://github.com/${owner}/${repo}`;
    }
    return null;
  },
};
