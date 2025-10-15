import React from 'react';
import './CreateRecordForm.css'; // Your CSS file

// Modal Component
const Modal = ({ show, handleClose }) => {
  if (!show) return null; // Don't render the modal if 'show' is false

  return (
    <div className="modal">
      <div className="modal-content">
        <h4>Record Created Successfully!</h4>
        <p>Your record has been successfully submitted.</p>
        <div className="button-container">
          <button className="modal-button" onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
