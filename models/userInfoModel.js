const mongoose = require('mongoose')
const { Schema } = mongoose
// const usersModel = mongoose.model('users')
const usersModel = require('./userModel')

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 1 }
})

const Counter = mongoose.model('Counter', CounterSchema)

const userSchema = new Schema({
  usersID: {
    type: mongoose.Schema.Types.ObjectId,
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
  },
  credits: {
    type: Number,
    required: false
  },
  Gender: {
    type: String,
    required: false
  },
  ExpiryDate: {
    type: Date,
    required: false
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

// Function to find a superadmin user and create a new document in usersinfos
async function createUserInfoForSuperadmin() {
  try {
    // Find a superadmin user
    const superadminUser = await usersModel.findOne({ userRole: 'superadmin' })

    if (!superadminUser) {
      console.log('Superadmin user not found.')
      return
    }
    const existingUserInfo = await usersinfosCollections.findOne({ usersID: superadminUser._id })
    if (!existingUserInfo) {
      const newUserInfo = new usersinfosCollections({
        usersID: superadminUser._id, // Assuming usersID is the field to store user ID
        memberCode: '0000',
        firstName: 'super',
        lastName: 'admin',
        phoneNumber: '000',
        dateOfBirth: new Date('1997-11-18'),
        idNumber: '0000'
      })
      // Save the new document
      await newUserInfo.save()
      console.log('New usersinfos document created for superadmin user.')
    }
  } catch (error) {
    console.error('Error creating usersinfos document:', error)
  }
}

// Call the function to create usersinfos for superadmin
createUserInfoForSuperadmin()

const usersinfosCollections = mongoose.model('usersinfos', userSchema)
const counter = mongoose.model('counters', CounterSchema)

module.exports = usersinfosCollections
