const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');

// defining the middleware
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

// route to invoke sign up from the controller
router.post('/signup',
    controller.signup
);

// route to login
router.post('/login',
    controller.login
);

// exporting router to index.js
module.exports = router;
