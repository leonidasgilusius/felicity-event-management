import mongoose from 'mongoose';

const AttendanceAuditSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'scan_mark_attended',
        'scan_duplicate',
        'manual_mark_attended',
        'manual_already_attended',
      ],
      required: true,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const AttendanceAudit = mongoose.model('AttendanceAudit', AttendanceAuditSchema);

export default AttendanceAudit;
