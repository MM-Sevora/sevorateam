import React, { useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  Heading1, Heading2, Code, Quote, Undo, Redo
} from 'lucide-react';

const MenuButton = ({ onClick, isActive, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-1.5 rounded hover:bg-[#E8D5C4] transition-colors ${
      isActive ? 'bg-[#E8D5C4] text-rose-600' : 'text-[#5D4A3A]'
    }`}
    title={title}
  >
    {children}
  </button>
);

const RichTextEditor = forwardRef(({ 
  content = '', 
  onChange, 
  placeholder = 'Write something...',
  users = [],
  editable = true,
  minHeight = '120px',
  className = ''
}, ref) => {
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-rose-600 underline hover:text-rose-700',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-2',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-[#D4BBA6] my-2',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-[#D4BBA6] bg-[#F5EBE0] p-2 font-semibold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-[#D4BBA6] p-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() || '',
    getText: () => editor?.getText() || '',
    clear: () => editor?.commands.clearContent(),
    focus: () => editor?.commands.focus(),
  }));

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    if (url === null) return;
    
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={`border border-[#D4BBA6] rounded-lg overflow-hidden bg-white ${className}`}>
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[#E8D5C4] bg-[#FDF8F3]">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </MenuButton>
          
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </MenuButton>
          
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </MenuButton>
          
          <div className="w-px h-5 bg-[#D4BBA6] mx-1" />
          
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
          
          <div className="w-px h-5 bg-[#D4BBA6] mx-1" />
          
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
            <Code className="w-4 h-4" />
          </MenuButton>
          
          <div className="w-px h-5 bg-[#D4BBA6] mx-1" />
          
          <MenuButton onClick={setLink} isActive={editor.isActive('link')} title="Link">
            <LinkIcon className="w-4 h-4" />
          </MenuButton>
          
          <MenuButton onClick={addImage} title="Image">
            <ImageIcon className="w-4 h-4" />
          </MenuButton>
          
          <MenuButton onClick={insertTable} isActive={editor.isActive('table')} title="Table">
            <TableIcon className="w-4 h-4" />
          </MenuButton>
          
          <div className="flex-1" />
          
          <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <Undo className="w-4 h-4" />
          </MenuButton>
          
          <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <Redo className="w-4 h-4" />
          </MenuButton>
        </div>
      )}
      
      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none p-3 focus:outline-none"
        style={{ minHeight }}
      />
      
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: ${minHeight};
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9C8C74;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror h1 { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; color: #4A3728; }
        .ProseMirror h2 { font-size: 1.25rem; font-weight: 600; margin: 0.5rem 0; color: #4A3728; }
        .ProseMirror h3 { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; color: #4A3728; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror li { margin: 0.25rem 0; }
        .ProseMirror blockquote { 
          border-left: 3px solid #D4BBA6; 
          padding-left: 1rem; 
          margin: 0.5rem 0;
          color: #6B5D52;
          font-style: italic;
        }
        .ProseMirror pre {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-family: monospace;
          overflow-x: auto;
        }
        .ProseMirror code {
          background: #F5EBE0;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5rem 0;
        }
        .ProseMirror th, .ProseMirror td {
          border: 1px solid #D4BBA6;
          padding: 0.5rem;
          text-align: left;
        }
        .ProseMirror th {
          background: #F5EBE0;
          font-weight: 600;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export { RichTextEditor };
