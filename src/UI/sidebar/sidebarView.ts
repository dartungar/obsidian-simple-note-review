import SimpleNoteReviewPlugin from "main";
import {
	ItemView,
	Setting,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import { INoteSet } from "src/noteSet/INoteSet";
import { NoteSetInfoModal } from "../noteset/noteSetInfoModal";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { NoteSetEmptyError } from "src/noteSet/noteSetService";
import { NoteSetResetModal } from "../noteset/noteSetResetModal";

export class SimpleNoteReviewSidebarView extends ItemView {
	static readonly VIEW_TYPE = "simple-note-review-sidebar-view";
	static readonly DISPLAY_TEXT = "Simple Note Review";
	static readonly SNR_ICON_NAME = "glasses";

	constructor(leaf: WorkspaceLeaf, private _plugin: SimpleNoteReviewPlugin) {
		super(leaf);
	}

	async onOpen() {
		await this.renderView();
	}

	async onClose() {
		// Nothing to clean up.
	}

	async renderView(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.toggleClass(
			"simple-note-review-sidebar-compact",
			this._plugin.settings.sidebarCompactMode
		);

		this.createGeneralActionsEl(this.contentEl);

		await this.createCurrentFileActionsEl(this.contentEl);

		this.contentEl.createEl("h4", { text: "Note Sets" });

		this._plugin.settings.noteSets.forEach((noteSet) => {
			this.createNotesetSection(noteSet);
		});
	}

	private createGeneralActionsEl(parentEl: HTMLElement): HTMLElement {
		const actionsEl = new Setting(parentEl);

		actionsEl.setDesc("general actions:");

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("refresh-cw")
				.setTooltip("refresh sidebar")
				.onClick(async () => {
					await this.onOpen();
				});
		});

		if (this._plugin.settings.sidebarShowSettingsButton) {
			actionsEl.addExtraButton((cb) => {
				cb.setIcon("settings")
					.setTooltip("open plugin settings")
					.onClick(() => {
						this._plugin.openSettings();
					});
			});
		}

		if (this._plugin.settings.sidebarShowOpenBottomBarButton) {
			actionsEl.addExtraButton((cb) => {
				cb.setIcon("panel-bottom")
					.setTooltip("open note review bottom bar")
					.onClick(() => {
						this._plugin.bottomBar.open();
					});
			});
		}

		return actionsEl.settingEl;
	}

	private async createCurrentFileActionsEl(parentEl: HTMLElement): Promise<HTMLElement> {
		const actionsEl = new Setting(parentEl);

		actionsEl.setDesc(await this.getCurrentFileActionsDescription());

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("ban")
				.setTooltip("ignore this note in all reviews")
				.onClick(() => {
					this.runAsync(async () => {
						await this._plugin.fileService.setReviewFrequency(
							this.app.workspace.getActiveFile(),
							ReviewFrequency.ignore
						);
						await this._plugin.bottomBar.render();
						await this.renderView();
					});
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal-low")
				.setTooltip("set review frequency to low")
				.onClick(() => {
					this.runAsync(async () => {
						await this._plugin.fileService.setReviewFrequency(
							this.app.workspace.getActiveFile(),
							ReviewFrequency.low
						);
						await this._plugin.bottomBar.render();
						await this.renderView();
					});
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal-medium")
				.setTooltip("set review frequency to normal")
				.onClick(() => {
					this.runAsync(async () => {
						await this._plugin.fileService.setReviewFrequency(
							this.app.workspace.getActiveFile(),
							ReviewFrequency.normal
						);
						await this._plugin.bottomBar.render();
						await this.renderView();
					});
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal")
				.setTooltip("set review frequency to high")
				.onClick(() => {
					this.runAsync(async () => {
						await this._plugin.fileService.setReviewFrequency(
							this.app.workspace.getActiveFile(),
							ReviewFrequency.high
						);
						await this._plugin.bottomBar.render();
						await this.renderView();
					});
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("skip-forward")
				.setTooltip("skip note for current review")
				.onClick(() => {
					this.runAsync(async () => {
						await this._plugin.reviewService.skipNote(
							this.app.workspace.getActiveFile(),
							this._plugin.settings.currentNoteSetId
						);
						await this._plugin.bottomBar.render();
						await this.renderView();
					});
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("file-check")
				.setTooltip(
					"mark current note as reviewed & go to the next file"
				)
				.onClick(() => {
					this.runAsync(async () => {
						await this._plugin.reviewService.reviewNote(
							this.app.workspace.getActiveFile(),
							this._plugin.settings.currentNoteSetId
						);
						await this._plugin.bottomBar.render();
						await this.renderView();
					});
				});
		});

		return actionsEl.settingEl;
	}

	private createNotesetSection(noteSet: INoteSet): HTMLElement {
		const section = new Setting(this.contentEl);

		const trimmedName =
			noteSet.displayName.length > 20
				? noteSet.displayName.substring(0, 20) + "..."
				: noteSet.displayName;
		section.setName(trimmedName);

		const descriptionParts: string[] = [];

		if (this._plugin.settings.sidebarShowNoteCount) {
			descriptionParts.push(this._plugin.noteSetService.getQueueProgressText(noteSet));
		}

		if (
			this._plugin.settings.currentNoteSetId &&
			this._plugin.settings.currentNoteSetId === noteSet.id
		) {
			descriptionParts.unshift("current note set");
		}

		const staleReasons = this._plugin.noteSetService.getQueueStaleReasons(noteSet);
		if (staleReasons.length > 0) {
			descriptionParts.push("queue may be stale");
		}
		section.setDesc(descriptionParts.join(" | "));

		if (noteSet?.validationErrors?.length > 0) {
			section.addExtraButton((cb) => {
				cb.setIcon("alert-triangle")
				.setTooltip(noteSet?.validationErrors.join(";\n"));
			});
		}

		if (staleReasons.length > 0) {
			section.addExtraButton((cb) => {
				cb.setIcon("history")
					.setTooltip(`Queue may be stale:\n${staleReasons.join(";\n")}`);
			});
		}

		section.addExtraButton((cb) => {
			cb.setIcon("info")
				.setTooltip("view note set info & stats")
				.onClick(() => {
					new NoteSetInfoModal(
						this.app,
						noteSet,
						this._plugin.noteSetService
					).open();
				});
		});

		if (this._plugin.settings.sidebarShowRandomButton) {
			section.addExtraButton((cb) => {
				cb.setIcon("dices")
					.setTooltip("open random note from this note set")
					.onClick(() => {
						this.runAsync(() =>
							this.startReviewWithDelegate(
								noteSet.id,
								(noteSetId) => this._plugin.reviewService.openRandomNoteInQueue(noteSetId)
							)
						);
					});
			});
		}

		section.addExtraButton((cb) => {
			cb.setIcon("rotate-cw")
				.setTooltip("reset review queue for this note set")
				.onClick(() => {
					new NoteSetResetModal(this.app, noteSet, () => {
						this.runAsync(async () => {
							await this._plugin.noteSetService.validateRulesAndSave(noteSet);
							await this._plugin.reviewService.resetNotesetQueueWithValidation(noteSet.id);
							await this._plugin.bottomBar.render();
							await this.renderView();
						});
					}).open();
				});
		});

		section.addExtraButton((cb) => {
			cb.setIcon("play")
				.setTooltip("review this note set")
				.onClick(() => {
					this.runAsync(() =>
						this.startReviewWithDelegate(
							noteSet.id,
							(noteSetId) => this._plugin.startReview(noteSetId)
						)
					);
				});
		});

		return section.settingEl;
	}

	private async getCurrentFileActionsDescription(): Promise<string> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!(activeFile instanceof TFile)) {
			return "current file actions: no active note";
		}

		if (!this._plugin.settings.sidebarShowCurrentNoteInfo) {
			return "current file actions";
		}

		const queueText = this.getActiveFileQueueText(activeFile);
		try {
			const reviewedValue = await this._plugin.fileService.getReviewedValue(activeFile);
			const reviewFrequency = await this._plugin.fileService.getReviewFrequency(activeFile);
			return `current file: reviewed ${this.getMetadataDisplayValue(reviewedValue)} | frequency ${reviewFrequency ?? ReviewFrequency.normal} | ${queueText}`;
		} catch (_error) {
			return `current file: ${queueText}`;
		}
	}

	private getActiveFileQueueText(activeFile: TFile): string {
		const currentNoteSet = this.getCurrentNoteSetOrNull();
		if (!currentNoteSet) {
			return "no current note set";
		}

		return currentNoteSet.queue?.filenames?.includes(activeFile.path)
			? "in current queue"
			: "not in current queue";
	}

	private getCurrentNoteSetOrNull(): INoteSet | null {
		try {
			return this._plugin.noteSetService.getNoteSet(this._plugin.settings.currentNoteSetId);
		} catch (_error) {
			return null;
		}
	}

	private getMetadataDisplayValue(value: unknown): string {
		if (value === null || value === undefined || value === "") {
			return "never";
		}

		if (value instanceof Date) {
			return value.toISOString().slice(0, 10);
		}

		if (this.hasToISODate(value)) {
			return value.toISODate();
		}

		return String(value);
	}

	private hasToISODate(value: unknown): value is { toISODate(): string } {
		return (
			typeof value === "object" &&
			value !== null &&
			"toISODate" in value &&
			typeof (value as { toISODate?: unknown }).toISODate === "function"
		);
	}

	getViewType(): string {
		return SimpleNoteReviewSidebarView.VIEW_TYPE;
	}

	getDisplayText(): string {
		return SimpleNoteReviewSidebarView.DISPLAY_TEXT;
	}

	getIcon(): string {
		return SimpleNoteReviewSidebarView.SNR_ICON_NAME;
	}

	private async startReviewWithDelegate(
		noteSetId: string,
		delegate: (noteSetId: string) => Promise<void>
	) {
		const noteSet = this._plugin.noteSetService.getNoteSet(noteSetId);
		const shouldAnnounceCurrentNoteSetChange =
			this._plugin.settings.currentNoteSetId !== noteSet.id;
		try {
			await delegate(noteSetId);
		} catch (error) {
			const noteSet = this._plugin.noteSetService.getNoteSet(noteSetId);
			if (error instanceof NoteSetEmptyError) {
				this._plugin.showNotice(`note set ${noteSet.displayName ?? noteSet.name} is empty.`)
				return;
			} 
			throw error;
		}
		
		if (this._plugin.settings.currentNoteSetId !== noteSet.id) {
			this._plugin.settings.currentNoteSetId = noteSet.id;
			await this._plugin.saveSettings();
		}

		if (shouldAnnounceCurrentNoteSetChange) {
			this._plugin.showNotice(`Set current note set to ${noteSet.displayName}.`);
		}
		await this._plugin.bottomBar.render();
		await this._plugin.activateView();
	}

	private runAsync(action: () => Promise<void>): void {
		void action().catch((error) => {
			this._plugin.showNotice(this.getErrorMessage(error));
			console.error(error);
		});
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
