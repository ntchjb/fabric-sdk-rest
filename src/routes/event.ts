/**
 * The router for event management
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import express from 'express'

const router = express.Router()

router.post('/create', (req, res, next) => {
  // Use EventService instance the same way as proposal and transaction
  return res.status(501).json({
    message: "This request has not been implemented yet.",
  });
})

router.post('/send', (req, res, next) => {
  return res.status(501).json({
    message: "This request has not been implemented yet.",
  });
})

export default router
