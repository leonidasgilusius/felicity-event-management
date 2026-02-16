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
    enum: ['draft', 'published', 'closed', 'completed'],
    default: 'draft'
  },
  eligibility: { type: String, default: 'All', required: true  },
  registrationDeadline: { type: Date, required: true  },
  registrationLimit: { type: Number,  required: true  }, 
  registrationFee: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  eventTags: [{ type: String, required: true }],

  currentRegistrations: { type: Number, default: 0 },
  image: { type: String }
}, baseOptions);

export default mongoose.model('Event', EventSchema);

// --- 2. Discriminators ---



// C. Hackathon (Future Extension - Tier A Feature) [cite: 169-173]
// You can uncomment this later when implementing Tier A
/*
const HackathonEvent = Event.discriminator('hackathon', new mongoose.Schema({
  startDate: Date,
  endDate: Date,
  minTeamSize: Number,
  maxTeamSize: Number,
  problemStatement: String
}));
*/
