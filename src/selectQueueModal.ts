import SimpleNoteReviewPlugin from "main";
import { App, Notice, SuggestModal } from "obsidian";
import { IQueue } from "./IQueue";

export class SelectQueueModal extends SuggestModal<IQueue> {
    /**
     *
     */
    constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {
        super(_app);
    }

    getSuggestions(query: string): IQueue[] | Promise<IQueue[]> {
        return this._plugin.settings.queues.filter(
            q => q.name && q.name.toLowerCase().includes(query.toLowerCase()))
    }

    renderSuggestion(queue: IQueue, el: HTMLElement) {
        el.createDiv({text: queue.name});
    }

    onChooseSuggestion(queue: IQueue, evt: MouseEvent | KeyboardEvent) {
        try {
            this._plugin.service.openNextFile(queue);
        } catch (error) {
            new Notice(error.message);
            this.open();
        } 
    }  

}