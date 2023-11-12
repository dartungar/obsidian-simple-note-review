import SimpleNoteReviewPlugin from "main";
import { ButtonComponent, Modal, Setting, debounce, setIcon } from "obsidian";
import { INoteSet } from "src/noteSet/INoteSet";
import { JoinLogicOperators } from "src/settings/joinLogicOperators";


export class NoteSetEditModal extends Modal {

    constructor(private _noteSet: INoteSet, private _plugin: SimpleNoteReviewPlugin) {
        super(app);
    }
        
    onOpen() {
        
        const { contentEl } = this;

        contentEl.createEl("h3", {text: `Note set "${this._noteSet.displayName}"`});

        const nameSetting = new Setting(contentEl);
        nameSetting.setName("Name");
        nameSetting.setDesc("If omitted, the name will be created from tags, folders, or dataviewJS query (if these are set).")
        nameSetting.addText(textField => {
            textField.setValue(this._noteSet.name)
            .setPlaceholder(this._noteSet.displayName)
            .onChange(value => {
                if (value === this._noteSet.name) {
                    return;
                }
                this._noteSet.name = value != "" ? value : null;
                if (value == "") {
                    textField.setPlaceholder(this._noteSet.displayName);
                }
            })
        });

        const tagsSetting = new Setting(contentEl);
        tagsSetting.setName("Tags");
        tagsSetting.setDesc(`One or more tags, separated by comma. Note set will contain notes tagged with ${this._noteSet.tagsJoinType === JoinLogicOperators.AND ? "all" : "any"} of these. Example: #review, #knowledge`)			
        tagsSetting.addTextArea(textArea => {
            textArea.setValue(this._noteSet.tags ? this._noteSet.tags.join(",") : "")
            .setPlaceholder("Tags")
            .onChange(value => {
                this._noteSet.tags = value != "" ? value.split(',').map(f => f.trim()) : [];
            });
        });

        const foldersSetting = new Setting(contentEl);
        foldersSetting.setName("Folders");
        foldersSetting.setDesc(`One or more folder paths relative to vault root, surrounded by quotes and separated by comma. Note set will contain notes located in any of these. Top-level folders must not contain slash in their path.  Example: "notes", "notes/programming"`)			
        foldersSetting.addTextArea(textArea => {
            textArea.setValue(this._noteSet.folders ? this._noteSet.folders.join(',') : "")
            .setPlaceholder("Folders")
            .onChange(value => {
                this._noteSet.folders = value != "" ? value.split(',').map(f => f.trim()) : [];
            });
        });

        const createdDateSetting = new Setting(contentEl);
        createdDateSetting.setName("Created in last N days");
        createdDateSetting.setDesc(`Number of days`);			
        createdDateSetting.addText(text => {
            text.inputEl.type = 'number';
            text.setValue(`${this._noteSet.createdInLastNDays}`);
            text.onChange(async (val) => {
                this._noteSet.createdInLastNDays = parseInt(val);
            } );
          });

        const modifiedDateSetting = new Setting(contentEl);
        modifiedDateSetting.setName("Modified in last N days");
        modifiedDateSetting.setDesc(`Number of days`);			
        modifiedDateSetting.addText(text => {
            text.inputEl.type = 'number';
            text.setValue(`${this._noteSet.modifiedInLastNDays}`);
            text.onChange(async (val) => {
                this._noteSet.modifiedInLastNDays = parseInt(val);
            } );
        });




        // Advanced Settings

        const advancedSectionHeader = new Setting(contentEl);
        advancedSectionHeader.setHeading();
        advancedSectionHeader.setName("Advanced Settings");

        const advancedSectionBodyEl = contentEl.createDiv({cls: ["setting-body-advanced", "is-collapsed"]});

        const tagJoinTypeSetting = new Setting(advancedSectionBodyEl);
        tagJoinTypeSetting.setName("If tags are specified, match notes with:")
        tagJoinTypeSetting.addDropdown(dropdown => {
            dropdown
            .addOption(JoinLogicOperators.OR, "any of the tags")
            .addOption(JoinLogicOperators.AND, "all of the tags")
            .setValue(this._noteSet.tagsJoinType as string || JoinLogicOperators.OR)
            .onChange((value: JoinLogicOperators) => {
                this._noteSet.tagsJoinType = value;
            } )
        });

        const folderTagJoinTypeSetting = new Setting(advancedSectionBodyEl);
        folderTagJoinTypeSetting.setName("If folders *and* tags are specified, match notes with: ")
        folderTagJoinTypeSetting.addDropdown(dropdown => {
            dropdown.addOption(JoinLogicOperators.OR, "specified tags OR in these folders").addOption(JoinLogicOperators.AND, "specified tags AND in these folders")
            .setValue(this._noteSet.foldersToTagsJoinType as string || JoinLogicOperators.OR)
            .onChange((value: JoinLogicOperators) => {
                this._noteSet.foldersToTagsJoinType = value; 
            })
        });

        const dataviewQuerySetting = new Setting(advancedSectionBodyEl);
        dataviewQuerySetting.setName("DataviewJS query");
        dataviewQuerySetting.setDesc(`DataviewJS-style query for more flexible control over the note set. If used, *overrides* Tags & Folders. Example: "(#knowledge and #review) or ('./notes')"`);
        dataviewQuerySetting.addTextArea(textArea => {
            textArea.setValue(this._noteSet.dataviewQuery)
            .setPlaceholder("DataviewJS query")
            .onChange(value => {
                this._noteSet.dataviewQuery = value;
                updateTagsFoldersSettingsAvailability(value);
            });
        });

        const saveBtn = new ButtonComponent(contentEl);
        saveBtn.setButtonText("Save");
        saveBtn.onClick(async () => await this.save());

        // Helpers

        const updateTagsFoldersSettingsAvailability = (dataviewJsQueryValue: string) : void => {
            const disableTagsFoldersSettings = dataviewJsQueryValue && (dataviewJsQueryValue != "");
            if (disableTagsFoldersSettings) {
                tagsSetting.settingEl.style.opacity = "50%";
                foldersSetting.settingEl.style.opacity = "50%";
            } else {
                tagsSetting.settingEl.style.opacity = "100%";
                foldersSetting.settingEl.style.opacity = "100%";
            }
            tagsSetting.setDisabled(disableTagsFoldersSettings);
            foldersSetting.setDisabled(disableTagsFoldersSettings);
        }

        updateTagsFoldersSettingsAvailability(this._noteSet.dataviewQuery);

    }
    


    async save() { 
        this._plugin.settings.noteSets.forEach((noteSet, index) => {
            if (noteSet.id == this._noteSet.id) {
                this._plugin.settings.noteSets[index] = this._noteSet;
            }
        });
        this._plugin.noteSetService.updateNoteSetDisplayNameAndDescription(this._noteSet);
        this._plugin.noteSetService.updateNoteSetStats(this._noteSet);
        await this._plugin.saveSettings();
        await this._plugin.activateView();
        this._plugin.showNotice(`Note set "${this._noteSet.displayName}" saved.`);
        this.close();
    }
    
}