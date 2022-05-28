import httpStatus from "http-status";
import { getRepository } from "typeorm";
import { User } from "../api/entity";
import APIResponse from "./APIResponse";
import { RoleType } from "./constant";
import { decodeToken } from "./jwt.helper";

const userRole = (req, res, next) => {
  if (req.user.role === RoleType.admin) {
    return next();
  }
  return res
    .status(httpStatus.UNAUTHORIZED)
    .json(
      new APIResponse(null, "Unauthorized User.", httpStatus.UNAUTHORIZED, {})
    );
};

const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    status: statusCode,
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? "😂" : error.stack,
    errors: error.errors || undefined,
  });
};

const validateUser = async (req, res, next) => {
  const userRepo = getRepository(User);

  const user = await userRepo.findOne({
    where: { email: req.body.email, is_deleted: false },
  });

  if (user) {
    return next();
  }
  return res
    .status(httpStatus.BAD_REQUEST)
    .json(new APIResponse(null, "User not found", httpStatus.BAD_REQUEST));
};

const validateUserByToken = async (req, res, next) => {
  const userRepo = getRepository(User);

  const user = await userRepo.findOne({
    where: { email: req.user.email, is_deleted: false },
  });

  if (user) {
    return next();
  }
  return res
    .status(httpStatus.BAD_REQUEST)
    .json(new APIResponse(null, "User not found", httpStatus.BAD_REQUEST));
};

const doHaveToken = (req, res, next) => {
  if (req.headers.authorization) {
    req["user"] = decodeToken(req.headers.authorization);
  }
  next();
};

export {
  userRole,
  errorHandler,
  validateUser,
  validateUserByToken,
  doHaveToken,
};
