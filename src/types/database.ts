// ─────────────────────────────────────────────────────────────
// types/database.ts
// Single source of truth for all DB-level types.
// These mirror the SQL schema 1:1.
// Never import Supabase types directly in components — use these.
// ─────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'member' | 'viewer'

export type TaskStatus =
    | 'backlog'
    | 'todo'
    | 'in_progress'
    | 'in_review'
    | 'done'
    | 'cancelled'

export type TaskPriority = 'no_priority' | 'urgent' | 'high' | 'medium' | 'low'

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export type ActivityType =
    | 'task_created'
    | 'task_updated'
    | 'task_status_changed'
    | 'task_priority_changed'
    | 'task_assigned'
    | 'task_unassigned'
    | 'task_due_date_set'
    | 'task_due_date_removed'
    | 'task_label_added'
    | 'task_label_removed'
    | 'comment_added'
    | 'comment_deleted'
    | 'task_deleted'

// ── Table row types ───────────────────────────────────────────

export interface Workspace {
    id: string
    name: string
    slug: string
    owner_id: string
    logo_url: string | null
    created_at: string
    updated_at: string
}

export interface WorkspaceMember {
    workspace_id: string
    user_id: string
    role: WorkspaceRole
    invited_by: string | null
    joined_at: string
}

export interface Project {
    id: string
    workspace_id: string
    name: string
    description: string | null
    status: ProjectStatus
    identifier: string
    created_by: string
    created_at: string
    updated_at: string
}

export interface Task {
    id: string
    project_id: string
    workspace_id: string
    sequence_number: number
    title: string
    description: TiptapDoc | null    // Tiptap ProseMirror JSON
    status: TaskStatus
    priority: TaskPriority
    assignee_id: string | null
    due_date: string | null          // ISO date string "YYYY-MM-DD"
    board_order: number
    parent_id: string | null
    deleted_at: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export interface Label {
    id: string
    workspace_id: string
    name: string
    color: string                    // hex e.g. "#6366f1"
}

export interface TaskLabel {
    task_id: string
    label_id: string
}

export interface Comment {
    id: string
    task_id: string
    workspace_id: string
    author_id: string
    body: string
    edited_at: string | null
    deleted_at: string | null
    created_at: string
}

export interface ActivityLog {
    id: string
    task_id: string
    workspace_id: string
    user_id: string
    type: ActivityType
    meta: ActivityMeta
    created_at: string
}

// ── Tiptap document type ──────────────────────────────────────

export interface TiptapDoc {
    type: 'doc'
    content: TiptapNode[]
}

export interface TiptapNode {
    type: string
    content?: TiptapNode[]
    attrs?: Record<string, unknown>
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
    text?: string
}

// ── Activity meta shapes ──────────────────────────────────────

export type ActivityMeta =
    | { from: TaskStatus; to: TaskStatus }         // task_status_changed
    | { from: TaskPriority; to: TaskPriority }     // task_priority_changed
    | { assignee_id: string }                      // task_assigned
    | { due_date: string }                         // task_due_date_set
    | { label_id: string; label_name: string }     // task_label_added/removed
    | Record<string, never>                        // task_created, comment_added, etc.

// ── Enriched / joined types (used in UI) ─────────────────────
// These extend base types with joined data — built in /lib/db layer.

export interface WorkspaceMemberWithProfile extends WorkspaceMember {
    profile: UserProfile
}

export interface TaskWithAssignee extends Task {
    assignee: UserProfile | null
    labels: Label[]
}

export interface CommentWithAuthor extends Comment {
    author: UserProfile
}

export interface ActivityLogWithUser extends ActivityLog {
    user: UserProfile
}

// ── User profile ─────────────────────────────────────────────
// Supabase auth.users doesn't have a profiles table by default.
// We pull display name and avatar from auth.users.user_metadata.
// If you add a profiles table later, update UserProfile here only.

export interface UserProfile {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
}

// ── Insert / Update payload types ────────────────────────────
// Used in /lib/db functions. Keeps API surface explicit.

export type CreateWorkspacePayload = Pick<Workspace, 'name' | 'slug'> & {
    owner_id: string
}

export type UpdateWorkspacePayload = Partial<Pick<Workspace, 'name' | 'logo_url'>>

export type CreateProjectPayload = Pick<
    Project,
    'workspace_id' | 'name' | 'description' | 'identifier' | 'created_by'
>

export type CreateTaskPayload = Pick<
    Task,
    | 'project_id'
    | 'workspace_id'
    | 'title'
    | 'status'
    | 'priority'
    | 'created_by'
> & {
    assignee_id?: string | null
    due_date?: string | null
    parent_id?: string | null
    board_order?: number
}

export type UpdateTaskPayload = Partial<
    Pick<
        Task,
        | 'title'
        | 'description'
        | 'status'
        | 'priority'
        | 'assignee_id'
        | 'due_date'
        | 'board_order'
        | 'parent_id'
        | 'deleted_at'
    >
>

export type InviteMemberPayload = {
    workspace_id: string
    user_id: string
    role: WorkspaceRole
    invited_by: string
}