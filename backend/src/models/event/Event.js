import mongoose from "mongoose"

const baseOptions = {
  discriminatorKey: 'type',
  collection: 'events',
  timestamps: true
};

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: { type: String, required: true },
  organizer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organizer', 
    required: true 
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'closed', 'completed'],
    default: 'draft'
  },
  registrationStatus: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  eligibility: { type: String, default: 'All', required: true, enum: ['All', 'IIIT']  },
  registrationDeadline: { type: Date, required: true  },
  registrationLimit: { type: Number,  required: true  }, 
  registrationFee: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  eventTags: [{ type: String, required: true }],

  currentRegistrations: { type: Number, default: 0 },
  image: { type: String },

  formSchema: [{
    label: String,
    fieldType: { type: String, enum: ['text', 'number', 'file', 'checkbox', 'dropdown'] },
    options: [String],
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }]
}, baseOptions);

export default mongoose.model('Event', EventSchema);