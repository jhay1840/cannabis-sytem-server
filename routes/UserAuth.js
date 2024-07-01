const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')
const htmlPdf = require('html-pdf')
const crypto = require('crypto')
const { Readable } = require('stream')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

dotenv.config()
// const { createCanvas } = require('canvas')
// const QRCode = require('qrcode')

const User = mongoose.model('users')
const usersInfo = mongoose.model('usersinfos')
const Counter = mongoose.model('counters')

const router = express.Router()
router.use(express.json())

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})
// Fetch HTML template from S3
async function fetchHTMLTemplateFromS3() {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: 'contract_template.html'
  }

  try {
    const { Body } = await s3Client.send(new GetObjectCommand(params))

    // Convert body stream to string
    const bodyBuffer = await streamToBuffer(Body)
    const htmlTemplate = bodyBuffer.toString('utf-8')

    // Now you can use `htmlTemplate` in your application
    // console.log(htmlTemplate)

    return htmlTemplate
  } catch (err) {
    console.error('Error fetching HTML template from S3:', err)
    throw err
  }
}

// Helper function to convert stream to buffer
async function streamToBuffer(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
const transportOptions = {
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}
const transporter = nodemailer.createTransport(transportOptions)
// Load the HTML template
// const templatePath = path.join(__dirname, '..', 'uploads', 'contracts', 'pdf', 'contract_template.html')

// // Load the HTML template
// const htmlTemplate = fs.readFileSync(templatePath, 'utf8')
/*
authenticate user
output: user 
*/
// Middleware to authenticate the user
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

// Get user info endpoint
router.get('/api/user/protected/user', async (req, res) => {
  try {
    const user = await usersInfo.findOne({ usersID: req.user.userId }).select('memberCode')
    if (!user) {
      return res.status(404).json({ error: 'User not found' + req.user.userId })
    }
    return res.json({ id: req.user.userId, memberCode: user.memberCode, userRole: req.user.userRole })
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' })
  }
})
/*
Check login details
*/
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    // Find user by email
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userRole: user.userRole, userName: user.userName },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    )

    const userRole = user.userRole
    req.session.token = token
    // res.cookie("jwt", token, { httpOnly: true });

    res.json({ token, userRole })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server Error' })
  }
})

/*
Check token and user type
*/
router.get('/api/public/user-type', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  const isLoggedIn = 'false'
  console.log(token)
  if (token == null) {
    return res.json(isLoggedIn)
  } else {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403)
      req.user = user
      return res.json(req.user.userRole)
    })
  }
})

//---------------------------------------------------------------------------------------------
// endpoint to check if email already exist

router.post('/api/protected/check_email', async (req, res) => {
  const { email } = req.body
  try {
    // check if email already exist
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(204).json({ message: 'Email already exists' })
    }
    res.status(201).json({ message: 'email validated' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

//---------------------------------------------------------------------------------------------
// endpoint for registering the user to database

// router.post('/api/protected/register', async (req, res) => {
//   const {
//     firstName,
//     lastName,
//     email,
//     idOrPassportNumber,
//     dateOfBirth,
//     gender,
//     phone,
//     preferredName,
//     userRole,
//     receiveUpdates,
//     subscribeToNewsletter,
//     nationality,
//     idType,
//     consumption
//   } = req.body

//   const resetToken = crypto.randomBytes(32).toString('hex')
//   const resetTokenExpire = Date.now() + 3600000
//   const salt = await bcrypt.genSalt(10)
//   const password = generateRandomPassword()
//   const hashedPassword = await bcrypt.hash(password, salt)

//   try {
//     const createdUser = await User.create({
//       userRole,
//       userName: preferredName,
//       password: hashedPassword,
//       email,
//       createdAt: Date.now(),
//       updatedAt: Date.now(),
//       confirmationCode: '',
//       confirmed: false,
//       resetToken: resetToken,
//       resetTokenExpire: resetTokenExpire
//     })
//     createdUser.confirmationCode = createdUser.id
//     await createdUser.save()

//     const counter = await Counter.findByIdAndUpdate(
//       { _id: 'memberCode' },
//       { $inc: { sequence_value: 1 } },
//       { new: true, upsert: true }
//     )
//     const createdUserInfo = await usersInfo.create({
//       usersID: createdUser.id,
//       firstName,
//       lastName,
//       phoneNumber: phone,
//       dateOfBirth,
//       gender,
//       memberCode: counter.sequence_value.toString().padStart(4, '0'),
//       idNumber: idOrPassportNumber,
//       credits: 0,
//       receiveUpdates,
//       subscribeToNewsletter,
//       nationality,
//       idType,
//       consumption
//     })
//     const htmlTemplate = await fetchHTMLTemplateFromS3()

//     const finalHtml = htmlTemplate
//       .replace('{fname}', firstName)
//       .replace('{lname}', lastName)
//       .replace('{preferred}', email)
//       .replace('{date}', Date.now())
//       .replace('{email}', email)
//       .replace('{phone}', phone)
//       .replace('{dateOfBirth}', dateOfBirth)
//       .replace('{idType}', idType)
//       .replace('{idNumber}', idOrPassportNumber)
//       .replace('{whatsapp}', receiveUpdates)
//       .replace('{newsletter}', subscribeToNewsletter)
//       .replace('{consumption}', consumption)
//     const memberCode = createdUserInfo.memberCode

//     htmlPdf.create(finalHtml).toBuffer((err, buffer) => {
//       if (err) {
//         console.error(err)
//         throw new Error('Error converting HTML to PDF')
//       }

//       const mailOptions = {
//         from: 'hello@cannabishealth.co.za',
//         to: email,
//         subject: 'Bornhigh Email Confirmation',
//         html: `
//           <h1>Confirm Your Email Address</h1>
//           <p>Please click on the following link to confirm your email address:</p>
//           <a href="${process.env.CLIENT_URL + '/confirm-email/' + createdUser.id}">${
//           process.env.CLIENT_URL + '/confirm-email/' + createdUser.id
//         }</a>
//         `
//       }
//       const welcomeEmail = {
//         from: 'hello@cannabishealth.co.za',
//         to: email,
//         subject: 'Welcome to Born High - Your Passport to Premium Cannabis Cultivation',
//         html: `
//           <p>Dear ${firstName},</p>
//           <p>Welcome to <a href="http://www.bornhigh.co.za">Born High</a>, where passion meets cultivation, and every strain tells a story of our unwavering commitment to providing premium local genetics. We are thrilled to have you join our close-knit family of cannabis enthusiasts who appreciate the art of breeding and the joy of pheno hunting.</p>
//           <p>Please find your signed contract attached to this email for your reference.</p>
//           <p><strong>About Born High:</strong></p>
//           <p>Born High is a Cape Town-based cannabis company with a rich history of cultivation spanning over 30 years. Our roots extend across the globe, from the lush landscapes of Hawaii, California, Ireland, Morocco, Lesotho, to the breathtaking Western Cape of South Africa. Our pride lies in crafting unique genetics, driven by a profound passion for cultivation.</p>
//           <p><strong>Our Promise to You:</strong></p>
//           <p>We are dedicated to creating exceptional strains, leveraging years of experience and a deep understanding of our plant's genetic potential. With each strain, we aim to deliver unparalleled quality, consistency, and a genuine connection to the art of cultivation.</p>
//           <p>Should you have any questions or require further assistance, please do not hesitate to reach out to us at hello@cannabishealth.co.za.</p>
//           <p>Welcome to the Born High family!</p>
//           <p>Best regards,</p>
//           <p>The Born High Team</p>
//         `,
//         attachments: [
//           {
//             filename: 'signed_contract.pdf',
//             content: buffer
//           }
//         ]
//       }

//       transporter.sendMail(mailOptions, (error, info) => {
//         if (error) {
//           console.error(error)
//           res.status(500).json({ message: 'Failed to send confirmation email' })
//         }
//       })

//       transporter.sendMail(welcomeEmail, (error, info) => {
//         if (error) {
//           console.error(error)
//           res.status(500).json({ message: 'Failed to send welcome email' })
//         }
//       })

//       res.status(201).json({ memberCode })
//     })
//   } catch (error) {
//     console.error(error)
//     res.status(500).json({ message: 'Server error' })
//   }
// })
router.post('/api/protected/register', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    idOrPassportNumber,
    dateOfBirth,
    gender,
    phone,
    preferredName,
    userRole,
    receiveUpdates,
    subscribeToNewsletter,
    nationality,
    idType,
    consumption
  } = req.body

  // Generate password reset token
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetTokenExpire = Date.now() + 3600000 // Token valid for 1 hour
  // Hash the password
  const salt = await bcrypt.genSalt(10)
  const password = generateRandomPassword()
  const hashedPassword = await bcrypt.hash(password, salt)

  try {
    const createdUser = await User.create({
      userRole,
      userName: preferredName,
      password: hashedPassword,
      email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      confirmationCode: '', // Use the user ID as the confirmation code
      confirmed: false,
      resetToken: resetToken,
      resetTokenExpire: resetTokenExpire
    })
    createdUser.confirmationCode = createdUser.id
    await createdUser.save()

    // Create user info with the generated member code
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'memberCode' },
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    )
    const createdUserInfo = await usersInfo.create({
      usersID: createdUser.id,
      firstName,
      lastName,
      phoneNumber: phone,
      dateOfBirth,
      gender,
      memberCode: counter.sequence_value.toString().padStart(4, '0'), // Use the generated member code
      idNumber: idOrPassportNumber,
      credits: 0,
      receiveUpdates,
      subscribeToNewsletter,
      nationality,
      idType,
      consumption
    })

    const finalHtml = htmlTemplate
      .replace('{fname}', firstName)
      .replace('{{lname}}', lastName)
      .replace('{preferred}', email)
      .replace('{date}', Date.now())
      .replace('{email}', email)
      .replace('{phone}', phone)
      .replace('{dateOfBirth}', dateOfBirth)
      .replace('{idType}', idType)
      .replace('{idNumber}', idOrPassportNumber)
      .replace('{whatsapp}', receiveUpdates)
      .replace('{newsletter}', subscribeToNewsletter)
      .replace('{consumption}', consumption)

    // Send confirmation email
    const mailOptions = {
      from: 'hello@cannabishealth.co.za',
      to: email,
      subject: 'Bornhigh Email Confirmation',
      html: `
    <h1>Confirm Your Email Address</h1>
    <p>Please click on the following link to confirm your email address:</p>
    <a href="${process.env.CLIENT_URL + '/confirm-email/' + createdUser.id}">${
        process.env.CLIENT_URL + '/confirm-email/' + createdUser.id
      }</a>
  `
    }
    const welcomeEmail = {
      from: 'hello@cannabishealth.co.za',
      to: email,
      subject: 'Welcome to Born High - Your Passport to Premium Cannabis Cultivation',
      html: `
      <p>Dear ${firstName},</p>

      <p>Welcome to <a href="http://www.bornhigh.co.za">Born High</a>, where passion meets cultivation, and every strain tells a story of our unwavering commitment to providing premium local genetics. We are thrilled to have you join our close-knit family of cannabis enthusiasts who appreciate the art of breeding and the joy of pheno hunting.</p>

      <p>Please find your signed contract attached to this email for your reference.</p>

      <p><strong>About Born High:</strong></p>
      <p>Born High is a Cape Town-based cannabis company with a rich history of cultivation spanning over 30 years. Our roots extend across the globe, from the lush landscapes of Hawaii, California, Ireland, Morocco, Lesotho, to the breathtaking Western Cape of South Africa. Our pride lies in crafting unique genetics, driven by a profound passion for cultivation.</p>

      <p><strong>Our Mission:</strong></p>
      <p>Our mission is singular and focused—the art of breeding and pheno hunting. We tirelessly explore and uncover hidden gems to enrich the Born High connoisseur’s library. Regardless of our growth, we remain a close-knit family of dedicated individuals, all working towards delivering the highest quality cannabis possible.</p>

      <p><strong>A Global Essence, Rooted in Cape Town:</strong></p>
      <p>While our roots may stretch across the globe, our essence is firmly rooted in representing Cape Town, South Africa, with pride. As we expand, we maintain our commitment to being a small company with a big heart. Our clear focus is on consistently producing top-tier cannabis, showcasing the very best that Cape Town has to offer.</p>

      <p><strong>Connect with Us:</strong></p>
      <p>To stay updated with our latest strains, events, and exclusive offerings, make sure to explore our website. You can also connect with us on Instagram for a visual journey into the world of Born High:</p>
      <ul>
        <li>Born High Social Club: <a href="https://www.instagram.com/bornhighcpt">https://www.instagram.com/bornhighcpt</a></li>
        <li>Born High Genetics: <a href="https://www.instagram.com/bornhighgenetics/">https://www.instagram.com/bornhighgenetics/</a></li>
      </ul>

      <p><strong>Your Journey with Born High:</strong></p>
      <p>Explore our diverse selection of premium cannabis strains and embark on a journey where each strain carries the essence of our enduring commitment to excellence. Every strain in our collection tells a unique story, and we are excited for you to become a part of it.</p>

      <p>Thank you for choosing Born High. Together, let us celebrate the art, passion, and joy of cannabis cultivation.</p>

      <p>Best regards,<br>The Born High Team</p>
    `
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error)
      } else {
        console.log('Email sent: ' + info.response)
      }
    })
    transporter.sendMail(welcomeEmail, (error, info) => {
      if (error) {
        console.log(error)
      } else {
        console.log('Email sent: ' + info.response)
      }
    })

    const memberCode = createdUserInfo.memberCode

    res.status(201).json({ memberCode })
  } catch (error) {
    console.error(error) // Log the error for debugging purposes

    res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
})
//---------------------------------------------------------------------------------------------
// confirm email address
router.get('/api/confirm-email/:confirmationCode', async (req, res) => {
  const confirmationCode = req.params.confirmationCode

  try {
    const updatedUser = await User.findOneAndUpdate(
      { confirmationCode: confirmationCode },
      { confirmed: true },
      { new: true }
    )

    if (!updatedUser) {
      return res.status(404).send('User not found')
    }

    const { email, resetToken } = updatedUser

    // Send email with the password reset link
    const resetEmail = {
      from: 'hello@cannabishealth.co.za',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>Dear ${updatedUser.userName},</p>
        <p>Your account has been successfully confirmed. To set your password, please click on the following link:</p>
        <p><a href="${process.env.CLIENT_URL}/password-reset/${resetToken}">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>The Born High Team</p>
      `
    }

    transporter.sendMail(resetEmail, (error, info) => {
      if (error) {
        console.log(error)
      } else {
        console.log('Password reset email sent: ' + info.response)
      }
    })

    res.send('Email confirmed and password reset link sent')
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  }
})
//---------------------------------------------------------------------------------------------
// Handle logout route
router.get('/logout', (req, res) => {
  try {
    // Clear session and JWT cookie
    req.session = null
    res.clearCookie('jwt')
    // res.redirect(process.env.CLIENT_URL + "/");
    res.send('logged out')
  } catch (error) {
    console.log(error)
  }
})

//reset/setup password
router.post('/api/reset-password/:resetToken', async (req, res) => {
  const resetToken = req.params.resetToken
  const { newPassword } = req.body

  try {
    const user = await User.findOne({
      resetToken,
      resetTokenExpire: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).send('Invalid or expired reset token')
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    user.password = hashedPassword
    user.resetToken = undefined
    user.resetTokenExpire = undefined

    await user.save()

    res.status(200).send('Password has been reset')
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  }
})

//-------------------------------------------HELPERS--------------------------------------------------
//generate password
function generateRandomPassword() {
  // Define the character sets for the password
  const uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const specialCharacters = '!@#$%^&*()_+[]{}|;:,.<>?'

  // Combine all character sets
  const allCharacters = uppercaseLetters + lowercaseLetters + numbers + specialCharacters

  // Function to get a random character from the character set
  const getRandomCharacter = characterSet => {
    const randomIndex = Math.floor(Math.random() * characterSet.length)
    return characterSet.charAt(randomIndex)
  }

  // Generate the password
  let password = ''
  for (let i = 0; i < 6; i++) {
    password += getRandomCharacter(allCharacters)
  }

  return password
}

module.exports = router
