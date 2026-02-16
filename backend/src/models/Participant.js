import mongoose from "mongoose";
import User from "./User.js"

const participantSchema = new mongoose.Schema({
    lastName: {
        type: String,
        trim: true
    },
    contactNumber: {
        type: String,
    },
    isIIIT: {
        type: Boolean,
        default: false
    },
    organisation: {
        type: String
    },
    interests: [{ type: String }],
    followedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' }]
})

export default User.discriminator("Participant", participantSchema)