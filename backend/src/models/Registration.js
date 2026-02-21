import mongoose from 'mongoose';

const baseOptions = {
  discriminatorKey: 'type',
  collection: 'registrations',
  timestamps: true
};

const RegistrationSchema = new mongoose.Schema({
  event: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  ticketId: { type: String, unique: true, required: true }, // Unique QR String
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'attended', 'shipped'],
    default: 'confirmed'
  }
}, baseOptions);

const Registration = mongoose.model('Registration', RegistrationSchema);

// --- 2. Discriminators ---


const TicketRegistration = Registration.discriminator('ticket', new mongoose.Schema({
  checkInTime: { type: Date },

  formResponses: [{
    label: String,
    answer: mongoose.Schema.Types.Mixed
  }]
}));

const MerchandiseOrder = Registration.discriminator('order', new mongoose.Schema({
  selectedVariants: { type: Map, of: String },
  quantity: { type: Number, default: 1 },
  totalPrice: { type: Number },
  
  paymentProofUrl : { type: String },
  paymentStatus: { 
    type: String, 
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval'
  }
}));

export { Registration, TicketRegistration, MerchandiseOrder };
export default Registration;