import { Editor, MarkdownView, Plugin, TFile } from 'obsidian';
import { QueueService } from 'src/queueService';
import { SelectQueueModal } from 'src/selectQueueModal';
import { DefaultSettings, SimpleNoteReviewPluginSettings } from 'src/settings/pluginSettings';
import { SimpleNoteReviewPluginSettingsTab } from 'src/settings/settings';

export default class SimpleNoteReviewPlugin extends Plugin {
	settings: SimpleNoteReviewPluginSettings;
	service: QueueService = new QueueService(this.app, this);
	readonly openModalIconName: string = "sheets-in-box";
	readonly markAsReviewedIconName: string = "checkmark";

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon(this.openModalIconName, "Simple Note Review", (evt: MouseEvent) => {
			new SelectQueueModal(this.app, this).open();
		})

		this.addCommand({
			id: "simple-note-review-open-modal",
			name: "Select Queue For Reviewing",
			callback: () => {
				new SelectQueueModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "simple-note-review-set-reviewed-date",
			name: "Mark Note As Reviewed Today",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.service.setMetadataValueToToday(view.file).then(() => {
					if (this.settings.currentQueue) {
						this.service.openNextFile(this.settings.currentQueue);
					}
				});
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item
					.setTitle("Mark Note As Reviewed Today")
					.setIcon(this.markAsReviewedIconName)
					.onClick(async () => {
						await this.service.setMetadataValueToToday(view.file); 
						if (this.settings.currentQueue) {
							this.service.openNextFile(this.settings.currentQueue);
						}
					});
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					item
					.setTitle("Mark Note As Reviewed Today")
					.setIcon(this.markAsReviewedIconName)
					.onClick(async () => {
						await this.service.setMetadataValueToToday(file as TFile); 
						if (this.settings.currentQueue) {
							this.service.openNextFile(this.settings.currentQueue);
						}
					});
				});
			})
		);

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
