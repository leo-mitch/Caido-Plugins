import type { Caido } from "@caido/sdk-frontend";

import { createSettingsPage } from "./page";
import { generateGuid, parseSettings, VERSION_INFO } from "./guid";

const COMMAND_ID = "guid-generator.generate";
const PAGE_PATH = "/guid-generator";
// FooterSlot is only exported as a type by the SDK package, so use the raw slot id.
const FOOTER_PRIMARY = "footer-primary";

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("Clipboard copy failed");
  }
}

export const init = (sdk: Caido) => {
  const getSettings = () => parseSettings(sdk.storage.get());

  const generateAndCopy = async (): Promise<string> => {
    const settings = getSettings();
    const guid = generateGuid(settings);
    try {
      await copyToClipboard(guid);
      sdk.window.showToast(`Copied ${VERSION_INFO[settings.version].label}: ${guid}`, {
        variant: "success",
        duration: 2000,
      });
    } catch {
      sdk.window.showToast(`Could not copy to clipboard: ${guid}`, { variant: "error" });
    }
    return guid;
  };

  sdk.commands.register(COMMAND_ID, {
    name: "Generate GUID",
    run: () => void generateAndCopy(),
  });
  sdk.commandPalette.register(COMMAND_ID);

  sdk.footer.addToSlot(FOOTER_PRIMARY, {
    type: "Button",
    label: "GUID",
    icon: "fas fa-fingerprint",
    onClick: () => void generateAndCopy(),
  });

  const page = createSettingsPage({
    getSettings,
    saveSettings: (s) => sdk.storage.set(s),
    onStorageChange: (cb) => sdk.storage.onChange(cb),
    generateAndCopy,
  });
  sdk.navigation.addPage(PAGE_PATH, { body: page.element, onEnter: page.refresh });
  sdk.sidebar.registerItem("GUID Generator", PAGE_PATH, { icon: "fas fa-fingerprint" });
};
