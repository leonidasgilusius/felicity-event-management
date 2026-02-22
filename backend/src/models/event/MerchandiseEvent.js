import mongoose from "mongoose";
import Event from "./Event.js";


const MerchandiseEvent = Event.discriminator('merchandise', new mongoose.Schema({
  stock: { type: Number, required: true },
  // size and color to be included in variants
  
  variants: [{
    name: String,
    details: { type: mongoose.Schema.Types.Mixed }
  }],
  
  maxPerUser: { type: Number, default: 1 },
  paymentDetails: { type: String, default: '' },

  formSchema: [{
    label: String,
    fieldType: { type: String, enum: ['text', 'number', 'file', 'dropdown', 'checkbox', 'textarea'] },
    options: [String],
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }]
}));

export default MerchandiseEvent