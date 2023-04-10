import SimpleNoteReviewPlugin from "main";
import {
	ItemView,
	Setting,
	TAbstractFile,
	WorkspaceLeaf,
	setIcon,
} from "obsidian";
import { INoteSet } from "src/noteSet/INoteSet";
import { NoteSetInfoModal } from "../noteSetInfoModal";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";

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

		this.createCurrentFileActionsEl(this.contentEl);

		this.contentEl.createEl("h4", { text: "Note Sets" });

		this._plugin.settings.noteSets.forEach((noteSet) => {
			this.createNotesetSection(noteSet);
		});
	}

	private createCurrentFileActionsEl(parentEl: HTMLElement): HTMLElement {
		var actionsEl = new Setting(parentEl);

		actionsEl.setDesc("current file actions:");

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("slash")
				.setTooltip("exclude file from review")
				.onClick(() => {
					this._plugin.service.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.ignore
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal-low")
				.setTooltip("set review frequency to low")
				.onClick(() => {
					this._plugin.service.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.low
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal-medium")
				.setTooltip("set review frequency to normal")
				.onClick(() => {
					this._plugin.service.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.normal
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal")
				.setTooltip("set review frequency to high")
				.onClick(() => {
					this._plugin.service.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.high
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("file-check")
				.setTooltip("mark note as reviewed & go to the next file")
				.onClick(() => {
					this._plugin.service.reviewNote(
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

		section.addExtraButton((cb) => {
			cb.setIcon("info")
				.setTooltip("view note set info & stats")
				.onClick(() => {
					new NoteSetInfoModal(
						this.app,
						noteSet,
						this._plugin.service
					).open();
				});
		});

		section.addExtraButton((cb) => {
			cb.setIcon("play")
				.setTooltip("start reviewing this note set")
				.onClick(async () => {
					this._plugin.settings.currentNoteSet = noteSet;
					await this._plugin.saveSettings();
					this._plugin.showNotice(
						`Set current note set to ${noteSet.displayName}.`
					);
				});
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
}
