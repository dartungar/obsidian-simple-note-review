import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
import { addSimpleNoteReviewIcon } from 'src/UI/icon';
import { NoteSetService } from 'src/noteSet/noteSetService';
import { SelectNoteSetModal } from 'src/UI/selectNoteSetModal';
import { DefaultSettings, SimpleNoteReviewPluginSettings } from 'src/settings/pluginSettings';
import { SimpleNoteReviewPluginSettingsTab } from 'src/settings/settingsTab';
import { ReviewFrequency } from 'src/noteSet/reviewFrequency';

export default class SimpleNoteReviewPlugin extends Plugin {
	settings: SimpleNoteReviewPluginSettings;
	service: NoteSetService = new NoteSetService(this.app, this);
	readonly openModalIconName: string = "glasses";
	readonly markAsReviewedIconName: string = "checkmark";

	async onload() {
		this.app.workspace.onLayoutReady(() => {
			if (!this.dataviewIsInstalled()) {
				this.showNotice("Could not find Dataview plugin. To use Simple Note Review plugin, please install Dataview plugin first.")
			}
		});

		await this.loadSettings();

		//addSimpleNoteReviewIcon();

		this.service.updateNoteSetDisplayNames();

		this.addRibbonIcon(this.openModalIconName, "Simple Note Review", (evt: MouseEvent) => {
			new SelectNoteSetModal(this.app, this).open();
		})

		this.addCommand({
			id: "open-modal",
			name: "Select Note Set For Reviewing",
			callback: () => {
				new SelectNoteSetModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "set-reviewed-date",
			name: "Mark Note As Reviewed Today",
			editorCallback: (async (editor: Editor, view: MarkdownView) => {
				await this.service.reviewNote(view.file);
			})
		});

		this.addCommand({
			id: "set-review-frequency-high",
			name: "Set review frequency to high",
			editorCallback: (async (editor: Editor, view: MarkdownView) => {
				await this.service.setReviewedFrequency(view.file, ReviewFrequency.high);
			})
		});

		this.addCommand({
			id: "set-review-frequency-normal",
			name: "Set review frequency to normal",
			editorCallback: (async (editor: Editor, view: MarkdownView) => {
				await this.service.setReviewedFrequency(view.file, ReviewFrequency.normal);
			})
		});

		this.addCommand({
			id: "set-review-frequency-low",
			name: "Set review frequency to low",
			editorCallback: (async (editor: Editor, view: MarkdownView) => {
				await this.service.setReviewedFrequency(view.file, ReviewFrequency.low);
			})
		});

		this.addCommand({
			id: "set-review-frequency-ignore",
			name: "Set review frequency to none (ignore this note)",
			editorCallback: (async (editor: Editor, view: MarkdownView) => {
				await this.service.setReviewedFrequency(view.file, ReviewFrequency.ignore);
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
		return !!getAPI();
	} 
}
