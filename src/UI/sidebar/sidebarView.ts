import SimpleNoteReviewPlugin from "main";
import {
	ItemView,
	Setting,
	TAbstractFile,
	WorkspaceLeaf,
	setIcon,
} from "obsidian";
import { INoteSet } from "src/noteSet/INoteSet";
import { NoteSetInfoModal } from "../noteset/noteSetInfoModal";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { NoteSetEditModal } from "../noteset/noteSetEditModal";

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

	async renderView(): Promise<any> {
		this.contentEl.empty();

		this.createGeneralActionsEl(this.contentEl);

		this.createCurrentFileActionsEl(this.contentEl);

		this.contentEl.createEl("h4", { text: "Note Sets" });

		this._plugin.settings.noteSets.forEach((noteSet) => {
			this.createNotesetSection(noteSet);
		});
	}

	private createGeneralActionsEl(parentEl: HTMLElement): HTMLElement {
		var actionsEl = new Setting(parentEl);

		actionsEl.setDesc("general actions:");

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("refresh-cw")
				.setTooltip("refresh sidebar")
				.onClick(async () => {
					await this.renderView();
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("settings")
				.setTooltip("open plugin settings")
				.onClick(() => {
					(this.app as any).setting.open();
					(this.app as any).setting.openTabById("simple-note-review");
				});
		});

		return actionsEl.settingEl;
	}

	private createCurrentFileActionsEl(parentEl: HTMLElement): HTMLElement {
		var actionsEl = new Setting(parentEl);

		actionsEl.setDesc("current file actions:");

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("ban")
				.setTooltip("ignore this note in all reviews")
				.onClick(() => {
					this._plugin.fileService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.ignore
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal-low")
				.setTooltip("set review frequency to low")
				.onClick(() => {
					this._plugin.fileService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.low
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal-medium")
				.setTooltip("set review frequency to normal")
				.onClick(() => {
					this._plugin.fileService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.normal
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal")
				.setTooltip("set review frequency to high")
				.onClick(() => {
					this._plugin.fileService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.high
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("skip-forward")
				.setTooltip("skip note for current review")
				.onClick(() => {
					this._plugin.reviewService.skipNote(
						this.app.workspace.getActiveFile(),
						this._plugin.settings.currentNoteSet
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("file-check")
				.setTooltip(
					"mark current note as reviewed & go to the next file"
				)
				.onClick(() => {
					this._plugin.reviewService.reviewNote(
						this.app.workspace.getActiveFile(),
						this._plugin.settings.currentNoteSet
					);
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

		if (
			this._plugin.settings.currentNoteSet &&
			this._plugin.settings.currentNoteSet.id === noteSet.id
		) {
			section.setDesc("current note set");
		} else {
			section.setDesc("");
		}

		if (!noteSet?.stats?.totalCount || noteSet.stats.totalCount === 0) {
			section.addExtraButton((cb) => {
				cb.setIcon("alert-triangle").setTooltip(
					"this note set appears to be empty. you may want to adjust settings or refresh sidebar via button at the top of it."
				);
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

		section.addExtraButton((cb) => {
			cb.setIcon("dices")
				.setTooltip("open random note from this note set")
				.onClick(async () =>
					this.startReviewWithDelegate(
						noteSet,
						this._plugin.reviewService.openRandomNoteInQueue
					)
				);
		});

		// TODO: confirmation window
		section.addExtraButton((cb) => {
			cb.setIcon("rotate-cw")
				.setTooltip("reset review queue for this note set")
				.onClick(async () =>
					this._plugin.reviewService.resetNotesetQueue(noteSet)
				);
		});

		section.addExtraButton((cb) => {
			cb.setIcon("play")
				.setTooltip("review this note set")
				.onClick(async () =>
					this.startReviewWithDelegate(
						noteSet,
						this._plugin.reviewService.startReview
					)
				);
		});

		return section.settingEl;
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
		noteSet: INoteSet,
		delegate: (noteset: INoteSet) => void
	) {
		if (this._plugin.settings.currentNoteSet !== noteSet) {
			this._plugin.settings.currentNoteSet = noteSet;
			await this._plugin.saveSettings();
			this._plugin.showNotice(
				`Set current note set to ${noteSet.displayName}.`
			);
		}
		delegate.bind(this._plugin.reviewService)(noteSet);
		//delegate(noteSet);
		this._plugin.activateView();
	}
}
