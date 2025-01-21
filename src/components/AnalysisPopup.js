import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import './AnalysisPopup.css';

const AnalysisPopup = ({ position, onAnalyze, analysisResult, onClose, isLoading, targetLanguage }) => {
  return (
    <div 
      className="analysis-popup" 
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        display: position.top ? 'block' : 'none' 
      }}
    >
      <button className="close-button" onClick={onClose}>×</button>
      <div className="popup-buttons">
        <button onClick={() => onAnalyze('definition')} disabled={isLoading}>
          Define
        </button>
        <button onClick={() => onAnalyze('grammar')} disabled={isLoading}>
          Explain Grammar
        </button>
        <button onClick={() => onAnalyze('sentence_structure')} disabled={isLoading}>
          Analyze Structure
        </button>
      </div>
      
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        analysisResult && (
          <div className="analysis-results-box">
            {targetLanguage && (
              <div className="language-notice">
                Translated to {targetLanguage}
              </div>
            )}
            {analysisResult}
          </div>
        )
      )}
    </div>
  );
};

export default AnalysisPopup;