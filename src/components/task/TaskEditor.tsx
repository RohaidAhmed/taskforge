'use client'

// components/task/TaskEditor.tsx
// Tiptap rich text editor for task descriptions.
// Saves on blur — no explicit save button needed.

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'
import type { TiptapDoc } from '@/types/database'

interface Props {
    initialContent: TiptapDoc | null
    onSave: (doc: TiptapDoc | null) => void
    editable?: boolean
    className?: string
}

export default function TaskEditor({ initialContent, onSave, editable = true, className }: Props) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
            }),
            Placeholder.configure({
                placeholder: 'Add a description...',
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: initialContent ?? '',
        editable,
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-invert prose-sm max-w-none focus:outline-none',
                    'prose-p:text-gray-300 prose-p:my-1',
                    'prose-headings:text-gray-200 prose-headings:font-semibold',
                    'prose-strong:text-gray-200',
                    'prose-code:text-brand-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded prose-code:text-xs',
                    'prose-blockquote:border-l-2 prose-blockquote:border-gray-700 prose-blockquote:text-gray-500 prose-blockquote:pl-3',
                    'prose-ul:text-gray-300 prose-ol:text-gray-300',
                    'prose-li:my-0.5',
                    'min-h-[60px]',
                    className
                ),
            },
        },
        onBlur: ({ editor }) => {
            const json = editor.getJSON() as TiptapDoc
            const isEmpty =
                !json.content ||
                json.content.length === 0 ||
                (json.content.length === 1 &&
                    json.content[0].type === 'paragraph' &&
                    !json.content[0].content)
            onSave(isEmpty ? null : json)
        },
    })

    // Sync content if task changes
    useEffect(() => {
        if (editor && !editor.isFocused) {
            editor.commands.setContent(initialContent ?? '')
        }
    }, [initialContent]) // eslint-disable-line

    return (
        <div className={cn(
            'rounded-lg transition-colors',
            editable && 'hover:bg-gray-800/30 focus-within:bg-gray-800/30 px-2 py-1.5 -mx-2'
        )}>
            <EditorContent editor={editor} />
        </div>
    )
}