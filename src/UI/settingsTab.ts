import SimpleNoteReviewPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { NoteSetDeleteModal } from "src/UI/noteset/noteSetDeleteModal";
import { NoteSetInfoModal } from "src/UI/noteset/noteSetInfoModal";
import { NoteSetEditModal } from "./noteset/noteSetEditModal";
import { ReviewAlgorithm } from "src/settings/reviewAlgorightms";
import { NoteSetResetModal } from "./noteset/noteSetResetModal";
import { ReviewStartUiBehavior } from "src/settings/pluginSettings";

type SettingsTabId = "general" | "noteSets" | "sidebar" | "bottomBar";
type RefreshTarget = "none" | "sidebar" | "bottomBar" | "both";

interface SettingsTabConfig {
	id: SettingsTabId;
	label: string;
}

export class SimpleNoteReviewPluginSettingsTab extends PluginSettingTab {
	private activeTab: SettingsTabId = "general";

	constructor(private _plugin: SimpleNoteReviewPlugin, app: App) {
		super(app, _plugin);
	}

	refresh(): void {
		this.display();
	}

	display(): void  {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Simple Note Review Settings")
			.setHeading();

		this.createTabs(containerEl);

		const tabContentEl = containerEl.createDiv({
			cls: "simple-note-review-settings-tab-content",
		});

		if (this.activeTab === "general") {
			this.renderGeneralSettings(tabContentEl);
			return;
		}

		if (this.activeTab === "noteSets") {
			this.renderNoteSetSettings(tabContentEl);
			return;
		}

		if (this.activeTab === "sidebar") {
			this.renderSidebarSettings(tabContentEl);
			return;
		}

		this.renderBottomBarSettings(tabContentEl);
	}

	private createTabs(containerEl: HTMLElement): void {
		const tabs: SettingsTabConfig[] = [
			{ id: "general", label: "General" },
			{ id: "noteSets", label: "Note Sets" },
			{ id: "sidebar", label: "Side Bar" },
			{ id: "bottomBar", label: "Bottom Bar" },
		];
		const tabsEl = containerEl.createDiv({
			cls: "simple-note-review-settings-tabs",
		});

		tabs.forEach((tab) => {
			const buttonEl = tabsEl.createEl("button", {
				text: tab.label,
				cls: "simple-note-review-settings-tab",
			});
			buttonEl.type = "button";
			buttonEl.toggleClass("is-active", this.activeTab === tab.id);
			buttonEl.onClickEvent(() => {
				this.activeTab = tab.id;
				this.display();
			});
		});
	}

	private renderGeneralSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Open next note in the note set after reviewing a note")
			.setDesc(
				"After marking note as reviewed, automatically open next note in the note set."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this._plugin.settings.openNextNoteAfterReviewing)
					.onChange((value) => {
						this._plugin.settings.openNextNoteAfterReviewing = value;
						this.runAsync(() => this.saveSettingsAndRefresh());
					});
			});

		this.addToggleSetting(
			containerEl,
			"Show notifications about marking note as reviewed",
			"Show a notice after the reviewed field is updated for a note.",
			this._plugin.settings.showReviewNotification,
			(value) => {
				this._plugin.settings.showReviewNotification = value;
			}
		);

		new Setting(containerEl)
			.setName("Review order")
			.setDesc(
				"Default orders notes by review date or review frequency. Random shuffles the queue when it is created or reset."
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption(ReviewAlgorithm.default, "Default")
					.addOption(ReviewAlgorithm.random, "Random")
					.setValue(this._plugin.settings.reviewAlgorithm)
					.onChange((value: ReviewAlgorithm) => {
						this._plugin.settings.reviewAlgorithm = value;
						this.runAsync(() => this.saveSettingsAndRefresh());
					});
			});

		new Setting(containerEl)
			.setName("Use review frequency")
			.setDesc(
				"Set review frequency level (high, normal, low, ignore) for each note. Notes with higher review frequency will be presented for review more often. Default is 'normal'."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this._plugin.settings.useReviewFrequency)
					.onChange((value) => {
						this._plugin.settings.useReviewFrequency = value;
						this.runAsync(() => this.saveSettingsAndRefresh());
					});
			});

		new Setting(containerEl)
			.setName("Start with unreviewed notes")
			.setDesc(
				"Start review with notes that have no review date. If turned off, notes without the review date will have lower priority than notes with early review dates."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this._plugin.settings.unreviewedNotesFirst)
					.onChange((value) => {
						this._plugin.settings.unreviewedNotesFirst = value;
						this.runAsync(() => this.saveSettingsAndRefresh());
					});
			});

		new Setting(containerEl)
			.setName("Metadata Fields")
			.setHeading();

		new Setting(containerEl)
			.setName("Reviewed field name")
			.setDesc("Frontmatter field updated when a note is marked as reviewed.")
			.addText((text) => {
				text.setValue(this._plugin.settings.reviewedFieldName)
					.setPlaceholder("reviewed")
					.onChange((value) => {
						this._plugin.settings.reviewedFieldName = value.trim() || "reviewed";
						this.runAsync(() => this.saveSettingsAndRefresh());
					});
			});

		new Setting(containerEl)
			.setName("Review frequency field name")
			.setDesc("Frontmatter field used for high, normal, low, or ignore.")
			.addText((text) => {
				text.setValue(this._plugin.settings.reviewFrequencyFieldName)
					.setPlaceholder("review-frequency")
					.onChange((value) => {
						this._plugin.settings.reviewFrequencyFieldName = value.trim() || "review-frequency";
						this.runAsync(() => this.saveSettingsAndRefresh());
					});
			});
	}

	private renderNoteSetSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Note Sets")
			.setHeading();

		if (this._plugin.settings && this._plugin.settings.noteSets) {
			this._plugin.settings.noteSets.forEach((noteSet, index) => {
				this._plugin.noteSetService.updateNoteSetDisplayNameAndDescription(
					noteSet
				);

				const setting = new Setting(containerEl);

				setting.setName(`Note Set "${noteSet.displayName}"`);
				const staleReasons = this._plugin.noteSetService.getQueueStaleReasons(noteSet);
				const descriptionParts = [
					this._plugin.noteSetService.getQueueProgressText(noteSet),
				];
				if (staleReasons.length > 0) {
					descriptionParts.push("queue may be stale");
				}
				setting.setDesc(descriptionParts.join(" | "));

				const updateHeader = (text: string): void => {
					setting.setName(`Note Set "${text}"`);
				};

				updateHeader(noteSet.displayName);

				if (noteSet?.validationErrors?.length > 0) {
					setting.addExtraButton((cb) => {
						cb.setIcon("alert-triangle")
						.setTooltip(noteSet?.validationErrors.join(";\n"));
					});
				}

				if (staleReasons.length > 0) {
					setting.addExtraButton((cb) => {
						cb.setIcon("history")
							.setTooltip(`Queue may be stale:\n${staleReasons.join(";\n")}`);
					});
				}

				setting.addExtraButton((cb) => {
					cb.setIcon("info")
						.setTooltip("Note set info & stats")
						.onClick(() => {
							new NoteSetInfoModal(
								this.app,
								noteSet,
								this._plugin.noteSetService
							).open();
						});
				});

				setting.addExtraButton((cb) => {
					cb.setIcon("rotate-cw")
						.setTooltip("Reset review queue and update stats for this note set")
						.onClick(() => {
							new NoteSetResetModal(this.app, noteSet, () => {
								this.runAsync(async () => {
									await this._plugin.noteSetService.validateRulesAndSave(noteSet);
									await this._plugin.reviewService.resetNotesetQueueWithValidation(noteSet.id);
									await this._plugin.noteSetService.updateNoteSetStats(noteSet);
									this.display();
								});
							}).open();
						});
				});

				setting.addExtraButton(cb => {
					cb.setIcon("arrow-up")
					.setTooltip("Move element up")
					.setDisabled(index === 0)
					.onClick(() => {
						if (index > 0) {
							const temp = this._plugin.settings.noteSets[index - 1].sortOrder;
							this._plugin.settings.noteSets[index - 1].sortOrder = noteSet.sortOrder;
							noteSet.sortOrder = temp;
							this.runAsync(() => this.saveSettingsAndRefresh());
							this.display();
						}
					});
				});

				setting.addExtraButton(cb => {
					cb.setIcon("arrow-down")
					.setTooltip("Move element down")
					.setDisabled(index >= this._plugin.settings.noteSets.length - 1)
					.onClick(() => {
						if (index < this._plugin.settings.noteSets.length - 1) {
							const temp = this._plugin.settings.noteSets[index + 1].sortOrder;
							this._plugin.settings.noteSets[index + 1].sortOrder = noteSet.sortOrder;
							noteSet.sortOrder = temp;
							this.runAsync(() => this.saveSettingsAndRefresh());
							this.display();
						}
					});
				});

				setting.addExtraButton((cb) => {
					cb.setIcon("edit")
						.setTooltip("Edit Note set")
						.onClick(() => {
							const modal = new NoteSetEditModal(noteSet, this._plugin);
							modal.open();
							modal.onClose = () => {
								this.refresh();
							};
						});
				});

				setting.addExtraButton((cb) => {
					cb.setIcon("trash")
						.setTooltip("Delete note set")
						.onClick(() => {
							new NoteSetDeleteModal(
								this.app,
								this,
								noteSet,
								this._plugin.noteSetService
							).open();
						});
				});
			});
		}

		new Setting(containerEl).addButton((btn) => {
			btn.setButtonText("Add Note Set");
			btn.onClick(async () => {
				await this._plugin.noteSetService.addEmptyNoteSet();
				this.refresh();
			});
		});
	}

	private renderSidebarSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Side Bar")
			.setHeading();

		this.addReviewStartBehaviorSetting(
			containerEl,
			"Automatically open side bar when starting review",
			"Open the sidebar after a review starts.",
			this._plugin.settings.sidebarOpenOnStart,
			(value) => {
				this._plugin.settings.sidebarOpenOnStart = value;
			},
			"If bottom bar is hidden"
		);

		this.addToggleSetting(
			containerEl,
			"Compact mode",
			"Use tighter spacing for sidebar rows.",
			this._plugin.settings.sidebarCompactMode,
			(value) => {
				this._plugin.settings.sidebarCompactMode = value;
			},
			"sidebar"
		);

		this.addToggleSetting(
			containerEl,
			"Show additional info about current note",
			"Show reviewed date, review frequency, and queue status in the current note actions row.",
			this._plugin.settings.sidebarShowCurrentNoteInfo,
			(value) => {
				this._plugin.settings.sidebarShowCurrentNoteInfo = value;
			},
			"sidebar"
		);

		this.addToggleSetting(
			containerEl,
			"Show note count",
			"Show queue progress for each note set.",
			this._plugin.settings.sidebarShowNoteCount,
			(value) => {
				this._plugin.settings.sidebarShowNoteCount = value;
			},
			"sidebar"
		);

		this.addToggleSetting(
			containerEl,
			"Show random button",
			"Show the random note button on each note set row.",
			this._plugin.settings.sidebarShowRandomButton,
			(value) => {
				this._plugin.settings.sidebarShowRandomButton = value;
			},
			"sidebar"
		);

		this.addToggleSetting(
			containerEl,
			"Show open bottom bar button",
			"Show the button that opens the bottom bar from the sidebar.",
			this._plugin.settings.sidebarShowOpenBottomBarButton,
			(value) => {
				this._plugin.settings.sidebarShowOpenBottomBarButton = value;
			},
			"sidebar"
		);

		this.addToggleSetting(
			containerEl,
			"Show Settings button",
			"Show the button that opens this plugin's settings from the sidebar.",
			this._plugin.settings.sidebarShowSettingsButton,
			(value) => {
				this._plugin.settings.sidebarShowSettingsButton = value;
			},
			"sidebar"
		);
	}

	private renderBottomBarSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Bottom Bar")
			.setHeading();

		this.addReviewStartBehaviorSetting(
			containerEl,
			"Automatically show bottom bar when starting review",
			"Show the bottom bar after a review starts.",
			this._plugin.settings.bottomBarOpenOnStart,
			(value) => {
				this._plugin.settings.bottomBarOpenOnStart = value;
			},
			"If sidebar is hidden"
		);

		this.addToggleSetting(
			containerEl,
			"Show note count",
			"Show queue progress next to the note set selector.",
			this._plugin.settings.bottomBarShowNoteCount,
			(value) => {
				this._plugin.settings.bottomBarShowNoteCount = value;
			},
			"bottomBar"
		);

		this.addToggleSetting(
			containerEl,
			"Show random button",
			"Show the random note button in the bottom bar.",
			this._plugin.settings.bottomBarShowRandomButton,
			(value) => {
				this._plugin.settings.bottomBarShowRandomButton = value;
			},
			"bottomBar"
		);

		this.addToggleSetting(
			containerEl,
			"Show open sidebar button",
			"Show the button that opens the sidebar from the bottom bar.",
			this._plugin.settings.bottomBarShowOpenSidebarButton,
			(value) => {
				this._plugin.settings.bottomBarShowOpenSidebarButton = value;
			},
			"bottomBar"
		);

		this.addToggleSetting(
			containerEl,
			"Show Settings button",
			"Show the button that opens this plugin's settings from the bottom bar.",
			this._plugin.settings.bottomBarShowSettingsButton,
			(value) => {
				this._plugin.settings.bottomBarShowSettingsButton = value;
			},
			"bottomBar"
		);
	}

	private addToggleSetting(
		parentEl: HTMLElement,
		name: string,
		desc: string,
		value: boolean,
		onChange: (value: boolean) => void,
		refreshTarget: RefreshTarget = "none"
	): void {
		new Setting(parentEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) => {
				toggle.setValue(value).onChange((newValue) => {
					onChange(newValue);
					this.runAsync(() => this.saveSettingsAndRefresh(refreshTarget));
				});
			});
	}

	private addReviewStartBehaviorSetting(
		parentEl: HTMLElement,
		name: string,
		desc: string,
		value: ReviewStartUiBehavior,
		onChange: (value: ReviewStartUiBehavior) => void,
		ifOtherHiddenLabel: string
	): void {
		new Setting(parentEl)
			.setName(name)
			.setDesc(desc)
			.addDropdown((dropdown) => {
				dropdown
					.addOption(ReviewStartUiBehavior.yes, "Yes")
					.addOption(ReviewStartUiBehavior.no, "No")
					.addOption(ReviewStartUiBehavior.ifOtherHidden, ifOtherHiddenLabel)
					.setValue(value)
					.onChange((newValue: ReviewStartUiBehavior) => {
						onChange(newValue);
						this.runAsync(() => this.saveSettingsAndRefresh());
					});
			});
	}

	private async saveSettingsAndRefresh(refreshTarget: RefreshTarget = "none"): Promise<void> {
		await this._plugin.saveSettings();

		if (refreshTarget === "sidebar" || refreshTarget === "both") {
			await this._plugin.refreshSidebarViews();
		}

		if (refreshTarget === "bottomBar" || refreshTarget === "both") {
			await this._plugin.bottomBar.render();
		}
	}

	private runAsync(action: () => Promise<void>): void {
		void action().catch((error) => {
			this._plugin.showNotice(error instanceof Error ? error.message : String(error));
			console.error(error);
		});
	}
}
