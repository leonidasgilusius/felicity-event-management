import mongoose from "mongoose";
import Event from "./Event.js";


const MerchandiseEvent = Event.discriminator('merchandise', new mongoose.Schema({
  stock: { type: Number, required: true },
  // size and color to be included in variants
  
  variants: [{
    name: String,
    details: { type: mongoose.Schema.Types.Mixed }
  }],
  
  maxPerUser: { type: Number, default: 1 }
}));

export default MerchandiseEvent