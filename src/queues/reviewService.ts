import SimpleNoteReviewPlugin from "main";
import { App, TAbstractFile, TFile } from "obsidian";
import { INoteQueue, NoteQueue } from "./noteQueue";
import { DataArray } from "obsidian-dataview";
import { INoteSet } from "src/noteSet/INoteSet";
import { calculateNoteReviewPriority } from "src/noteSet/noteReviewPriorityHelpers";
import {
	OpenNextFileInNoteSetError,
	NoteSetEmptyError,
} from "src/noteSet/noteSetService";
import { ReviewFrequency } from "src/noteSet/reviewFrequency";
import { ReviewAlgorithm } from "src/settings/reviewAlgorightms";
import { DataviewService } from "src/dataview/dataviewService";

export class ReviewService {
    private _dataviewService = new DataviewService();
	private _activeQueue: INoteQueue;

	constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {}

	public async startReview(noteSet: INoteSet): Promise<void> {
		if (!noteSet.queue?.filenames?.length || noteSet.queue.filenames.length === 0) {
			this._plugin.showNotice("starting a fresh review...")
			await this.createNotesetQueue(noteSet);
		}
        	
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
			this.openNextNoteInQueue(noteSet);
		} catch (error) {
			this._plugin.showNotice(error.message);
		}

		if (this._plugin.settings.openNextNoteAfterReviewing) {
            await this.openNextNoteInQueue(noteSet);
		}
	}
	
	// TODO
	public async openRandomNoteInQueue(noteSet: INoteSet) {
		let randomIndex = Math.floor(Math.random() * noteSet.queue.filenames.length);
    	let filePath = noteSet.queue.filenames[randomIndex];
		const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        await this._app.workspace.getLeaf().openFile(abstractFile as TFile);
	}

	// TODO
    public async skipNote(note: TAbstractFile, noteSet: INoteSet): Promise<void> {
		// TODO: check if current note is in queue
		this.removeNoteFromQueue(note, noteSet);
		await this.openNextNoteInQueue(noteSet);
    }

    // TODO
    private async removeNoteFromQueue(note: TAbstractFile, noteSet: INoteSet): Promise<void> {
		noteSet.queue.filenames.remove(note.path);
		await this._plugin.saveSettings();
    }

    // TODO
    private async openNextNoteInQueue(noteSet: INoteSet): Promise<void> {
		let filePath = noteSet.queue.filenames[0];
		const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        await this._app.workspace.getLeaf().openFile(abstractFile as TFile);
    }

    // TODO
    private async createNotesetQueue(noteSet: INoteSet): Promise<void> {
		let files = await this.generateNotesetQueue(noteSet);
		noteSet.queue = new NoteQueue(files);
		await this._plugin.saveSettings();
    }

    // TODO: remove; use logic for populating new review
	private async generateNotesetQueue(
		noteSet: INoteSet
	): Promise<string[]> {
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
			return sorted.map(x => x.file.path).array();
		}
		throw new NoteSetEmptyError();
	}

	private pathEqualsCurrentFilePath(path: string): boolean {
		return path === this._app.workspace.getActiveFile()?.path;
	}
}