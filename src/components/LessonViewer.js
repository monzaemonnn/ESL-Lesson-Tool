// src/components/LessonViewer.js
import React, { useRef } from 'react';
import parse from 'html-react-parser';
import './LessonViewer.css';

const LessonViewer = ({ lessonContent, onTextSelect }) => {
  const contentRef = useRef(null);
  const prevHighlightRef = useRef(null);

  const isValidSelection = (range) => {
    try {
      // Check if selection is within a single text node
      return range && 
        range.startContainer.nodeType === Node.TEXT_NODE &&
        range.endContainer.nodeType === Node.TEXT_NODE &&
        range.startContainer === range.endContainer;
    } catch {
      return false;
    }
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0).cloneRange();
    const selectedText = selection.toString().trim();
    
    // Validate before processing
    if (!selectedText || !isValidSelection(range)) {
      selection.removeAllRanges();
      return;
    }

    // Cleanup previous highlight safely
    if (prevHighlightRef.current) {
      try {
        prevHighlightRef.current.replaceWith(...prevHighlightRef.current.childNodes);
      } catch (error) {
        console.warn('Error removing previous highlight:', error);
      }
    }

    // Create new highlight with error boundary
    try {
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'highlight';
      range.surroundContents(highlightSpan);
      prevHighlightRef.current = highlightSpan;

      // Get position after DOM modification
      const rect = highlightSpan.getBoundingClientRect();
      onTextSelect(selectedText, rect);
    } catch (error) {
      console.warn('Highlight error:', error);
      selection.removeAllRanges();
    }
  };

  return (
    <div 
      className="lesson-content" 
      onMouseUp={handleMouseUp}
      ref={contentRef}
    >
      {parse(lessonContent)}
    </div>
  );
};

export default LessonViewer;