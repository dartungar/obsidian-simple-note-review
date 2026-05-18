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
        el.createEl("small", {
            text: noteSet.description,
            cls: "simple-note-review-muted",
        });
    }

    async onChooseSuggestion(noteSet: INoteSet, _evt: MouseEvent | KeyboardEvent) {
        const previousNoteSetId = this._plugin.settings.currentNoteSetId;
        try {
            await this._plugin.startReview(noteSet.id);
            if (previousNoteSetId !== noteSet.id) {
                this._plugin.showNotice(`Set current note set to ${noteSet.displayName}.`);
            }
        }         
        catch (error) {
			if (error instanceof NoteSetEmptyError) {
				this._plugin.showNotice(`note set ${noteSet.displayName ?? noteSet.name} is empty.`)
                return;
			}
            this._plugin.showNotice(error instanceof Error ? error.message : String(error));
            console.error(error);
		} 
    }  

}
