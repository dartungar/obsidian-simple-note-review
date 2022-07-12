import { Plugin } from 'obsidian';
import { QueueService } from 'src/queueService';
import { SelectQueueModal } from 'src/selectQueueModal';
import { DefaultSettings, SimpleNoteReviewPluginSettings } from 'src/settings/pluginSettings';
import { SimpleNoteReviewPluginSettingsTab } from 'src/settings/settings';

export default class SimpleNoteReviewPlugin extends Plugin {
	settings: SimpleNoteReviewPluginSettings;
	service: QueueService = new QueueService(this.app, this);

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("sheets-in-box", "Simple Note Review", (evt: MouseEvent) => {
			new SelectQueueModal(this.app, this).open();
		})

		this.addSettingTab(new SimpleNoteReviewPluginSettingsTab(this, this.app));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			new DefaultSettings(),
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
