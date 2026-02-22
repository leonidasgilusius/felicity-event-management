import mongoose from "mongoose";
import Event from "./Event.js";

const NormalEvent = Event.discriminator('normal', new mongoose.Schema({
  location: { type: String },
  registrationFee: { type: Number, default: 0 },
  
  formSchema: [{
    label: String,
    fieldType: { type: String, enum: ['text', 'number', 'file', 'dropdown', 'checkbox', 'textarea'] },
    options: [String],
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }]
}));

export default NormalEvent