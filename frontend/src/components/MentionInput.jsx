import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';

/**
 * MentionInput - A textarea with @mention autocomplete support
 * 
 * Usage:
 * <MentionInput
 *   value={content}
 *   onChange={setContent}
 *   onMentionsChange={setMentions}
 *   placeholder="Write something..."
 * />
 */
const MentionInput = forwardRef(({ 
    value, 
    onChange, 
    onMentionsChange,
    placeholder = "Write something...",
    className = "",
    rows = 4,
    disabled = false
}, ref) => {
    const { api } = useAuth();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartPos, setMentionStartPos] = useState(null);
    const [mentions, setMentions] = useState([]);
    const textareaRef = useRef(null);
    const suggestionsRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => textareaRef.current?.focus(),
        getMentions: () => mentions
    }));

    const fetchSuggestions = async (query) => {
        if (!query || query.length < 1) {
            setSuggestions([]);
            return;
        }
        
        try {
            const response = await api.get(`/pulse/employees?search=${encodeURIComponent(query)}&limit=8`);
            setSuggestions(response.data.employees || []);
            setSelectedIndex(0);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
            setSuggestions([]);
        }
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;
        onChange(newValue);

        // Check for @ trigger
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
            // Only trigger if @ is at start or after a space, and no space in query
            const charBeforeAt = lastAtIndex > 0 ? newValue[lastAtIndex - 1] : ' ';
            
            if ((charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
                setMentionQuery(textAfterAt);
                setMentionStartPos(lastAtIndex);
                setShowSuggestions(true);
                fetchSuggestions(textAfterAt);
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const insertMention = (employee) => {
        if (mentionStartPos === null) return;
        
        const beforeMention = value.slice(0, mentionStartPos);
        const afterMention = value.slice(mentionStartPos + mentionQuery.length + 1);
        const mentionText = `@${employee.name}`;
        
        const newValue = beforeMention + mentionText + ' ' + afterMention;
        onChange(newValue);
        
        // Add to mentions list
        const newMention = {
            user_id: employee.id,
            name: employee.name,
            start: mentionStartPos,
            end: mentionStartPos + mentionText.length
        };
        setMentions(prev => [...prev.filter(m => m.user_id !== employee.id), newMention]);
        
        setShowSuggestions(false);
        setMentionQuery('');
        setMentionStartPos(null);
        
        // Focus back on textarea
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = mentionStartPos + mentionText.length + 1;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % suggestions.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                break;
            case 'Enter':
                if (showSuggestions && suggestions.length > 0) {
                    e.preventDefault();
                    insertMention(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                break;
            case 'Tab':
                if (showSuggestions && suggestions.length > 0) {
                    e.preventDefault();
                    insertMention(suggestions[selectedIndex]);
                }
                break;
            default:
                break;
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Scroll selected item into view
    useEffect(() => {
        if (suggestionsRef.current && showSuggestions) {
            const selectedElement = suggestionsRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, showSuggestions]);

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                className={`w-full px-3 py-2 border border-[#E8D5C4] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-[#4A3728] placeholder:text-[#9C8C74] ${className}`}
            />
            
            {/* Mention Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-64 mt-1 bg-white border border-[#E8D5C4] rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {suggestions.map((employee, index) => (
                        <button
                            key={employee.id}
                            type="button"
                            onClick={() => insertMention(employee)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#F5EBE0] transition-colors ${
                                index === selectedIndex ? 'bg-[#F5EBE0]' : ''
                            }`}
                        >
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-[#E8D5C4] text-[#4A3728] text-xs">
                                    {getInitials(employee.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#4A3728] truncate">{employee.name}</p>
                                <p className="text-xs text-[#9C8C74] capitalize">{employee.department}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            {/* Hint text */}
            <p className="text-xs text-[#9C8C74] mt-1">
                Type @ to mention someone
            </p>
        </div>
    );
});

MentionInput.displayName = 'MentionInput';

export default MentionInput;


/**
 * MentionText - Renders text with highlighted @mentions
 */
export const MentionText = ({ text, mentions = [], className = "" }) => {
    if (!text) return null;
    
    // Simple regex to find @mentions in text
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }
        
        // Add mention
        parts.push({
            type: 'mention',
            content: match[0],
            name: match[1]
        });
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }

    return (
        <span className={className}>
            {parts.map((part, index) => (
                part.type === 'mention' ? (
                    <span 
                        key={index}
                        className="text-rose-600 font-medium hover:underline cursor-pointer"
                    >
                        {part.content}
                    </span>
                ) : (
                    <span key={index}>{part.content}</span>
                )
            ))}
        </span>
    );
};
