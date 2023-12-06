import { Notice, Plugin } from "obsidian";
import { getAPI } from "obsidian-dataview";
import { NoteSetService } from "src/noteSet/noteSetService";
import { SelectNoteSetModal } from "src/UI/selectNoteSetModal";
import {
	DefaultSettings,
	SimpleNoteReviewPluginSettings,
} from "src/settings/pluginSettings";
import { SimpleNoteReviewPluginSettingsTab } from "src/UI/settingsTab";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { SimpleNoteReviewSidebarView } from "src/UI/sidebar/sidebarView";
import { FileService } from "src/notes/fileService";
import { ReviewService } from "src/queues/reviewService";

export default class SimpleNoteReviewPlugin extends Plugin {
	settings: SimpleNoteReviewPluginSettings;
	noteSetService: NoteSetService = new NoteSetService(this.app, this);
	reviewService: ReviewService = new ReviewService(this.app, this);
	fileService: FileService = new FileService(this.app, this);

	readonly openModalIconName: string = "glasses";
	readonly markAsReviewedIconName: string = "checkmark";

	async onload() {
		this.app.workspace.onLayoutReady(() => {
			if (!this.dataviewIsInstalled()) {
				this.showNotice(
					"Could not find Dataview plugin. To use Simple Note Review plugin, please install Dataview plugin first."
				);
			}
		});

		await this.loadSettings();

		this.noteSetService.updateNoteSetDisplayNames();

		this.registerView(
			SimpleNoteReviewSidebarView.VIEW_TYPE,
			(leaf) => new SimpleNoteReviewSidebarView(leaf, this)
		);

		this.addRibbonIcon(
			this.openModalIconName,
			"Simple Note Review: Open Sidebar View",
			(evt: MouseEvent) => {
				this.activateView();
			}
		);

		this.addRibbonIcon(
			"play",
			"Simple Note Review: Continue Review of Current Note Set",
			(evt: MouseEvent) => {
				this.reviewService.startReview(this.settings.currentNoteSet);
			}
		);

		this.addCommands();

		this.addSettingTab(
			new SimpleNoteReviewPluginSettingsTab(this, this.app)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			new DefaultSettings(),
			await this.loadData()
		);

		this.settings.noteSets = this.noteSetService.sortNoteSets(this.settings.noteSets);
		await this.noteSetService.updateAllNotesetErrors();
	}

	async saveSettings() {
		this.settings.noteSets = this.noteSetService.sortNoteSets(this.settings.noteSets);
		await this.saveData(this.settings);
	}

	public showNotice(message: string): void {
		new Notice(message);
	}

	private dataviewIsInstalled(): boolean {
		return !!getAPI();
	}

	private addCommands(): void {
		this.addCommand({
			id: "start-review",
			name: "Start reviewing notes in current note set",
			callback: () => {
				this.reviewService.startReview(this.settings.currentNoteSet);
			},
		});

		this.addCommand({
			id: "open-sidebar",
			name: "Open Sidebar View",
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: "open-random-note",
			name: "Open random note from the current note set",
			callback: () => {
				this.reviewService.openRandomNoteInQueue(
					this.settings.currentNoteSet
				);
			},
		});

		this.addCommand({
			id: "reset-queue",
			name: "reset queue for the current note set",
			callback: () => {
				this.reviewService.resetNotesetQueue(
					this.settings.currentNoteSet
				);
			},
		});

		this.addCommand({
			id: "open-modal",
			name: "Select note set for reviewing",
			callback: () => {
				new SelectNoteSetModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "mark-current-note-as-reviewed",
			name: "Mark current note as reviewed",
			callback: () => {
				this.reviewService.reviewNote(
					this.app.workspace.getActiveFile(),
					this.settings.currentNoteSet
				);
			},
		});

		this.addCommand({
			id: "set-review-frequency-high",
			name: "Set review frequency to high",
			callback: () => {
				this.fileService.setReviewFrequency(
					this.app.workspace.getActiveFile(),
					ReviewFrequency.high
				);
			},
		});

		this.addCommand({
			id: "set-review-frequency-normal",
			name: "Set review frequency to normal",
			callback: () => {
				this.fileService.setReviewFrequency(
					this.app.workspace.getActiveFile(),
					ReviewFrequency.normal
				);
			},
		});

		this.addCommand({
			id: "set-review-frequency-low",
			name: "Set review frequency to low",
			callback: () => {
				this.fileService.setReviewFrequency(
					this.app.workspace.getActiveFile(),
					ReviewFrequency.low
				);
			},
		});

		this.addCommand({
			id: "set-review-frequency-ignore",
			name: "Set review frequency to none (ignore this note in all reviews)",
			callback: () => {
				this.fileService.setReviewFrequency(
					this.app.workspace.getActiveFile(),
					ReviewFrequency.ignore
				);
			},
		});

		this.addCommand({
			id: "skip-note",
			name: "Skip note from current review",
			callback: () => {
				this.reviewService.skipNote(
					this.app.workspace.getActiveFile(),
					this.settings.currentNoteSet
				);
			},
		});
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(
			SimpleNoteReviewSidebarView.VIEW_TYPE
		);

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: SimpleNoteReviewSidebarView.VIEW_TYPE,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(
				SimpleNoteReviewSidebarView.VIEW_TYPE
			)[0]
		);
	}
}
