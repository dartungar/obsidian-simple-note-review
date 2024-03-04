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

	public async startReview(noteSet: INoteSet): Promise<void> {
		await this.createNotesetQueueIfNotExists(noteSet);
		await this.openNextNoteInQueue(noteSet);
	}

	public async resetNotesetQueue(noteset: INoteSet): Promise<void> {
		await this.createNotesetQueue(noteset);
	}

	/** Mark note as reviewed today. If setting "open next note in noteSet after reviewing" is enabled,
	 * open next note in noteSet (current noteSet by default).
	 * @param  {TAbstractFile} note
	 * @param  {INoteSet=this._plugin.settings.currentnoteSet} noteSet
	 * @returns Promise
	 */
	public async reviewNote(
		note: TAbstractFile,
		noteSet: INoteSet
	): Promise<void> {
		// "note" must be an actual note, not folder
		if (!(note instanceof TFile)) return;
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

	public async openRandomNoteInQueue(noteSet: INoteSet) {
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
		noteSet: INoteSet
	): Promise<void> {
		// TODO: check if current note is in queue
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
		const errorMsgBase = `Error opening next note in note set ${noteSet.displayName}: `;
		if (
			noteSet.queue?.filenames?.length &&
			noteSet.queue?.filenames?.length === 0
		) {
			this._plugin.showNotice(errorMsgBase + "review queue is empty.");
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

	private async createNotesetQueue(noteSet: INoteSet): Promise<void> {
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
			await this.createNotesetQueue(noteSet);
		}
	}

	private async generateNotesetQueue(noteSet: INoteSet): Promise<string[]> {
		const reviewedFieldName = this._plugin.settings.reviewedFieldName;
		const freqFieldname = this._plugin.settings.reviewFrequencyFieldName;
		const pages = (
			await this._dataviewService.getNoteSetFiles(noteSet)
		).filter((x) => x[freqFieldname] !== ReviewFrequency.ignore);
		let sorted: DataArray<Record<string, any>>;

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
