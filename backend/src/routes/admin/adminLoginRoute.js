import express from "express"
import { body } from "express-validator"
import adminLogin from "../../controllers/admin/loginController.js"
import { verifyCaptcha } from "../../middleware/captchaMiddleware.js"

const router = express.Router()

router.post('/', [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    ],
    verifyCaptcha,
    adminLogin
)

export default router