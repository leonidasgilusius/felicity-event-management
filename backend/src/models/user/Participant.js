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
    interests: {
        type: [{ type: String, trim: true }],
        default: []
    },
    followedOrganizers: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' }],
        default: []
    }
})

export default User.discriminator("Participant", participantSchema)