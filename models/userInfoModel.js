const mongoose = require('mongoose')
const { Schema } = mongoose

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 1 }
})

const Counter = mongoose.model('Counter', CounterSchema)

const userSchema = new Schema({
  usersID: {
    type: String,
    required: true,
    unique: true
  },
  memberCode: {
    type: String,
    required: true,
    unique: true,
    minlength: 4
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  idNumber: {
    type: String,
    required: true
  }
})

// Generate a unique member code with a minimum of 4 digits starting from 0001
userSchema.pre('save', async function (next) {
  if (!this.memberCode) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'memberCode' },
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    )

    // Generate member code by padding the counter value
    this.memberCode = counter.sequence_value.toString().padStart(4, '0')
  }
  next()
})

const usersinfosCollections = mongoose.model('usersinfos', userSchema)
const counter = mongoose.model('counters', CounterSchema)

module.exports = usersinfosCollections
