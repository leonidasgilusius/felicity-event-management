import mongoose from 'mongoose';

const ForumReactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const ForumMessageSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumMessage',
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isAnnouncement: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    reactions: {
      type: [ForumReactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

ForumMessageSchema.index({ event: 1, createdAt: 1 });

const ForumMessage = mongoose.model('ForumMessage', ForumMessageSchema);

export default ForumMessage;
