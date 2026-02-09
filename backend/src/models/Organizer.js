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
  }
});

export default User.discriminator("Organizer", organizerSchema)