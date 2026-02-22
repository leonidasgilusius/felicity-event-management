import mongoose from 'mongoose';

const EventFeedbackSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: '',
    },
  },
  { timestamps: true }
);

EventFeedbackSchema.index({ event: 1, user: 1 }, { unique: true });

const EventFeedback = mongoose.model('EventFeedback', EventFeedbackSchema);

export default EventFeedback;
