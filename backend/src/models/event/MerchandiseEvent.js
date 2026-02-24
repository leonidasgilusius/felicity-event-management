import mongoose from "mongoose";
import Event from "./Event.js";


const MerchandiseEvent = Event.discriminator('merchandise', new mongoose.Schema({
  stock: { type: Number, required: true },
  
  variants: [{
    name: String,
    details: { type: mongoose.Schema.Types.Mixed }
  }],
  
  maxPerUser: { type: Number, default: 1 },
  paymentDetails: { type: String, default: '' }
}));

export default MerchandiseEvent