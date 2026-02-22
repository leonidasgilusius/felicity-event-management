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
        eventTags: '',
        location: '',
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
            <p style={{ marginTop: 0, marginBottom: 20, color: '#666', fontSize: 14 }}>
                Step 1: Create Draft → Step 2: Define Form Fields → Step 3: Publish
            </p>

            {/* ── Step 1: Draft form ── */}
            <form className="organizer-form" onSubmit={handleCreateDraft}>
                <label>Event Name</label>
                <input name="title" placeholder="Event Name" value={draftForm.title} onChange={onDraftInputChange} required />

                <label>Description</label>
                <textarea
                    name="description"
                    placeholder="Describe the event…"
                    value={draftForm.description}
                    onChange={onDraftInputChange}
                    required
                />

                <label>Event Type</label>
                <select name="eventType" value={draftForm.eventType} onChange={onDraftInputChange}>
                    <option value="normal">Normal</option>
                    <option value="merchandise">Merchandise</option>
                </select>

                <label>Start Date</label>
                <input type="datetime-local" step="900" name="startDate" value={draftForm.startDate} onChange={onDraftInputChange} required />

                <label>End Date</label>
                <input type="datetime-local" step="900" name="endDate" value={draftForm.endDate} onChange={onDraftInputChange} required />

                <label>Registration Deadline</label>
                <input
                    type="datetime-local"
                    name="registrationDeadline"
                    value={draftForm.registrationDeadline}
                    onChange={onDraftInputChange}
                    required
                />

                <label>Registration Limit</label>
                <input
                    type="number"
                    name="registrationLimit"
                    placeholder="e.g. 100"
                    value={draftForm.registrationLimit}
                    onChange={onDraftInputChange}
                    required
                />

                <label>Registration Fee (₹)</label>
                <input
                    type="number"
                    name="registrationFee"
                    placeholder="0 for free"
                    value={draftForm.registrationFee}
                    onChange={onDraftInputChange}
                    required
                />

                <label>Eligibility</label>
                <input
                    name="eligibility"
                    placeholder="e.g. All, UG1, etc."
                    value={draftForm.eligibility}
                    onChange={onDraftInputChange}
                    required
                />

                {draftForm.eventType === 'normal' && (
                    <>
                        <label>Location</label>
                        <input
                            name="location"
                            placeholder="Venue / Online link"
                            value={draftForm.location}
                            onChange={onDraftInputChange}
                        />
                    </>
                )}

                <label>Tags <span style={{ fontWeight: 400, color: '#888' }}>(comma-separated)</span></label>
                <input
                    name="eventTags"
                    placeholder="e.g. tech, workshop, music"
                    value={draftForm.eventTags}
                    onChange={onDraftInputChange}
                />

                <button type="submit" className="card-button" disabled={!!draftEvent} style={{ marginTop: 8 }}>
                    {draftEvent ? '✓ Draft Created' : 'Create Draft'}
                </button>
            </form>

            {/* ── Step 2: Form Builder ── */}
            {draftEvent && (
                <div className="organizer-form-builder" style={{ marginTop: 28 }}>
                    <h4 style={{ marginBottom: 16 }}>Step 2 — Registration Form Fields</h4>
                    <p style={{ fontSize: 13, color: '#666', marginTop: 0, marginBottom: 16 }}>
                        Define the fields participants will fill in when registering. Fields are locked after the first registration.
                    </p>

                    {/* Add field row */}
                    <div className="organizer-form-row">
                        <input
                            placeholder="Field label (e.g. Roll Number)"
                            value={newField.label}
                            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                        />
                        <select
                            value={newField.fieldType}
                            onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}
                        >
                            <option value="text">Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="number">Number</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="file">File Upload</option>
                        </select>
                        <label className="organizer-checkbox">
                            <input
                                type="checkbox"
                                checked={newField.required}
                                onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                            />
                            Required
                        </label>
                    </div>

                    {newField.fieldType === 'dropdown' && (
                        <div style={{ marginBottom: 12 }}>
                            <input
                                placeholder="Options (comma-separated, e.g. Option A, Option B)"
                                value={newField.optionsText}
                                onChange={(e) => setNewField({ ...newField, optionsText: e.target.value })}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #cfd8e6', borderRadius: 6, fontSize: 14 }}
                            />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={addField}
                        style={{
                            marginBottom: 20, padding: '9px 20px', background: '#eef2ff',
                            color: '#667eea', border: '1.5px solid #667eea', borderRadius: 8,
                            fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        + Add Field
                    </button>

                    {/* Fields list */}
                    <div className="organizer-field-list">
                        {formFields.length === 0 && (
                            <p style={{ color: '#aaa', fontSize: 13 }}>No fields added yet.</p>
                        )}
                        {formFields.map((field, index) => (
                            <div key={index} className="organizer-field-item">
                                <div>
                                    <span style={{ fontWeight: 600, color: '#2f3b52' }}>{field.label}</span>
                                    <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>
                                        {field.fieldType}{field.required ? ' *' : ''}
                                        {field.options?.length > 0 && ` [${field.options.join(', ')}]`}
                                    </span>
                                </div>
                                <div className="organizer-field-actions">
                                    <button onClick={() => moveField(index, 'up')} disabled={index === 0} title="Move up">↑</button>
                                    <button onClick={() => moveField(index, 'down')} disabled={index === formFields.length - 1} title="Move down">↓</button>
                                    <button onClick={() => removeField(index)} style={{ color: '#e74c3c' }} title="Delete">✕</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Step 2 & 3 actions */}
                    <div className="organizer-flow-actions" style={{ marginTop: 20 }}>
                        <button type="button" className="card-button" onClick={handleSaveFormFields}>
                            Save Fields
                        </button>
                        <button type="button" className="card-button" onClick={handlePublishDraft}
                            style={{ background: 'linear-gradient(135deg,#27ae60,#16a085)' }}>
                            Publish Event
                        </button>
                    </div>
                </div>
            )}

            {createFlowMessage && (
                <p style={{
                    marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: createFlowMessage.toLowerCase().includes('fail') || createFlowMessage.toLowerCase().includes('error')
                        ? '#feeaea' : '#e8f8ef',
                    color: createFlowMessage.toLowerCase().includes('fail') || createFlowMessage.toLowerCase().includes('error')
                        ? '#c0392b' : '#27ae60',
                }}>
                    {createFlowMessage}
                </p>
            )}
            </section>
        </div>
        </div>
    );
};

export default CreateEvent;
