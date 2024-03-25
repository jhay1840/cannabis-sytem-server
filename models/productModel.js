// Import necessary modules
const mongoose = require('mongoose')

// Define Schema
const Schema = mongoose.Schema

// Create a new schema
const cannabisSchema = new Schema({
  name: { type: String, required: true },
  secondBreed: { type: String },
  type: { type: String, required: true },
  sativaPercent: { type: Number },
  THCpercent: { type: Number },
  CBDpercent: { type: Number },
  CBNpercent: { type: Number },
  description: { type: String },
  medDescription: { type: String },
  category: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  imageURL: { type: String },
  salePrice: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  stock: { type: Number, default: 0 }
})

// Create model from the schema
const Cannabis = mongoose.model('cannabisproducts', cannabisSchema)

// Export the model
module.exports = Cannabis
