import SimpleNoteReviewPlugin from "main";
import { App, SuggestModal } from "obsidian";
import { INoteSet } from "../noteSet/INoteSet";
import { NoteSetEmptyError } from "src/noteSet/noteSetService";

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
            await this._plugin.reviewService.startReview(noteSet.id);
            this._plugin.settings.currentNoteSetId = noteSet.id;
            this._plugin.showNotice(`Set current note set to ${noteSet.displayName}.`);
            this._plugin.saveSettings();
        }         
        catch (error) {
			if (error instanceof NoteSetEmptyError) {
				this._plugin.showNotice(`note set ${noteSet.displayName ?? noteSet.name} is empty.`)
			} 
            throw error;
		} 
    }  

}