import { celebrate } from "celebrate";
import { Request, Response } from "express";
import httpStatus from "http-status";
import Joi from "joi";
import { getRepository } from "typeorm";
import APIResponse from "../../utils/APIResponse";
import { Country } from "../entity";
import XLSX from "xlsx";
import { Languages } from "../../utils/constant";
import { deleteFile } from "../../utils/utils";
import moment from "moment";

// UserSide Controller *************************************

const country = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: Request, res: Response) => {
    try {
      const countryRepo = getRepository(Country);
      const data = await countryRepo.find();

      let countries;
      if (req.query.lang === Languages.en) {
        countries = data.map((x) => ({
          id: x.id,
          name: x.name,
          code: x.code,
        }));
      } else {
        countries = data.map((x) => ({
          id: x.id,
          name: x.name_ko,
          code: x.code,
        }));
      }

      if (countries) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(countries, "Data Found", 200));
      }
      throw new Error("Countries Not found");
    } catch (error) {
      return res
        .status(404)
        .json(new APIResponse(null, "Data not Found", 404, error));
    }
  },
};


// AdminSide Controller *************************************



export {
  country
};
