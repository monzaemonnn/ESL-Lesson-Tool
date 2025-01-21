import React from 'react';
import mammoth from 'mammoth';

const FileUpload = ({ onFileUpload, isDisabled }) => {
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onFileUpload(file);
  };

  return (
    <div className="file-upload">
      <label>
        {isDisabled ? 'Processing...' : 'Upload DOCX Lesson:'}
        <input 
          type="file" 
          accept=".docx" 
          onChange={handleFileUpload}
          disabled={isDisabled}
        />
      </label>
    </div>
  );
};

export default FileUpload;