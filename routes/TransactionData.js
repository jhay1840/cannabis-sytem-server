const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config()

const User = mongoose.model('users')
const usersInfo = mongoose.model('usersinfos')
const Product = mongoose.model('cannabisproducts')
const Stocks = mongoose.model('cannabismovements')
const Credits = mongoose.model('membercredits')

const router = express.Router()
router.use(express.json())

function authenticateToken(req, res, next) {
  const token = req.session.token
  if (token == null) {
    return res.sendStatus(401)
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}
router.use('/api/protected', authenticateToken)

// POST route to add a new transaction
router.post('/api/protected/addStocks', async (req, res) => {
  try {
    const {
      productId,
      amountPurchased,
      realWeight,
      growType,
      jarWeight,
      purchasePrice,
      purchaseTotal,
      dispensePrice,
      dispenseTotal,
      sampleTaste,
      frDisplay,
      intStash,
      exStash,
      comments
    } = req.body

    // Perform validations on the input data
    if (amountPurchased < 0 || realWeight < 0 || jarWeight < 0 || purchasePrice < 0 || dispensePrice < 0) {
      return res.status(400).json({ error: 'Negative numbers are not allowed.' })
    }

    // Create a new Stock instance
    const newStock = await Stocks.create({
      transactionDate: Date.now(),
      transactionType: 'Add Stock',
      productId,
      amountPurchased,
      realWeight,
      growType,
      jarWeight,
      purchasePricePerGram: purchasePrice,
      totalPurchasePrice: purchaseTotal,
      dispensePricePerGram: dispensePrice,
      totalDispensePrice: dispenseTotal,
      movementsSampleTaste: sampleTaste,
      movementsForDisplayJar: frDisplay,
      movementsInStash: intStash,
      movementsExtStash: exStash,
      comments,
      createdBy: req.user.userName
    })
    // Update the stock of the product in the Product model
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Update the product's stock based on the new stock transaction
    product.stock += realWeight
    await product.save()

    // Send success response with created stock data
    res.status(201).json({ message: 'Stock added successfully', stock: newStock })
  } catch (error) {
    console.error('Error adding stocks:', error)
    res.status(500).json({ error: 'An error occurred while adding stocks' })
  }
})

// GET all Transactions or search transaction by name
router.get('/api/protected/cannabisTransactions', async (req, res) => {
  try {
    const { search, productId } = req.query // Get the search query from the request query parameters

    let transactions
    if (productId && productId.trim() !== '') {
      // If productId is provided, filter transactions by productId
      transactions = await Stocks.find({ productId: productId.trim() }).sort({ transactionDate: -1 })
    } else {
      // Otherwise, fetch all products
      transactions = await Stocks.find().sort({ transactionDate: -1 })
    }

    res.json(transactions)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// adding credit route
router.post('/api/protected/updateCredits', async (req, res) => {
  try {
    const { memberCode, amount, comments, paidBy } = req.body

    // Find user by member code and update credits
    const user = await usersInfo.findOne({ memberCode })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update user's credits
    user.credits += amount
    await user.save()

    // Log credit update transaction
    const transaction = new Credits({
      memberCode,
      transactionType: 'Donation',
      amount,
      creditBefore: user.credits - amount,
      creditAfter: user.credits,
      comments,
      paidBy,
      createdBy: req.user.userName
    })
    await transaction.save()

    return res.status(200).json({ message: 'Credits updated successfully' })
  } catch (error) {
    console.error('Error updating credits:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET all credit Transactions or search transaction by name
router.get('/api/protected/creditTransactions', async (req, res) => {
  try {
    const { search, memberId } = req.query // Get the search query from the request query parameters

    let transactions
    if (memberId && memberId.trim() !== '') {
      // If productId is provided, filter transactions by productId
      transactions = await Credits.find({ memberCode: memberId.trim() }).sort({ transactionDate: -1 })
    } else {
      // Otherwise, fetch all products
      transactions = await Credits.find().sort({ transactionDate: -1 })
    }

    res.json(transactions)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
