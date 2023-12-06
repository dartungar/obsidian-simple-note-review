import { INoteQueue } from "src/queues/noteQueue"
import { JoinLogicOperators } from "../settings/joinLogicOperators"
import { INoteSetStats } from "./INoteSetStats"

// TODO: excluded tags, folders, frontmatter keys
export interface INoteSet {
    id: number
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
    validationError: string | undefined
}

export class EmptyNoteSet implements INoteSet {
    id: number
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
    validationError: undefined

    constructor(id: number) {    
        this.id = id;    
    }
}