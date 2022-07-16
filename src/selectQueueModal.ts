import SimpleNoteReviewPlugin from "main";
import { App, SuggestModal } from "obsidian";
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
            q => {
                const name = this._plugin.service.getQueueDisplayName(q);
                return name != "" && name.toLowerCase().includes(query.toLowerCase());
            } )
    }

    renderSuggestion(queue: IQueue, el: HTMLElement) {
        el.createDiv({text: this._plugin.service.getQueueDisplayName(queue)});
    }

    onChooseSuggestion(queue: IQueue, evt: MouseEvent | KeyboardEvent) {
        try {
            this._plugin.settings.currentQueue = queue;
            this._plugin.saveSettings();
            this._plugin.service.openNextFile(queue);
        } catch (error) {
            this._plugin.showNotice(error.message);
            this.open();
        } 
    }  

}