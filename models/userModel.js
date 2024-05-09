const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { Schema } = mongoose

const userSchema = new Schema({
  userRole: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  confirmationCode: { type: String },
  confirmed: { type: Boolean, default: false }
})

// Static method to create the initial superadmin account
userSchema.statics.createSuperAdmin = async function () {
  const existingSuperAdmin = await this.findOne({ userName: 'erickadmin' })

  if (existingSuperAdmin) {
    // console.log('Superadmin account already exists.')
    return existingSuperAdmin
  }

  // Hash the password before storing it
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash('AAdynamics2023!', salt)
  const superAdmin = await this.create({
    userRole: 'superadmin', // Specify the role for the superadmin
    userName: 'erickadmin',
    password: hashedPassword, // Replace with a secure password or hash
    email: 'jhay.dev1840@gmail.com',
    confirmed: false
  })

  console.log('Superadmin account created successfully.')
  return superAdmin
}

const User = mongoose.model('users', userSchema)

async function initializeSuperAdmin() {
  try {
    const superAdmin = await User.createSuperAdmin()

    // console.log('Superadmin account details:', superAdmin)
  } catch (error) {
    console.error('Error creating superadmin account:', error)
  }
}

// Call the function to create the initial superadmin account
initializeSuperAdmin()

const usersCollections = mongoose.model('users', userSchema)

// remove users with unconfirmed emails after 24 hours  86400
// userSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400, partialFilterExpression: { confirmed: false } })

module.exports = usersCollections
