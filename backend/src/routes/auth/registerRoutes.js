import express from "express"
import { body } from "express-validator"
import { register } from "../../controllers/auth/registerController.js"
import { verifyCaptcha } from "../../middleware/captchaMiddleware.js"

const router = express.Router()

router.post('/',
    [
        body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
        body('name').exists().withMessage('Username is required').isString(),
        body('password')
            .exists().withMessage('Password must be given')
            .isString()
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
    ],
    verifyCaptcha,
    register
)


export default router

