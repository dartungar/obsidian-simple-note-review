import SimpleNoteReviewPlugin from "main";
import { App, PluginSettingTab, Setting, setIcon } from "obsidian";
import { EmptyQueue } from "src/queue/IQueue";
import { JoinLogicOperators } from "src/joinLogicOperators";
import { QueueInfoModal } from "src/queue/queueInfoModal";

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
			.setName("Open next note in queue after reviewing a note")
			.setDesc("After marking note as reviewed, automatically open next note in queue.")
			.addToggle(toggle => {
				toggle.setValue(this._plugin.settings.openNextNoteAfterReviewing)
				.onChange(value => {
					this._plugin.settings.openNextNoteAfterReviewing = value;
					this._plugin.saveSettings;
				})
			})

		new Setting(containerEl)
			.setName("Open random note for review")
			.setDesc("When reviewing, open random note from queue, instead of note with earliest review date.")
			.addToggle(toggle => {
				toggle.setValue(this._plugin.settings.openRandomNote)
				.onChange(value => {
					this._plugin.settings.openRandomNote = value;
					this._plugin.saveSettings;
				})
			})


		// Queue settings

        containerEl.createEl('h3', { text: 'Queues' });

        containerEl.createEl('div', {text: 'A queue is a list of notes waiting for review.'})

        this._plugin.settings 
		&& this._plugin.settings.queues
		&& this._plugin.settings.queues.forEach(queue => {
			// Header
            const header = new Setting(containerEl);
			const nameOnInit = this._plugin.service.getQueueDisplayName(queue);

			header.setHeading();
			header.setClass("queue-heading");
			header.setName(`Queue "${nameOnInit}"`);

			const baseSettingIconContainer = createSpan({cls: "simple-note-review-collapse-icon"});
			setIcon(baseSettingIconContainer, "right-chevron-glyph");
			header.nameEl.prepend(baseSettingIconContainer);

			// TODO: button for showing queue stats
			header.addExtraButton(cb => {
				cb.setIcon('info')
				.setTooltip("Queue info & stats")
				.onClick(() => {
					new QueueInfoModal(this.app, queue, this._plugin.service).open();
				})
			})

			header.addExtraButton(cb => {
				cb.setIcon("trash")
				.setTooltip("Delete queue")
				.onClick(async () => {
					console.log("deleting queue with id", queue.id, this._plugin.settings.queues);
					this._plugin.settings.queues = this._plugin.settings.queues.filter(q => q.id !== queue.id);
					await this._plugin.saveSettings();
					this.refresh();
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
				textField.setValue(queue.name)
				.setPlaceholder(this._plugin.service.getQueueDisplayName(queue))
				.onChange(value => {
					queue.name = value != "" ? value : null;
					this._plugin.saveSettings();
					if (value == "") {
						textField.setPlaceholder(this._plugin.service.getQueueDisplayName(queue));
					}
				})
			});

			const tagsSetting = new Setting(settingBodyEl);
			tagsSetting.setName("Tags");
			tagsSetting.setDesc(`One or more tags, separated by comma. Queue will contain notes tagged with ${queue.tagsJoinType === JoinLogicOperators.AND ? "all" : "any"} of these. Example: #review, #knowledge`)			
			tagsSetting.addTextArea(textArea => {
				textArea.setValue(queue.tags ? queue.tags.join(",") : "")
				.setPlaceholder("Tags")
				.onChange(value => {
					queue.tags = value != "" ? value.split(',').map(f => f.trim()) : [];
					this._plugin.saveSettings();
				});
			});

			const foldersSetting = new Setting(settingBodyEl);
			foldersSetting.setName("Folders");
			foldersSetting.setDesc(`One or more folder paths relative to vault root, surrounded by quotes and separated by comma. Queue will contain notes located in any of these. Example: "/notes", "/programming"`)			
			foldersSetting.addTextArea(textArea => {
				textArea.setValue(queue.folders ? queue.folders.join(',') : "")
				.setPlaceholder("Folders")
				.onChange(value => {
					queue.folders = value != "" ? value.split(',').map(f => f.trim()) : [];
					this._plugin.saveSettings();
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
				.setValue(queue.tagsJoinType as string || JoinLogicOperators.OR)
				.onChange((value: JoinLogicOperators) => {
					queue.tagsJoinType = value;
					this._plugin.saveSettings();
				} )
			});

			const folderTagJoinTypeSetting = new Setting(advancedSectionBodyEl);
			folderTagJoinTypeSetting.setName("If folders and tags are specified, match notes with: ")
			folderTagJoinTypeSetting.addDropdown(dropdown => {
				dropdown.addOption(JoinLogicOperators.OR, "specified tags OR in these folders").addOption(JoinLogicOperators.AND, "specified tags AND in these folders")
				.setValue(queue.foldersToTagsJoinType as string || JoinLogicOperators.OR)
				.onChange((value: JoinLogicOperators) => {
					queue.foldersToTagsJoinType = value; 
					this._plugin.saveSettings();} )
			});

			const dataviewQuerySetting = new Setting(advancedSectionBodyEl);
			dataviewQuerySetting.setName("DataviewJS query");
			dataviewQuerySetting.setDesc(`DataviewJS-style query. If used, overrides Tags & Folders. Example: "(#knowledge and #review) or ('./notes')"`);
            dataviewQuerySetting.addTextArea(textArea => {
				textArea.setValue(queue.dataviewQuery)
				.setPlaceholder("DataviewJS query")
				.onChange(value => {
					queue.dataviewQuery = value;
					this._plugin.saveSettings();
					updateTagsFoldersSettingsAvailability(value);
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

			updateTagsFoldersSettingsAvailability(queue.dataviewQuery);
        })

        new Setting(containerEl)
		.addButton(btn => {
			btn.setButtonText("Add queue");
			btn.onClick(() => {
				this._plugin.settings.queues.push(
                        new EmptyQueue(
							this._plugin.settings.queues.length > 0 ? Math.max(...this._plugin.settings.queues.map(q => q.id)) + 1 : 1), // id "generation"
                    );
				this._plugin.saveSettings();
				this.refresh();
			});
		});
    }


}