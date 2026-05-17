import { App, setIcon } from "obsidian";
import type { IconName } from "obsidian";
import type SimpleNoteReviewPlugin from "main";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { INoteSet } from "src/noteSet/INoteSet";
import { NoteSetInfoModal } from "src/UI/noteset/noteSetInfoModal";

export class NoteReviewBottomBar {
	private rootEl: HTMLElement | null = null;
	private closingEl: HTMLElement | null = null;
	private closeTimer: number | null = null;

	constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {}

	public open(): void {
		if (this.closeTimer !== null) {
			window.clearTimeout(this.closeTimer);
			this.closeTimer = null;
		}
		this.closingEl?.remove();
		this.closingEl = null;

		if (!this.rootEl) {
			this.rootEl = document.body.createDiv({
				cls: ["simple-note-review-bottom-bar", "is-opening"],
			});
			window.requestAnimationFrame(() => {
				this.rootEl?.removeClass("is-opening");
			});
		}

		void this.render();
	}

	public close(): void {
		if (!this.rootEl) {
			return;
		}

		const rootEl = this.rootEl;
		this.rootEl = null;
		this.closingEl = rootEl;
		rootEl.addClass("is-closing");
		this.closeTimer = window.setTimeout(() => {
			rootEl.remove();
			if (this.closingEl === rootEl) {
				this.closingEl = null;
			}
			this.closeTimer = null;
		}, 180);
	}

	public isOpen(): boolean {
		return this.rootEl !== null;
	}

	public async render(): Promise<void> {
		if (!this.rootEl) {
			return;
		}

		this.rootEl.empty();

		const statusEl = this.rootEl.createDiv({
			cls: "simple-note-review-bottom-bar-status",
		});

		const currentNoteSet = this.getCurrentNoteSetOrNull();
		this.createNoteSetSelect(statusEl, currentNoteSet);

		if (currentNoteSet && this._plugin.settings.bottomBarShowNoteCount) {
			statusEl.createSpan({
				text: this._plugin.noteSetService.getQueueProgressText(currentNoteSet),
				cls: "simple-note-review-bottom-bar-progress",
			});
		}

		const actionsEl = this.rootEl.createDiv({
			cls: "simple-note-review-bottom-bar-actions",
		});

		this.createIconButton(actionsEl, "info", "view note set info & stats", () => {
			this.openCurrentNoteSetInfo();
		});
		this.createDivider(actionsEl);

		this.createIconButton(actionsEl, "play", "continue review", async () => {
			await this.continueReview();
		});
		if (this._plugin.settings.bottomBarShowRandomButton) {
			this.createIconButton(actionsEl, "dices", "open random note", async () => {
				const noteSet = this.requireCurrentNoteSet();
				if (!noteSet) {
					return;
				}
				await this._plugin.reviewService.openRandomNoteInQueue(noteSet.id);
			});
		}
		this.createIconButton(actionsEl, "skip-forward", "skip note", async () => {
			const noteSet = this.requireCurrentNoteSet();
			if (!noteSet) {
				return;
			}
			await this._plugin.reviewService.skipNote(
				this._app.workspace.getActiveFile(),
				noteSet.id
			);
		});
		this.createIconButton(actionsEl, "file-check", "mark note as reviewed", async () => {
			const noteSet = this.requireCurrentNoteSet();
			if (!noteSet) {
				return;
			}
			await this._plugin.reviewService.reviewNote(
				this._app.workspace.getActiveFile(),
				noteSet.id
			);
		});

		this.createDivider(actionsEl);

		this.createIconButton(actionsEl, "signal-low", "set review frequency to low", async () => {
			await this._plugin.fileService.setReviewFrequency(
				this._app.workspace.getActiveFile(),
				ReviewFrequency.low
			);
		});
		this.createIconButton(actionsEl, "signal-medium", "set review frequency to normal", async () => {
			await this._plugin.fileService.setReviewFrequency(
				this._app.workspace.getActiveFile(),
				ReviewFrequency.normal
			);
		});
		this.createIconButton(actionsEl, "signal", "set review frequency to high", async () => {
			await this._plugin.fileService.setReviewFrequency(
				this._app.workspace.getActiveFile(),
				ReviewFrequency.high
			);
		});
		this.createIconButton(actionsEl, "ban", "ignore this note in all reviews", async () => {
			await this._plugin.fileService.setReviewFrequency(
				this._app.workspace.getActiveFile(),
				ReviewFrequency.ignore
			);
		});

		this.createDivider(actionsEl);

		if (this._plugin.settings.bottomBarShowOpenSidebarButton) {
			this.createIconButton(actionsEl, "panel-right", "open sidebar", async () => {
				await this._plugin.activateView();
			});
		}
		if (this._plugin.settings.bottomBarShowSettingsButton) {
			this.createIconButton(actionsEl, "settings", "open plugin settings", () => {
				this._plugin.openSettings();
			});
		}
		this.createIconButton(actionsEl, "x", "close bottom bar", () => {
			this.close();
		});
	}

	private createNoteSetSelect(
		parentEl: HTMLElement,
		currentNoteSet: INoteSet | null
	): HTMLSelectElement {
		const selectEl = parentEl.createEl("select", {
			cls: "simple-note-review-bottom-bar-select",
		});
		selectEl.setAttribute("aria-label", "select note set");
		selectEl.setAttribute("title", "select note set");

		const noteSets = this._plugin.settings.noteSets;
		if (noteSets.length === 0) {
			const optionEl = selectEl.createEl("option");
			optionEl.value = "";
			optionEl.text = "No note sets";
			selectEl.disabled = true;
			return selectEl;
		}

		const currentNoteSetIndex = currentNoteSet
			? noteSets.findIndex((noteSet) => noteSet.id === currentNoteSet.id)
			: -1;

		if (currentNoteSetIndex === -1) {
			const optionEl = selectEl.createEl("option");
			optionEl.value = "";
			optionEl.text = "Select note set";
		}

		noteSets.forEach((noteSet, index) => {
			const optionEl = selectEl.createEl("option");
			optionEl.value = String(index);
			optionEl.text = noteSet.displayName;
		});

		selectEl.value = currentNoteSetIndex >= 0 ? String(currentNoteSetIndex) : "";
		const onNoteSetSelected = () => this.selectNoteSetByIndex(selectEl.value);
		selectEl.addEventListener("input", onNoteSetSelected);
		selectEl.addEventListener("change", onNoteSetSelected);
		selectEl.addEventListener("click", (event) => event.stopPropagation());
		selectEl.addEventListener("mousedown", (event) => event.stopPropagation());

		return selectEl;
	}

	private selectNoteSetByIndex(noteSetIndexValue: string): void {
		if (noteSetIndexValue === "") {
			return;
		}

		const noteSetIndex = Number(noteSetIndexValue);
		const selectedNoteSet = Number.isInteger(noteSetIndex)
			? this._plugin.settings.noteSets[noteSetIndex]
			: null;
		if (!selectedNoteSet) {
			this._plugin.showNotice("Could not select note set.");
			return;
		}
		if (this._plugin.settings.currentNoteSetId === selectedNoteSet.id) {
			return;
		}

		this.runAsync(async () => {
			this._plugin.settings.currentNoteSetId = selectedNoteSet.id;
			await this._plugin.saveSettings();
			this._plugin.showNotice(`Set current note set to ${selectedNoteSet.displayName}.`);
			await this._plugin.refreshSidebarViews();
			await this.render();
		});
	}

	private createIconButton(
		parentEl: HTMLElement,
		icon: IconName,
		tooltip: string,
		onClick: () => Promise<void> | void
	): HTMLButtonElement {
		const buttonEl = parentEl.createEl("button", {
			cls: "simple-note-review-bottom-bar-button",
		});
		buttonEl.type = "button";
		buttonEl.setAttribute("aria-label", tooltip);
		buttonEl.setAttribute("title", tooltip);
		setIcon(buttonEl, icon);
		buttonEl.onClickEvent((event) => {
			event.preventDefault();
			event.stopPropagation();
			this.runAsync(async () => {
				await onClick();
				await this._plugin.refreshSidebarViews();
				await this.render();
			});
		});

		return buttonEl;
	}

	private createDivider(parentEl: HTMLElement): void {
		parentEl.createDiv({
			cls: "simple-note-review-bottom-bar-divider",
		});
	}

	private getCurrentNoteSetOrNull(): INoteSet | null {
		try {
			return this._plugin.noteSetService.getNoteSet(this._plugin.settings.currentNoteSetId);
		} catch (_error) {
			return null;
		}
	}

	private requireCurrentNoteSet(): INoteSet | null {
		const noteSet = this.getCurrentNoteSetOrNull();
		if (!noteSet) {
			this._plugin.showNotice("Select a note set first.");
			return null;
		}

		return noteSet;
	}

	private async continueReview(): Promise<void> {
		const noteSet = this.requireCurrentNoteSet();
		if (!noteSet) {
			return;
		}

		await this._plugin.startReview(noteSet.id);
	}

	private openCurrentNoteSetInfo(): void {
		const noteSet = this.requireCurrentNoteSet();
		if (!noteSet) {
			return;
		}

		new NoteSetInfoModal(
			this._app,
			noteSet,
			this._plugin.noteSetService
		).open();
	}

	private runAsync(action: () => Promise<void>): void {
		void action().catch((error) => {
			this._plugin.showNotice(error instanceof Error ? error.message : String(error));
			console.error(error);
		});
	}
}
