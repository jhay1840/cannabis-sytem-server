// Import necessary modules
const mongoose = require('mongoose')

// Define Schema
const Schema = mongoose.Schema

// Create a new schema
const memberCreditSchema = new Schema({
  memberCode: { type: String },
  transactionId: { type: String, unique: true },
  transactionDate: { type: Date, default: Date.now },
  transactionType: { type: String },
  amount: { type: Number },
  creditBefore: { type: Number },
  creditAfter: { type: Number },
  comments: { type: String },
  createdBy: { type: String },
  paidBy: { type: String }
})

// Pre-save middleware to generate auto-incrementing transaction ID
memberCreditSchema.pre('save', async function (next) {
  if (!this.isNew) {
    // If the document is not new, skip generating the ID
    return next()
  }

  try {
    // Find the latest transaction ID from the database
    const latestMovement = await this.constructor.findOne({}, {}, { sort: { transactionId: -1 } })

    // Extract the numeric part of the latest transaction ID and increment it
    let nextIdNumber = 1
    if (latestMovement && latestMovement.transactionId) {
      const lastIdNumber = parseInt(latestMovement.transactionId.replace('MTN', ''), 10)
      nextIdNumber = lastIdNumber + 1
    }

    // Format the new transaction ID with leading zeros
    const formattedId = `MTN${nextIdNumber.toString().padStart(4, '0')}`
    this.transactionId = formattedId

    next()
  } catch (error) {
    next(error)
  }
})

// Create model from the schema
const MemberCredit = mongoose.model('membercredits', memberCreditSchema)

// Export the model
module.exports = MemberCredit
