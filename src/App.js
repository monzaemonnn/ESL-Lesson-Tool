import React, { useState, useRef, useEffect } from 'react';
import LessonViewer from './components/LessonViewer';
import AnalysisPopup from './components/AnalysisPopup';
import FileUpload from './components/FileUpload';
import LoadingSpinner from './components/LoadingSpinner';
import mammoth from 'mammoth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import './App.css';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

function App() {
  const [lessonContent, setLessonContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [analysisResult, setAnalysisResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [savedLessons, setSavedLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const containerRef = useRef(null);

  // Load lessons from Firestore
  const loadLessonsFromCloud = async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, "lessons"));
      const lessons = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedLessons(lessons);
      if (lessons.length > 0) {
        setSelectedLessonId(lessons[0].id);
        setLessonContent(lessons[0].content);
      }
    } catch (error) {
      setErrorMessage('Failed to load lessons from cloud');
    } finally {
      setIsLoading(false);
    }
  };

  // Save lesson to Firestore
  const saveLessonToCloud = async (title, content, file) => {
    try {
      const docRef = await addDoc(collection(db, "lessons"), {
        title,
        content,
        createdAt: new Date().toISOString()
      });

      // Store original DOCX in Storage
      const storageRef = ref(storage, `lessons/${docRef.id}/${file.name}`);
      await uploadBytes(storageRef, file);
      
      return docRef.id;
    } catch (error) {
      throw new Error('Cloud save failed: ' + error.message);
    }
  };

  useEffect(() => {
    loadLessonsFromCloud();
  }, []);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        window.getSelection().removeAllRanges();
        const highlights = document.querySelectorAll('.highlight');
        highlights.forEach(highlight => {
          try {
            if (highlight.parentNode) {
              highlight.replaceWith(...highlight.childNodes);
            }
          } catch (error) {
            console.warn('Error removing highlight:', error);
          }
        });
        handleClosePopup();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle text selection
  const handleTextSelect = (text, rect) => {
    setSelectedText(text);
    setPopupPosition({
      top: rect.top + window.scrollY + rect.height + 5,
      left: rect.left + window.scrollX
    });
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        
        // Upload to Firebase
        await saveLessonToCloud(
          file.name.replace('.docx', ''),
          html,
          file
        );
        
        // Refresh lesson list
        await loadLessonsFromCloud();
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle lesson selection
  const handleLessonSelect = (lessonId) => {
    const lesson = savedLessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedLessonId(lessonId);
      setLessonContent(lesson.content);
      handleClosePopup();
    }
  };

  // Analysis handler with translation
  const handleAnalyze = async (analysisType) => {
    if (!selectedText) return;

    const promptMap = {
      definition: `Define "${selectedText}" concisely in simple English, place brackets around the words you are defining`,
      grammar: `Explain the grammar in: "${selectedText}" using simple terms`,
      sentence_structure: `Analyze the sentence structure of: "${selectedText}" simply`
    };

    let prompt = promptMap[analysisType];
    if (targetLanguage) {
      prompt += `. Then translate the explanation to ${targetLanguage} using simple terms. Follow these rules strictly:
      1. Never include the word "translation" in the response
      2. Keep bracketed terms in English: (Example) → (Example)
      3. Provide direct translation after colon: (Example): *翻訳*
      4. No pronunciation guides
      5. No introductory phrases like "Here is..."
      6. Maintain original definition structure`;
    }

    try {
      setErrorMessage('');
      setIsLoading(true);
      setAnalysisResult('');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      
      setAnalysisResult(data.candidates[0].content.parts[0].text);
    } catch (error) {
      setErrorMessage(`Analysis failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Close popup
  const handleClosePopup = () => {
    setAnalysisResult('');
    setPopupPosition({ top: 0, left: 0 });
    setSelectedText('');
  };

  return (
    <div className="container" ref={containerRef}>
      <div className="lesson-header">
        <h1>ESL Lesson Tool</h1>
        
        <div className="lesson-selector">
          <label>Select Lesson: </label>
          <select 
            value={selectedLessonId} 
            onChange={(e) => handleLessonSelect(e.target.value)}
            disabled={isLoading}
          >
            <option value="">-- Choose a Lesson --</option>
            {savedLessons.map(lesson => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title} ({new Date(lesson.createdAt).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="error-message">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="language-selector">
        <label>Translation: </label>
        <select 
          value={targetLanguage} 
          onChange={(e) => setTargetLanguage(e.target.value)}
          disabled={isLoading}
        >
          <option value="">None</option>
          <option value="Cantonese">Cantonese (廣東話)</option>
          <option value="Japanese">Japanese (日本語)</option>
        </select>
      </div>

      <FileUpload 
        onFileUpload={handleFileUpload} 
        isDisabled={isLoading}
      />
      
      {isLoading ? (
        <div className="loading-message">
          <LoadingSpinner />
          <p>Loading lessons from cloud...</p>
        </div>
      ) : (
        <LessonViewer 
          lessonContent={lessonContent}
          onTextSelect={handleTextSelect} 
        />
      )}
      
      <AnalysisPopup 
        position={popupPosition}
        onAnalyze={handleAnalyze}
        analysisResult={analysisResult}
        onClose={handleClosePopup}
        isLoading={isLoading}
        targetLanguage={targetLanguage}
      />
    </div>
  );
}

export default App;