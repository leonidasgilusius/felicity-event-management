import express from "express"
import { body } from "express-validator"
import { login } from "../../controllers/auth/loginController.js"
import { verifyCaptcha } from "../../middleware/captchaMiddleware.js"

const router = express.Router()

router.post('/',
    [
        body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
        body('password')
        .exists().withMessage('Password must be given')
        .isString()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    ],
    verifyCaptcha,
    login
)


export default router
