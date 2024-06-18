const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SettingsSchema = new Schema(
  {
    appName: {
      type: String,
      required: true,
      default: 'Born High'
    },
    appLogo: {
      type: String,
      default: '/images/logos/bornhigh.svg' // Default path or URL to the app logo
    },
    appDomainLink: {
      type: String,
      default: 'http://localhost:3000' // Default path or URL to the app logo
    },
    idTypes: {
      type: [String],
      default: ['ID', 'Passport', "Driver's License"] // Default ID types
    },
    estimatedConsumption: {
      type: [String],
      default: ['20g', '50g', '100g'] // Default estimated consumption values
    },
    cannabisCategories: {
      type: [String],
      default: ['Category 1', 'Category 2', 'Category 3'] // Default cannabis product categories
    },
    cannabisType: {
      type: [String],
      default: ['Indica', 'Sativa', 'Hybrid'] // Default cannabis product type
    }
  },
  { timestamps: true }
)

const Settings = mongoose.model('settings', SettingsSchema)

// Check if the settings collection is empty
Settings.countDocuments({})
  .then(count => {
    if (count === 0) {
      // Create a new document with default values
      const defaultSettings = new Settings()
      return defaultSettings.save()
    } else {
      console.log('Settings already exist')
    }
  })
  .then(() => console.log('Default settings created successfully'))
  .catch(err => console.error('Error creating or checking default settings:', err))

module.exports = Settings
