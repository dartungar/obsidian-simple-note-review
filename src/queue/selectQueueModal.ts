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

    getSuggestions(query: string): IQueue[] {
        this.setPlaceholder("Select a queue to start reviewing notes");
        return this._plugin.settings.queues.filter(
            q => {
                if (query === "") {
                    return true;
                } 

                const name = q.displayName;
                if (!name || name === "") {
                    return false;
                } 
                
                return name.toLowerCase().includes(query.toLowerCase());
            });
    }

    renderSuggestion(queue: IQueue, el: HTMLElement) {
        el.createDiv({text: queue.displayName});
        el.createEl("small", {text: queue.description}).style.opacity = "60%";
    }

    async onChooseSuggestion(queue: IQueue, evt: MouseEvent | KeyboardEvent) {
        try {
            this._plugin.settings.currentQueue = queue;
            this._plugin.saveSettings();
            this._plugin.showNotice(`Set current queue to ${queue.displayName}.`);
            await this._plugin.service.openNextFile(queue);
        } catch (error) {
            this._plugin.showNotice(error.message);
            this.open();
        } 
    }  

}