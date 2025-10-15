import React, { useState } from 'react';
import './NewRecord.css';

const NewRecord = () => {
  const [formData, setFormData] = useState({
    controlNo: '',
    officeRequestor: '',
    titleDesc: '',
    concernedPersonnel: '',
    destinationOffice: '',
    classification: '',
    priority: '',
    retentionPeriod: '',
    file: null,
    recordOrigin: 'Internal'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      file: e.target.files[0]
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form data submitted: ', formData);
  };

  return (
    <div className="form-container">
      <h2>Create New Record</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Record Origin</label>
          <div className="radio-buttons">
            <label>
              <input
                type="radio"
                name="recordOrigin"
                value="Internal"
                checked={formData.recordOrigin === 'Internal'}
                onChange={handleChange}
              />
              Internal
            </label>
            <label>
              <input
                type="radio"
                name="recordOrigin"
                value="External"
                checked={formData.recordOrigin === 'External'}
                onChange={handleChange}
              />
              External
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Control No.</label>
          <input
            type="text"
            name="controlNo"
            value={formData.controlNo}
            onChange={handleChange}
            placeholder="e.g., 2025-09-001"
            required
          />
        </div>

        <div className="form-group">
          <label>Office/Requestor</label>
          <input
            type="text"
            name="officeRequestor"
            value={formData.officeRequestor}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Title and Description</label>
          <textarea
            name="titleDesc"
            value={formData.titleDesc}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Concerned Personnel</label>
          <input
            type="text"
            name="concernedPersonnel"
            value={formData.concernedPersonnel}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Destination Office</label>
          <input
            type="text"
            name="destinationOffice"
            value={formData.destinationOffice}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Classification</label>
          <input
            type="text"
            name="classification"
            value={formData.classification}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Priority</label>
          <input
            type="text"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Retention Period</label>
          <input
            type="text"
            name="retentionPeriod"
            value={formData.retentionPeriod}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Attach File (PDF required)</label>
          <input
            type="file"
            name="file"
            accept="application/pdf"
            onChange={handleFileChange}
            required
          />
        </div>

        <button type="submit" className="submit-button">Create Record</button>
      </form>
    </div>
  );
};

export default NewRecord;
