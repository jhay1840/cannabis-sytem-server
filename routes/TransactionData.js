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
const DispenseTransaction = mongoose.model('dispensetransactions')

const router = express.Router()
router.use(express.json())

// Middleware to authenticate the user
function authenticateTokenUser(req, res, next) {
  const token = req.session.token
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
  const token = req.session.token
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
// GET all credit Transactions or search transaction by name
router.get('/api/user/protected/creditTransactions', async (req, res) => {
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
router.get('/api/protected/dispenseTransactions', async (req, res) => {
  try {
    const { memberId, productId, search } = req.query // Get memberId, productId, and search from the query parameters

    let transactions
    if (memberId && memberId.trim() !== '') {
      // Filter transactions by memberId
      transactions = await DispenseTransaction.find({ memberCode: memberId.trim() }).sort({ transactionDate: -1 })
    } else {
      // Fetch all transactions if no memberId is provided
      transactions = await DispenseTransaction.find().sort({ transactionDate: -1 })
    }

    if (productId && productId.trim() !== '') {
      // Filter transactions to only include those that contain the specified productId
      transactions = transactions.filter(transaction =>
        transaction.products.some(product => product.productId.toString() === productId.trim())
      )
    }

    if (search && search.trim() !== '') {
      const searchTerm = search.trim().toLowerCase()
      // Further filter transactions based on the search term
      transactions = transactions.filter(transaction => {
        // Check comments, createdBy, and product names
        const matchesComments = transaction.comments.toLowerCase().includes(searchTerm)
        const matchesCreatedBy = transaction.createdBy.toLowerCase().includes(searchTerm)
        const matchesProductName = transaction.products.some(product => product.name.toLowerCase().includes(searchTerm))
        return matchesComments || matchesCreatedBy || matchesProductName
      })
    }

    res.json(transactions)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})
router.get('/api/user/protected/dispenseTransactions', async (req, res) => {
  try {
    const { memberId, productId, search } = req.query // Get memberId, productId, and search from the query parameters

    let transactions
    if (memberId && memberId.trim() !== '') {
      // Filter transactions by memberId
      transactions = await DispenseTransaction.find({ memberCode: memberId.trim() }).sort({ transactionDate: -1 })
    } else {
      // Fetch all transactions if no memberId is provided
      transactions = await DispenseTransaction.find().sort({ transactionDate: -1 })
    }

    if (productId && productId.trim() !== '') {
      // Filter transactions to only include those that contain the specified productId
      transactions = transactions.filter(transaction =>
        transaction.products.some(product => product.productId.toString() === productId.trim())
      )
    }

    if (search && search.trim() !== '') {
      const searchTerm = search.trim().toLowerCase()
      // Further filter transactions based on the search term
      transactions = transactions.filter(transaction => {
        // Check comments, createdBy, and product names
        const matchesComments = transaction.comments.toLowerCase().includes(searchTerm)
        const matchesCreatedBy = transaction.createdBy.toLowerCase().includes(searchTerm)
        const matchesProductName = transaction.products.some(product => product.name.toLowerCase().includes(searchTerm))
        return matchesComments || matchesCreatedBy || matchesProductName
      })
    }

    res.json(transactions)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

//checkout process
router.post('/api/protected/checkout', async (req, res) => {
  const { memberCode, checkoutDate, comments, isGift, products } = req.body

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // 1. Update member's credits (assuming each product has a weight and the credits are reduced accordingly)
    const user = await usersInfo.findOne({ memberCode }).session(session)
    if (!user) {
      throw new Error('User not found')
    }

    const totalCredits = products.reduce((total, product) => total + product.subtotal, 0)
    user.credits -= totalCredits
    await user.save({ session })

    // 2. Create a new transaction
    const transaction = new DispenseTransaction({
      memberCode,
      checkoutDate,
      comments,
      isGift,
      products,
      amountTotal: totalCredits,
      createdBy: req.user.userName
    })
    await transaction.save({ session })

    // 3. Update product weights
    for (const product of products) {
      const productRecord = await Product.findById(product.productId).session(session)
      if (!productRecord) {
        throw new Error(`Product not found: ${product.productId}`)
      }
      productRecord.stock -= product.weight
      await productRecord.save({ session })
    }

    await session.commitTransaction()
    session.endSession()

    res.status(200).send('Checkout successful')
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Error during checkout:', error)
    res.status(500).send('Checkout failed. Please try again.')
  }
})

module.exports = router
