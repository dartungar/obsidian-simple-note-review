// TODO: frontmatter keys
// TODO: excluded tags, folders, frontmatter keys
export interface IQueueParams {
    tags: string[]
    folders: string[]
}

export class EmptyQueueParams implements IQueueParams {
    tags: []
    folders: []
}