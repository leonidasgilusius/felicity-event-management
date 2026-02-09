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
    ref: 'User', 
    required: true 
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'completed'],
    default: 'draft'
  },
  eligibility: { type: String, default: 'All' },
  registrationDeadline: { type: Date },
  registrationLimit: { type: Number }, 
  currentRegistrations: { type: Number, default: 0 },
  image: { type: String }
}, baseOptions);

const Event = mongoose.model('Event', EventSchema);

// --- 2. Discriminators ---

const NormalEvent = Event.discriminator('normal', new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String },
  registrationFee: { type: Number, default: 0 },
  
  formSchema: [{
    label: String,
    fieldType: { type: String, enum: ['text', 'number', 'file', 'dropdown'] },
    options: [String],
    required: { type: Boolean, default: false }
  }]
}));

const MerchandiseEvent = Event.discriminator('merchandise', new mongoose.Schema({
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  
  variants: [{
    name: String,
    options: [String]
  }],
  
  maxPerUser: { type: Number, default: 1 }
}));

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

module.exports = { Event, NormalEvent, MerchandiseEvent };