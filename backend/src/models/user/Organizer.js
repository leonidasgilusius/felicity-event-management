import mongoose from "mongoose";
import User from "./User.js"

const organizerSchema = new mongoose.Schema({
  category: {
    type: String,
    trim: true 
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  contactEmail: {
    type: String,
    trim: true,
    default: ''
  },
  contactPhone: {
    type: String,
    trim: true,
    default: ''
  },
  discordWebhook: {
    type: String,
    trim: true,
    default: ''
  },
  isDisabled: { type: Boolean, default: false }, // disabled can be toggled
  archived: { type: Boolean, default: false }, // archive is one-time
});

export default User.discriminator("Organizer", organizerSchema)