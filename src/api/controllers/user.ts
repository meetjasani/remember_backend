import { Request, Response } from "express";
import httpStatus from "http-status";
import { getRepository } from "typeorm";
import {
  Country,
  OTP,
  User,
} from "../entity";
import APIResponse from "../../utils/APIResponse";
import { getJWTToken } from "../../utils/jwt.helper";
import { celebrate } from "celebrate";
import Joi from "joi";
import { Languages, RoleType, UserType } from "../../utils/constant";
import { encrypt, decrypt } from "../../utils/bcrypt.helper";
import { sendEmailHelper } from "../../utils/emailer";
import { uploadImage } from "../../utils/fileUpload";
import { updateUserDataInFirestore } from "../../utils/utils";
import moment from "moment";
import fs from "fs";
// import momment from "momment"

let tokens = {};
// UserSide Controller **********************************
const login = {
  validator: celebrate({
    body: Joi.object().keys({
      email: Joi.string().required(),
      password: Joi.string().required(),
      login_with: Joi.string()
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response) => {
    try {
      const userRepo = getRepository(User);
      const user = await userRepo.findOne({
        where: { email: req.body.email, login_with: req.body.login_with, is_deleted: false },
      });

      if (user) {
        const encryptPassword = encrypt(req.body.password)
        let match = false;
        if (encryptPassword.toString() == user.password) {
          match = true;
        } else {
          match = false;
        }

        //const match = await comparePassword(req.body.password, user.password);

        if (match) {
          const token = getJWTToken({
            id: user.id,
            email: req.body.email,
            role: RoleType.user,
          });

          let newUser;
          if (req.query.lang === Languages.en) {
            newUser = {
              id: user.id,
              avatar: user.avatar,
              name: user.name,
              email: user.email,
              mobile: user.mobile,
              dob: user.dob,
              user_type: user.user_type,
              token: token,
              login_with: user.login_with
            };
          } else {
            newUser = {
              id: user.id,
              avatar: user.avatar,
              name: user.name,
              email: user.email,
              mobile: user.mobile,
              dob: user.dob,
              user_type: user.user_type,
              token: token,
              login_with: user.login_with
            };
          }

          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(newUser, "Login Successfully", httpStatus.OK)
            );
        }
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Wrong Password",
              httpStatus.BAD_REQUEST,
              "Wrong Password"
            )
          );
      }
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Wrong Email",
            httpStatus.BAD_REQUEST,
            "Wrong Email"
          )
        );
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Incorrect Password",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const register = {
  validator: celebrate({
    body: Joi.object().keys({
      name: Joi.string().required(),
      email: Joi.string().required(),
      mobile: Joi.string().required(),
      password: Joi.string().required().min(8),
      user_type: Joi.string(),
      login_with: Joi.string().required(),
      is_verified: Joi.boolean().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userRepo = getRepository(User);

      const checkUser = await userRepo.findOne({
        where: {
          email: req.body.email,
          login_with: req.body.login_with,
          is_deleted: false,
        },
      });

      if (!checkUser) {
        // Password Encryption
        if (req.query.lang === Languages.en) {
          const newPassword = await encrypt(req.body.password);

          const newUser = {
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            password: newPassword,
            user_type: req.body.user_type,
            login_with: req.body.login_with,
            is_verified: req.body.is_verified
          };

          // Create and add the user into database
          const user = userRepo.create(newUser);
          let result = await userRepo.save(user);
          result = JSON.parse(JSON.stringify(result));

          if (result) {
            const newResult = {
              id: result.id,
              avatar: null,
              name: result.name,
              email: result.email,
              mobile: result.mobile,
              user_type: result.user_type,
              login_with: result.login_with,
              is_verified: result.is_verified
            };
            return res
              .status(httpStatus.OK)
              .json(new APIResponse(newResult, "User added Succesfully", 200));
          }
        } else {

          // Password Encryption
          const newPassword = await encrypt(req.body.password);
          const newUser = {
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            password: newPassword,
            user_type: req.body.user_type,
            login_with: req.body.login_with,
            is_verified: req.body.is_verified
          };

          // Create and add the user into database
          const user = userRepo.create(newUser);
          let result = await userRepo.save(user);
          result = JSON.parse(JSON.stringify(result));

          if (result) {
            const newResult = {
              id: result.id,
              avatar: null,
              name: result.name,
              email: result.email,
              mobile: result.mobile,
              user_type: result.user_type,
              login_with: result.login_with,
              is_verified: result.is_verified
            };
            return res
              .status(httpStatus.OK)
              .json(new APIResponse(newResult, "User added Succesfully", 200));
          }
        }
        // Encrypted password add into user detail

        throw new Error("User Not Added");
      }
      throw new Error("User already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "User already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const sendOtp = {
  validator: celebrate({
    body: Joi.object().keys({
      mobile: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response) => {
    try {
      const otpRepo = getRepository(OTP);

      await otpRepo
        .createQueryBuilder()
        .delete()
        .from(OTP)
        .where("mobile = :id", { id: req.body.mobile })
        .execute();

      // const code = generateRandomNumber();
      const code = 12345;

      const otpObj = {
        mobile: req.body.mobile,
        code,
      };

      const otp = otpRepo.create(otpObj);
      const result = await otpRepo.save(otp);

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              { id: result.id, mobile: result.mobile },
              "Otp sent successfully",
              httpStatus.OK
            )
          );
      }

      throw new Error("Otp Error");
    } catch (error) {
      return res
        .status(500)
        .json(
          new APIResponse(
            null,
            "Otp Error",
            httpStatus.INTERNAL_SERVER_ERROR,
            httpStatus[500]
          )
        );
    }
  },
};

const verifyOtp = {
  validator: celebrate({
    body: Joi.object().keys({
      mobile: Joi.string().required(),
      code: Joi.number().required(),
    }),
  }),

  controller: async (req: Request, res: Response) => {
    try {
      const otpRepo = getRepository(OTP);
      const matchMobile = await otpRepo.findOne({
        where: { mobile: req.body.mobile },
      });

      if (!matchMobile) {
        return res
          .status(400)
          .json(
            new APIResponse(
              null,
              "Incorrect Mobile Number",
              400,
              httpStatus[400]
            )
          );
      }
      const matchOtp = await otpRepo.findOne({
        where: { code: req.body.code },
      });

      if (!matchOtp) {
        return res
          .status(400)
          .json(new APIResponse(null, "Incorrect OTP", 400, httpStatus[400]));
      }

      const result = await otpRepo.delete(matchOtp);

      return res
        .status(httpStatus.OK)
        .json(
          new APIResponse({ is_verified: true }, "Mobile number verified", 200)
        );
    } catch (error) {
      return res.status(400).json(new APIResponse(null, "Error", 400, error));
    }
  },
};


const deleteUserSelf = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const userRepo = getRepository(User);
      const user = await userRepo.findOne({
        where: { id: req.user.id, is_deleted: false },
      });

      if (!user) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(null, "User not Exists", httpStatus.BAD_REQUEST)
          );
      }

      userRepo.merge(user, {
        is_deleted: true,
        deleted_at: new Date().toUTCString(),
        deleted_by: RoleType.user,
      });
      const results = await userRepo.save(user);

      if (results) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(null, "User Deleted", httpStatus.OK));
      }
      throw new Error("User not Exists");
    } catch (error) {
      return res
        .status(404)
        .json(
          new APIResponse(
            null,
            "User not Exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const edit = {
  validator: celebrate({
    body: Joi.object().keys({
      mobile: Joi.string(),
      dob: Joi.string(),
      password: Joi.string().default("").min(8)
    }),
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const userRepo = getRepository(User);

      const checkUser = await userRepo.findOne({ where: { id: req.user.id } });

      if (!checkUser) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "User not found",
              httpStatus.BAD_REQUEST,
              httpStatus.BAD_REQUEST
            )
          );
      }
      let data: any;
      if (req.body.password != "") {
        const newPassword = await encrypt(req.body.password);

        data = {
          mobile: req.body.mobile,
          dob: req.body.bob,
          password: newPassword,
        };
      } else {
        data = {
          mobile: req.body.mobile,
          dob: req.body.bob
        };

      }


      if (req.files.length) {
        let avatar = await uploadImage(req.files[0]);
        data["avatar"] = avatar;
      }

      userRepo.merge(checkUser, data);
      const result = await userRepo.save(checkUser);
      if (result) {
        const newPassword = await decrypt(result.password);
        const newResult = {
          id: result.id,
          avatar: result.avatar,
          name: result.name,
          email: result.email,
          mobile: result.mobile,
          dob: result.dob,
          password: newPassword
        };

        updateUserDataInFirestore({
          id: result.id,
          image: result.avatar,
          name: result.name,
        });
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(newResult, "Profile changed", httpStatus.OK));
      }
      throw new Error("User not Exists");
    } catch (error) {
      fs.unlinkSync(req.files[0].path);
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in user edit",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getUser = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),
  controller: async (req: any, res: Response) => {
    try {
      const userRepo = getRepository(User);
      const user = await userRepo.findOne({
        where: { id: req.user.id, is_deleted: false },
      });

      if (user) {
        let newUser;
        if (req.query.lang === Languages.en) {
          newUser = {
            id: user.id,
            avatar: user.avatar,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            dob: user.dob,
            user_type: user.user_type
          };
        } else {
          newUser = {
            id: user.id,
            avatar: user.avatar,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            dob: user.dob,
            user_type: user.user_type
          };
        }

        const token = getJWTToken(newUser);
        newUser["token"] = token;

        return res
          .status(httpStatus.OK)
          .json(new APIResponse(newUser, "User Found", 200));
      }
      throw new Error("User not found");
    } catch (error) {
      return res
        .status(400)
        .json(new APIResponse(null, "User not found", 400, error));
    }
  },
};

const verifyUser = {
  controller: async (req: any, res: Response) => {
    try {
      const userRepo = getRepository(User);
      const user = await userRepo.findOne({ where: { id: req.user.id } });
      if (!user) {
        return res
          .status(401)
          .json(new APIResponse(null, "User not found", 401));
      }
      return res
        .status(httpStatus.OK)
        .json(new APIResponse(null, "User verified", 200));
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(null, "User not found", httpStatus.BAD_REQUEST, error)
        );
    }
  },
};

const getEmail = {
  validator: celebrate({
    body: Joi.object().keys({
      name: Joi.string().required(),
      mobile: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),
  controller: async (req: any, res: Response) => {
    try {
      const userRepo = getRepository(User);
      const user = await userRepo.findOne({
        where: { name: req.body.name, mobile: req.body.mobile, is_deleted: false },
      });

      if (user) {
        let newUser;
        if (req.query.lang === Languages.en) {
          newUser = {
            email: user.email
          };
        } else {
          newUser = {
            email: user.email,
          };
        }

        // const token = getJWTToken(newUser);
        // newUser["token"] = token;

        return res
          .status(httpStatus.OK)
          .json(new APIResponse(newUser, "User email found", 200));
      }
      throw new Error("User email not found");
    } catch (error) {
      return res
        .status(400)
        .json(new APIResponse(null, "User email not found", 400, error));
    }
  },
};

// const getPassword = {
//   validator: celebrate({
//     body: Joi.object().keys({
//       email: Joi.string().required(),
//       mobile: Joi.string().required(),
//     }),
//     query: Joi.object().keys({
//       lang: Joi.string().required(),
//     }),
//   }),
//   controller: async (req: any, res: Response) => {
//     try {
//       const userRepo = getRepository(User);
//       const user = await userRepo.findOne({
//         where: { email: req.body.email, mobile: req.body.mobile, is_deleted: false },
//       });

//       if (user) {
//         let newUser;
//         if (req.query.lang === Languages.en) {
//           const NewPassword = await decrypt(user.password)
//           newUser = {
//             password: NewPassword
//           };
//         } else {
//           const NewPassword = await decrypt(user.password)
//           newUser = {
//             password: NewPassword,
//           };
//         }

//         const token = getJWTToken(newUser);
//         newUser["token"] = token;

//         return res
//           .status(httpStatus.OK)
//           .json(new APIResponse(newUser, "User password found", 200));
//       }
//       throw new Error("User password not found");
//     } catch (error) {
//       return res
//         .status(400)
//         .json(new APIResponse(null, "User password not found", 400, error));
//     }
//   },
// };

const sendEmail = {
  validator: celebrate({
    body: Joi.object().keys({
      email: Joi.string()
        .email({ tlds: { allow: true } })
        .required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const token = getJWTToken({ email: req.body.email });

      if (tokens[req.body.email] && tokens[req.body.email].length) {
        tokens[req.body.email] = [...tokens[req.body.email], token];
      } else {
        tokens[req.body.email] = [token];
      }

      // To remove the bearer
      let a = token.split(" ");

      let link = `http://localhost:3000/forgotpass?token=${a[a.length - 1]}`;

      const info = await sendEmailHelper(
        req.body.email,
        "Password Reset Request",
        link
      );

      if (info) {
        return res
          .status(200)
          .json(
            new APIResponse(
              { message: "Link sent successfully" },
              "Link sent successfully.",
              200
            )
          );
      }
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Cannot send Link successfully.",
            httpStatus.BAD_REQUEST
          )
        );
    } catch (error) {
      res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(null, "Wrong Email", httpStatus.BAD_REQUEST, error)
        );
    }
  },
};

const forgotPassword = {
  validator: celebrate({
    body: Joi.object().keys({
      password: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const userRepo = getRepository(User);

      if (
        tokens[req.user.email] &&
        tokens[req.user.email].includes(req.headers.authorization)
      ) {
        delete tokens[req.user.email];
      } else {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Link Expired",
              httpStatus.BAD_REQUEST,
              httpStatus[400]
            )
          );
      }

      const user = await userRepo.findOne({
        where: { email: req.user.email, is_deleted: false },
      });

      if (!user) {
        return res
          .status(400)
          .json(new APIResponse(null, "Wrong email", 400, httpStatus[400]));
      }

      const newPass = await encrypt(req.body.password);

      userRepo.merge(user, { password: newPass });
      const results = await userRepo.save(user);

      if (results) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(null, "Password Changed", 200));
      }
      throw new Error("Wrong Email");
    } catch (error) {
      return res
        .status(400)
        .json(new APIResponse(null, "Wrong Email", 400, error));
    }
  },
};

// To get Filtered User
const getFilteredUsers = {
  validator: celebrate({
    query: Joi.object().keys({
      date_option: Joi.string().valid("sign_up", "deletion"),
      start_date: Joi.string().allow(null, ""),
      end_date: Joi.string().allow(null, ""),
      user_information: Joi.string().valid(
        "email",
        "name",
        "mobile"
      ),
      user_type: Joi.string().allow(null, ""),
      search_term: Joi.string().allow(null, ""),
      per_page: Joi.number().required(),
      page_number: Joi.number().required(),
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const userRepo = getRepository(User);



      const date_option =
        req.query.date_option === "sign_up" ? "created_at" : "deleted_at";

      let conditions = [];

      Object.keys(req.query).map((query) => {



        switch (query) {
          case "date_option":
            if (!req.query.start_date) break;
            if (!req.query.end_date) break;
            const start_date = `${req.query.start_date} 00:00:00.000000`;
            const end_date = `${moment(req.query.end_date)
              .add(1, "days")
              .format()
              .slice(0, 10)} 00:00:00.000000`;
            conditions.push(
              `user.${date_option} BETWEEN '${start_date}' AND '${end_date}'`
            );
            break;
          case "user_information":
            if (req.query.user_information === "name") {
              req.query.search_term.split(" ").map((x) => {
                conditions.push(
                  `(user.name ILIKE '%${x}%')`
                );
              });
            } else {
              conditions.push(
                `user.${req.query.user_information} ILIKE '%${req.query.search_term}%'`
              );
            }
            break;
        }
      });

      let query = userRepo
        .createQueryBuilder("user")
        .select([
          "user.id",
          "user.name",
          "user.mobile",
          "user.email",
          "user.dob",
          "user.user_type",
          "user.created_at",
          "user.deleted_at",
          "user.is_deleted"
        ])



      conditions.map((x, i) => {
        if (!i) {
          query = query.where(x);
        } else {
          query = query.andWhere(x);
        }
      });

      if (req.query.user_type) {
        if (req.query.user_type === UserType.Basic || req.query.user_type === UserType.Premium || req.query.user_type === UserType.Standard) {
          query = query.andWhere("user.user_type = :userType", {
            userType: `${req.query.user_type}`
          });
        }
        if (req.query.user_type === "Terminated") {
          query = query.andWhere("user.is_deleted = :deleted", {
            deleted: true
          });
        }

      }



      const [users, count] = await query
        .orderBy("user.created_at", "DESC")
        .skip(req.query.per_page * (req.query.page_number - 1))
        .take(req.query.per_page)
        .getManyAndCount();


      const BasicCount = await userRepo
        .createQueryBuilder("user").where("user.user_type = :userType", {
          userType: UserType.Basic
        }).andWhere("user.is_deleted = :deleted", {
          deleted: false
        }).getCount();

      const StandardCount = await userRepo
        .createQueryBuilder("user").where("user.user_type = :userType", {
          userType: UserType.Standard
        }).andWhere("user.is_deleted = :deleted", {
          deleted: false
        }).getCount();

      const PremiumCount = await userRepo
        .createQueryBuilder("user").where("user.user_type = :userType", {
          userType: UserType.Premium
        }).andWhere("user.is_deleted = :deleted", {
          deleted: false
        }).getCount();

      const TerminatedCount = await userRepo
        .createQueryBuilder("user").where("user.is_deleted = :deleted", {
          deleted: true
        }).getCount();

      const result = {
        users: users.map((x) => {
          return {
            id: x.id,
            name: x.name,
            email: x.email,
            dob: x.dob,
            mobile: x.mobile,
            user_type: x.user_type,
            created_at: x.created_at,
            deleted_at: x.deleted_at,
            is_deleted: x.is_deleted,
          };
        }),
        count: count,
        Basiccount: BasicCount,
        StandardCount: StandardCount,
        PremiumCount: PremiumCount,
        TerminatedCount: TerminatedCount
      };
      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(result, "Users get successfully.", httpStatus.OK)
          );
      }
    } catch (err) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new APIResponse(
            err,
            "Error in getting user",
            httpStatus.INTERNAL_SERVER_ERROR
          )
        );
    }
  },
};


export {
  register,
  login,
  sendOtp,
  verifyOtp,
  deleteUserSelf,
  edit,
  getUser,
  verifyUser,
  getEmail,
  // getPassword,
  sendEmail,
  forgotPassword,
  getFilteredUsers
};
