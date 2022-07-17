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
        this.setPlaceholder("Select a queue to start reviewing notes");
        return this._plugin.settings.queues.filter(
            q => {
                if (query == "") return true;
                const name = this._plugin.service.getQueueDisplayName(q);
                if (!name || name == "") return false;
                return name && name != "" && name.toLowerCase().includes(query.toLowerCase());
            });
    }

    renderSuggestion(queue: IQueue, el: HTMLElement) {
        el.createDiv({text: this._plugin.service.getQueueDisplayName(queue)});
        el.createEl("small", {text: this._plugin.service.getQueueDescription(queue)}).style.opacity = "60%";
    }

    onChooseSuggestion(queue: IQueue, evt: MouseEvent | KeyboardEvent) {
        try {
            this._plugin.settings.currentQueue = queue;
            this._plugin.saveSettings();
            this._plugin.showNotice(`Set current queue to ${this._plugin.service.getQueueDisplayName(queue)}.`);
            this._plugin.service.openNextFile(queue);
        } catch (error) {
            this._plugin.showNotice(error.message);
            this.open();
        } 
    }  

}