import {
  DEFAULT_SETTINGS,
  generateGuid,
  type GuidSettings,
  type GuidVersion,
  parseSettings,
  VERSION_INFO,
} from "./guid";

type PageDeps = {
  getSettings: () => GuidSettings;
  saveSettings: (s: GuidSettings) => Promise<void>;
  onStorageChange: (cb: (value: unknown) => void) => void;
  generateAndCopy: () => Promise<string>;
};

const STYLE = `
.guidgen { padding: 1.5rem; height: 100%; overflow: auto; box-sizing: border-box; font-size: 0.875rem; }
.guidgen h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
.guidgen .muted { opacity: 0.7; margin: 0 0 1.25rem; }
.guidgen section { border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: 6px; padding: 1rem; margin-bottom: 1rem; max-width: 640px; }
.guidgen h2 { font-size: 0.95rem; margin: 0 0 0.75rem; }
.guidgen label.opt { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.4rem 0; cursor: pointer; }
.guidgen label.opt input { margin-top: 0.2rem; }
.guidgen .desc { display: block; opacity: 0.65; font-size: 0.8rem; }
.guidgen .preview { font-family: ui-monospace, monospace; font-size: 0.95rem; padding: 0.6rem 0.75rem; border-radius: 4px; background: color-mix(in srgb, currentColor 8%, transparent); word-break: break-all; margin-bottom: 0.75rem; }
.guidgen .row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.guidgen button { font: inherit; color: inherit; cursor: pointer; padding: 0.4rem 0.9rem; border-radius: 4px; border: 1px solid color-mix(in srgb, currentColor 25%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); }
.guidgen button:hover { background: color-mix(in srgb, currentColor 14%, transparent); }
`;

export function createSettingsPage(deps: PageDeps) {
  const root = document.createElement("div");
  root.className = "guidgen";
  root.innerHTML = `
    <style>${STYLE}</style>
    <h1>GUID Generator</h1>
    <p class="muted">Choose what the footer <b>GUID</b> button generates. Settings are saved automatically.</p>
    <section>
      <h2>GUID type</h2>
      <div data-versions></div>
    </section>
    <section>
      <h2>Format</h2>
      <label class="opt"><input type="checkbox" data-opt="hyphens"><span>Hyphens<span class="desc">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</span></span></label>
      <label class="opt"><input type="checkbox" data-opt="uppercase"><span>Uppercase<span class="desc">Use A–F instead of a–f</span></span></label>
      <label class="opt"><input type="checkbox" data-opt="braces"><span>Braces<span class="desc">Wrap in { } (Microsoft style)</span></span></label>
    </section>
    <section>
      <h2>Preview</h2>
      <div class="preview" data-preview></div>
      <div class="row">
        <button data-action="copy">Generate &amp; copy</button>
        <button data-action="reset">Reset to defaults</button>
      </div>
    </section>
  `;

  const versionsEl = root.querySelector<HTMLDivElement>("[data-versions]")!;
  for (const [key, info] of Object.entries(VERSION_INFO)) {
    const label = document.createElement("label");
    label.className = "opt";
    label.innerHTML = `<input type="radio" name="guidgen-version" value="${key}"><span>${info.label}<span class="desc">${info.description}</span></span>`;
    versionsEl.appendChild(label);
  }

  const preview = root.querySelector<HTMLDivElement>("[data-preview]")!;
  const radios = root.querySelectorAll<HTMLInputElement>('input[name="guidgen-version"]');
  const checks = root.querySelectorAll<HTMLInputElement>("input[data-opt]");

  const render = (s: GuidSettings) => {
    radios.forEach((r) => (r.checked = r.value === s.version));
    checks.forEach((c) => (c.checked = s[c.dataset.opt as "hyphens" | "uppercase" | "braces"]));
    preview.textContent = generateGuid(s);
  };

  const readForm = (): GuidSettings => {
    const s = { ...deps.getSettings() };
    const checked = Array.from(radios).find((r) => r.checked);
    if (checked) s.version = checked.value as GuidVersion;
    checks.forEach((c) => (s[c.dataset.opt as "hyphens" | "uppercase" | "braces"] = c.checked));
    return s;
  };

  const save = async (s: GuidSettings) => {
    render(s);
    await deps.saveSettings(s);
  };

  root.addEventListener("change", () => void save(readForm()));
  root.querySelector('[data-action="reset"]')!.addEventListener("click", () => void save({ ...DEFAULT_SETTINGS }));
  root.querySelector('[data-action="copy"]')!.addEventListener("click", async () => {
    preview.textContent = await deps.generateAndCopy();
  });

  deps.onStorageChange((v) => render(parseSettings(v)));

  const refresh = () => render(deps.getSettings());
  refresh();
  return { element: root, refresh };
}
