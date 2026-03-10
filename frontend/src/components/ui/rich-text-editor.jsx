import React, { useEffect, forwardRef, useImperativeHandle, useCallback, useState, useRef } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  Heading1, Heading2, Code, Quote, Undo, Redo, AtSign
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

// Mention List Component
const MentionList = forwardRef(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index) => {
    const item = items[index];
    if (item) {
      command({ id: item.id, label: item.name });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="bg-white border border-[#D4BBA6] rounded-lg shadow-lg p-2 text-sm text-[#9C8C74]">
        No users found
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#D4BBA6] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
      {items.map((item, index) => (
        <button
          type="button"
          key={item.id}
          onClick={() => selectItem(index)}
          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#F5EBE0] transition-colors ${
            index === selectedIndex ? 'bg-[#F5EBE0] text-rose-600' : 'text-[#4A3728]'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-medium">
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{item.name}</span>
            {item.email && <span className="text-xs text-[#9C8C74]">{item.email}</span>}
          </div>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';

const RichTextEditor = forwardRef(({ 
  content = '', 
  onChange, 
  onMentionsChange,
  placeholder = 'Write something...',
  users = [],
  editable = true,
  minHeight = '120px',
  className = ''
}, ref) => {
  const [mentions, setMentions] = useState([]);
  const usersRef = useRef(users);
  
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Create suggestion configuration
  const suggestion = {
    items: ({ query }) => {
      return usersRef.current
        .filter(user => 
          user.name?.toLowerCase().includes(query.toLowerCase()) ||
          user.email?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8);
    },
    render: () => {
      let component;
      let popup;

      return {
        onStart: props => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },
        onUpdate: props => {
          component?.updateProps(props);
          if (!props.clientRect) return;
          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },
        onKeyDown: props => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props);
        },
        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };

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
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-medium',
        },
        suggestion,
        renderLabel({ options, node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      
      // Extract mentions from the content
      const mentionNodes = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'mention') {
          mentionNodes.push({
            id: node.attrs.id,
            label: node.attrs.label
          });
        }
      });
      
      // Only update if mentions changed
      const mentionIds = mentionNodes.map(m => m.id);
      const currentIds = mentions.map(m => m.id);
      if (JSON.stringify(mentionIds) !== JSON.stringify(currentIds)) {
        setMentions(mentionNodes);
        onMentionsChange?.(mentionIds);
      }
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
    getMentions: () => mentions.map(m => m.id),
    clear: () => {
      editor?.commands.clearContent();
      setMentions([]);
    },
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
          
          {users.length > 0 && (
            <>
              <div className="w-px h-5 bg-[#D4BBA6] mx-1" />
              <span className="text-xs text-[#9C8C74] px-1 flex items-center gap-1">
                <AtSign className="w-3 h-3" /> to mention
              </span>
            </>
          )}
          
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
        .ProseMirror .mention {
          background-color: rgb(254 226 226);
          color: rgb(185 28 28);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export { RichTextEditor };
