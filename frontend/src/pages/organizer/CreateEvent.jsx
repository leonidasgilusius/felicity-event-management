import { useState } from 'react';
import OrganizerSidebar from '../../components/Organizer/OrganizerSidebar';
import { createOrganizerDraftEvent, updateOrganizerEventFormSchema, publishOrganizerEvent, getErrorMessage } from '../../utils/api';
import '../../styles/Dashboard.css';

const EVENT_CATEGORIES = ['Technology', 'Music', 'Sports', 'Art', 'Science', 'Literature', 'Gaming', 'Film', 'Dance', 'Food'];
const ELIGIBILITY_OPTIONS = [
    { value: 'All', label: 'All' },
    { value: 'IIIT', label: 'IIIT Only' },
];

const validateTimeline = ({ startDate, endDate, registrationDeadline }) => {
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    const parsedRegistrationDeadline = new Date(registrationDeadline);

    if (
        Number.isNaN(parsedStartDate.getTime()) ||
        Number.isNaN(parsedEndDate.getTime()) ||
        Number.isNaN(parsedRegistrationDeadline.getTime())
    ) {
        return 'Please enter valid event dates.';
    }

    if (parsedEndDate <= parsedStartDate) {
        return 'End date must be after start date.';
    }

    if (parsedRegistrationDeadline >= parsedEndDate) {
        return 'Registration deadline must be before end date.';
    }

    return null;
};

const CreateEvent = () => {
    const getTodayAtMidnight = () => {
        const now = new Date();
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); 
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}T00:00`;
    };

    const defaultDate = getTodayAtMidnight()

    const getInitialDraftForm = () => ({
        title: '',
        description: '',
        eventType: 'normal',
        startDate: defaultDate,
        endDate: defaultDate,
        registrationDeadline: defaultDate,
        registrationLimit: 100,
        registrationFee: 0,
        eligibility: 'All',
        eventTags: [],
        location: '',
        stock: 50,
        maxPerUser: 1,
        paymentDetails: '',
    });

    const [draftForm, setDraftForm] = useState(getInitialDraftForm());
    const [draftEvent, setDraftEvent] = useState(null);
    const [variants, setVariants] = useState([]);           // [{ name, optionsText }]
    const [newVariant, setNewVariant] = useState({ name: '', optionsText: '' });
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

    const toggleCategory = (category) => {
        setDraftForm((previous) => ({
            ...previous,
            eventTags: previous.eventTags.includes(category)
                ? previous.eventTags.filter((item) => item !== category)
                : [...previous.eventTags, category],
        }));
    };

    const handleCreateDraft = async (event) => {
        event.preventDefault();
        setCreateFlowMessage('');

        if (!Array.isArray(draftForm.eventTags) || draftForm.eventTags.length === 0) {
            setCreateFlowMessage('Select at least one event category.');
            return;
        }

        const timelineError = validateTimeline({
            startDate: draftForm.startDate,
            endDate: draftForm.endDate,
            registrationDeadline: draftForm.registrationDeadline,
        });
        if (timelineError) {
            setCreateFlowMessage(timelineError);
            return;
        }

        try {
        const payload = {
            ...draftForm,
            registrationLimit: Number(draftForm.registrationLimit),
            registrationFee: Number(draftForm.registrationFee),
            eventTags: draftForm.eventTags,
        };

        if (draftForm.eventType === 'merchandise') {
            payload.stock = Number(draftForm.stock);
            payload.registrationLimit = Number(draftForm.stock); // limit = stock for merch
            payload.maxPerUser = Number(draftForm.maxPerUser);
            payload.paymentDetails = draftForm.paymentDetails;
            payload.variants = variants.map((v) => ({
                name: v.name,
                details: Object.fromEntries(
                    v.optionsText.split(',').map((o) => o.trim()).filter(Boolean).map((o) => [o, true])
                ),
            }));
        }

        const response = await createOrganizerDraftEvent(payload);
        setDraftEvent(response.event);
        setCreateFlowMessage('Draft created. Define required fields next.');
        setFormFields([]);
        } catch (createError) {
        setCreateFlowMessage(getErrorMessage(createError, 'Failed to create draft event.'));
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
        setCreateFlowMessage(getErrorMessage(saveError, 'Failed to save form fields.'));
        }
    };

    const handlePublishDraft = async () => {
        if (!draftEvent) {
            setCreateFlowMessage('Create a draft first.');
            return;
        }

        setCreateFlowMessage('');
        try {
        await publishOrganizerEvent(draftEvent._id);
        setCreateFlowMessage('Event published successfully. You can start a new draft now.');
        setDraftEvent(null);
        setDraftForm(getInitialDraftForm());
        setVariants([]);
        setNewVariant({ name: '', optionsText: '' });
        setFormFields([]);
        setNewField({
            label: '',
            fieldType: 'text',
            optionsText: '',
            required: false
        });
        } catch (publishError) {
        setCreateFlowMessage(getErrorMessage(publishError, 'Failed to publish event.'));
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

                {draftForm.eventType === 'normal' && (
                    <>
                        <label>Registration Limit</label>
                        <input
                            type="number"
                            name="registrationLimit"
                            placeholder="e.g. 100"
                            value={draftForm.registrationLimit}
                            onChange={onDraftInputChange}
                            required
                        />
                    </>
                )}

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
                <select
                    name="eligibility"
                    value={draftForm.eligibility}
                    onChange={onDraftInputChange}
                    required
                >
                    {ELIGIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

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

                {draftForm.eventType === 'merchandise' && (
                    <>
                        <label>Stock (total units available)</label>
                        <input
                            type="number" name="stock" min={1}
                            value={draftForm.stock}
                            onChange={onDraftInputChange} required
                        />

                        <label>Max Per User</label>
                        <input
                            type="number" name="maxPerUser" min={1}
                            value={draftForm.maxPerUser}
                            onChange={onDraftInputChange} required
                        />

                        <label>Payment Details <span style={{ fontWeight: 400, color: '#888' }}>(UPI / bank account shown to buyers)</span></label>
                        <textarea
                            name="paymentDetails"
                            placeholder="e.g. UPI: name@upi  or  Account: 123456789, IFSC: SBIN0001234"
                            value={draftForm.paymentDetails}
                            onChange={onDraftInputChange}
                            rows={2}
                        />

                        <label>Variants <span style={{ fontWeight: 400, color: '#888' }}>(optional, e.g. Size, Colour)</span></label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input
                                placeholder="Variant name (e.g. Size)"
                                value={newVariant.name}
                                onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                                style={{ flex: 1 }}
                            />
                            <input
                                placeholder="Options (comma-separated, e.g. S, M, L, XL)"
                                value={newVariant.optionsText}
                                onChange={(e) => setNewVariant({ ...newVariant, optionsText: e.target.value })}
                                style={{ flex: 2 }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (!newVariant.name.trim()) return;
                                    setVariants([...variants, { ...newVariant }]);
                                    setNewVariant({ name: '', optionsText: '' });
                                }}
                                style={{ padding: '8px 14px', background: '#eef2ff', color: '#667eea', border: '1.5px solid #667eea', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                            >+ Add</button>
                        </div>
                        {variants.map((v, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: '#f8f9fb', padding: '6px 10px', borderRadius: 6 }}>
                                <span style={{ fontWeight: 600, minWidth: 80 }}>{v.name}:</span>
                                <span style={{ color: '#555', flex: 1 }}>{v.optionsText}</span>
                                <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                            </div>
                        ))}
                    </>
                )}

                <label>Event Categories</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                    {EVENT_CATEGORIES.map((category) => (
                        <label key={category} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                                type="checkbox"
                                checked={draftForm.eventTags.includes(category)}
                                onChange={() => toggleCategory(category)}
                            />
                            <span>{category}</span>
                        </label>
                    ))}
                </div>

                <button type="submit" className="card-button" disabled={!!draftEvent} style={{ marginTop: 8 }}>
                    {draftEvent ? '✓ Draft Created' : 'Create Draft'}
                </button>
            </form>

            {/* ── Step 2: Form Builder ── */}
            {draftEvent && (
                <div className="organizer-form-builder" style={{ marginTop: 28 }}>
                    <h4 style={{ marginBottom: 16 }}>Step 2 — Registration Form Fields</h4>
                    <p style={{ fontSize: 13, color: '#666', marginTop: 0, marginBottom: 16 }}>
                        {draftEvent.type === 'merchandise'
                            ? 'Optional: add extra fields for buyers (e.g. delivery address, phone number).'
                            : 'Define the fields participants will fill in when registering. Fields are locked after the first registration.'}
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
