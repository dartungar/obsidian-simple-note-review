import SimpleNoteReviewPlugin from "main";
import { App, PluginSettingTab, Setting, setIcon, debounce } from "obsidian";
import { JoinLogicOperators } from "src/settings/joinLogicOperators";
import { NoteSetDeleteModal } from "src/UI/noteset/noteSetDeleteModal";
import { NoteSetInfoModal } from "src/UI/noteset/noteSetInfoModal";
import { ReviewAlgorithm } from "../settings/reviewAlgorightms";
import { NoteSetEditModal } from "./noteset/noteSetEditModal";

export class SimpleNoteReviewPluginSettingsTab extends PluginSettingTab {
	constructor(private _plugin: SimpleNoteReviewPlugin, app: App) {
		super(app, _plugin);
	}

	refresh(): void {
		this.display();
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Simple Note Review Settings" });

		// General settings

		new Setting(containerEl)
			.setName("Open next note in the note set after reviewing a note")
			.setDesc(
				"After marking note as reviewed, automatically open next note in the note set."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this._plugin.settings.openNextNoteAfterReviewing)
					.onChange((value) => {
						this._plugin.settings.openNextNoteAfterReviewing =
							value;
						this._plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Use review frequency")
			.setDesc(
				"Set review frequency level (high, normal, low, ignore) for each note. Notes with higher review frequency will be presented for review more often. Default is 'normal'."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this._plugin.settings.useReviewFrequency)
					.onChange((value) => {
						this._plugin.settings.useReviewFrequency = value;
						this._plugin.saveSettings();
					});
			});

			new Setting(containerEl)
			.setName("Start with unreviewed notes")
			.setDesc(
				"Start review with notes that have no review date. If turned off, notes without the review date will have lower priority than notes with early review dates."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this._plugin.settings.unreviewedNotesFirst)
					.onChange((value) => {
						this._plugin.settings.unreviewedNotesFirst = value;
						this._plugin.saveSettings();
					});
			});

		// NoteSet settings

		containerEl.createEl("h3", { text: "Note Sets" });

		this._plugin.settings &&
			this._plugin.settings.noteSets &&
			this._plugin.settings.noteSets.forEach((noteSet) => {
				this._plugin.service.updateNoteSetDisplayNameAndDescription(
					noteSet
				);
				this._plugin.service.updateNoteSetStats(noteSet);

				// Header
				const setting = new Setting(containerEl);

				setting.setName(`Note Set "${noteSet.displayName}"`);

				const updateHeader = (text: string): void => {
					setting.setName(`Note Set "${text}"`);
				};

				updateHeader(noteSet.displayName);

				setting.addExtraButton((cb) => {
					cb.setIcon("info")
						.setTooltip("Note set info & stats")
						.onClick(() => {
							new NoteSetInfoModal(
								this.app,
								noteSet,
								this._plugin.service
							).open();
						});
				});

				setting.addExtraButton((cb) => {
					cb.setIcon("edit")
						.setTooltip("Edit Note set")
						.onClick(() => {
							var modal = new NoteSetEditModal(noteSet, this._plugin);
							modal.open();
							modal.onClose = () => {
								this.refresh();
							};
						});
				});

				setting.addExtraButton((cb) => {
					cb.setIcon("trash")
						.setTooltip("Delete note set")
						.onClick(async () => {
							new NoteSetDeleteModal(
								this.app,
								this,
								noteSet,
								this._plugin.service
							).open();
						});
				});
			});

		new Setting(containerEl).addButton((btn) => {
			btn.setButtonText("Add Note Set");
			btn.onClick(async () => {
				await this._plugin.service.addEmptyNoteSet();
				this.refresh();
			});
		});
	}
}
