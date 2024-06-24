// Import necessary modules
const mongoose = require('mongoose')

// Define Schema
const Schema = mongoose.Schema

// Create a new schema
const cannabisMovementSchema = new Schema({
  productId: { type: String },
  transactionId: { type: String, unique: true },
  transactionDate: { type: Date, default: Date.now },
  transactionType: { type: String },
  amountPurchased: { type: Number },
  realWeight: { type: Number },
  growType: { type: String },
  jarWeight: { type: Number },
  purchasePricePerGram: { type: Number },
  dispensePricePerGram: { type: Number },
  totalPurchasePrice: { type: Number },
  totalDispensePrice: { type: Number },
  movementsSampleTaste: { type: Number, default: 0 },
  movementsForDisplayJar: { type: Number, default: 0 },
  movementsInStash: { type: Number, default: 0 },
  movementsExtStash: { type: Number, default: 0 },
  comments: { type: String },
  createdBy: { type: String },
  initialInventory: { type: Number },
  finalInventory: { type: Number }
})

// Pre-save middleware to generate auto-incrementing transaction ID
cannabisMovementSchema.pre('save', async function (next) {
  if (!this.isNew) {
    return next()
  }

  try {
    // Find the latest transaction ID from the database
    const latestMovement = await this.constructor.findOne({}, {}, { sort: { transactionId: -1 } })

    // Log the latest movement and nextIdNumber for debugging
    console.log('Latest Movement:', latestMovement)

    let nextIdNumber = 1
    if (latestMovement && latestMovement.transactionId) {
      const lastIdNumber = parseInt(latestMovement.transactionId.replace('TRN', ''), 10)
      nextIdNumber = lastIdNumber + 1
    }

    // Log the calculated nextIdNumber for debugging
    console.log('Next ID Number:', nextIdNumber)

    // Format the new transaction ID with leading zeros
    const formattedId = `TRN${nextIdNumber.toString().padStart(5, '0')}`
    console.log('Generated transaction ID:', formattedId)
    this.transactionId = formattedId

    next()
  } catch (error) {
    next(error)
  }
})

// Create model from the schema
const CannabisMovement = mongoose.model('cannabismovements', cannabisMovementSchema)

// Export the model
module.exports = CannabisMovement
