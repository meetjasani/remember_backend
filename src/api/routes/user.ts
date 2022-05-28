import express from "express";
import {
  userRole,
  validateUser,
  validateUserByToken,
} from "../../utils/middlewares";
import { upload } from "../../utils/multer";
import {
  register,
  login,
  sendOtp,
  verifyOtp,
  deleteUserSelf,
  edit,
  getUser,
  verifyUser,
  getEmail,
  sendEmail,
  forgotPassword,
  // getPassword,
} from "../controllers/user";

const router = express.Router();

/**
 * @swagger
 * /user/auth/signup:
 *  post:
 *    tags: [User]
 *    description: test all
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          name:
 *            type: string
 *          email:
 *            type: string
 *          mobile:
 *            type: string
 *          password:
 *            type: string
 *          login_with:
 *            type: string
 *          is_verified:
 *            type: boolean
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.post("/auth/signup", register.validator, register.controller);

/**
 * @swagger
 * /user/auth/login:
 *  post:
 *    tags: [User]
 *    description: test all
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          email:
 *            type: string
 *          password:
 *            type: string
 *          login_with:
 *            type: string
 *    responses:
 *      200:
 *        description: Success
 *
 */
router.post("/auth/login", login.validator, login.controller);


/**
 * @swagger
 * /user/auth/edit:
 *  patch:
 *    tags: [User]
 *    description: test all
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          name:
 *            type: string
 *          email:
 *            type: string
 *          mobile:
 *            type: string
 *          dob:
 *            type: string
 *          password:
 *            type: string
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.patch(
  "/auth/edit",
  upload.any(),
  edit.validator,
  validateUserByToken,
  edit.controller
);

/**
 * @swagger
 * /user/auth/delete:
 *  patch:
 *    tags: [User]
 *    description: DeleteSelf
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    security:
 *    - Token: []
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.patch("/auth/delete", validateUserByToken, deleteUserSelf.controller);

/**
 * @swagger
 * /user/otp-send:
 *  post:
 *    tags: [User]
 *    description: test all
 *    parameters:
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          mobile:
 *            type: string
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.post("/otp-send", sendOtp.validator, sendOtp.controller);

/**
 * @swagger
 * /user/otp-verify:
 *  post:
 *    tags: [User]
 *    description: test all
 *    parameters:
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          mobile:
 *            type: string
 *          code:
 *            type: number
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.post("/otp-verify", verifyOtp.validator, verifyOtp.controller);

/**
 * @swagger
 * /user/getUser:
 *  get:
 *    tags: [User]
 *    description: get itineraries for current user
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    security:
 *    - Token: []
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.get("/getUser", getUser.controller);

/**
 * @swagger
 * /user/validate:
 *  get:
 *    tags: [User]
 *    description: get itineraries for current user
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    security:
 *    - Token: []
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.get("/validate", verifyUser.controller);

/**
 * @swagger
 * /user/getEmail:
 *  post:
 *    tags: [User]
 *    description: get itineraries for current user
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          name:
 *            type: string
 *          mobile:
 *            type: string
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.post("/getEmail", getEmail.validator, getEmail.controller);

/**
 * @swagger
 * /user/sendForgotlink:
 *  post:
 *    tags: [User]
 *    description: check email before send
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          email:
 *            type: string
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.post(
  "/sendForgotlink",
  sendEmail.validator,
  validateUser,
  sendEmail.controller
);

/**
 * @swagger
 * /user/auth/forgot:
 *  post:
 *    tags: [User]
 *    description: test all
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          password:
 *            type: string
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.post("/forgot", forgotPassword.validator, forgotPassword.controller);

export default router;
