import SimpleNoteReviewPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { EmptyQueueParams } from "src/IQeueParams";
import { Queue } from "src/queue";

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
            const setting = new Setting(containerEl);

			setting.setClass("section-setting");

            setting.addText(textField => {
				textField.setValue(queue.params.name)
				.setPlaceholder("Queue name")
				.onChange(value => {
					queue.params.name = value;
					this._plugin.saveSettings;
				})
			});

            setting.addTextArea(textArea => {
				textArea.setValue(queue.params.dataviewQuery)
				.setPlaceholder("DataviewJS query")
				.onChange(value => {
					queue.params.dataviewQuery = value;
					this._plugin.saveSettings;
				});
			});

            setting.addButton(btn => {
				btn.setButtonText("Delete queue");
				btn.onClick(() => {
					//console.log(this._plugin.settings);
					this._plugin.settings.queues = this._plugin.settings.queues.filter(q => q.params.id !== queue.params.id);
					this._plugin.saveSettings();
					this.refresh();
				});
			})
        })

        new Setting(containerEl)
		.addButton(btn => {
			btn.setButtonText("Add queue");
			btn.onClick(() => {
				this._plugin.settings.queues.push(
                    new Queue(
                        new EmptyQueueParams(this._plugin.settings.queues.length > 0 ? Math.max(...this._plugin.settings.queues.map(q => q.params.id)) + 1 : 1), // id "generation"
                        app, 
                        this._plugin)
                    );
				this._plugin.saveSettings();
				this.refresh();
				console.log(this._plugin.settings);
			});
		})
    }
}