import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { 
  Bold, Italic, Strikethrough, Code, Link2, Image as ImageIcon,
  List, ListOrdered, Quote, Heading1, Heading2, Heading3,
  Undo, Redo, FileCode, Minus
} from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

const lowlight = createLowlight(common);

const MenuButton = ({ onClick, isActive, disabled, children, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "p-1.5 rounded hover:bg-gray-100 transition-colors",
      isActive && "bg-gray-200 text-blue-600",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

export const TipTapEditor = ({ 
  content = '', 
  onChange, 
  placeholder = 'Write something...',
  minHeight = '200px',
  editable = true,
  className = ''
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-4',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto text-sm font-mono',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-white", className)}>
      {/* Toolbar */}
      {editable && (
        <div className="border-b bg-gray-50 p-2 flex items-center gap-1 flex-wrap">
          <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
            <MenuButton 
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </MenuButton>
          </div>

          <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
            <MenuButton 
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline Code"
            >
              <Code className="w-4 h-4" />
            </MenuButton>
          </div>

          <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
            <MenuButton 
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code Block"
            >
              <FileCode className="w-4 h-4" />
            </MenuButton>
          </div>

          <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
            <MenuButton 
              onClick={setLink}
              isActive={editor.isActive('link')}
              title="Add Link"
            >
              <Link2 className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={addImage}
              title="Add Image"
            >
              <ImageIcon className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              <Minus className="w-4 h-4" />
            </MenuButton>
          </div>

          <div className="flex items-center gap-0.5">
            <MenuButton 
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </MenuButton>
            <MenuButton 
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </MenuButton>
          </div>
        </div>
      )}

      {/* Bubble Menu for selection */}
      {editable && (
        <BubbleMenu 
          editor={editor} 
          options={{ placement: 'top', offset: 8 }}
          className="bg-white shadow-lg border rounded-lg p-1 flex items-center gap-0.5"
        >
          <MenuButton 
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
          >
            <Bold className="w-4 h-4" />
          </MenuButton>
          <MenuButton 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
          >
            <Italic className="w-4 h-4" />
          </MenuButton>
          <MenuButton 
            onClick={setLink}
            isActive={editor.isActive('link')}
          >
            <Link2 className="w-4 h-4" />
          </MenuButton>
        </BubbleMenu>
      )}

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className={cn(
          "prose prose-sm max-w-none p-4",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror]:min-h-[var(--min-height)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          "[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:mb-4",
          "[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:mb-3",
          "[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-medium [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-2",
          "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic",
          "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-4",
          "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-4",
          "[&_.ProseMirror_li]:my-1",
          "[&_.ProseMirror_hr]:my-8 [&_.ProseMirror_hr]:border-gray-200"
        )}
        style={{ '--min-height': minHeight }}
      />
    </div>
  );
};

export default TipTapEditor;
