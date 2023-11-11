import SimpleNoteReviewPlugin from "main";
import { App, SuggestModal } from "obsidian";
import { INoteSet } from "../noteSet/INoteSet";

export class SelectNoteSetModal extends SuggestModal<INoteSet> {
    /**
     *
     */
    constructor(private _app: App, private _plugin: SimpleNoteReviewPlugin) {
        super(_app);
    }

    getSuggestions(query: string): INoteSet[] {
        this.setPlaceholder("Select a note set to start reviewing notes");
        return this._plugin.settings.noteSets.filter(
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

    renderSuggestion(noteSet: INoteSet, el: HTMLElement) {
        el.createDiv({text: noteSet.displayName});
        el.createEl("small", {text: noteSet.description}).style.opacity = "60%";
    }

    async onChooseSuggestion(noteSet: INoteSet, evt: MouseEvent | KeyboardEvent) {
        try {
            this._plugin.settings.currentNoteSet = noteSet;
            this._plugin.saveSettings();
            this._plugin.showNotice(`Set current note set to ${noteSet.displayName}.`);
            await this._plugin.noteSetService.openNextFile(noteSet);
        } catch (error) {
            console.error(error.message);
            this._plugin.showNotice(error.message);
            this.open();
        } 
    }  

}