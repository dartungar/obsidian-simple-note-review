
export enum NotesetValidationErrors {
    QueueEmpty = "Noteset review queue is empty. If this seems wrong, try resetting queue and/or checking noteset rules.",
    RulesAreIncorrect = "Noteset rules are incorrect. Please check noteset settings.",
    CustomDataviewIncorrect = "Custom DataviewJS query is incorrect. Please check noteset settings.",
    RulesDoNotMatchAnyNotes = "Noteset rules do not match any notes.",
}