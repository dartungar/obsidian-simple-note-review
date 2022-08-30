// TODO: frontmatter keys

import { JoinLogicOperators } from "../joinLogicOperators"
import { INoteSetStats } from "./INoteSetStats"

// TODO: excluded tags, folders, frontmatter keys
export interface INoteSet {
    id: number
    name: string
    displayName: string
    description: string
    tags: string[]
    tagsJoinType: JoinLogicOperators
    folders: string[]
    foldersToTagsJoinType: JoinLogicOperators
    dataviewQuery: string
    stats: INoteSetStats
}

export class EmptyNoteSet implements INoteSet {
    id: number
    name: "new note set"
    displayName: string
    description: string
    tags: []
    tagsJoinType: JoinLogicOperators.OR
    folders: []
    foldersToTagsJoinType: JoinLogicOperators.OR
    dataviewQuery: ""
    stats: INoteSetStats

    constructor(id: number) {    
        this.id = id;    
    }
}