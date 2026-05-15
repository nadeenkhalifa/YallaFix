const express = require("express");
const router = express.Router();

// Authentication subroutes
router.use("/register", require("./register"));
router.use("/login", require("./login"));
router.use("/logout", require("./logout"));
router.use("/passwordReset", require("./passwordReset"));

module.exports = router;
