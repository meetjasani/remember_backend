import express from "express";
import {
    userRole,
    validateUserByToken,
} from "../../utils/middlewares";
import { upload } from "../../utils/multer";
import { createMemorialHall, deleteMemorialHall, editMemorialHall, getMemorialHall, getMemorialHallByID, memorialHallImage, memorialHallSByUser } from "../controllers/memorialHall";

const router = express.Router();

/**
 * @swagger
 * /memorialHall/memorialHallRegistration:
 *  post:
 *    tags: [MemorialHall]
 *    description: test all
 *    security:
 *    - Token: []
 *    consumes:
 *     - multipart/form-data
 *     - application/x-www-form-urlencoded
 *     - binary
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
 *          age:
 *            type: number
 *          job_title:
 *            type: string
 *          date_of_death:
 *            type: string
 *          date_of_carrying_the_coffin_out:
 *            type: string
 *          funeral_Address:
 *            type: string
 *          room_number:
 *            type: number
 *          burial_plot:
 *            type: string
 *          Introduction:
 *            type: string
 *          registerer:
 *            type: array
 *            example: [
 *                        {
 *                            "name": "string",
 *                            "RelationShip": "string",
 *                        }
 *                    ]
 *          inviteFamilyMembers:
 *            type: array
 *            example: [
 *                        {
 *                            "name": "string",
 *                            "email":"string",
 *                            "RelationShip": "string",
 *                        }
 *                    ]
 *          moneyAccount:
 *            type: array
 *            example: [
 *                        {
 *                            "name": "string",
 *                            "bank_name":"string",
 *                            "ac_number": "string",
 *                        }
 *                    ]
 *          donationSerives:
 *            type: array
 *            example: [
 *                        {
 *                            "donation_field": "string",
 *                            "bank_name":"string",
 *                            "recipient_organization": "string",
 *                            "ac_number": "string",
 *                            "Introduction": "string",
 *                            "service_duration": "string",
 *                        }
 *                    ]
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 */
router.post("/memorialHallRegistration", createMemorialHall.validator, createMemorialHall.controller);


/**
 * @swagger
 * /memorialHall/memorialHallImage:
 *  patch:
 *    tags: [MemorialHall]
 *    description: test all
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: formData
 *      name: memorial_id
 *      required: true
 *      type: string
 *    - in: formData
 *      name: image
 *      required: true
 *      type: file
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.patch(
    "/memorialHallImage",
    upload.any(),
    memorialHallImage.validator,
    memorialHallImage.controller
);

/**
 * @swagger
 * /memorialHall/memorialHalls:
 *  get:
 *    tags: [MemorialHall]
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
router.get("/memorialHalls", getMemorialHall.controller);

/**
 * @swagger
 * /memorialHall/memorialHallSByUser:
 *  get:
 *    tags: [MemorialHall]
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
router.get("/memorialHallSByUser", validateUserByToken, memorialHallSByUser.controller);

/**
 * @swagger
 * /memorialHall/getMemorialHall/{id}:
 *  post:
 *    tags: [MemorialHall]
 *    description: Add and Remove from whishlist
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: path
 *      name: id
 *      required: true
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.post("/getMemorialHall/:id", getMemorialHallByID.validator, getMemorialHallByID.controller);

/**
 * @swagger
 * /memorialHall/editMemorialHall/{id}:
 *  put:
 *    tags: [MemorialHall]
 *    description: edit itinerary by admin
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: path
 *      name: id
 *      type: string
 *      required: true
 *    - in: body
 *      name: body
 *      required: true
 *      schema:
 *        type: object
 *        properties:
 *          name:
 *            type: string
 *          age:
 *            type: number
 *          job_title:
 *            type: string
 *          date_of_death:
 *            type: string
 *          date_of_carrying_the_coffin_out:
 *            type: string
 *          funeral_Address:
 *            type: string
 *          room_number:
 *            type: number
 *          burial_plot:
 *            type: string
 *          Introduction:
 *            type: string
 *          registerer:
 *            type: array
 *            example: [
 *                        {
 *                            "name": "string",
 *                            "RelationShip": "string",
 *                        }
 *                    ]
 *          inviteFamilyMembers:
 *            type: array
 *            example: [
 *                        {
 *                            "name": "string",
 *                            "email":"string",
 *                            "RelationShip": "string",
 *                        }
 *                    ]
 *          moneyAccount:
 *            type: array
 *            example: [
 *                        {
 *                            "name": "string",
 *                            "bank_name":"string",
 *                            "ac_number": "string",
 *                        }
 *                    ]
 *          donationSerives:
 *            type: array
 *            example: [
 *                        {
 *                            "donation_field": "string",
 *                            "bank_name":"string",
 *                            "recipient_organization": "string",
 *                            "ac_number": "string",
 *                            "Introduction": "string",
 *                            "service_duration": "string",
 *                        }
 *                    ]
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.put(
    "/editMemorialHall/:id",
    editMemorialHall.validator,
    editMemorialHall.controller
);

/**
 * @swagger
 * /admin/deleteMemorialHall/{id}:
 *  delete:
 *    tags: [MemorialHall]
 *    description: Delete Hosting
 *    security:
 *    - Token: []
 *    parameters:
 *    - in: query
 *      name: lang
 *      required: true
 *      type: string
 *    - in: path
 *      name: id
 *      type: string
 *      required: true
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 */
router.delete(
    "/deleteMemorialHall/:id",
    userRole,
    deleteMemorialHall.validator,
    deleteMemorialHall.controller
);


export default router;