import SimpleNoteReviewPlugin from "main";
import { App, TAbstractFile, TFile } from "obsidian";
import { Review } from "./review";
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
	private _activeReview: Review;

	constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {}

    public async startNewReview(noteSet: INoteSet): Promise<void> {
        await this.createNewReview(noteSet);
        await this.openNextNoteInReview(this._activeReview);
	}


	/** Mark note as reviewed today. If setting "open next note in noteSet after reviewing" is enabled,
	 * open next note in noteSet (current noteSet by default).
	 * @param  {TAbstractFile} note
	 * @param  {INoteSet=this._plugin.settings.currentnoteSet} noteSet
	 * @returns Promise
	 */
	public async reviewNote(
		note: TAbstractFile,
        review: Review = this._activeReview
	): Promise<void> {
		// "note" must be an actual note, not folder
		if (!(note instanceof TFile)) return;
		try {
            this._plugin.fileService.setReviewedToToday(note);
            this.removeNoteFromReview(note, review);
		} catch (error) {
			this._plugin.showNotice(error.message);
		}

		if (this._plugin.settings.openNextNoteAfterReviewing) {
            await this.openNextNoteInReview(review);
		}
	}

	// TODO
    public async skipCurrentNote(): Promise<void> {

    }

    // TODO
    private removeNoteFromReview(note: TAbstractFile, review: Review = this._activeReview): void {

    }

    // TODO
    private async openNextNoteInReview(review: Review): Promise<void> {

    }


    // TODO
    private async createNewReview(noteSet: INoteSet): Promise<void> {

    }

    // TODO: remove; use logic for populating new review
	private async getNextFilePath(
		noteSet: INoteSet,
		reviewAlgorithm: ReviewAlgorithm = this._plugin.settings.reviewAlgorithm
	): Promise<string> {
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
			let firstNoteIndex: number;
			switch (reviewAlgorithm) {
				case ReviewAlgorithm.random:
					firstNoteIndex = ~~(Math.random() * sorted.length);
					break;
				case ReviewAlgorithm.default:
				default:
					firstNoteIndex = 0;
					break;
			}
			const firstInNoteSetPath = sorted[firstNoteIndex]?.file?.path;

			if (!firstInNoteSetPath) throw new OpenNextFileInNoteSetError();

			if (sorted.length === 1) {
				return firstInNoteSetPath;
			}
			const nextInnoteSetPath = sorted[1]?.file?.path;
			// sometimes DV cache does not update in time so we have to take next note in set
			return this.pathEqualsCurrentFilePath(firstInNoteSetPath)
				? nextInnoteSetPath
				: firstInNoteSetPath;
		}
		throw new NoteSetEmptyError();
	}

	private pathEqualsCurrentFilePath(path: string): boolean {
		return path === this._app.workspace.getActiveFile()?.path;
	}
}
