import { INoteQueue } from "src/queues/noteQueue"
import { JoinLogicOperators } from "../settings/joinLogicOperators"
import { INoteSetStats } from "./INoteSetStats"
import { NotesetValidationErrors } from "./notesetValidationErrors"

// TODO: excluded tags, folders, frontmatter keys
export interface INoteSet {
    id: string
    sortOrder: number | undefined
    name: string
    displayName: string
    description: string
    tags: string[]
    tagsJoinType: JoinLogicOperators
    folders: string[]
    foldersToTagsJoinType: JoinLogicOperators
    createdInLastNDays: number | undefined
    modifiedInLastNDays: number | undefined
    dataviewQuery: string
    stats: INoteSetStats
    queue: INoteQueue
    validationErrors: NotesetValidationErrors[]
}

export class EmptyNoteSet implements INoteSet {
    id = crypto.randomUUID()
    sortOrder: undefined
    name: "new note set"
    displayName: string
    description: string
    tags: []
    tagsJoinType: JoinLogicOperators.OR
    folders: []
    foldersToTagsJoinType: JoinLogicOperators.OR
    createdInLastNDays: undefined
    modifiedInLastNDays: undefined
    dataviewQuery: ""
    stats: INoteSetStats
    queue: INoteQueue
    validationErrors: []
}