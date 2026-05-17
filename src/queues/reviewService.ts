import SimpleNoteReviewPlugin from "main";
import { App, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { NoteQueue } from "./noteQueue";
import { DataArray } from "obsidian-dataview";
import { INoteSet } from "src/noteSet/INoteSet";
import { NoteSetEmptyError } from "src/noteSet/noteSetService";
import { calculateNoteReviewPriority, getReviewFrequencyFromMetadataValue } from "src/noteSet/noteReviewPriorityHelpers";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { DataviewService } from "src/dataview/dataviewService";
import { DataviewPage } from "src/dataview/dataviewFacade";
import { ReviewAlgorithm } from "src/settings/reviewAlgorightms";

export class ReviewService {
	private _dataviewService = new DataviewService();

	constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {}

	public async startReview(noteSetId: string): Promise<void> {
		const noteset = this._plugin.noteSetService.getNoteSet(noteSetId);
		await this.createNotesetQueueIfNotExists(noteset);
		if (!this.hasQueuedNotes(noteset)) {
			throw new NoteSetEmptyError();
		}
		await this.openNextNoteInQueue(noteset);
	}

	public async resetNotesetQueueWithValidation(noteSetId: string): Promise<void> {
		const noteset = this._plugin.noteSetService.getNoteSet(noteSetId);
		await this.createNotesetQueueWithValidation(noteset);
	}

	/** Mark note as reviewed today. If setting "open next note in noteSet after reviewing" is enabled,
	 * open next note in noteSet (current noteSet by default).
	 * @param  {TAbstractFile} note
	 * @param  {INoteSet=this._plugin.settings.currentnoteSet} noteSet
	 * @returns Promise
	 */
	public async reviewNote(
		note: TAbstractFile | null,
		noteSetId: string
	): Promise<void> {
		// "note" must be an actual note, not folder
		if (!(note instanceof TFile)) {
			this._plugin.showNotice("No active note selected.");
			return;
		}

		const noteSet = this._plugin.noteSetService.getNoteSet(noteSetId);

		try {
			await this._plugin.fileService.setReviewedToToday(note);
			await this.removeNoteFromQueue(note, noteSet);
		} catch (error) {
			this._plugin.showNotice(this.getErrorMessage(error));
			return;
		}

		if (!this.hasQueuedNotes(noteSet)) {
			this.showReviewCompleteNotice(noteSet);
			return;
		}

		if (this._plugin.settings.openNextNoteAfterReviewing) {
			await this.openNextNoteInQueue(noteSet);
		}
	}

	public async openRandomNoteInQueue(noteSetId: string) {
		const noteSet = this._plugin.noteSetService.getNoteSet(noteSetId);

		await this.createNotesetQueueIfNotExists(noteSet);
		if (!this.hasQueuedNotes(noteSet)) {
			throw new NoteSetEmptyError();
		}

		const randomIndex = Math.floor(
			Math.random() * noteSet.queue.filenames.length
		);
		const filePath = noteSet.queue.filenames[randomIndex];
		const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
		if (!(abstractFile instanceof TFile)) {
			this._plugin.showNotice(`Could not get the note file with path "${filePath}" from Obsidian.`);
			return;
		}
		const leaf = this.getLeafForNote();
		if (!leaf) {
			this._plugin.showNotice("Could not get a leaf from Obsidian.");
			return;
		}
		await leaf.openFile(abstractFile);
	}

	public async skipNote(
		note: TAbstractFile | null,
		noteSetId: string
	): Promise<void> {
		if (!(note instanceof TFile)) {
			this._plugin.showNotice("No active note selected.");
			return;
		}
		const noteSet = this._plugin.noteSetService.getNoteSet(noteSetId);
		await this.removeNoteFromQueue(note, noteSet);
		if (!this.hasQueuedNotes(noteSet)) {
			this.showReviewCompleteNotice(noteSet);
			return;
		}
		await this.openNextNoteInQueue(noteSet);
	}

	private async removeNoteFromQueue(
		note: TFile,
		noteSet: INoteSet
	): Promise<void> {
		noteSet.queue.filenames.remove(note.path);
		await this._plugin.noteSetService.saveNoteSet(noteSet);
	}

	private async openNextNoteInQueue(noteSet: INoteSet): Promise<void> {
		const errorMsgBase = `Error opening next note in note set ${noteSet.displayName}: \n`;
		if (!noteSet.queue?.filenames?.length) {
			this.showReviewCompleteNotice(noteSet);
			return;
		}
		const filePath = noteSet.queue.filenames[0];
		const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
		if (!abstractFile || !(abstractFile instanceof TFile)) {
			this._plugin.showNotice(
				errorMsgBase +
					`could not get the note file with path "${filePath}" from Obsidian.`
			);
			return;
		}
		const leaf = this.getLeafForNote();
		if (!leaf) {
			this._plugin.showNotice(
				errorMsgBase + "could not get a leaf from Obsidian."
			);
			return;
		}
		await leaf.openFile(abstractFile);
	}

	private async createNotesetQueueWithValidation(noteSet: INoteSet): Promise<void> {
		const files = await this.generateNotesetQueue(noteSet);
		noteSet.queue = new NoteQueue(
			files,
			this._plugin.noteSetService.getQueueRulesHash(noteSet)
		);
		await this._plugin.noteSetService.validateRulesAndSave(noteSet);
		if (noteSet?.validationErrors?.length > 0) {
			const errorsString = noteSet.validationErrors.join(";\n");
			this._plugin.showNotice(
				`Error while trying to create review queue for note set "${noteSet.displayName}":\n ${errorsString}`
			);
		}
	}


	private async createNotesetQueueIfNotExists(
		noteSet: INoteSet
	): Promise<void> {
		if (
			!noteSet.queue ||
			!noteSet.queue?.filenames?.length ||
			noteSet.queue.filenames.length === 0
		) {
			await this.createNotesetQueueWithValidation(noteSet);
		}
	}

	private hasQueuedNotes(noteSet: INoteSet): boolean {
		return noteSet.queue?.filenames?.length > 0;
	}

	private async generateNotesetQueue(noteSet: INoteSet): Promise<string[]> {
		const reviewedFieldName = this._plugin.settings.reviewedFieldName;
		const freqFieldname = this._plugin.settings.reviewFrequencyFieldName;
		const pages = (
			await this._dataviewService.getNoteSetFiles(noteSet)
		).filter((x) => this.noteShouldBeReviewed(x, freqFieldname));
		let sorted: DataArray<DataviewPage>;

		if (this._plugin.settings.useReviewFrequency) {
			sorted = pages.sort(
				(x) => calculateNoteReviewPriority(this._plugin, x),
				"desc"
			);
		} else {
			sorted = pages.sort((x) => x[reviewedFieldName], "asc");
		}

		if (sorted.length > 0) {
			const filePaths = sorted.map((x) => x.file.path).array();
			if (this._plugin.settings.reviewAlgorithm === ReviewAlgorithm.random) {
				return this.shuffle(filePaths);
			}

			return filePaths;
		}

		return [];
	}

	private noteShouldBeReviewed(note: DataviewPage, frequencyFieldName: string): boolean {
		return getReviewFrequencyFromMetadataValue(note[frequencyFieldName]) !== ReviewFrequency.ignore;
	}

	private getLeafForNote(): WorkspaceLeaf | null {
		const recentLeaf = this._app.workspace.getMostRecentLeaf();
		if (recentLeaf?.view.getViewType() === "markdown") {
			return recentLeaf;
		}

		const activeLeaf = this._app.workspace.getLeaf(false);
		if (activeLeaf.view.getViewType() === "markdown") {
			return activeLeaf;
		}

		const existingMarkdownLeaf = this._app.workspace.getLeavesOfType("markdown")[0];
		if (existingMarkdownLeaf) {
			return existingMarkdownLeaf;
		}

		return activeLeaf;
	}

	private shuffle(filePaths: string[]): string[] {
		const shuffled = [...filePaths];
		for (let index = shuffled.length - 1; index > 0; index--) {
			const randomIndex = Math.floor(Math.random() * (index + 1));
			[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
		}

		return shuffled;
	}

	private showReviewCompleteNotice(noteSet: INoteSet): void {
		this._plugin.showNotice(`Finished review for "${noteSet.displayName}".`);
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
