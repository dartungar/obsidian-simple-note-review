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
				.setTooltip("open settings")
				.onClick( () => {
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
			cb.setIcon("slash")
				.setTooltip("exclude file from review")
				.onClick(() => {
					this._plugin.noteSetService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.ignore
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal-low")
				.setTooltip("set review frequency to low")
				.onClick(() => {
					this._plugin.noteSetService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.low
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal-medium")
				.setTooltip("set review frequency to normal")
				.onClick(() => {
					this._plugin.noteSetService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.normal
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("signal")
				.setTooltip("set review frequency to high")
				.onClick(() => {
					this._plugin.noteSetService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.high
					);
				});
		});

		actionsEl.addExtraButton((cb) => {
			cb.setIcon("file-check")
				.setTooltip("mark note as reviewed & go to the next file")
				.onClick(() => {
					this._plugin.noteSetService.reviewNote(
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

        this._plugin.noteSetService.updateNoteSetStats(noteSet);

        if (!noteSet?.stats?.totalCount || noteSet.stats.totalCount === 0) { 
            section.addExtraButton((cb) => {
                cb.setIcon("alert-triangle")
                    .setTooltip("this note set is empty. you may want to adjust settings.");
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
			cb.setIcon("edit")
				.setTooltip("edit note set")
				.onClick(() => {
					new NoteSetEditModal(noteSet, this._plugin).open();
				});
		});

        section.addExtraButton((cb) => {
			cb.setIcon("dices")
				.setTooltip("open random note from this note set")
				.onClick(async () => {
                    this._plugin.settings.currentNoteSet = noteSet;
					await this._plugin.saveSettings();
					this._plugin.showNotice(
						`Set current note set to ${noteSet.displayName}.`
					);
                    this._plugin.noteSetService.openRandomFile(this._plugin.settings.currentNoteSet);
                    this._plugin.activateView();
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
                    this._plugin.noteSetService.startReview(this._plugin.settings.currentNoteSet);
                    this._plugin.activateView();
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
