import { App, Notice, Plugin } from "obsidian";
import { getAPI } from "obsidian-dataview";
import { NoteSetService } from "src/noteSet/noteSetService";
import { SelectNoteSetModal } from "src/UI/selectNoteSetModal";
import {
	DefaultSettings,
	ReviewStartUiBehavior,
	SimpleNoteReviewPluginSettings,
} from "src/settings/pluginSettings";
import { SimpleNoteReviewPluginSettingsTab } from "src/UI/settingsTab";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { SimpleNoteReviewSidebarView } from "src/UI/sidebar/sidebarView";
import { FileService } from "src/notes/fileService";
import { ReviewService } from "src/queues/reviewService";
import { NoteReviewBottomBar } from "src/UI/bottomBar/noteReviewBottomBar";

interface AppWithSettings extends App {
	setting: {
		open(): void;
		openTabById(id: string): void;
	};
}

export default class SimpleNoteReviewPlugin extends Plugin {
	settings: SimpleNoteReviewPluginSettings;
	noteSetService: NoteSetService = new NoteSetService(this.app, this);
	reviewService: ReviewService = new ReviewService(this.app, this);
	fileService: FileService = new FileService(this.app, this);
	bottomBar: NoteReviewBottomBar = new NoteReviewBottomBar(this.app, this);

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
			(_evt: MouseEvent) => {
				this.runAsync(() => this.activateView());
			}
		);

		this.addRibbonIcon(
			"play",
			"Simple Note Review: Continue Review of Current Note Set",
			(_evt: MouseEvent) => {
				this.runAsync(async () => {
					await this.startReview(this.settings.currentNoteSetId);
				});
			}
		);

		this.addCommands();

		this.addSettingTab(
			new SimpleNoteReviewPluginSettingsTab(this, this.app)
		);

		this.registerEvent(this.app.vault.on("delete", (file) => {
			this.runAsync(async () => {
				await this.noteSetService.onPhysicalDeleteNote(file);
				await this.bottomBar.render();
			});
		}));

		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			this.runAsync(async () => {
				await this.noteSetService.onPhysicalRenameNote(file, oldPath);
				await this.bottomBar.render();
			});
		}));

		this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
			this.runAsync(() => this.bottomBar.render());
		}));
	}

	onunload() {
		this.bottomBar.close();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			new DefaultSettings(),
			await this.loadData()
		);

		this.settings.noteSets = this.noteSetService.sortNoteSets(this.settings.noteSets);
		await this.noteSetService.validateAllNotesets();
	}

	async saveSettings() {
		this.settings.noteSets = this.noteSetService.sortNoteSets(this.settings.noteSets);
		await this.saveData(this.settings);
	}

	public showNotice(message: string): void {
		new Notice(message);
	}

	public openSettings(): void {
		const appWithSettings = this.app as AppWithSettings;
		appWithSettings.setting.open();
		appWithSettings.setting.openTabById(this.manifest.id);
	}

	public async startReview(noteSetId: string): Promise<void> {
		const noteSet = this.noteSetService.getNoteSet(noteSetId);
		await this.reviewService.startReview(noteSet.id);

		if (this.settings.currentNoteSetId !== noteSet.id) {
			this.settings.currentNoteSetId = noteSet.id;
			await this.saveSettings();
		}

		await this.applyReviewStartUiSettings();
	}

	private dataviewIsInstalled(): boolean {
		return !!getAPI();
	}

	private addCommands(): void {
		this.addCommand({
			id: "start-review",
			name: "Start reviewing notes in current note set",
			callback: () => {
				this.runAsync(async () => {
					await this.startReview(this.settings.currentNoteSetId);
				});
			},
		});

		this.addCommand({
			id: "open-sidebar",
			name: "Open Sidebar View",
			callback: () => {
				this.runAsync(() => this.activateView());
			},
		});

		this.addCommand({
			id: "open-bottom-bar",
			name: "Open Note Review Bottom Bar",
			callback: () => {
				this.bottomBar.open();
			},
		});

		this.addCommand({
			id: "open-random-note",
			name: "Open random note from the current note set",
			callback: () => {
				this.runAsync(async () => {
					await this.reviewService.openRandomNoteInQueue(
						this.settings.currentNoteSetId
					);
					await this.bottomBar.render();
				});
			},
		});

		this.addCommand({
			id: "reset-queue",
			name: "reset queue for the current note set",
			callback: () => {
				this.runAsync(async () => {
					await this.reviewService.resetNotesetQueueWithValidation(
						this.settings.currentNoteSetId
					);
					await this.bottomBar.render();
				});
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
				this.runAsync(async () => {
					await this.reviewService.reviewNote(
						this.app.workspace.getActiveFile(),
						this.settings.currentNoteSetId
					);
					await this.bottomBar.render();
				});
			},
		});

		this.addCommand({
			id: "set-review-frequency-high",
			name: "Set review frequency to high",
			callback: () => {
				this.runAsync(async () => {
					await this.fileService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.high
					);
					await this.bottomBar.render();
				});
			},
		});

		this.addCommand({
			id: "set-review-frequency-normal",
			name: "Set review frequency to normal",
			callback: () => {
				this.runAsync(async () => {
					await this.fileService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.normal
					);
					await this.bottomBar.render();
				});
			},
		});

		this.addCommand({
			id: "set-review-frequency-low",
			name: "Set review frequency to low",
			callback: () => {
				this.runAsync(async () => {
					await this.fileService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.low
					);
					await this.bottomBar.render();
				});
			},
		});

		this.addCommand({
			id: "set-review-frequency-ignore",
			name: "Set review frequency to none (ignore this note in all reviews)",
			callback: () => {
				this.runAsync(async () => {
					await this.fileService.setReviewFrequency(
						this.app.workspace.getActiveFile(),
						ReviewFrequency.ignore
					);
					await this.bottomBar.render();
				});
			},
		});

		this.addCommand({
			id: "skip-note",
			name: "Skip note from current review",
			callback: () => {
				this.runAsync(async () => {
					await this.reviewService.skipNote(
						this.app.workspace.getActiveFile(),
						this.settings.currentNoteSetId
					);
					await this.bottomBar.render();
				});
			},
		});
	}

	async activateView() {
		const existingLeaf = this.app.workspace.getLeavesOfType(
			SimpleNoteReviewSidebarView.VIEW_TYPE
		)[0];

		if (existingLeaf) {
			if (existingLeaf.view instanceof SimpleNoteReviewSidebarView) {
				await existingLeaf.view.renderView();
			}
			this.app.workspace.revealLeaf(existingLeaf);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getRightLeaf(true);
		if (!leaf) {
			this.showNotice("Could not open Simple Note Review sidebar.");
			return;
		}

		await leaf.setViewState({
			type: SimpleNoteReviewSidebarView.VIEW_TYPE,
			active: true,
		});

		const sidebarLeaf = this.app.workspace.getLeavesOfType(
			SimpleNoteReviewSidebarView.VIEW_TYPE
		)[0];
		if (sidebarLeaf) {
			this.app.workspace.revealLeaf(sidebarLeaf);
		}
	}

	private isSidebarOpen(): boolean {
		return this.app.workspace.getLeavesOfType(
			SimpleNoteReviewSidebarView.VIEW_TYPE
		).length > 0;
	}

	private async applyReviewStartUiSettings(): Promise<void> {
		if (this.shouldOpenBottomBarOnReviewStart()) {
			this.bottomBar.open();
		}

		if (this.shouldOpenSidebarOnReviewStart()) {
			await this.activateView();
		} else {
			await this.refreshSidebarViews();
		}

		await this.bottomBar.render();
	}

	private shouldOpenBottomBarOnReviewStart(): boolean {
		if (this.settings.bottomBarOpenOnStart === ReviewStartUiBehavior.yes) {
			return true;
		}

		return (
			this.settings.bottomBarOpenOnStart === ReviewStartUiBehavior.ifOtherHidden &&
			!this.isSidebarOpen()
		);
	}

	private shouldOpenSidebarOnReviewStart(): boolean {
		if (this.settings.sidebarOpenOnStart === ReviewStartUiBehavior.yes) {
			return true;
		}

		return (
			this.settings.sidebarOpenOnStart === ReviewStartUiBehavior.ifOtherHidden &&
			!this.bottomBar.isOpen()
		);
	}

	async refreshSidebarViews() {
		await Promise.all(
			this.app.workspace
				.getLeavesOfType(SimpleNoteReviewSidebarView.VIEW_TYPE)
				.map(async (leaf) => {
					if (leaf.view instanceof SimpleNoteReviewSidebarView) {
						await leaf.view.renderView();
					}
				})
		);
	}

	private runAsync(action: () => Promise<void>): void {
		void action().catch((error) => {
			this.showNotice(this.getErrorMessage(error));
			console.error(error);
		});
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
