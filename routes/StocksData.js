const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config()

const User = mongoose.model('users')
const ClosingStock = mongoose.model('closingstocks')
const Product = mongoose.model('cannabisproducts')

const router = express.Router()
router.use(express.json())

/// Middleware to authenticate the user
function authenticateTokenUser(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token == null) {
    return res.sendStatus(401) // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403) // Forbidden
    }
    req.user = user
    next()
  })
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token == null) {
    return res.sendStatus(401) // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403) // Forbidden
    }
    req.user = user
    // Assuming the token contains a user object with a role property
    if (req.user.userRole !== 'superadmin' && req.user.userRole !== 'admin') {
      return res.sendStatus(403).send(req.user.userRole) // Forbidden
    }

    next()
  })
}

router.use('/api/user/protected/', authenticateTokenUser)
router.use('/api/protected/', authenticateToken)

// POST endpoint to save closing stocks
router.post('/api/protected/saveClosingStock', async (req, res) => {
  try {
    const closingStockData = req.body

    // Validate data
    if (!Array.isArray(closingStockData) || closingStockData.length === 0) {
      return res.status(400).json({ error: 'Invalid data format' })
    }

    // Ensure user information is available
    if (!req.user || !req.user.userName) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Add createdBy field to each item
    const closingStockDataWithUser = closingStockData.map(item => ({
      ...item,
      createdBy: req.user.userName
    }))

    // Save each item as a new document in the database
    const savedItems = await Promise.all(
      closingStockDataWithUser.map(async item => {
        const newItem = new ClosingStock(item)
        return newItem.save()
      })
    )

    res.status(200).json({ message: 'Data saved successfully', data: savedItems })
  } catch (error) {
    console.error('Error saving closing stock data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Route to get reports based on date range
router.get('/api/protected/reports', async (req, res) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' })
  }

  try {
    const reports = await ClosingStock.find({
      closeDate: {
        $gte: startDate,
        $lte: endDate
      }
    })

    res.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Route to get an overview including out-of-stock count, total products count, and member count
router.get('/api/protected/overview', async (req, res) => {
  try {
    // Query to count out-of-stock products, including those without a stock field
    const outOfStockCount = await Product.countDocuments({
      $or: [{ stock: { $lte: 0 } }, { stock: { $exists: false } }]
    })

    // Query to count total products
    const totalProductsCount = await Product.countDocuments()

    // Query to count users with the role 'member'
    const memberCount = await User.countDocuments({ userRole: 'member' })

    // Send the counts in the response
    res.json({
      outOfStockCount: outOfStockCount,
      totalProductsCount: totalProductsCount,
      memberCount: memberCount
    })
  } catch (error) {
    console.error('Error fetching overview data:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
