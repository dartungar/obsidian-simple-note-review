import SimpleNoteReviewPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { NoteSetDeleteModal } from "src/UI/noteset/noteSetDeleteModal";
import { NoteSetInfoModal } from "src/UI/noteset/noteSetInfoModal";
import { NoteSetEditModal } from "./noteset/noteSetEditModal";
import { ReviewAlgorithm } from "src/settings/reviewAlgorightms";
import { NoteSetResetModal } from "./noteset/noteSetResetModal";

export class SimpleNoteReviewPluginSettingsTab extends PluginSettingTab {
	constructor(private _plugin: SimpleNoteReviewPlugin, app: App) {
		super(app, _plugin);
	}

	refresh(): void {
		this.display();
	}

	display(): void  {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Simple Note Review Settings")
			.setHeading();

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
						void this._plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Review order")
			.setDesc(
				"Default orders notes by review date or review frequency. Random shuffles the queue when it is created or reset."
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption(ReviewAlgorithm.default, "Default")
					.addOption(ReviewAlgorithm.random, "Random")
					.setValue(this._plugin.settings.reviewAlgorithm)
					.onChange((value: ReviewAlgorithm) => {
						this._plugin.settings.reviewAlgorithm = value;
						void this._plugin.saveSettings();
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
						void this._plugin.saveSettings();
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
						void this._plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Metadata Fields")
			.setHeading();

		new Setting(containerEl)
			.setName("Reviewed field name")
			.setDesc("Frontmatter field updated when a note is marked as reviewed.")
			.addText((text) => {
				text.setValue(this._plugin.settings.reviewedFieldName)
					.setPlaceholder("reviewed")
					.onChange((value) => {
						this._plugin.settings.reviewedFieldName = value.trim() || "reviewed";
						void this._plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Review frequency field name")
			.setDesc("Frontmatter field used for high, normal, low, or ignore.")
			.addText((text) => {
				text.setValue(this._plugin.settings.reviewFrequencyFieldName)
					.setPlaceholder("review-frequency")
					.onChange((value) => {
						this._plugin.settings.reviewFrequencyFieldName = value.trim() || "review-frequency";
						void this._plugin.saveSettings();
					});
			});

		// NoteSet settings

		new Setting(containerEl)
			.setName("Note Sets")
			.setHeading();

		if (this._plugin.settings && this._plugin.settings.noteSets) {
			this._plugin.settings.noteSets.forEach((noteSet, index) => {
				this._plugin.noteSetService.updateNoteSetDisplayNameAndDescription(
					noteSet
				);

				// Header
				const setting = new Setting(containerEl);

				setting.setName(`Note Set "${noteSet.displayName}"`);
				const staleReasons = this._plugin.noteSetService.getQueueStaleReasons(noteSet);
				const descriptionParts = [
					this._plugin.noteSetService.getQueueProgressText(noteSet),
				];
				if (staleReasons.length > 0) {
					descriptionParts.push("queue may be stale");
				}
				setting.setDesc(descriptionParts.join(" | "));

				const updateHeader = (text: string): void => {
					setting.setName(`Note Set "${text}"`);
				};

				updateHeader(noteSet.displayName);

				if (noteSet?.validationErrors?.length > 0) {
					setting.addExtraButton((cb) => {
						cb.setIcon("alert-triangle")
						.setTooltip(noteSet?.validationErrors.join(";\n"));
					});
				}

				if (staleReasons.length > 0) {
					setting.addExtraButton((cb) => {
						cb.setIcon("history")
							.setTooltip(`Queue may be stale:\n${staleReasons.join(";\n")}`);
					});
				}

				setting.addExtraButton((cb) => {
					cb.setIcon("info")
						.setTooltip("Note set info & stats")
						.onClick(() => {
							new NoteSetInfoModal(
								this.app,
								noteSet,
								this._plugin.noteSetService
							).open();
						});
				});

				setting.addExtraButton((cb) => {
					cb.setIcon("rotate-cw")
						.setTooltip("Reset review queue and update stats for this note set")
						.onClick(() => {
							new NoteSetResetModal(this.app, noteSet, () => {
								this.runAsync(async () => {
									await this._plugin.noteSetService.validateRulesAndSave(noteSet);
									await this._plugin.reviewService.resetNotesetQueueWithValidation(noteSet.id);
									await this._plugin.noteSetService.updateNoteSetStats(noteSet);
									this.display();
								});
							}).open();
						});
				});

				setting.addExtraButton(cb => {
					cb.setIcon('arrow-up')
					.setTooltip("Move element up")
					.setDisabled(index === 0)
					.onClick(() => {
						if (index > 0) {
							const temp = this._plugin.settings.noteSets[index - 1].sortOrder;
							this._plugin.settings.noteSets[index - 1].sortOrder = noteSet.sortOrder;
							noteSet.sortOrder = temp;
							void this._plugin.saveSettings();
							this.display();
						}
					})
				});
		
				setting.addExtraButton(cb => {
					cb.setIcon('arrow-down')
					.setTooltip("Move element down")
					.setDisabled(index >= this._plugin.settings.noteSets.length - 1)
					.onClick(() => {
						if (index < this._plugin.settings.noteSets.length - 1) {
							const temp = this._plugin.settings.noteSets[index + 1].sortOrder;
							this._plugin.settings.noteSets[index + 1].sortOrder = noteSet.sortOrder;
							noteSet.sortOrder = temp;
							void this._plugin.saveSettings();
							this.display();
						}
					})
				});

				setting.addExtraButton((cb) => {
					cb.setIcon("edit")
						.setTooltip("Edit Note set")
						.onClick(() => {
							const modal = new NoteSetEditModal(noteSet, this._plugin);
							modal.open();
							modal.onClose = () => {
								this.refresh();
							};
						});
				});

				setting.addExtraButton((cb) => {
					cb.setIcon("trash")
						.setTooltip("Delete note set")
						.onClick(() => {
							new NoteSetDeleteModal(
								this.app,
								this,
								noteSet,
								this._plugin.noteSetService
							).open();
						});
				});
			});
		}

		new Setting(containerEl).addButton((btn) => {
			btn.setButtonText("Add Note Set");
			btn.onClick(async () => {
				await this._plugin.noteSetService.addEmptyNoteSet();
				this.refresh();
			});
		});
	}

	private runAsync(action: () => Promise<void>): void {
		void action().catch((error) => {
			this._plugin.showNotice(error instanceof Error ? error.message : String(error));
			console.error(error);
		});
	}
}
