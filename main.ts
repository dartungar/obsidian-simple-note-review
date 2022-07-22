import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
import { addSimpleNoteReviewIcon } from 'src/icon';
import { QueueService } from 'src/queue/queueService';
import { SelectQueueModal } from 'src/queue/selectQueueModal';
import { DefaultSettings, SimpleNoteReviewPluginSettings } from 'src/settings/pluginSettings';
import { SimpleNoteReviewPluginSettingsTab } from 'src/settings/settingsTab';

export default class SimpleNoteReviewPlugin extends Plugin {
	settings: SimpleNoteReviewPluginSettings;
	service: QueueService = new QueueService(this.app, this);
	readonly openModalIconName: string = "simple-note-review-icon";
	readonly markAsReviewedIconName: string = "checkmark";

	async onload() {
		if (!this.dataviewIsInstalled()) {
			this.showNotice("Could not find Dataview plugin. To use Simple Note Review plugin, please install Dataview plugin first.")
			return;
		}

		await this.loadSettings();

		addSimpleNoteReviewIcon();

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
			editorCallback: (async (editor: Editor, view: MarkdownView) => {
				await this.service.reviewNote(view.file);
			})
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item
					.setTitle("Mark Note As Reviewed Today")
					.setIcon(this.markAsReviewedIconName)
					.onClick(async () => {
						await this.service.reviewNote(view.file);
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
						await this.service.reviewNote(file);
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

	public showNotice(message: string) : void {
		new Notice(message);
	}

	private dataviewIsInstalled(): boolean {
		try {
			const dv = getAPI();
			if (dv == null) throw new Error();
			return true;
		} catch (error) {
			return false;
		}
	}
}
