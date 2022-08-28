import { IQueue } from "./IQueue";
import { App, TAbstractFile, TFile} from "obsidian";
import SimpleNoteReviewPlugin from "main";
import { DataviewService } from "./dataviewService";
import { QueueInfoService } from "./queueInfoService";


export class QueueEmptyError extends Error {
    message = "Queue is empty";
}
export class DataviewQueryError extends Error { }

export class QueueService {
    private _dataviewService = new DataviewService();
    private _queueInfoService = new QueueInfoService(this._dataviewService);

    constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) { }

    /** Mark note as reviewed today. If setting "open next note in queue after reviewing" is enabled,
     * open next note in queue (current queue by default).
     * @param  {TAbstractFile} note
     * @param  {IQueue=this._plugin.settings.currentQueue} queue
     * @returns Promise
     */


    public updateQueueDisplayNames() {
        this._plugin.settings.queues.forEach(q => this.updateQueueDisplayNameAndDescription(q));
    } 

    public updateQueueDisplayNameAndDescription(queue: IQueue) {
        this._queueInfoService.updateQueueDisplayNameAndDescription(queue);
    }

    public updateQueueStats(queue: IQueue) {
        this._queueInfoService.updateQueueStats(queue);
    }

    public async reviewNote(note: TAbstractFile, queue: IQueue = this._plugin.settings.currentQueue): Promise<void> {
        // "note" must be an actual note, not folder
        if (!(note instanceof TFile))
            return;
        try {
            await this.setMetadataValueToToday(note);
        } catch (error) {
            this._plugin.showNotice(error.message);
        }
        
        if (this._plugin.settings.openNextNoteAfterReviewing) {
            await this.openNextFile(queue);
        }
    }


    /** Open next file in queue.
     * @param  {IQueue} queue
     * @returns Promise
     */
    public async openNextFile(queue: IQueue): Promise<void> {
        const filePath = this.getNextFilePath(queue);
        const abstractFile = this._app.vault.getAbstractFileByPath(filePath);
        await this._app.workspace.getLeaf().openFile(abstractFile as TFile); 
    }


    /** Set value of metadata field "reviewed" to today in yyyy-mm-dd format.
     * @param  {TFile} file
     * @returns Promise
     */
    public async setMetadataValueToToday(file: TFile): Promise<void> {
        const todayString = new Date().toISOString().slice(0, 10); // "yyyy-mm-dd"
        await this.changeOrAddMetadataValue(file, todayString);
        this._plugin.showNotice(`Marked note "${file.path}" as reviewed today.`)
    }

    private getNextFilePath(queue: IQueue): string {
        const pages = this._dataviewService.getQueueFiles(queue);
        const sorted = pages.sort(x => x[this._plugin.settings.fieldName], "asc").array();
        if (sorted.length > 0) {
            const firstNoteIndex = this._plugin.settings.openRandomNote ? ~~(Math.random() * sorted.length) : 0;
            const firstInQueue = sorted[firstNoteIndex]["file"]["path"];
            if (sorted.length === 1) {
                return firstInQueue;
            }
            const nextInQueue = sorted[1]["file"]["path"];
            return this.pathEqualsCurrentFilePath(firstInQueue) ? nextInQueue : firstInQueue;
        } 
        throw new QueueEmptyError();
    }

    private pathEqualsCurrentFilePath(path: string): boolean {
        return path === this._app.workspace.getActiveFile().path;
    }

    // TODO: check if async works / is really needed
    // TODO: do not mangle metadata
    private async changeOrAddMetadataValue(file: TFile = null, value: string): Promise<void> {
        const newFieldValue = `${this._plugin.settings.fieldName}: ${value}`;
        const fileContentSplit = (await this._app.vault.read(file)).split("\n");
        const page = this._dataviewService.getPageFromPath(file.path);
        if (!page[this._plugin.settings.fieldName]) {
            if (fileContentSplit[0] !== "---") {
                fileContentSplit.unshift("---");
                fileContentSplit.unshift("---");
            }
            fileContentSplit.splice(1, 0, newFieldValue);

            await this._app.vault.modify(file, fileContentSplit.join("\n"));
            return;
        } 

        const newContent = fileContentSplit.map(line => {
            if (!line.startsWith(this._plugin.settings.fieldName)) return line; // TODO: more precise matching
            return newFieldValue;
        });
        await this._app.vault.modify(file, newContent.join("\n"));
    }

}