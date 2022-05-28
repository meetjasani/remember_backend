import express from "express";
import { doHaveToken, userRole } from "../../utils/middlewares";
import { upload } from "../../utils/multer";
import {
  country,
} from "../controllers";

const router = express.Router();

/**
 * @swagger
 * /general/country:
 *  get:
 *    tags: [General]
 *    description: test all
 *    responses:
 *      200:
 *        description: Success
 *        content: {}
 *
 */
router.get("/country", country.controller);

export default router;
