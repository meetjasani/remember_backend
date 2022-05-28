import { Application } from "express";
import user from "./user";
import general from "./general";
import admin from "./admin";
import memorialHall from "./memorialHall";
import jwt from "express-jwt";
import { jwtSecret } from "../../../config";

export const setup = (app: Application) => {
  app.use(
    "/api/v1",
    jwt({ algorithms: ["HS256"], secret: jwtSecret }).unless({
      path: [
        "/api/v1/general/country",
        "/api/v1/user/auth/login",
        "/api/v1/user/auth/signup",
        "/api/v1/user/otp-send",
        "/api/v1/user/otp-verify",
        "/api/v1/user/sendForgotlink",
        "/api/v1/admin/auth/login",
        "/api/v1/user/getEmail"
      ],
    })
  );

  app.use("/api/v1/user", user);

  app.use("/api/v1/general", general);

  app.use("/api/v1/admin", admin);

  app.use("/api/v1/memorialHall", memorialHall);

};
