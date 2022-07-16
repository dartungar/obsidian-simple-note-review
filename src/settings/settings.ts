import SimpleNoteReviewPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { EmptyQueue } from "src/IQueue";

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

        containerEl.createEl('h3', { text: 'Queues' });

        containerEl.createEl('div', {text: 'A queue is a list of notes waiting for review.'})

		containerEl.createEl('div', {text: 'Queues are reviewed based on review date. Notes with no review date will be reviewed first.'})

		containerEl.createEl('div', {text: '\n Use DataviewJS query by tags and/or folders to build queue. Example query: "#programming and #to_review"'})


        this._plugin.settings 
		&& this._plugin.settings.queues
		&& this._plugin.settings.queues.forEach(queue => {
			// Header
            const baseSetting = new Setting(containerEl);
			const nameOnInit = this._plugin.service.getQueueDisplayName(queue);

			baseSetting.setHeading();
			baseSetting.setName(nameOnInit != "" ? `Queue "${nameOnInit}"` : "New queue");
			baseSetting.addExtraButton(cb => {
				cb.setIcon("trash")
				.setTooltip("Delete queue")
				.onClick(async () => {
					//console.log(this._plugin.settings);
					this._plugin.settings.queues = this._plugin.settings.queues.filter(q => q.id !== queue.id);
					await this._plugin.saveSettings();
					this.refresh();
				})
			})

			//setting.setClass("section-setting");
			const nameSetting = new Setting(containerEl);
			nameSetting.setName("Name");
			nameSetting.setDesc("If omitted, name will be created from tags/folders")
            nameSetting.addText(textField => {
				textField.setValue(queue.name)
				.setPlaceholder(this._plugin.service.getQueueDisplayName(queue))
				.onChange(value => {
					queue.name = value;
					this._plugin.saveSettings();
					if (value == "") {
						textField.setPlaceholder(this._plugin.service.getQueueDisplayName(queue));
					}
				})
			});

			const tagsSetting = new Setting(containerEl);
			tagsSetting.setName("Tags");
			tagsSetting.setDesc(`One or more tags, separated by comma. Queue will contain notes tagged with any of these. Example: #review, #knowledge`)
			tagsSetting.addTextArea(textArea => {
				textArea.setValue(queue.tags ? queue.tags.join(",") : "")
				.setPlaceholder("Tags")
				.onChange(value => {
					queue.tags = value.split(',').map(f => f.trim());
					this._plugin.saveSettings();
				});
			});

			const foldersSetting = new Setting(containerEl);
			foldersSetting.setName("Folders");
			foldersSetting.setDesc(`One or more folder paths relative to vault root, surrounded by quotes and separated by comma. Queue will contain notes located in any of these. Example: "/notes", "/programming"`)			
			foldersSetting.addTextArea(textArea => {
				textArea.setValue(queue.folders ? queue.folders.join(',') : "")
				.setPlaceholder("Folders")
				.onChange(value => {
					queue.folders = value.split(',').map(f => f.trim());
					this._plugin.saveSettings();
				});
			});
			
			const dataviewQuerySetting = new Setting(containerEl);
			dataviewQuerySetting.setName("DataviewJS query");
			dataviewQuerySetting.setDesc(`DataviewJS-style query. If used, overrides Tags & Folders. Example: "(#knowledge and #review) or ('./notes')"`);
            dataviewQuerySetting.addTextArea(textArea => {
				textArea.setValue(queue.dataviewQuery)
				.setPlaceholder("DataviewJS query")
				.onChange(value => {
					queue.dataviewQuery = value;
					this._plugin.saveSettings();
					// TODO: debounce
					updateTagsFoldersSettingsAvailability(value);
				});
			});

			

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
				console.log(this._plugin.settings);
			});
		});


    }


}