import type { Caido } from "@caido/sdk-frontend";

type ID = string;

const STYLE = `
.rbd-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.55); }
.rbd { width: min(640px, calc(100vw - 32px)); max-height: min(720px, calc(100vh - 48px)); display: flex; flex-direction: column; border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.5); border: 1px solid color-mix(in srgb, currentColor 18%, transparent); font-size: 0.875rem; overflow: hidden; }
.rbd header { padding: 0.9rem 1rem 0.6rem; display: flex; align-items: center; gap: 0.5rem; }
.rbd header h2 { font-size: 1rem; margin: 0; flex: 1; }
.rbd .rbd-x { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; opacity: 0.7; padding: 0.2rem 0.4rem; }
.rbd .rbd-x:hover { opacity: 1; }
.rbd .rbd-controls { padding: 0 1rem 0.6rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
.rbd select, .rbd input[type=text] { font: inherit; color: inherit; background: color-mix(in srgb, currentColor 6%, transparent); border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 4px; padding: 0.35rem 0.5rem; }
.rbd select { flex: 1 1 200px; }
.rbd select option { color: initial; }
.rbd input[type=text] { flex: 1 1 160px; }
.rbd .rbd-bar { padding: 0.45rem 1rem; display: flex; align-items: center; gap: 0.6rem; border-top: 1px solid color-mix(in srgb, currentColor 14%, transparent); border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent); }
.rbd .rbd-bar label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; flex: 1; user-select: none; }
.rbd .rbd-count { opacity: 0.7; }
.rbd ul { list-style: none; margin: 0; padding: 0.25rem 0; overflow: auto; flex: 1; min-height: 120px; }
.rbd li label { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 1rem; cursor: pointer; user-select: none; }
.rbd li label:hover { background: color-mix(in srgb, currentColor 7%, transparent); }
.rbd li.sel label { background: color-mix(in srgb, #e5484d 14%, transparent); }
.rbd li .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rbd li .tag { font-size: 0.72rem; opacity: 0.6; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); border-radius: 3px; padding: 0 0.3rem; }
.rbd .rbd-empty { padding: 1.5rem 1rem; opacity: 0.6; text-align: center; }
.rbd footer { padding: 0.75rem 1rem; display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid color-mix(in srgb, currentColor 14%, transparent); }
.rbd button.btn { font: inherit; color: inherit; cursor: pointer; padding: 0.4rem 0.9rem; border-radius: 4px; border: 1px solid color-mix(in srgb, currentColor 25%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); }
.rbd button.btn:hover:not(:disabled) { background: color-mix(in srgb, currentColor 14%, transparent); }
.rbd button.danger { background: #c62f35; border-color: #c62f35; color: #fff; }
.rbd button.danger:hover:not(:disabled) { background: #e5484d; }
.rbd button.danger.confirm { background: #8f1d22; border-color: #ff8a8e; }
.rbd button:disabled { opacity: 0.45; cursor: not-allowed; }
.rbd input[type=checkbox] { accent-color: #e5484d; width: 15px; height: 15px; margin: 0; cursor: pointer; }
`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function themeColors(): { bg: string; fg: string } {
  const isOpaque = (c: string) => c && c !== "transparent" && !/rgba\(.*,\s*0\)$/.test(c);
  const candidates = [document.querySelector("#app"), document.body, document.documentElement];
  let bg = "#24262b";
  let fg = "#e6e6e6";
  for (const el of candidates) {
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (isOpaque(cs.backgroundColor)) {
      bg = cs.backgroundColor;
      fg = cs.color || fg;
      break;
    }
  }
  return { bg, fg };
}

let openInstance: (() => void) | undefined;

export function openBulkDeleteModal(sdk: Caido): void {
  if (openInstance) return; // already open

  const selected = new Set<ID>();
  let collectionId: ID | undefined =
    sdk.replay.getCurrentSession()?.collectionId ?? sdk.replay.getCollections()[0]?.id;
  let filter = "";
  let lastClickedIndex: number | undefined;
  let confirmTimer: number | undefined;
  let busy = false;

  const overlay = document.createElement("div");
  overlay.className = "rbd-overlay";
  const { bg, fg } = themeColors();
  overlay.innerHTML = `
    <style>${STYLE}</style>
    <div class="rbd" role="dialog" aria-modal="true" aria-label="Bulk delete Replay sessions" style="background:${bg};color:${fg}">
      <header>
        <h2>Bulk delete Replay sessions</h2>
        <button class="rbd-x" data-act="close" title="Close (Esc)">&times;</button>
      </header>
      <div class="rbd-controls">
        <select data-el="collection" aria-label="Collection"></select>
        <input type="text" data-el="filter" placeholder="Filter sessions…" aria-label="Filter sessions">
      </div>
      <div class="rbd-bar">
        <label><input type="checkbox" data-el="all"> <span>Select all</span></label>
        <span class="rbd-count" data-el="count"></span>
      </div>
      <ul data-el="list"></ul>
      <footer>
        <button class="btn" data-act="close">Cancel</button>
        <button class="btn danger" data-act="delete" disabled>Delete Selected</button>
      </footer>
    </div>
  `;

  const $ = <T extends Element>(sel: string) => overlay.querySelector(sel) as T;
  const collectionSel = $<HTMLSelectElement>('[data-el="collection"]');
  const filterInput = $<HTMLInputElement>('[data-el="filter"]');
  const allBox = $<HTMLInputElement>('[data-el="all"]');
  const countEl = $<HTMLSpanElement>('[data-el="count"]');
  const listEl = $<HTMLUListElement>('[data-el="list"]');
  const deleteBtn = $<HTMLButtonElement>('[data-act="delete"]');

  const openTabIds = () => new Set(sdk.replay.getTabs().map((t) => t.sessionId));

  /** Sessions of the active collection, in tree order, after the text filter. */
  const visibleSessions = () => {
    if (!collectionId) return [];
    const collection = sdk.replay.getCollections().find((c) => c.id === collectionId);
    const byId = new Map(sdk.replay.getSessions({ collectionId }).map((s) => [s.id, s]));
    const ordered = collection
      ? collection.sessionIds.map((id) => byId.get(id)).filter((s) => s !== undefined)
      : [...byId.values()];
    const q = filter.trim().toLowerCase();
    return q ? ordered.filter((s) => s.name.toLowerCase().includes(q)) : ordered;
  };

  const resetConfirm = () => {
    window.clearTimeout(confirmTimer);
    confirmTimer = undefined;
    deleteBtn.classList.remove("confirm");
  };

  const renderCollections = () => {
    const collections = sdk.replay.getCollections();
    if (!collections.some((c) => c.id === collectionId)) collectionId = collections[0]?.id;
    collectionSel.innerHTML = collections
      .map(
        (c) =>
          `<option value="${escapeHtml(c.id)}"${c.id === collectionId ? " selected" : ""}>${escapeHtml(c.name)} (${c.sessionIds.length})</option>`,
      )
      .join("");
    collectionSel.disabled = collections.length === 0;
  };

  const renderList = () => {
    const sessions = visibleSessions();
    const tabs = openTabIds();
    // Drop selections that no longer exist in this collection.
    const valid = new Set(sdk.replay.getSessions({ collectionId }).map((s) => s.id));
    for (const id of selected) if (!valid.has(id)) selected.delete(id);

    if (sessions.length === 0) {
      listEl.innerHTML = `<div class="rbd-empty">${collectionId ? (filter ? "No sessions match the filter." : "This collection has no sessions.") : "No collections."}</div>`;
    } else {
      listEl.innerHTML = sessions
        .map((s, i) => {
          const on = selected.has(s.id);
          return `<li class="${on ? "sel" : ""}" data-id="${escapeHtml(s.id)}" data-index="${i}">
            <label><input type="checkbox"${on ? " checked" : ""}>
            <span class="name" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>
            ${tabs.has(s.id) ? '<span class="tag">open tab</span>' : ""}</label></li>`;
        })
        .join("");
    }
    renderSummary(sessions.map((s) => s.id));
  };

  const renderSummary = (visibleIds = visibleSessions().map((s) => s.id)) => {
    const visibleSelected = visibleIds.filter((id) => selected.has(id)).length;
    allBox.checked = visibleIds.length > 0 && visibleSelected === visibleIds.length;
    allBox.indeterminate = visibleSelected > 0 && visibleSelected < visibleIds.length;
    allBox.disabled = visibleIds.length === 0;
    countEl.textContent = `${selected.size} selected`;
    deleteBtn.disabled = selected.size === 0 || busy;
    if (!deleteBtn.classList.contains("confirm")) {
      deleteBtn.textContent = selected.size ? `Delete Selected (${selected.size})` : "Delete Selected";
    }
  };

  const setRowState = (li: HTMLLIElement, on: boolean) => {
    const id = li.dataset.id!;
    if (on) selected.add(id);
    else selected.delete(id);
    li.classList.toggle("sel", on);
    (li.querySelector("input") as HTMLInputElement).checked = on;
  };

  const doDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    busy = true;
    deleteBtn.disabled = true;
    deleteBtn.textContent = "Deleting…";
    try {
      const tabs = openTabIds();
      for (const id of ids) if (tabs.has(id)) sdk.replay.closeTab(id);
      const deleted = await sdk.replay.deleteSessions(ids);
      for (const id of deleted) selected.delete(id);
      const failed = ids.length - deleted.length;
      sdk.window.showToast(
        failed
          ? `Deleted ${deleted.length} session(s); ${failed} could not be deleted.`
          : `Deleted ${deleted.length} session(s).`,
        { variant: failed ? "warning" : "success", duration: 2500 },
      );
    } catch (err) {
      sdk.window.showToast(`Failed to delete sessions: ${err instanceof Error ? err.message : String(err)}`, {
        variant: "error",
      });
    } finally {
      busy = false;
      resetConfirm();
      // Let the Replay store catch up before re-reading it.
      window.setTimeout(() => {
        renderCollections();
        renderList();
      }, 150);
    }
  };

  const close = () => {
    endDrag();
    resetConfirm();
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    openInstance = undefined;
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };

  // ---- events ----
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelectorAll('[data-act="close"]').forEach((b) => b.addEventListener("click", close));

  collectionSel.addEventListener("change", () => {
    collectionId = collectionSel.value;
    selected.clear();
    lastClickedIndex = undefined;
    resetConfirm();
    renderList();
  });

  filterInput.addEventListener("input", () => {
    filter = filterInput.value;
    lastClickedIndex = undefined;
    renderList();
  });

  allBox.addEventListener("change", () => {
    const on = allBox.checked;
    listEl.querySelectorAll<HTMLLIElement>("li[data-id]").forEach((li) => setRowState(li, on));
    resetConfirm();
    renderSummary();
  });

  // ---- row selection ----
  // Click toggles a row, Shift+click selects a range, and pressing the mouse
  // on a row then dragging over others applies the same check/uncheck to them.
  const getRows = () => Array.from(listEl.querySelectorAll<HTMLLIElement>("li[data-id]"));

  type Drag = { on: boolean; anchor: number; before: Set<ID>; lastY: number; raf?: number };
  let drag: Drag | undefined;

  /** Apply the drag mode to anchor..index; rows outside go back to their pre-drag state. */
  const applyDrag = (index: number) => {
    if (!drag) return;
    const [a, b] = [Math.min(drag.anchor, index), Math.max(drag.anchor, index)];
    getRows().forEach((li, i) => {
      const on = i >= a && i <= b ? drag!.on : drag!.before.has(li.dataset.id!);
      if (selected.has(li.dataset.id!) !== on) setRowState(li, on);
    });
    renderSummary();
  };

  const rowAtPoint = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLLIElement>("li[data-id]") ?? null;

  // Auto-scroll the list while dragging near its top/bottom edge.
  const autoScroll = () => {
    if (!drag) return;
    const r = listEl.getBoundingClientRect();
    const edge = 28;
    let dy = 0;
    if (drag.lastY < r.top + edge) dy = -Math.ceil((r.top + edge - drag.lastY) / 3);
    else if (drag.lastY > r.bottom - edge) dy = Math.ceil((drag.lastY - (r.bottom - edge)) / 3);
    if (dy) {
      listEl.scrollTop += dy;
      const y = Math.min(Math.max(drag.lastY, r.top + 2), r.bottom - 2);
      const li = rowAtPoint(r.left + r.width / 2, y);
      if (li) applyDrag(Number(li.dataset.index));
    }
    drag.raf = requestAnimationFrame(autoScroll);
  };

  const endDrag = () => {
    if (!drag) return;
    if (drag.raf) cancelAnimationFrame(drag.raf);
    drag = undefined;
    document.removeEventListener("mousemove", onDragMove, true);
    document.removeEventListener("mouseup", endDrag, true);
  };

  const onDragMove = (e: MouseEvent) => {
    if (!drag) return;
    if ((e.buttons & 1) === 0) return endDrag(); // button released outside the window
    drag.lastY = e.clientY;
    const li = rowAtPoint(e.clientX, e.clientY);
    if (li && listEl.contains(li)) applyDrag(Number(li.dataset.index));
  };

  listEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const li = (e.target as HTMLElement).closest<HTMLLIElement>("li[data-id]");
    if (!li) return;
    e.preventDefault(); // no text selection / native checkbox toggle
    const index = Number(li.dataset.index);
    const on = !selected.has(li.dataset.id!);
    resetConfirm();

    if (e.shiftKey && lastClickedIndex !== undefined) {
      const rows = getRows();
      const [a, b] = [Math.min(lastClickedIndex, index), Math.max(lastClickedIndex, index)];
      for (let i = a; i <= b; i++) setRowState(rows[i]!, on);
      lastClickedIndex = index;
      renderSummary();
      return;
    }

    lastClickedIndex = index;
    drag = { on, anchor: index, before: new Set(selected), lastY: e.clientY };
    applyDrag(index);
    document.addEventListener("mousemove", onDragMove, true);
    document.addEventListener("mouseup", endDrag, true);
    drag.raf = requestAnimationFrame(autoScroll);
  });

  // State is handled on mousedown; stop the <label> from toggling the checkbox again.
  listEl.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("li[data-id]")) e.preventDefault();
  });

  // Two-step confirm so a stray click never deletes anything.
  deleteBtn.addEventListener("click", () => {
    if (selected.size === 0 || busy) return;
    if (!deleteBtn.classList.contains("confirm")) {
      deleteBtn.classList.add("confirm");
      deleteBtn.textContent = `Click again to delete ${selected.size}`;
      confirmTimer = window.setTimeout(() => {
        resetConfirm();
        renderSummary();
      }, 4000);
      return;
    }
    void doDelete();
  });

  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  openInstance = close;

  renderCollections();
  renderList();
  filterInput.focus();
}
