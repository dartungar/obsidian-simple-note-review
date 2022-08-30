import SimpleNoteReviewPlugin from "main";
import { App, PluginSettingTab, Setting, setIcon, debounce } from "obsidian";
import { JoinLogicOperators } from "src/joinLogicOperators";
import { NoteSetDeleteModal } from "src/noteSet/noteSetDeleteModal";
import { NoteSetInfoModal } from "src/noteSet/noteSetInfoModal";

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

		containerEl.createEl('h2', { text: 'Simple Note Review Settings' });

		// General settings

		new Setting(containerEl)
			.setName("Open next note in note set after reviewing a note")
			.setDesc("After marking note as reviewed, automatically open next note in note set.")
			.addToggle(toggle => {
				toggle.setValue(this._plugin.settings.openNextNoteAfterReviewing)
				.onChange(value => {
					this._plugin.settings.openNextNoteAfterReviewing = value;
					this._plugin.saveSettings;
				})
			})

		new Setting(containerEl)
			.setName("Open random note for review")
			.setDesc("When reviewing, open random note from note set, instead of note with earliest review date.")
			.addToggle(toggle => {
				toggle.setValue(this._plugin.settings.openRandomNote)
				.onChange(value => {
					this._plugin.settings.openRandomNote = value;
					this._plugin.saveSettings;
				})
			})


		// NoteSet settings

        containerEl.createEl('h3', { text: 'Note Sets' });

        this._plugin.settings 
		&& this._plugin.settings.noteSets
		&& this._plugin.settings.noteSets.forEach(noteSet => {
			this._plugin.service.updateNoteSetDisplayNameAndDescription(noteSet);

			// Header
            const header = new Setting(containerEl);
			const baseSettingIconContainer = createSpan({cls: "simple-note-review-collapse-icon"});

			header.setHeading();
			header.setClass("noteSet-heading");

			const updateHeader = (text: string): void => {
				header.setName(`Note Set "${text}"`);
				
				setIcon(baseSettingIconContainer, "right-chevron-glyph");
				header.nameEl.prepend(baseSettingIconContainer);
			}

			updateHeader(noteSet.displayName);

			header.addExtraButton(cb => {
				cb.setIcon('info')
				.setTooltip("Note set info & stats")
				.onClick(() => {
					new NoteSetInfoModal(this.app, noteSet, this._plugin.service).open();
				})
			})

			header.addExtraButton(cb => {
				cb.setIcon("trash")
				.setTooltip("Delete note set")
				.onClick(async () => {
					new NoteSetDeleteModal(this.app, this, noteSet, this._plugin.service).open();
				})
			})


			const settingBodyEl = containerEl.createDiv({cls: ["setting-body", "is-collapsed"]})

			header.settingEl.addEventListener("click", e => {
				settingBodyEl.toggleClass("is-collapsed", !settingBodyEl.hasClass("is-collapsed"));
				baseSettingIconContainer.toggleClass("rotated90", !baseSettingIconContainer.hasClass("rotated90"));
			})

			const nameSetting = new Setting(settingBodyEl);
			nameSetting.setName("Name");
			nameSetting.setDesc("If omitted, name will be created from tags/folders.")
            nameSetting.addText(textField => {
				textField.setValue(noteSet.name)
				.setPlaceholder(noteSet.displayName)
				.onChange(value => {
					if (value === noteSet.name) {
						return;
					}
					noteSet.name = value != "" ? value : null;
					this._plugin.saveSettings();
					if (value == "") {
						textField.setPlaceholder(noteSet.displayName);
					}
					updateNoteSetDisplayName();
				})
			});

			const tagsSetting = new Setting(settingBodyEl);
			tagsSetting.setName("Tags");
			tagsSetting.setDesc(`One or more tags, separated by comma. Note set will contain notes tagged with ${noteSet.tagsJoinType === JoinLogicOperators.AND ? "all" : "any"} of these. Example: #review, #knowledge`)			
			tagsSetting.addTextArea(textArea => {
				textArea.setValue(noteSet.tags ? noteSet.tags.join(",") : "")
				.setPlaceholder("Tags")
				.onChange(value => {
					noteSet.tags = value != "" ? value.split(',').map(f => f.trim()) : [];
					this._plugin.saveSettings();
					updateNoteSetDisplayName();
				});
			});

			const foldersSetting = new Setting(settingBodyEl);
			foldersSetting.setName("Folders");
			foldersSetting.setDesc(`One or more folder paths relative to vault root, surrounded by quotes and separated by comma. Note set will contain notes located in any of these. Example: "/notes", "/programming"`)			
			foldersSetting.addTextArea(textArea => {
				textArea.setValue(noteSet.folders ? noteSet.folders.join(',') : "")
				.setPlaceholder("Folders")
				.onChange(value => {
					noteSet.folders = value != "" ? value.split(',').map(f => f.trim()) : [];
					this._plugin.saveSettings();
					updateNoteSetDisplayName();
				});
			});

			// Advanced Settings

			const advancedSectionHeader = new Setting(settingBodyEl);
			advancedSectionHeader.setHeading();
			advancedSectionHeader.setName("Advanced");

			const advancedSectionIconContainer = createSpan({cls: "simple-note-review-collapse-icon"});
			setIcon(advancedSectionIconContainer, "right-chevron-glyph");
			advancedSectionHeader.nameEl.prepend(advancedSectionIconContainer);

			const advancedSectionBodyEl = settingBodyEl.createDiv({cls: ["setting-body-advanced", "is-collapsed"]});

			advancedSectionHeader.settingEl.addEventListener("click", e => {
				advancedSectionBodyEl.toggleClass("is-collapsed", !advancedSectionBodyEl.hasClass("is-collapsed"));
				advancedSectionIconContainer.toggleClass("rotated90", !advancedSectionIconContainer.hasClass("rotated90"));
			});

			const tagJoinTypeSetting = new Setting(advancedSectionBodyEl);
			tagJoinTypeSetting.setName("If tags are specified, match notes with:")
			tagJoinTypeSetting.addDropdown(dropdown => {
				dropdown
				.addOption(JoinLogicOperators.OR, "any of the tags").addOption(JoinLogicOperators.AND, "all of the tags")
				.setValue(noteSet.tagsJoinType as string || JoinLogicOperators.OR)
				.onChange((value: JoinLogicOperators) => {
					noteSet.tagsJoinType = value;
					this._plugin.saveSettings();
					updateNoteSetDisplayName();
				} )
			});

			const folderTagJoinTypeSetting = new Setting(advancedSectionBodyEl);
			folderTagJoinTypeSetting.setName("If folders and tags are specified, match notes with: ")
			folderTagJoinTypeSetting.addDropdown(dropdown => {
				dropdown.addOption(JoinLogicOperators.OR, "specified tags OR in these folders").addOption(JoinLogicOperators.AND, "specified tags AND in these folders")
				.setValue(noteSet.foldersToTagsJoinType as string || JoinLogicOperators.OR)
				.onChange((value: JoinLogicOperators) => {
					noteSet.foldersToTagsJoinType = value; 
					this._plugin.saveSettings();
					updateNoteSetDisplayName();
				})
			});

			const dataviewQuerySetting = new Setting(advancedSectionBodyEl);
			dataviewQuerySetting.setName("DataviewJS query");
			dataviewQuerySetting.setDesc(`DataviewJS-style query. If used, overrides Tags & Folders. Example: "(#knowledge and #review) or ('./notes')"`);
            dataviewQuerySetting.addTextArea(textArea => {
				textArea.setValue(noteSet.dataviewQuery)
				.setPlaceholder("DataviewJS query")
				.onChange(value => {
					noteSet.dataviewQuery = value;
					this._plugin.saveSettings();
					updateTagsFoldersSettingsAvailability(value);
					updateNoteSetDisplayName();
				});
			});

			// Helpers

			const updateTagsFoldersSettingsAvailability = (dataviewJsQueryValue: string) : void => {
				const disableTagsFoldersSettings = dataviewJsQueryValue && (dataviewJsQueryValue != "");
				if (disableTagsFoldersSettings) {
					tagsSetting.settingEl.style.opacity = "50%";
					foldersSetting.settingEl.style.opacity = "50%";
				} else {
					tagsSetting.settingEl.style.opacity = "100%";
					foldersSetting.settingEl.style.opacity = "100%";
				}
				tagsSetting.setDisabled(disableTagsFoldersSettings);
				foldersSetting.setDisabled(disableTagsFoldersSettings);
			}

			updateTagsFoldersSettingsAvailability(noteSet.dataviewQuery);

			const updateNoteSetDisplayName = (): void => {
				const debounced = debounce(() => {
					this._plugin.service.updateNoteSetDisplayNameAndDescription(noteSet);
					updateHeader(noteSet.displayName);
				}, 1000);
				debounced();
			}


        })

        new Setting(containerEl)
		.addButton(btn => {
			btn.setButtonText("Add Note Set");
			btn.onClick(async () => {
				await this._plugin.service.addEmptyNoteSet();
				this.refresh();
			});
		});
    }
}