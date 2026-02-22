import express from "express"
import { body } from "express-validator"
import adminLogin from "../../controllers/admin/loginController.js"

const router = express.Router()

router.post('/', [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    ],
    adminLogin
)

export default router