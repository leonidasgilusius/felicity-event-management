import { useState } from 'react';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import { createOrganizerDraftEvent, updateOrganizerEventFormSchema, publishOrganizerEvent } from '../../utils/api';
import '../../styles/Dashboard.css';

const CreateEvent = () => {
    const getTodayAtMidnight = () => {
        const now = new Date();
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); 
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}T00:00`;
    };

    const defaultDate = getTodayAtMidnight()

    const [draftForm, setDraftForm] = useState({
        title: '',
        description: '',
        eventType: 'normal',
        startDate: defaultDate,
        endDate: defaultDate,
        registrationDeadline: defaultDate,
        registrationLimit: 100,
        registrationFee: 0,
        eligibility: 'All',
        eventTags: ''
    });
    const [draftEvent, setDraftEvent] = useState(null);
    const [formFields, setFormFields] = useState([]);
    const [newField, setNewField] = useState({
        label: '',
        fieldType: 'text',
        optionsText: '',
        required: false
    });
    const [createFlowMessage, setCreateFlowMessage] = useState('');

    const onDraftInputChange = (event) => {
        const { name, value } = event.target;
        setDraftForm((previous) => ({ ...previous, [name]: value }));
    };

    const handleCreateDraft = async (event) => {
        event.preventDefault();
        setCreateFlowMessage('');

        try {
        const payload = {
            ...draftForm,
            registrationLimit: Number(draftForm.registrationLimit),
            registrationFee: Number(draftForm.registrationFee),
            eventTags: draftForm.eventTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        };

        const response = await createOrganizerDraftEvent(payload);
        setDraftEvent(response.event);
        setCreateFlowMessage('Draft created. Define required fields next.');
        setFormFields([]);
        } catch (createError) {
        setCreateFlowMessage(createError.response?.data?.message || 'Failed to create draft event.');
        }
    };

    const addField = () => {
        if (!newField.label.trim()) return;

        const nextField = {
        label: newField.label.trim(),
        fieldType: newField.fieldType,
        required: newField.required,
        options:
            newField.fieldType === 'dropdown'
            ? newField.optionsText.split(',').map((o) => o.trim()).filter(Boolean)
            : [],
        order: formFields.length
        };

        setFormFields((previous) => [...previous, nextField]);
        setNewField({ label: '', fieldType: 'text', optionsText: '', required: false });
    };

    const moveField = (index, direction) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= formFields.length) return;

        const nextFields = [...formFields];
        const [movedField] = nextFields.splice(index, 1);
        nextFields.splice(targetIndex, 0, movedField);
        setFormFields(nextFields.map((field, fieldIndex) => ({ ...field, order: fieldIndex })));
    };

    const removeField = (index) => {
        const nextFields = formFields.filter((_, fieldIndex) => fieldIndex !== index);
        setFormFields(nextFields.map((field, fieldIndex) => ({ ...field, order: fieldIndex })));
    };

    const handleSaveFormFields = async () => {
        if (!draftEvent) return;
        setCreateFlowMessage('');
        try {
        await updateOrganizerEventFormSchema(draftEvent._id, formFields);
        setCreateFlowMessage('Required fields saved. You can publish now.');
        } catch (saveError) {
        setCreateFlowMessage(saveError.response?.data?.message || 'Failed to save form fields.');
        }
    };

    const handlePublishDraft = async () => {
        if (!draftEvent) return;
        setCreateFlowMessage('');
        try {
        await publishOrganizerEvent(draftEvent._id);
        setCreateFlowMessage('Event published successfully.');
        } catch (publishError) {
        setCreateFlowMessage(publishError.response?.data?.message || 'Failed to publish event.');
        }
    };

    return (
        <div className="dashboard-container participant-dashboard-container">
        <OrganizerSidebar />
        <div className="dashboard-content participant-dashboard-content">
            <section className="info-section participant-section">
            <h3>Create Event</h3>
            <p>Create (Draft) → Define Required Fields → Publish</p>

            <form className="organizer-form" onSubmit={handleCreateDraft}>
                <input name="title" placeholder="Event Name" value={draftForm.title} onChange={onDraftInputChange} required />
                <textarea
                name="description"
                placeholder="Description"
                value={draftForm.description}
                onChange={onDraftInputChange}
                required
                />
                <label htmlFor="eventType">Event Type</label>
                <select name="eventType" value={draftForm.eventType} onChange={onDraftInputChange}>
                <option value="normal">Normal</option>
                <option value="merchandise">Merchandise</option>
                </select>

                <label htmlFor="startDate">Start Date</label>
                <input type="datetime-local" step="900" name="startDate" value={draftForm.startDate} onChange={onDraftInputChange} required />
                
                <label htmlFor="endDate">End Date</label>
                <input type="datetime-local" step="900" name="endDate" value={draftForm.endDate} onChange={onDraftInputChange} required />
                
                <label htmlFor="registrationDeadline">Registration Deadline</label>
                <input
                type="datetime-local"
                name="registrationDeadline"
                value={draftForm.registrationDeadline}
                onChange={onDraftInputChange}
                required
                />

                <label htmlFor="registrationLimit">Registration Limit</label>
                <input
                type="number"
                name="registrationLimit"
                placeholder="Registration Limit"
                value={draftForm.registrationLimit}
                onChange={onDraftInputChange}
                required
                />

                <label htmlFor="registrationFee">Registration Fee</label>
                <input
                type="number"
                name="registrationFee"
                placeholder="Registration Fee"
                value={draftForm.registrationFee}
                onChange={onDraftInputChange}
                required
                />

                <label htmlFor="eligibility">Eligibility</label>
                <input
                name="eligibility"
                placeholder="Eligibility (e.g., All, UG1, etc)"
                value={draftForm.eligibility}
                onChange={onDraftInputChange}
                required
                />

                <label htmlFor="eventTags">Event Tags</label>
                <input
                name="eventTags"
                placeholder="Tags (comma-separated)"
                value={draftForm.eventTags}
                onChange={onDraftInputChange}
                />
                <button type="submit" className="card-button" disabled={!!draftEvent}>
                {draftEvent ? 'Draft Created' : 'Create Draft'}
                </button>
            </form>

            {draftEvent && (
                <div className="form-builder-section">
                <h4>Required Fields Builder</h4>
                <div className="field-inputs">
                    <input
                    placeholder="Field label"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    />
                    <select
                    value={newField.fieldType}
                    onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}
                    >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown</option>
                    </select>
                    {newField.fieldType === 'dropdown' && (
                    <input
                        placeholder="Options (comma-separated)"
                        value={newField.optionsText}
                        onChange={(e) => setNewField({ ...newField, optionsText: e.target.value })}
                    />
                    )}
                    <label>
                    <input
                        type="checkbox"
                        checked={newField.required}
                        onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                    />
                    Required
                    </label>
                    <button type="button" onClick={addField}>
                    Add Field
                    </button>
                </div>

                <div className="fields-list">
                    {formFields.map((field, index) => (
                    <div key={index} className="field-item">
                        <span>
                        {field.label} ({field.fieldType}) {field.required ? '*' : ''}
                        </span>
                        <div className="field-actions">
                        <button onClick={() => moveField(index, 'up')}>↑</button>
                        <button onClick={() => moveField(index, 'down')}>↓</button>
                        <button onClick={() => removeField(index)}>Delete</button>
                        </div>
                    </div>
                    ))}
                </div>

                <div className="flow-actions">
                    <button type="button" className="card-button" onClick={handleSaveFormFields}>
                    Save Fields
                    </button>
                    <button type="button" className="card-button" onClick={handlePublishDraft}>
                    Publish Event
                    </button>
                </div>
                </div>
            )}

            {createFlowMessage && <p className="success-message">{createFlowMessage}</p>}
            </section>
        </div>
        </div>
    );
};

export default CreateEvent;
