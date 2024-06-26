import SimpleNoteReviewPlugin from "main";
import { App, TAbstractFile, TFile } from "obsidian";
import { NoteQueue } from "./noteQueue";
import { DataArray } from "obsidian-dataview";
import { INoteSet } from "src/noteSet/INoteSet";
import { calculateNoteReviewPriority } from "src/noteSet/noteReviewPriorityHelpers";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { DataviewService } from "src/dataview/dataviewService";

export class ReviewService {
	private _dataviewService = new DataviewService();

	constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {}

	public async startReview(noteSetId: string): Promise<void> {
		const noteset = this._plugin.noteSetService.getNoteSet(noteSetId);
		await this.createNotesetQueueIfNotExists(noteset);
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
		note: TAbstractFile,
		noteSetId: string
	): Promise<void> {
		// "note" must be an actual note, not folder
		if (!(note instanceof TFile)) return;

		const noteSet = this._plugin.noteSetService.getNoteSet(noteSetId);

		try {
			this._plugin.fileService.setReviewedToToday(note);
			this.removeNoteFromQueue(note, noteSet);
		} catch (error) {
			this._plugin.showNotice(error.message);
		}

		if (this._plugin.settings.openNextNoteAfterReviewing) {
			await this.openNextNoteInQueue(noteSet);
		}
	}

	public async openRandomNoteInQueue(noteSetId: string) {
		const noteSet = this._plugin.noteSetService.getNoteSet(noteSetId);

		await this.createNotesetQueueIfNotExists(noteSet);

		const randomIndex = Math.floor(
			Math.random() * noteSet.queue.filenames.length
		);
		const filePath = noteSet.queue.filenames[randomIndex];
		const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
		await this._app.workspace
			.getMostRecentLeaf()
			.openFile(abstractFile as TFile);
	}

	public async skipNote(
		note: TAbstractFile,
		noteSetId: string
	): Promise<void> {
		// TODO: check if current note is in queue
		const noteSet = this._plugin.noteSetService.getNoteSet(noteSetId);
		this.removeNoteFromQueue(note, noteSet);
		await this.openNextNoteInQueue(noteSet);
	}

	private async removeNoteFromQueue(
		note: TAbstractFile,
		noteSet: INoteSet
	): Promise<void> {
		noteSet.queue.filenames.remove(note.path);
		await this._plugin.noteSetService.saveNoteSet(noteSet);
	}

	private async openNextNoteInQueue(noteSet: INoteSet): Promise<void> {
		const errorMsgBase = `Error opening next note in note set ${noteSet.displayName}: \n`;
		if (!noteSet.queue?.filenames?.length) {
			this._plugin.showNotice(errorMsgBase + "review queue is empty. Check note set in plugin settings.");
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
		const leaf = this._app.workspace.getMostRecentLeaf();
		if (!leaf) {
			this._plugin.showNotice(
				errorMsgBase + "could not get a leaf from Obsidian."
			);
			return;
		}
		await leaf.openFile(abstractFile as TFile);
	}

	private async createNotesetQueueWithValidation(noteSet: INoteSet): Promise<void> {
		const files = await this.generateNotesetQueue(noteSet);
		noteSet.queue = new NoteQueue(files);
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

	private async generateNotesetQueue(noteSet: INoteSet): Promise<string[]> {
		const reviewedFieldName = this._plugin.settings.reviewedFieldName;
		const freqFieldname = this._plugin.settings.reviewFrequencyFieldName;
		const pages = (
			await this._dataviewService.getNoteSetFiles(noteSet)
		).filter((x) => x[freqFieldname] !== ReviewFrequency.ignore);
		let sorted: DataArray<Record<string, TFile>>;

		if (this._plugin.settings.useReviewFrequency) {
			sorted = pages.sort(
				(x) => calculateNoteReviewPriority(this._plugin, x),
				"desc"
			);
		} else {
			sorted = pages.sort((x) => x[reviewedFieldName], "asc");
		}

		if (sorted.length > 0) {
			return sorted.map((x) => x.file.path).array();
		}

		return [];
	}
}
