import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Unlink, Undo, Redo } from 'lucide-react';

const MenuBar = ({ editor }) => {
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const buttons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: 'Underline' },
    { type: 'divider' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Bullet List' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: 'Numbered List' },
    { type: 'divider' },
    { icon: LinkIcon, action: setLink, active: editor.isActive('link'), title: 'Add Link' },
    { icon: Unlink, action: () => editor.chain().focus().unsetLink().run(), disabled: !editor.isActive('link'), title: 'Remove Link' },
    { type: 'divider' },
    { icon: Undo, action: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo(), title: 'Undo' },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo(), title: 'Redo' },
  ];

  return (
    <div className="flex items-center gap-0.5 p-1.5 border-b border-[#E8D5C4] bg-white rounded-t-xl">
      {buttons.map((btn, i) => {
        if (btn.type === 'divider') {
          return <div key={i} className="w-px h-5 bg-[#E8D5C4] mx-1" />;
        }
        const Icon = btn.icon;
        return (
          <button
            key={i}
            type="button"
            onClick={btn.action}
            disabled={btn.disabled}
            className={`p-1.5 rounded-md transition-all ${
              btn.active 
                ? 'bg-rose-100 text-rose-600' 
                : btn.disabled 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-[#5D4A3A] hover:bg-[#F5EDE5] hover:text-[#4A3728]'
            }`}
            title={btn.title}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
};

export default function RichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing...', 
  maxLength = 3000,
  className = '',
  minHeight = '180px'
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-rose-600 underline hover:text-rose-700',
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-4 py-3 text-[#4A3728] text-[15px] leading-relaxed`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      if (text.length <= maxLength) {
        onChange?.(html, text);
      }
    },
  });

  // Sync external value changes
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const charCount = editor?.getText().length || 0;

  return (
    <div className={`border border-[#E8D5C4] rounded-xl overflow-hidden bg-[#F5EDE5] focus-within:border-rose-300 transition-colors ${className}`}>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          float: left;
          height: 0;
        }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror li { margin: 0.25rem 0; }
        .ProseMirror p { margin: 0.25rem 0; }
      `}</style>
    </div>
  );
}

// Helper to convert HTML to plain text for social platforms
export function htmlToPlainText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Convert lists to text with bullets/numbers
  doc.querySelectorAll('ul li').forEach((li, i) => {
    li.textContent = '• ' + li.textContent;
  });
  doc.querySelectorAll('ol li').forEach((li, i) => {
    li.textContent = (i + 1) + '. ' + li.textContent;
  });
  // Add line breaks
  doc.querySelectorAll('p, li').forEach(el => {
    el.textContent = el.textContent + '\n';
  });
  return doc.body.textContent?.trim() || '';
}

// Helper to check if content has formatting
export function hasRichFormatting(html) {
  if (!html) return false;
  return /<(strong|em|u|a|ul|ol|li)[^>]*>/i.test(html);
}
