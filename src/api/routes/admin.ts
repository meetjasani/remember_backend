import express from "express";
import { userRole } from "../../utils/middlewares";
import { upload } from "../../utils/multer";
import {
  addUser,
  deleteUserByAdmin,
  editUser,
  getUsers,
  login,
  resetPassword,
  validateAdmin,
} from "../controllers/admin";
import { getFilteredUsers } from "../controllers/user";

const router = express();

/**
 * @swagger
 * /admin/auth/login:
 *  post:
 *    tags: [Admin]
 *    description: test all
 *    parameters:
 *    - in: query
 *      name: lang
 *      type: string
 *      required: true
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
 *    responses:
 *      200:
 *        description: Success
 *
 */
router.post("/auth/login", login.validator, login.controller);

/**
 * @swagger
 * /admin/addUser:
 *  post:
 *    tags: [Admin]
 *    description: Add user by admin
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
 *          user_type:
 *            type: string
 *    security:
 *    - Token: []
 *    responses:
 *      200:
 *        description: Success
 *
 */
router.post(
  "/addUser",
  upload.any(),
  userRole,
  addUser.validator,
  addUser.controller
);

/**
 * @swagger
 * /admin/auth/reset:
 *  post:
 *    tags: [Admin]
 *    description: test all
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      type: string
 *      required: true
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          new_password:
 *            type: string
 *          old_password:
 *            type: string
 *    responses:
 *      200:
 *        description: Success
 *
 */
router.post("/auth/reset", resetPassword.validator, resetPassword.controller);

/**
 * @swagger
 * /admin/auth/deleteUser:
 *  put:
 *    tags: [Admin]
 *    description: test all
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: body
 *      name: id
 *      type: string
 *      required: true
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.put(
  "/auth/deleteUser",
  userRole,
  deleteUserByAdmin.validator,
  deleteUserByAdmin.controller
);

/**
 * @swagger
 * /admin/validate:
 *  post:
 *    tags: [Admin]
 *    description: test all
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    responses:
 *      200:
 *        description: Success
 *
 */
router.get("/validate", validateAdmin.validator, userRole, validateAdmin.controller);

/**
 * @swagger
 * /admin/editUser:
 *  patch:
 *    tags: [Admin]
 *    description: test all
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: id
 *      type: string
 *      required: true
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
 *          user_type:
 *            type: string
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.patch(
  "/editUser",
  upload.any(),
  userRole,
  editUser.validator,
  editUser.controller
);

/**
 * @swagger
 * /admin/users:
 *  get:
 *    tags: [Admin]
 *    description: test all
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    responses:
 *      200:
 *        description: Success
 *
 */
router.get("/users", userRole, getUsers.controller);

/**
 * @swagger
 * /admin/getFilteredUser:
 *  get:
 *    tags: [Admin]
 *    description: test all`
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: date_option
 *      enum: [ "sign_up", "deletion" ]
 *      required: false
 *      type: string
 *    - in: query
 *      name: start_date
 *      required: false
 *      type: string
 *    - in: query
 *      name: end_date
 *      required: false
 *      type: string
 *    - in: query
 *      name: user_information
 *      enum: [ "email", "name", "dob", "mobile"]
 *      required: false
 *      type: string
 *    - in: query
 *      name: search_term
 *      required: false
 *      type: string
 *    - in: query
 *      name: user_type
 *      enum: [ "Non", "Standard", "Basic", "Premium"]
 *      required: false
 *      type: string
 *    - in: query
 *      name: per_page
 *      type: number
 *      required: true
 *    - in: query
 *      name: page_number
 *      type: number
 *      required: true
 *    - in: query
 *      name: lang
 *      type: string
 *      enum: ['ko', 'en']
 *      required: true
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */

router.get(
  "/getFilteredUser",
  userRole,
  getFilteredUsers.validator,
  getFilteredUsers.controller
);

export default router;
