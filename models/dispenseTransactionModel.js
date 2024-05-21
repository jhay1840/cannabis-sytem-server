// Import necessary modules
const mongoose = require('mongoose')

// Define Schema
const Schema = mongoose.Schema

const ProductSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'cannabisproducts', required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    salePrice: { type: Number, required: true },
    weight: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  },
  { _id: false }
) // _id: false to avoid nested _id field for products
// Create a new schema
const dispenseTransactionSchema = new Schema(
  {
    memberCode: { type: String, required: true },
    transactionId: { type: String, unique: true },
    transactionType: { type: String, default: 'Dispense' },
    amountTotal: { type: Number, required: true },
    comments: { type: String },
    createdBy: { type: String, required: true },
    isGift: { type: Boolean, default: false },
    checkoutDate: { type: Date, required: true },
    products: { type: [ProductSchema], required: true }
  },
  {
    timestamps: true // Automatically add createdAt and updatedAt fields
  }
)

// Pre-save middleware to generate auto-incrementing transaction ID
dispenseTransactionSchema.pre('save', async function (next) {
  if (!this.isNew) return next() // Skip if document is not new

  try {
    // Find the latest transaction ID from the database
    const latestMovement = await this.constructor.findOne({}, {}, { sort: { transactionId: -1 } })

    // Extract the numeric part of the latest transaction ID and increment it
    let nextIdNumber = 1
    if (latestMovement && latestMovement.transactionId) {
      const lastIdNumber = parseInt(latestMovement.transactionId.replace('DTN', ''), 10)
      nextIdNumber = isNaN(lastIdNumber) ? 1 : lastIdNumber + 1
    }

    // Format the new transaction ID with leading zeros
    const formattedId = `DTN${nextIdNumber.toString().padStart(4, '0')}`
    this.transactionId = formattedId

    next()
  } catch (error) {
    next(error)
  }
})

// Create model from the schema
const DispenseTransaction = mongoose.model('dispensetransactions', dispenseTransactionSchema)

// Export the model
module.exports = DispenseTransaction
