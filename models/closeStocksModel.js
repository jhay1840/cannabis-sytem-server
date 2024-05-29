const mongoose = require('mongoose')
const Schema = mongoose.Schema

const closingStockSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    endOfDayQty: { type: Number, required: true },
    startOfDayQty: { type: Number, required: true },
    usage: { type: Number },
    closeDate: { type: String, required: true }, // Assuming closeDate is a string
    createdBy: { type: String, required: true } // Assuming createdBy is a string
  },
  { timestamps: true }
) // Automatically manage createdAt and updatedAt fields

const ClosingStock = mongoose.model('closingstocks', closingStockSchema)

module.exports = ClosingStock
