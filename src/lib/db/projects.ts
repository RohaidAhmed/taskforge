// lib/db/projects.ts
import { createClient } from '@/lib/supabase/server'
import type {
    Project,
    CreateProjectPayload,
    ProjectStatus,
} from '@/types/database'

export async function getProjectsByWorkspace(
    workspaceId: string
): Promise<Project[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived')
        .order('created_at', { ascending: true })

    if (error || !data) return []
    return data as Project[]
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

    if (error) return null
    return data as Project
}

export async function createProject(
    payload: CreateProjectPayload
): Promise<{ data: Project | null; error: string | null }> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single()

    if (error) {
        if (error.code === '23505')
            return { data: null, error: 'A project with this identifier already exists.' }
        return { data: null, error: error.message }
    }
    return { data: data as Project, error: null }
}

export async function updateProjectStatus(
    projectId: string,
    status: ProjectStatus
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId)

    return { error: error?.message ?? null }
}

export async function isIdentifierAvailable(
    workspaceId: string,
    identifier: string
): Promise<boolean> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('identifier', identifier)
        .maybeSingle()
    return data === null
}