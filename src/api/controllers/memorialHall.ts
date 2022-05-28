import { celebrate } from "celebrate";
import e, { Request, Response } from "express";
import httpStatus from "http-status";
import Joi, { number, x } from "joi";
import moment from "moment";
import { EntityManager, getRepository, JoinColumn } from "typeorm";
import APIResponse from "../../utils/APIResponse";
import { uploadImage } from "../../utils/fileUpload";
import {
  DonationSerives,
  InviteFamilyMembers,
  memorialHall,
  MoneyAccount,
  NonMemberMemorialPost,
  Plan,
  Registerer,
  Subcription,
  User,
} from "../entity";
import fs from "fs";
import {
  MemorialHallStatus,
  PostType,
  RelationShip,
  RoleType,
  ServiceDuration,
  StatusType,
  UserType,
} from "../../utils/constant";
import FriendList from "../entity/FriendList";
import NonRegisterUser from "../entity/NonRegisterUser";
import { sendInviteFamilyMemeberEmailHelper } from "../../utils/emailer";
import Visitor from "../entity/Visitor";
import MemorialMessage from "../entity/MemorialMessage";
import MemorialPost from "../entity/MemorialPost";
import MemorialAlbumVideo from "../entity/MemorialAlbumVideo";
import DonationHistory from "../entity/DonationHistory";
import FuneralList from "../entity/FuneralList";
var requestIp = require("request-ip");
import axios from "axios";

const createMemorialHall = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      name: Joi.string().required(),
      date_of_birth: Joi.date().required(),
      job_title: Joi.string().required(),
      date_of_death: Joi.date().required(),
      date_of_carrying_the_coffin_out: Joi.date().required(),
      funeral_Address: Joi.string().required(),
      room_number: Joi.number().required(),
      burial_plot: Joi.string().required(),
      Introduction: Joi.string().required(),
      memorial_hall_status: Joi.string()
        .valid(...Object.values(MemorialHallStatus))
        .required(),
      registerer: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          relationship: Joi.string()
            .valid(...Object.values(RelationShip))
            .required(),
          relationship_name: Joi.string().allow(""),
        })
      ),
      inviteFamilyMembers: Joi.array().items(
        Joi.object({
          name: Joi.string().allow(null, ""),
          email: Joi.string().allow(null, ""),
          relationship: Joi.string()
            .valid(...Object.values(RelationShip))
            .allow(null, ""),
          relationship_name: Joi.string().allow(""),
        })
      ),
      moneyAccount: Joi.array().items(
        Joi.object({
          name: Joi.string().allow(null, ""),
          bank_name: Joi.string().allow(null, ""),
          ac_number: Joi.string().allow(null, ""),
        })
      ),
      donationSerives: Joi.array().items(
        Joi.object({
          donation_field: Joi.string().allow(null, ""),
          bank_name: Joi.string().allow(null, ""),
          recipient_organization: Joi.string().allow(null, ""),
          ac_number: Joi.string().allow(null, ""),
          Introduction: Joi.string().allow(null, ""),
          service_duration: Joi.string()
            .valid(...Object.values(ServiceDuration))
            .allow(null, ""),
        })
      ),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);

      if (memorialHallRepo) {
        let created_by, creator;
        if (req.user.role === "ADMIN") {
          created_by = req.user;
          creator = RoleType.admin;
        } else {
          created_by = req.user;
          creator = RoleType.user;
        }

        let newMemorialHall = {
          name: req.body.name,
          date_of_birth: req.body.date_of_birth,
          job_title: req.body.job_title,
          date_of_death: req.body.date_of_death,
          date_of_carrying_the_coffin_out:
            req.body.date_of_carrying_the_coffin_out,
          funeral_Address: req.body.funeral_Address,
          room_number: req.body.room_number,
          burial_plot: req.body.burial_plot,
          Introduction: req.body.Introduction,
          memorial_hall_status: req.body.memorial_hall_status,
          user: created_by,
          creator: creator,
        };

        // Create and add the user into database
        const memorialHall = memorialHallRepo.create(newMemorialHall);
        let result = await memorialHallRepo.save(memorialHall);
        result = JSON.parse(JSON.stringify(result));

        if (result) {
          const registererRepo = getRepository(Registerer);
          const inviteFamilyMembersRepo = getRepository(InviteFamilyMembers);
          const moneyAccountRepo = getRepository(MoneyAccount);
          const donationSerivesRepo = getRepository(DonationSerives);
          const friendListRepo = getRepository(FriendList);
          const nonRegisterUserRepo = getRepository(NonRegisterUser);
          const userRepo = getRepository(User);

          let functions = [];

          functions.push(
            req.body.registerer.map((x) => {
              x["memorialHall"] = result.id;
              x["relationship"] =
                x.relationship == RelationShip.son
                  ? x.relationship
                  : x.relationship == RelationShip.daughter
                    ? x.relationship
                    : x.relationship_name;
              const registerer = registererRepo.create(x);
              return registererRepo.save(registerer);
            })
          );

          functions.push(
            req.body.inviteFamilyMembers.map((x) => {
              x["memorialHall"] = result.id;
              x["relationship"] =
                x.relationship == RelationShip.son
                  ? x.relationship
                  : x.relationship == RelationShip.daughter
                    ? x.relationship
                    : x.relationship_name;
              const inviteFamilyMembers = inviteFamilyMembersRepo.create(x);
              return inviteFamilyMembersRepo.save(inviteFamilyMembers);
            })
          );

          functions.push(
            req.body.moneyAccount.map((x) => {
              x["memorialHall"] = result.id;
              const moneyAccount = moneyAccountRepo.create(x);
              return moneyAccountRepo.save(moneyAccount);
            })
          );

          functions.push(
            req.body.donationSerives.map((x) => {
              x["memorialHall"] = result.id;
              const donationSerives = donationSerivesRepo.create(x);
              return donationSerivesRepo.save(donationSerives);
            })
          );

          await Promise.all(functions);

          req.body.inviteFamilyMembers.map((x) => {
            (async () => {
              let queryUser = userRepo
                .createQueryBuilder("user")
                .where("user.email = :email", { email: x.email })
                .andWhere("user.is_deleted = :is_del", { is_del: false });

              let users = await queryUser.getOne();

              let queryRequestUser = userRepo
                .createQueryBuilder("user")
                .where("user.id = :id", { id: req.user.id })
                .andWhere("user.is_deleted = :is_del", { is_del: false });

              let usersReq = await queryRequestUser.getOne();

              if (users) {
                const newFriendList = {
                  status: StatusType.Confirm,
                };

                newFriendList["sender_id"] = req.user.id;
                newFriendList["receiver_id"] = users.id;
                newFriendList["memorialHall"] = result.id;

                const friendList = friendListRepo.create(newFriendList);
                friendListRepo.save(friendList);

                let link = `${process.env.APP_URL}/login?id=${result.id}`;

                await sendInviteFamilyMemeberEmailHelper(
                  x.email,
                  "remember invitation Request",
                  link,
                  result.name,
                  usersReq.name
                );
              } else {
                const newNonRegisterUser = {
                  sender_id: req.user.id,
                  memorial_id: result.id,
                  email: x.email,
                };

                let link = `${process.env.APP_URL}/Registration?id=${result.id}&eid=${x.email}`;

                await sendInviteFamilyMemeberEmailHelper(
                  x.email,
                  "remember invitation Request",
                  link,
                  result.name,
                  usersReq.name
                );

                const nonRegisterUser =
                  nonRegisterUserRepo.create(newNonRegisterUser);
                nonRegisterUserRepo.save(nonRegisterUser);
              }
            })();
          });

          const newResult = {
            id: result.id,
          };
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                newResult,
                "Memorial Hall added Succesfully",
                httpStatus.OK
              )
            );
        }

        throw new Error("Memorial Hall Not Added");
      }
      throw new Error("Memorial Hall already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const createMemorialHallByAdmin = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      name: Joi.string().required(),
      date_of_birth: Joi.date().required(),
      job_title: Joi.string().required(),
      date_of_death: Joi.date().required(),
      date_of_carrying_the_coffin_out: Joi.date().required(),
      funeral_Address: Joi.string().required(),
      room_number: Joi.number().required(),
      burial_plot: Joi.string().required(),
      Introduction: Joi.string().required(),
      memorial_hall_status: Joi.string()
        .valid(...Object.values(MemorialHallStatus))
        .required(),
      memorial_hall_active: Joi.string().required(),
      registerer: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          relationship: Joi.string()
            .valid(...Object.values(RelationShip))
            .required(),
          relationship_name: Joi.string().allow(""),
        })
      ),
      inviteFamilyMembers: Joi.array().items(
        Joi.object({
          name: Joi.string().allow(null, ""),
          email: Joi.string().allow(null, ""),
          relationship: Joi.string()
            .valid(...Object.values(RelationShip))
            .allow(null, ""),
          relationship_name: Joi.string().allow(""),
        })
      ),
      moneyAccount: Joi.array().items(
        Joi.object({
          name: Joi.string().allow(null, ""),
          bank_name: Joi.string().allow(null, ""),
          ac_number: Joi.string().allow(null, ""),
        })
      ),
      donationSerives: Joi.array().items(
        Joi.object({
          donation_field: Joi.string().allow(null, ""),
          bank_name: Joi.string().allow(null, ""),
          recipient_organization: Joi.string().allow(null, ""),
          ac_number: Joi.string().allow(null, ""),
          Introduction: Joi.string().allow(null, ""),
          service_duration: Joi.string()
            .valid(...Object.values(ServiceDuration))
            .allow(null, ""),
        })
      ),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);

      if (memorialHallRepo) {
        let created_by, creator;
        if (req.user.role === "ADMIN") {
          created_by = req.user;
          creator = RoleType.admin;
        } else {
          created_by = req.user;
          creator = RoleType.user;
        }

        let newMemorialHall = {
          name: req.body.name,
          date_of_birth: req.body.date_of_birth,
          job_title: req.body.job_title,
          date_of_death: req.body.date_of_death,
          date_of_carrying_the_coffin_out:
            req.body.date_of_carrying_the_coffin_out,
          funeral_Address: req.body.funeral_Address,
          room_number: req.body.room_number,
          burial_plot: req.body.burial_plot,
          Introduction: req.body.Introduction,
          memorial_hall_status: req.body.memorial_hall_status,
          user: created_by,
          creator: creator,
          is_deleted: req.body.memorial_hall_active,
        };

        // Create and add the user into database
        const memorialHall = memorialHallRepo.create(newMemorialHall);
        let result = await memorialHallRepo.save(memorialHall);
        result = JSON.parse(JSON.stringify(result));

        if (result) {
          const registererRepo = getRepository(Registerer);
          const inviteFamilyMembersRepo = getRepository(InviteFamilyMembers);
          const moneyAccountRepo = getRepository(MoneyAccount);
          const donationSerivesRepo = getRepository(DonationSerives);
          const friendListRepo = getRepository(FriendList);
          const nonRegisterUserRepo = getRepository(NonRegisterUser);
          const userRepo = getRepository(User);

          let functions = [];

          functions.push(
            req.body.registerer.map((x) => {
              x["memorialHall"] = result.id;
              x["relationship"] =
                x.relationship == RelationShip.son
                  ? x.relationship
                  : x.relationship == RelationShip.daughter
                    ? x.relationship
                    : x.relationship_name;
              const registerer = registererRepo.create(x);
              return registererRepo.save(registerer);
            })
          );

          functions.push(
            req.body.inviteFamilyMembers.map((x) => {
              x["memorialHall"] = result.id;
              x["relationship"] =
                x.relationship == RelationShip.son
                  ? x.relationship
                  : x.relationship == RelationShip.daughter
                    ? x.relationship
                    : x.relationship_name;
              const inviteFamilyMembers = inviteFamilyMembersRepo.create(x);
              return inviteFamilyMembersRepo.save(inviteFamilyMembers);
            })
          );

          functions.push(
            req.body.moneyAccount.map((x) => {
              x["memorialHall"] = result.id;
              const moneyAccount = moneyAccountRepo.create(x);
              return moneyAccountRepo.save(moneyAccount);
            })
          );

          functions.push(
            req.body.donationSerives.map((x) => {
              x["memorialHall"] = result.id;
              const donationSerives = donationSerivesRepo.create(x);
              return donationSerivesRepo.save(donationSerives);
            })
          );

          await Promise.all(functions);

          req.body.inviteFamilyMembers.map((x) => {
            (async () => {
              let queryUser = userRepo
                .createQueryBuilder("user")
                .where("user.email = :email", { email: x.email })
                .andWhere("user.is_deleted = :is_del", { is_del: false });

              let users = await queryUser.getOne();

              let queryRequestUser = userRepo
                .createQueryBuilder("user")
                .where("user.id = :id", { id: req.user.id })
                .andWhere("user.is_deleted = :is_del", { is_del: false });

              let usersReq = await queryRequestUser.getOne();

              if (users) {
                const newFriendList = {
                  status: StatusType.Confirm,
                };

                newFriendList["sender_id"] = req.user.id;
                newFriendList["receiver_id"] = users.id;
                newFriendList["memorialHall"] = result.id;

                const friendList = friendListRepo.create(newFriendList);
                friendListRepo.save(friendList);

                let link = `${process.env.APP_URL}/login?id=${result.id}`;

                await sendInviteFamilyMemeberEmailHelper(
                  x.email,
                  "remember invitation Request",
                  link,
                  result.name,
                  usersReq.name
                );
              } else {
                const newNonRegisterUser = {
                  sender_id: req.user.id,
                  memorial_id: result.id,
                  email: x.email,
                };

                let link = `${process.env.APP_URL}/Registration?id=${result.id}&eid=${x.email}`;

                await sendInviteFamilyMemeberEmailHelper(
                  x.email,
                  "remember invitation Request",
                  link,
                  result.name,
                  usersReq.name
                );

                const nonRegisterUser =
                  nonRegisterUserRepo.create(newNonRegisterUser);
                nonRegisterUserRepo.save(nonRegisterUser);
              }
            })();
          });

          const newResult = {
            id: result.id,
          };
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                newResult,
                "Memorial Hall added Succesfully",
                httpStatus.OK
              )
            );
        }

        throw new Error("Memorial Hall Not Added");
      }
      throw new Error("Memorial Hall already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const memorialHallImage = {
  validator: celebrate({
    body: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);
      const checkMemorialHall = await memorialHallRepo.findOne({
        where: { id: req.body.id },
      });

      if (!checkMemorialHall) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Memorial Hall not found",
              httpStatus.BAD_REQUEST,
              httpStatus.BAD_REQUEST
            )
          );
      }

      let data = {};

      if (req.files.length) {
        let image = await uploadImage(req.files[0]);
        data["image"] = image;
        data["main_image"] = image;
      }

      memorialHallRepo.merge(checkMemorialHall, data);
      const result = await memorialHallRepo.save(checkMemorialHall);

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(null, "Image Save Successfully", httpStatus.OK)
          );
      }
      throw new Error("Memorial Hall not Exists");
    } catch (error) {
      fs.unlinkSync(req.files[0].path);
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in Image insert",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getMemorialHall = {
  validator: {
    query: Joi.object().keys({
      lang: Joi.string(),
      search_term: Joi.string().allow(""),
    }),
  },

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);
      let conditions = [];
      Object.keys(req.query).map((query) => {
        switch (query) {
          case "search_term":
            if (!req.query.search_term) break;
            req.query.search_term.split(" ").map((x) => {
              conditions.push(`(memorial_hall.name ILIKE '%${x}%')`);
            });
            break;
        }
      });

      let query = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .select(["memorial_hall"])
        .where("memorial_hall.is_deleted = :is_del", { is_del: false })

      conditions.map((x, i) => {
        if (!i) {
          query = query.where(x);
        } else {
          query = query.andWhere(x);
        }
      });

      const memorials = await query
        .andWhere("memorial_hall.memorial_hall_status = :memorial_hall_status", { memorial_hall_status: MemorialHallStatus.Public })
        .orderBy("memorial_hall.created_at", "DESC")
        .getMany();

      const result = {
        memorials: memorials.map((x, i) => {
          return {
            id: x.id,
            name: x.name,
            image: x.image ?? "",
            date_of_death: moment(x.date_of_death).format("YYYY.MM.DD"),
            date_of_birth: moment(x.date_of_birth).format("YYYY.MM.DD"),
            job_title: x.job_title,
          };
        }),
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              result,
              "Memorials hall get successfully.",
              httpStatus.OK
            )
          );
      }

      throw new Error("Memorials hall not found.");
    } catch (error) {
      return res
        .status(404)
        .json(
          new APIResponse(
            null,
            "Cannot get memorials hall.",
            httpStatus.NOT_FOUND,
            error
          )
        );
    }
  },
};

const getMemorialHallAuth = {
  validator: {
    query: Joi.object().keys({
      lang: Joi.string(),
      search_term: Joi.string().allow(""),
    }),
  },

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);
      const friendListRepo = getRepository(FriendList);

      let conditions = [];

      Object.keys(req.query).map((query) => {
        switch (query) {
          case "search_term":
            if (!req.query.search_term) break;
            req.query.search_term.split(" ").map((x) => {
              conditions.push(`(memorial_hall.name ILIKE '%${x}%')`);
            });
            break;
        }
      });

      let queryMemorial = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .select(["memorial_hall", "user"])
        .leftJoin("memorial_hall.user", "user")
        .where("memorial_hall.is_deleted = :is_del", { is_del: false });
      // .andWhere("memorial_hall.memorial_hall_status = :memorial_hall_status", { memorial_hall_status: MemorialHallStatus.Public });

      conditions.map((x, i) => {
        if (!i) {
          queryMemorial = queryMemorial.where(x);
        } else {
          queryMemorial = queryMemorial.andWhere(x);
        }
      });

      const memorials = await queryMemorial
        .orderBy("memorial_hall.created_at", "DESC")
        .getMany();

      // const friendList = await Promise.all(memorials.map((x) => GetFriendListData(x.id, req.user.id)));

      let query = await friendListRepo
        .createQueryBuilder("friend_list")
        .select(["friend_list", "memorialHall", "user_sender", "user_receiver"])
        .leftJoin("friend_list.memorialHall", "memorialHall")
        .leftJoin("friend_list.sender_id", "user_sender")
        .leftJoin("friend_list.receiver_id", "user_receiver")
        .where("sender_id = :sender_id OR receiver_id = :receiver_id", {
          sender_id: req.user.id,
          receiver_id: req.user.id,
        });
      const friendListData = await query.getMany();

      let friendListDataResult = {
        friendListData: friendListData.map((x) => {
          return {
            id: x.id,
            sender_id: x.sender_id.id,
            receiver_id: x.receiver_id.id,
            memorial_id: x.memorialHall.id,
            status: GetStatusDisplay(
              x.status,
              req.user.id,
              x.sender_id.id,
              x.receiver_id.id
            ),
          };
        }),
      };

      const result = {
        memorials: memorials
          .filter(
            (y) =>
              (y.memorial_hall_status == MemorialHallStatus.Private &&
                y.user.id == req.user.id) ||
              y.memorial_hall_status == MemorialHallStatus.Public
          )
          .map((x, i) => {
            return {
              id: x.id,
              name: x.name,
              image: x.image ?? "",
              date_of_death: moment(x.date_of_death).format("YYYY.MM.DD"),
              date_of_birth: moment(x.date_of_birth).format("YYYY.MM.DD"),
              job_title: x.job_title,
              user_id: x.user.id,
              friend_list: friendListDataResult.friendListData.filter(
                (f: any) => f.memorial_id == x.id
              ),
            };
          }),
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              result,
              "Memorials hall get successfully.",
              httpStatus.OK
            )
          );
      }

      throw new Error("Memorials hall not found.");
    } catch (error) {
      return res
        .status(404)
        .json(
          new APIResponse(
            null,
            "Cannot get memorials hall.",
            httpStatus.NOT_FOUND,
            error
          )
        );
    }
  },
};

const memorialHallSByUser = {
  validator: {
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  },

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);
      const memorials = await memorialHallRepo.find({
        where: { is_deleted: false, user: req.user.id },
      });
      const result = memorials.map((x) => {
        return {
          id: x.id,
          name: x.name,
          job_title: x.job_title,
          date_of_death: moment(x.date_of_death).format("YYYY.MM.DD"),
          image: x.image ?? "",
        };
      });

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              result,
              "Memorials hall get successfully.",
              httpStatus.OK
            )
          );
      }
      throw new Error("Memorials hall not found.");
    } catch (error) {
      return res
        .status(404)
        .json(
          new APIResponse(
            null,
            "Cannot get memorials hall.",
            httpStatus.NOT_FOUND,
            error
          )
        );
    }
  },
};

const getMemorialHallByID = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialHallRepo = getRepository(memorialHall);
      let memorialHallData = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .select([
          "memorial_hall",
          "registerer",
          "invite_family_members",
          "money_account",
          "donation_serives",
        ])
        .leftJoin("memorial_hall.registerer", "registerer")
        .leftJoin("memorial_hall.inviteFamilyMembers", "invite_family_members")
        .leftJoin("memorial_hall.moneyAccount", "money_account")
        .leftJoin("memorial_hall.donationSerives", "donation_serives")
        .where("memorial_hall.id = :id", { id: req.params.id })
        .andWhere("memorial_hall.is_deleted = :is_del", { is_del: false })
        .getOne();

      let result = {
        id: memorialHallData.id,
        name: memorialHallData.name,
        date_of_birth: moment(memorialHallData.date_of_birth).format(
          "YYYY.MM.DD"
        ),
        job_title: memorialHallData.job_title,
        date_of_death: moment(memorialHallData.date_of_death).format(
          "YYYY.MM.DD HH:mm"
        ),
        date_of_carrying_the_coffin_out: moment(
          memorialHallData.date_of_carrying_the_coffin_out
        ).format("YYYY.MM.DD HH:mm"),
        funeral_Address: memorialHallData.funeral_Address,
        room_number: memorialHallData.room_number,
        burial_plot: memorialHallData.burial_plot,
        image: memorialHallData.image ?? "",
        Introduction: memorialHallData.Introduction,
        is_deleted: memorialHallData.is_deleted,
        memorial_hall_status: memorialHallData.memorial_hall_status,
        registerer: memorialHallData.registerer.map((x) => {
          return {
            name: x.name,
            relationship:
              x.relationship == RelationShip.daughter
                ? x.relationship
                : x.relationship == RelationShip.son
                  ? x.relationship
                  : RelationShip.other,
            relationship_name:
              x.relationship == RelationShip.daughter
                ? ""
                : x.relationship == RelationShip.son
                  ? ""
                  : x.relationship,
          };
        }),
        inviteFamilyMembers: memorialHallData.inviteFamilyMembers.map((x) => {
          return {
            name: x.name,
            email: x.email,
            relationship:
              x.relationship == RelationShip.daughter
                ? x.relationship
                : x.relationship == RelationShip.son
                  ? x.relationship
                  : RelationShip.other,
            relationship_name:
              x.relationship == RelationShip.daughter
                ? ""
                : x.relationship == RelationShip.son
                  ? ""
                  : x.relationship,
          };
        }),
        moneyAccount: memorialHallData.moneyAccount.map((x) => {
          return {
            name: x.name,
            bank_name: x.bank_name,
            ac_number: x.ac_number,
          };
        }),
        donationSerives: memorialHallData.donationSerives.map((x) => {
          return {
            donation_field: x.donation_field,
            donation_field_ko: x.donation_field_ko,
            bank_name: x.bank_name,
            recipient_organization: x.recipient_organization,
            ac_number: x.ac_number,
            Introduction: x.Introduction,
            service_duration: x.service_duration,
          };
        }),
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(result, "Memorial Hall found", httpStatus.OK));
      }

      throw new Error("Memorial hall Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const editMemorialHall = {
  validator: celebrate({
    body: Joi.object().keys({
      name: Joi.string().required(),
      date_of_birth: Joi.date().required(),
      job_title: Joi.string().required(),
      date_of_death: Joi.date().required(),
      date_of_carrying_the_coffin_out: Joi.date().required(),
      funeral_Address: Joi.string().required(),
      room_number: Joi.number().required(),
      burial_plot: Joi.string().required(),
      Introduction: Joi.string().required(),
      memorial_hall_status: Joi.string()
        .valid(...Object.values(MemorialHallStatus))
        .required(),
      registerer: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          relationship: Joi.string()
            .valid(...Object.values(RelationShip))
            .required(),
          relationship_name: Joi.string().allow(""),
        })
      ),
      inviteFamilyMembers: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          email: Joi.string().required(),
          relationship: Joi.string()
            .valid(...Object.values(RelationShip))
            .required(),
          relationship_name: Joi.string().allow(""),
        })
      ),
      moneyAccount: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          bank_name: Joi.string().required(),
          ac_number: Joi.string().required(),
        })
      ),
      donationSerives: Joi.array().items(
        Joi.object({
          donation_field: Joi.string().required(),
          bank_name: Joi.string().required(),
          recipient_organization: Joi.string().required(),
          ac_number: Joi.string().required(),
          Introduction: Joi.string().required(),
          service_duration: Joi.string()
            .valid(...Object.values(ServiceDuration))
            .required(),
        })
      ),
    }),
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);

      const memorial = await memorialHallRepo.findOne({
        where: { id: req.params.id, is_deleted: false },
      });

      if (memorial) {
        const registererRepo = getRepository(Registerer);
        const inviteFamilyMembersRepo = getRepository(InviteFamilyMembers);
        const moneyAccountRepo = getRepository(MoneyAccount);
        const donationSerivesRepo = getRepository(DonationSerives);
        const friendListRepo = getRepository(FriendList);
        const nonRegisterUserRepo = getRepository(NonRegisterUser);
        const userRepo = getRepository(User);

        let deleteFun = [
          registererRepo
            .createQueryBuilder("registerer")
            .delete()
            .where("registerer.memorial_id = :id", {
              id: req.params.id,
            })
            .execute(),
          inviteFamilyMembersRepo
            .createQueryBuilder("invite_family_members")
            .delete()
            .where("invite_family_members.memorial_id = :id", {
              id: req.params.id,
            })
            .execute(),
          moneyAccountRepo
            .createQueryBuilder("money_account")
            .delete()
            .where("money_account.memorial_id = :id", {
              id: req.params.id,
            })
            .execute(),
          donationSerivesRepo
            .createQueryBuilder("donation_serives")
            .delete()
            .where("donation_serives.memorial_id = :id", {
              id: req.params.id,
            })
            .execute(),
        ];

        await Promise.all(deleteFun);

        let editFunctions = [];
        editFunctions.push(
          req.body.registerer.map((x) => {
            x["memorialHall"] = req.params.id;
            x["relationship"] =
              x.relationship == RelationShip.son
                ? x.relationship
                : x.relationship == RelationShip.daughter
                  ? x.relationship
                  : x.relationship_name;
            const registerer = registererRepo.create(x);
            return registererRepo.save(registerer);
          })
        );

        editFunctions.push(
          req.body.inviteFamilyMembers.map((x) => {
            x["memorialHall"] = req.params.id;
            x["relationship"] =
              x.relationship == RelationShip.son
                ? x.relationship
                : x.relationship == RelationShip.daughter
                  ? x.relationship
                  : x.relationship_name;
            const inviteFamilyMembers = inviteFamilyMembersRepo.create(x);
            return inviteFamilyMembersRepo.save(inviteFamilyMembers);
          })
        );

        editFunctions.push(
          req.body.moneyAccount.map((x) => {
            x["memorialHall"] = req.params.id;
            const moneyAccount = moneyAccountRepo.create(x);
            return moneyAccountRepo.save(moneyAccount);
          })
        );

        editFunctions.push(
          req.body.donationSerives.map((x) => {
            x["memorialHall"] = req.params.id;
            const donationSerives = donationSerivesRepo.create(x);
            return donationSerivesRepo.save(donationSerives);
          })
        );

        await Promise.all(editFunctions);

        friendListRepo
          .createQueryBuilder("friend_list")
          .delete()
          .where("friend_list.memorial_id = :id", {
            id: req.params.id,
          })
          .execute();

        nonRegisterUserRepo
          .createQueryBuilder("non_register_user")
          .delete()
          .where("non_register_user.memorial_id = :id", {
            id: req.params.id,
          })
          .execute();

        req.body.inviteFamilyMembers.map((x) => {
          (async () => {
            let queryUser = userRepo
              .createQueryBuilder("user")
              .where("user.email = :email", { email: x.email })
              .andWhere("user.is_deleted = :is_del", { is_del: false });

            let users = await queryUser.getOne();

            let queryRequestUser = userRepo
              .createQueryBuilder("user")
              .where("user.id = :id", { id: req.user.id })
              .andWhere("user.is_deleted = :is_del", { is_del: false });

            let usersReq = await queryRequestUser.getOne();

            if (users) {
              const newFriendList = {
                status: StatusType.Confirm,
              };

              newFriendList["sender_id"] = req.user.id;
              newFriendList["receiver_id"] = users.id;
              newFriendList["memorialHall"] = req.params.id;

              const friendList = friendListRepo.create(newFriendList);
              friendListRepo.save(friendList);
            } else {
              const newNonRegisterUser = {
                sender_id: req.user.id,
                memorial_id: req.params.id,
                email: x.email,
              };

              let link = `${process.env.APP_URL}/Registration?id=${req.params.id}`;

              await sendInviteFamilyMemeberEmailHelper(
                x.email,
                "remember invitation Request",
                link,
                req.body.name,
                usersReq.name
              );

              const nonRegisterUser =
                nonRegisterUserRepo.create(newNonRegisterUser);
              nonRegisterUserRepo.save(nonRegisterUser);
            }
          })();
        });

        const data = {
          name: req.body.name,
          date_of_birth: req.body.date_of_birth,
          job_title: req.body.job_title,
          date_of_death: req.body.date_of_death,
          date_of_carrying_the_coffin_out:
            req.body.date_of_carrying_the_coffin_out,
          funeral_Address: req.body.funeral_Address,
          room_number: req.body.room_number,
          burial_plot: req.body.burial_plot,
          Introduction: req.body.Introduction,
          memorial_hall_status: req.body.memorial_hall_status,
        };

        memorialHallRepo.merge(memorial, data);
        const result = await memorialHallRepo.save(memorial);

        if (result) {
          const newResult = {
            id: result.id,
          };
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                newResult,
                "Memorial hall edited successfully",
                httpStatus.OK
              )
            );
        }
        throw new Error("Memorial hall not edited");
      }

      throw new Error("Memorial hall not edited");
    } catch (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new APIResponse(
            null,
            "Memorial hall not edited",
            httpStatus.INTERNAL_SERVER_ERROR,
            error
          )
        );
    }
  },
};

const editMemorialHallByAdmin = {
  validator: celebrate({
    body: Joi.object().keys({
      name: Joi.string().required(),
      date_of_birth: Joi.date().required(),
      job_title: Joi.string().required(),
      date_of_death: Joi.date().required(),
      date_of_carrying_the_coffin_out: Joi.date().required(),
      funeral_Address: Joi.string().required(),
      room_number: Joi.number().required(),
      burial_plot: Joi.string().required(),
      Introduction: Joi.string().required(),
      memorial_hall_status: Joi.string()
        .valid(...Object.values(MemorialHallStatus))
        .required(),
      memorial_hall_active: Joi.string().required(),
      registerer: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          relationship: Joi.string()
            .valid(...Object.values(RelationShip))
            .required(),
          relationship_name: Joi.string().allow(""),
        })
      ),
      inviteFamilyMembers: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          email: Joi.string().required(),
          relationship: Joi.string()
            .valid(...Object.values(RelationShip))
            .required(),
          relationship_name: Joi.string().allow(""),
        })
      ),
      moneyAccount: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          bank_name: Joi.string().required(),
          ac_number: Joi.string().required(),
        })
      ),
      donationSerives: Joi.array().items(
        Joi.object({
          donation_field: Joi.string().required(),
          bank_name: Joi.string().required(),
          recipient_organization: Joi.string().required(),
          ac_number: Joi.string().required(),
          Introduction: Joi.string().required(),
          service_duration: Joi.string()
            .valid(...Object.values(ServiceDuration))
            .required(),
        })
      ),
    }),
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);

      const memorial = await memorialHallRepo.findOne({
        where: { id: req.params.id, is_deleted: false },
      });

      if (memorial) {
        const registererRepo = getRepository(Registerer);
        const inviteFamilyMembersRepo = getRepository(InviteFamilyMembers);
        const moneyAccountRepo = getRepository(MoneyAccount);
        const donationSerivesRepo = getRepository(DonationSerives);
        const friendListRepo = getRepository(FriendList);
        const nonRegisterUserRepo = getRepository(NonRegisterUser);
        const userRepo = getRepository(User);

        let deleteFun = [
          registererRepo
            .createQueryBuilder("registerer")
            .delete()
            .where("registerer.memorial_id = :id", {
              id: req.params.id,
            })
            .execute(),

          inviteFamilyMembersRepo
            .createQueryBuilder("invite_family_members")
            .delete()
            .where("invite_family_members.memorial_id = :id", {
              id: req.params.id,
            })
            .execute(),
          moneyAccountRepo
            .createQueryBuilder("money_account")
            .delete()
            .where("money_account.memorial_id = :id", {
              id: req.params.id,
            })
            .execute(),
          donationSerivesRepo
            .createQueryBuilder("donation_serives")
            .delete()
            .where("donation_serives.memorial_id = :id", {
              id: req.params.id,
            })
            .execute(),
        ];

        await Promise.all(deleteFun);

        let editFunctions = [];
        editFunctions.push(
          req.body.registerer.map((x) => {
            x["memorialHall"] = req.params.id;
            x["relationship"] =
              x.relationship == RelationShip.son
                ? x.relationship
                : x.relationship == RelationShip.daughter
                  ? x.relationship
                  : x.relationship_name;
            const registerer = registererRepo.create(x);
            return registererRepo.save(registerer);
          })
        );

        editFunctions.push(
          req.body.inviteFamilyMembers.map((x) => {
            x["memorialHall"] = req.params.id;
            x["relationship"] =
              x.relationship == RelationShip.son
                ? x.relationship
                : x.relationship == RelationShip.daughter
                  ? x.relationship
                  : x.relationship_name;
            const inviteFamilyMembers = inviteFamilyMembersRepo.create(x);
            return inviteFamilyMembersRepo.save(inviteFamilyMembers);
          })
        );

        editFunctions.push(
          req.body.moneyAccount.map((x) => {
            x["memorialHall"] = req.params.id;
            const moneyAccount = moneyAccountRepo.create(x);
            return moneyAccountRepo.save(moneyAccount);
          })
        );

        editFunctions.push(
          req.body.donationSerives.map((x) => {
            x["memorialHall"] = req.params.id;
            const donationSerives = donationSerivesRepo.create(x);
            return donationSerivesRepo.save(donationSerives);
          })
        );

        await Promise.all(editFunctions);

        friendListRepo
          .createQueryBuilder("friend_list")
          .delete()
          .where("friend_list.memorial_id = :id", {
            id: req.params.id,
          })
          .execute();

        nonRegisterUserRepo
          .createQueryBuilder("non_register_user")
          .delete()
          .where("non_register_user.memorial_id = :id", {
            id: req.params.id,
          })
          .execute();

        req.body.inviteFamilyMembers.map((x) => {
          (async () => {
            let queryUser = userRepo
              .createQueryBuilder("user")
              .where("user.email = :email", { email: x.email })
              .andWhere("user.is_deleted = :is_del", { is_del: false });

            let users = await queryUser.getOne();

            let queryRequestUser = userRepo
              .createQueryBuilder("user")
              .where("user.id = :id", { id: req.user.id })
              .andWhere("user.is_deleted = :is_del", { is_del: false });

            let usersReq = await queryRequestUser.getOne();

            if (users) {
              const newFriendList = {
                status: StatusType.Confirm,
              };

              newFriendList["sender_id"] = req.user.id;
              newFriendList["receiver_id"] = users.id;
              newFriendList["memorialHall"] = req.params.id;

              const friendList = friendListRepo.create(newFriendList);
              friendListRepo.save(friendList);
            } else {
              const newNonRegisterUser = {
                sender_id: req.user.id,
                memorial_id: req.params.id,
                email: x.email,
              };

              let link = `${process.env.APP_URL}/Registration?id=${req.params.id}`;

              await sendInviteFamilyMemeberEmailHelper(
                x.email,
                "remember invitation Request",
                link,
                req.body.name,
                usersReq.name
              );

              const nonRegisterUser =
                nonRegisterUserRepo.create(newNonRegisterUser);
              nonRegisterUserRepo.save(nonRegisterUser);
            }
          })();
        });

        const data = {
          name: req.body.name,
          date_of_birth: req.body.date_of_birth,
          job_title: req.body.job_title,
          date_of_death: req.body.date_of_death,
          date_of_carrying_the_coffin_out:
            req.body.date_of_carrying_the_coffin_out,
          funeral_Address: req.body.funeral_Address,
          room_number: req.body.room_number,
          burial_plot: req.body.burial_plot,
          Introduction: req.body.Introduction,
          memorial_hall_status: req.body.memorial_hall_status,
          is_deleted: req.body.memorial_hall_active,
        };

        memorialHallRepo.merge(memorial, data);
        const result = await memorialHallRepo.save(memorial);

        if (result) {
          const newResult = {
            id: result.id,
          };
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                newResult,
                "Memorial hall edited successfully",
                httpStatus.OK
              )
            );
        }
        throw new Error("Memorial hall not edited");
      }

      throw new Error("Memorial hall not edited");
    } catch (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new APIResponse(
            null,
            "Memorial hall not edited",
            httpStatus.INTERNAL_SERVER_ERROR,
            error
          )
        );
    }
  },
};

const deleteMemorialHall = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);

      const response = await memorialHallRepo
        .createQueryBuilder()
        .update(memorialHall, {
          is_deleted: true,
          deleted_at: new Date().toUTCString(),
          deleted_by: RoleType.admin,
        })
        .where("id IN(:...ids)", { ids: req.body.id.split(",").map((x) => x) })
        .execute();

      if (response) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(null, "Memorial hall deleted", httpStatus.OK));
      }

      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in deleting memorial hall",
            httpStatus.BAD_REQUEST
          )
        );
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in accepting memorial hall",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getMemorialHallByViewByInvitation = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialHallRepo = getRepository(memorialHall);
      const userRepo = getRepository(User);
      const friendListRepo = getRepository(FriendList);
      const nonRegisterUserRepo = getRepository(NonRegisterUser);
      const checkUser = await userRepo.findOne({ where: { id: req.user.id } });
      const checkNonRegisterUser = await nonRegisterUserRepo.findOne({
        where: { email: checkUser.email },
      });

      let friendListResult;
      if (checkNonRegisterUser) {
        const newFriendList = {
          status: StatusType.Confirm,
        };

        newFriendList["sender_id"] = req.user.id;
        newFriendList["receiver_id"] = checkNonRegisterUser.sender_id;
        newFriendList["memorialHall"] = checkNonRegisterUser.memorial_id;

        const friendList = friendListRepo.create(newFriendList);
        friendListResult = friendListRepo.save(friendList);

        await nonRegisterUserRepo
          .createQueryBuilder()
          .delete()
          .where("email = :email", { email: checkUser.email })
          .execute();
      }

      let result;
      if (friendListResult) {
        let memorialHallData = await memorialHallRepo
          .createQueryBuilder("memorial_hall")
          .select([
            "memorial_hall",
            "registerer",
            "invite_family_members",
            "visitor",
            "friend_list",
            "user",
            "donation_serives",
            "donation_history",
            "money_account",
          ])
          .leftJoin("memorial_hall.user", "user")
          .leftJoin("memorial_hall.registerer", "registerer")
          .leftJoin(
            "memorial_hall.inviteFamilyMembers",
            "invite_family_members"
          )
          .leftJoin("memorial_hall.donationSerives", "donation_serives")
          .leftJoin("memorial_hall.donationHistory", "donation_history")
          .leftJoin("memorial_hall.moneyAccount", "money_account")
          .leftJoin("memorial_hall.visitor", "visitor")
          .leftJoin("memorial_hall.memorialHallList", "friend_list")
          .where("memorial_hall.id = :id", { id: req.params.id })
          .andWhere("memorial_hall.is_deleted = :is_del", { is_del: false })
          .getOne();

        const friendList = await Promise.all(
          memorialHallData.memorialHallList.map((x) =>
            GetFriendList(x.id, req.user.id)
          )
        );
        result = {
          id: memorialHallData.id,
          visitors:
            memorialHallData.visitor.length > 0
              ? memorialHallData.visitor
                .map((a) => a.count)
                .reduce(function (a, b) {
                  return a + b;
                })
              : 0,
          registerer: memorialHallData.registerer
            .map((m) => m.name + " " + GetRelationShip(m.relationship))
            .join("∙"),
          date_of_carrying_the_coffin_out: moment(
            memorialHallData.date_of_carrying_the_coffin_out
          ).format("YYYY.MM.DD"),
          funeral_Address: await GetFuneralAddressList(memorialHallData.funeral_Address, "funeral_Address"),
          mobile: await GetFuneralAddressList(memorialHallData.funeral_Address, "mobile"),
          burial_plot: memorialHallData.burial_plot,
          image: memorialHallData.image,
          date_of_birth: moment(memorialHallData.date_of_birth).format(
            "YYYY.MM.DD"
          ),
          date_of_death: moment(memorialHallData.date_of_death).format(
            "YYYY.MM.DD"
          ),
          memorial_hall_name: memorialHallData.name,
          job_title: memorialHallData.job_title,
          followers: memorialHallData.memorialHallList
            .filter((y) => y.status == StatusType.Confirm)
            .map((fo) => fo).length,
            Introduction:memorialHallData.Introduction?memorialHallData.Introduction:"",
          donation_history:
            memorialHallData.donationHistory.filter(
              (y) => y.is_deleted == false
            ).length > 0
              ? memorialHallData.donationHistory
                .filter((y) => y.is_deleted == false)
                .map((x) => {
                  return {
                    name: x.name,
                    donation_amount: x.donation_amount,
                  };
                })
              : [],
          total_donation_amount:
            memorialHallData.donationHistory.filter(
              (y) => y.is_deleted == false
            ).length > 0
              ? memorialHallData.donationHistory
                .filter((y) => y.is_deleted == false)
                .map((a: any) => parseFloat(a.donation_amount))
                .reduce((a, b) => {
                  return a + b;
                })
              : 0,
          friend_list: friendList[0] ?? [],
          money_account:
            memorialHallData.moneyAccount.filter((y: any) => (y.name != "" && y.bank_name != "" && y.ac_number != "")).map((x) => {
              return {
                name: x.name,
                bank_name: x.bank_name,
                ac_number: x.ac_number,
              };
            }) ?? [],
          donation_serives:
            memorialHallData.donationSerives.length > 0
              ? memorialHallData.donationSerives.map((x) => {
                return {
                  service_duration: x.service_duration,
                };
              })
              : [],
          main_image: memorialHallData.main_image ?? memorialHallData.image,
          main_video: memorialHallData.main_video ?? "",
          memorial_hall_type_ko: GetMemorialHallType(
            memorialHallData.memorial_hall_status
          ),
          memorial_hall_type: memorialHallData.memorial_hall_status,
          user_id: memorialHallData.user.id,
          created_at: memorialHallData.created_at,
          invite_family_members:
            memorialHallData.inviteFamilyMembers.map((x) => {
              return {
                name: x.name,
                relationship: x.relationship,
              };
            }) ?? [],
        };
      }
      if (result) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(result, "Memorial Hall found", httpStatus.OK));
      }

      throw new Error("Memorial hall Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const createMemorialHallVisitor = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const client_ip = requestIp.getClientIp(req);
      const visitorRepo = getRepository(Visitor);

      if (visitorRepo) {
        const checkVisitor = await visitorRepo.findOne({
          where: { memorialHall: req.params.id, ip_address: client_ip },
        });
        if (!checkVisitor) {
          const newVisitor = {
            count: 1,
            ip_address: client_ip,
            memorialHall: req.params.id,
          };
          const visitor = visitorRepo.create(newVisitor);
          await visitorRepo.save(visitor);

          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(null, "Visitor Add Successfully", httpStatus.OK)
            );
        }

        return res
          .status(httpStatus.OK)
          .json(new APIResponse(null, "Visitor already exists", httpStatus.OK));
      }

      throw new Error("Visitor already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Visitor already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getMemorialHallByView = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialHallRepo = getRepository(memorialHall);

      let memorialHallData = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .select([
          "memorial_hall",
          "registerer",
          "invite_family_members",
          "visitor",
          "friend_list",
          "user",
          "donation_serives",
          "donation_history",
          "money_account",
        ])
        .leftJoin("memorial_hall.registerer", "registerer")
        .leftJoin("memorial_hall.user", "user")
        .leftJoin("memorial_hall.inviteFamilyMembers", "invite_family_members")
        .leftJoin("memorial_hall.donationSerives", "donation_serives")
        .leftJoin("memorial_hall.donationHistory", "donation_history")
        .leftJoin("memorial_hall.moneyAccount", "money_account")
        .leftJoin("memorial_hall.visitor", "visitor")
        .leftJoin("memorial_hall.memorialHallList", "friend_list")
        .where("memorial_hall.id = :id", { id: req.params.id })
        .andWhere("memorial_hall.is_deleted = :is_del", { is_del: false })
        .getOne();

      const friendList = await Promise.all(
        memorialHallData.memorialHallList.map((x) =>
          GetFriendList(x.id, req.user.id)
        )
      );
      const result = {
        id: memorialHallData.id,
        visitors:
          memorialHallData.visitor.length > 0
            ? memorialHallData.visitor
              .map((a) => a.count)
              .reduce(function (a, b) {
                return a + b;
              })
            : 0,
        registerer: memorialHallData.registerer
          .map((m) => m.name + " " + GetRelationShip(m.relationship))
          .join("∙"),
        date_of_carrying_the_coffin_out: moment(
          memorialHallData.date_of_carrying_the_coffin_out
        ).format("YYYY.MM.DD"),
        funeral_Address: await GetFuneralAddressList(memorialHallData.funeral_Address, "funeral_Address"),
        mobile: await GetFuneralAddressList(memorialHallData.funeral_Address, "mobile"),
        burial_plot: memorialHallData.burial_plot,
        image: memorialHallData.image,
        date_of_birth: moment(memorialHallData.date_of_birth).format(
          "YYYY.MM.DD"
        ),
        date_of_death: moment(memorialHallData.date_of_death).format(
          "YYYY.MM.DD"
        ),
        memorial_hall_name: memorialHallData.name,
        job_title: memorialHallData.job_title,
        followers: memorialHallData.memorialHallList
          .filter((y) => y.status == StatusType.Confirm)
          .map((fo) => fo).length,
        Introduction:memorialHallData.Introduction?memorialHallData.Introduction:"",
        donation_history:
          memorialHallData.donationHistory.filter((y) => y.is_deleted == false)
            .length > 0
            ? memorialHallData.donationHistory
              .filter((y) => y.is_deleted == false)
              .map((x) => {
                return {
                  name: x.name,
                  donation_amount: x.donation_amount,
                };
              })
            : [],
        money_account:
          memorialHallData.moneyAccount.filter((y: any) => (y.name != "" && y.bank_name != "" && y.ac_number != "")).map((x) => {
            return {
              name: x.name,
              bank_name: x.bank_name,
              ac_number: x.ac_number,
            };
          }) ?? [],
        total_donation_amount:
          memorialHallData.donationHistory.filter((y) => y.is_deleted == false)
            .length > 0
            ? memorialHallData.donationHistory
              .filter((y) => y.is_deleted == false)
              .map((a: any) => parseFloat(a.donation_amount))
              .reduce((a, b) => {
                return a + b;
              })
            : 0,
        friend_list: friendList[0] ?? [],
        donation_serives:
          memorialHallData.donationSerives.length > 0
            ? memorialHallData.donationSerives.map((x) => {
              return {
                service_duration: x.service_duration,
              };
            })
            : [],
        main_image: memorialHallData.main_image ?? memorialHallData.image,
        main_video: memorialHallData.main_video ?? "",
        memorial_hall_type_ko: GetMemorialHallType(
          memorialHallData.memorial_hall_status
        ),
        memorial_hall_type: memorialHallData.memorial_hall_status,
        user_id: memorialHallData.user.id,
        created_at: memorialHallData.created_at,
        invite_family_members:
          memorialHallData.inviteFamilyMembers.map((x) => {
            return {
              name: x.name,
              relationship: x.relationship,
            };
          }) ?? [],
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(result, "Memorial Hall found", httpStatus.OK));
      }

      throw new Error("Memorial hall Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getmemorialHallByAdmin = {
  validator: celebrate({
    query: Joi.object().keys({
      start_date: Joi.string().allow(null, ""),
      end_date: Joi.string().allow(null, ""),
      date_option: Joi.string().default("created_at"),
      memorial_information: Joi.string().valid(
        "name",
        "memorialhallname",
        "Registerer",
        "usertype"
      ),
      memorial_type: Joi.string()
        .valid(...Object.values(MemorialHallStatus))
        .allow(null, "All", ""),
      search_term: Joi.string().allow(null, ""),
      per_page: Joi.number().required(),
      page_number: Joi.number().required(),
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);

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
              `user.${req.query.date_option} BETWEEN '${start_date}' AND '${end_date}'`
            );
            break;
          case "memorial_information":
            if (req.query.memorial_information === "name") {
              req.query.search_term.split(" ").map((x) => {
                conditions.push(`(user.name ILIKE '%${x}%')`);
              });
            } else if (req.query.memorial_information === "memorialhallname") {
              req.query.search_term.split(" ").map((x) => {
                conditions.push(`(memorial_hall.name ILIKE '%${x}%')`);
              });
            } else if (req.query.memorial_information === "Registerer") {
              req.query.search_term.split(" ").map((x) => {
                conditions.push(`(registerer.relationship ILIKE '%${x}%')`);
              });
            } else if (req.query.memorial_information === "usertype") {
              req.query.search_term.split(" ").map((x) => {
                conditions.push(`(user.plan_type ILIKE '%${x}%')`);
              });
            } else {
              conditions.push(
                `memorial_hall.${req.query.memorial_information} ILIKE '%${req.query.search_term}%'`
              );
            }
            break;
        }
      });

      let query = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .select([
          "memorial_hall",
          "registerer",
          "invite_family_members",
          "user",
          "friend_list",
          "visitor",
          "donation_history",
          "subcription",
        ])
        .leftJoin("memorial_hall.user", "user")
        .leftJoin("memorial_hall.registerer", "registerer")
        .leftJoin("memorial_hall.inviteFamilyMembers", "invite_family_members")
        .leftJoin("memorial_hall.donationHistory", "donation_history")
        .leftJoin("memorial_hall.visitor", "visitor")
        .leftJoin("memorial_hall.memorialHallList", "friend_list")
        .leftJoin("user.subcription", "subcription")
        .where("user.is_deleted = :is_del", { is_del: false });
      conditions.map((x, i) => {
        if (!i) {
          query = query.where(x);
        } else {
          query = query.andWhere(x);
        }
      });

      // if (req.body.start_date && req.body.end_date) {
      //     query = query.andWhere(`((memorial_hall.created_at) OVERLAPS ('${moment(req.body.start_date).format("YYYY-MM-DD")}', '${moment(req.body.end_date).format("YYYY-MM-DD")}'))`);
      // }

      if (req.query.memorial_type) {
        if (
          req.query.memorial_type == MemorialHallStatus.Private ||
          req.query.memorial_type == MemorialHallStatus.Public
        ) {
          query = query.andWhere(
            "memorial_hall.memorial_hall_status =:memorial_type_id",
            { memorial_type_id: `${req.query.memorial_type}` }
          );
        }
      }

      const [memorialhall, count] = await query
        .orderBy("memorial_hall.created_at", "DESC")
        .andWhere("memorial_hall.is_deleted = :is_del", { is_del: false })
        .skip(req.query.per_page * (req.query.page_number - 1))
        .take(req.query.per_page)
        .getManyAndCount();

      const AllCount = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .where("memorial_hall.is_deleted = :is_del", { is_del: false })
        .getCount();

      const PublicCount = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .where("memorial_hall.memorial_hall_status = :memorial_type", {
          memorial_type: MemorialHallStatus.Public,
        })
        .andWhere("memorial_hall.is_deleted = :is_del", { is_del: false })
        .getCount();

      const PrivateCount = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .where("memorial_hall.memorial_hall_status = :memorial_type", {
          memorial_type: MemorialHallStatus.Private,
        })
        .andWhere("memorial_hall.is_deleted = :is_del", { is_del: false })
        .getCount();

      const result = {
        memorialhall: memorialhall.map((x) => {
          return {
            id: x.id,
            user_name: x.user.name,
            memorial_hall_name: x.name,
            registerer: x.registerer
              .map((m) => m.name + " " + GetRelationShip(m.relationship))
              .join(","),
            family_member: x.inviteFamilyMembers.map((f) => f).length,
            followers: x.memorialHallList.map((fo) => fo).length,
            visitors:
              x.visitor.length > 0
                ? x.visitor
                  .map((a) => a.count)
                  .reduce(function (a, b) {
                    return a + b;
                  })
                : 0,
            total_donation_amount:
              x.donationHistory.filter((y) => y.is_deleted == false).length > 0
                ? x.donationHistory
                  .filter((y) => y.is_deleted == false)
                  .map((a: any) => parseFloat(a.value))
                  .reduce(function (a, b) {
                    return a + b;
                  })
                : 0,
            main_image: x.main_image ?? x.image,
            date_of_registration: moment(x.created_at).format("YYYY.MM.DD"),
            user_type: GetUserTypeValue(
              x.user.subcription
                .filter((s) => s.plan_status == true)
                .map((m) => m.plan_type)[0]
            ),
            memorial_hall_type: GetMemorialHallType(x.memorial_hall_status),
          };
        }),
        count: count,
        AllCount: AllCount,
        PublicCount: PublicCount,
        PrivateCount: PrivateCount,
      };
      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              result,
              "Memorial Hall get successfully.",
              httpStatus.OK
            )
          );
      }
    } catch (err) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new APIResponse(
            err,
            "Error in getting Memorial Hall",
            httpStatus.INTERNAL_SERVER_ERROR
          )
        );
    }
  },
};

const GetRelationShip = (TypeName: any) => {
  let relationship_ko = "";
  switch (TypeName) {
    case RelationShip.daughter:
      relationship_ko = "딸";
      break;
    case RelationShip.son:
      relationship_ko = "아들";
      break;
    default:
      relationship_ko = TypeName;
      break;
  }

  return relationship_ko;
};

const GetUserTypeValue = (TypeName: any) => {
  let plan_type_ko = "";
  switch (TypeName) {
    case UserType.Non:
      plan_type_ko = "비회원";
      break;
    case UserType.Standard:
      plan_type_ko = "일반";
      break;
    case UserType.Basic:
      plan_type_ko = "베이직";
      break;
    case UserType.Premium:
      plan_type_ko = "프리미엄";
      break;

    default:
      break;
  }

  return plan_type_ko;
};

const GetMemorialHallType = (TypeName: any) => {
  let memorial_hall_type_ko = "";
  switch (TypeName) {
    case MemorialHallStatus.Public:
      memorial_hall_type_ko = "공개";
      break;
    case MemorialHallStatus.Private:
      memorial_hall_type_ko = "비공개";
      break;
    default:
      break;
  }

  return memorial_hall_type_ko;
};

const getMemorialHallViewNoAuth = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialHallRepo = getRepository(memorialHall);

      let memorialHallData = await memorialHallRepo
        .createQueryBuilder("memorial_hall")
        .select([
          "memorial_hall",
          "registerer",
          "invite_family_members",
          "visitor",
          "friend_list",
          "money_account",
          "user",
          "donation_serives",
          "donation_history",
        ])
        .leftJoin("memorial_hall.registerer", "registerer")
        .leftJoin("memorial_hall.user", "user")
        .leftJoin("memorial_hall.inviteFamilyMembers", "invite_family_members")
        .leftJoin("memorial_hall.donationSerives", "donation_serives")
        .leftJoin("memorial_hall.visitor", "visitor")
        .leftJoin("memorial_hall.donationHistory", "donation_history")
        .leftJoin("memorial_hall.memorialHallList", "friend_list")
        .leftJoin("memorial_hall.moneyAccount", "money_account")
        .where("memorial_hall.id = :id", { id: req.params.id })
        .andWhere("memorial_hall.is_deleted = :is_del", { is_del: false })
        .getOne();

      // const friendList = await Promise.all(memorialHallData.memorialHallList.map((x) => GetFriendList(x.id)));
      const result = {
        id: memorialHallData.id,
        visitors:
          memorialHallData.visitor.length > 0
            ? memorialHallData.visitor
              .map((a) => a.count)
              .reduce(function (a, b) {
                return a + b;
              })
            : 0,
        registerer: memorialHallData.registerer
          .map((m) => m.name + " " + GetRelationShip(m.relationship))
          .join("∙"),
        date_of_carrying_the_coffin_out: moment(
          memorialHallData.date_of_carrying_the_coffin_out
        ).format("YYYY.MM.DD"),
        funeral_Address: await GetFuneralAddressList(memorialHallData.funeral_Address, "funeral_Address"),
        mobile: await GetFuneralAddressList(memorialHallData.funeral_Address, "mobile"),
        burial_plot: memorialHallData.burial_plot,
        image: memorialHallData.image,
        date_of_birth: moment(memorialHallData.date_of_birth).format(
          "YYYY.MM.DD"
        ),
        date_of_death: moment(memorialHallData.date_of_death).format(
          "YYYY.MM.DD"
        ),
        memorial_hall_name: memorialHallData.name,
        job_title: memorialHallData.job_title,
        followers: memorialHallData.memorialHallList
          .filter((y) => y.status == StatusType.Confirm)
          .map((fo) => fo).length,
          Introduction:memorialHallData.Introduction?memorialHallData.Introduction:"",
        main_image: memorialHallData.main_image ?? memorialHallData.image,
        main_video: memorialHallData.main_video ?? "",
        invite_family_members:
          memorialHallData.inviteFamilyMembers.map((x) => {
            return {
              name: x.name,
              relationship: x.relationship,
            };
          }) ?? [],
        money_account:
          memorialHallData.moneyAccount.filter((y: any) => (y.name != "" && y.bank_name != "" && y.ac_number != "")).map((x) => {
            return {
              name: x.name,
              bank_name: x.bank_name,
              ac_number: x.ac_number,
            };
          }) ?? [],
        friend_list: [],
        donation_history:
          memorialHallData.donationHistory.filter((y) => y.is_deleted == false)
            .length > 0
            ? memorialHallData.donationHistory
              .filter((y) => y.is_deleted == false)
              .map((x) => {
                return {
                  name: x.name,
                  donation_amount: x.donation_amount,
                };
              })
            : [],
        total_donation_amount:
          memorialHallData.donationHistory.filter((y) => y.is_deleted == false)
            .length > 0
            ? memorialHallData.donationHistory
              .filter((y) => y.is_deleted == false)
              .map((a: any) => parseFloat(a.donation_amount))
              .reduce((a, b) => {
                return a + b;
              })
            : 0,
        donation_serives:
          memorialHallData.donationSerives.length > 0
            ? memorialHallData.donationSerives.map((x) => {
              return {
                service_duration: x.service_duration,
              };
            })
            : [],
        memorial_hall_type_ko: GetMemorialHallType(
          memorialHallData.memorial_hall_status
        ),
        memorial_hall_type: memorialHallData.memorial_hall_status,
        user_id: memorialHallData.user.id,
        created_at: memorialHallData.created_at,
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(result, "Memorial Hall found", httpStatus.OK));
      }

      throw new Error("Memorial hall Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

function GetFriendList(id: string, req_user_id: string) {
  return new Promise(async (resolve, reject) => {
    try {
      let friendList = [];

      const friendListRepo = getRepository(FriendList);
      let query = friendListRepo
        .createQueryBuilder("friend_list")
        .select(["friend_list", "user", "user_reciver"])
        .leftJoin("friend_list.sender_id", "user")
        .leftJoin("friend_list.receiver_id", "user_reciver")
        .where("friend_list.id = :id", { id: id });

      const friendListData = await query.getMany();
      if (friendListData) {
        friendList = friendListData.map((x) => {
          return {
            id: x.id,
            status: x.status,
            sender_id: x.sender_id.id,
            receiver_id: x.receiver_id.id,
            display_status: GetStatusDisplay(
              x.status,
              req_user_id,
              x.sender_id.id,
              x.receiver_id.id
            ),
          };
        });
      } else {
        friendList = [];
      }
      resolve(friendList);
    } catch (e) {
      reject(e);
    }
  });
}

const createMemorialHallMessage = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      title: Joi.string().allow(null, "").required(),
      content: Joi.string().required(),
      memorial_id: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialMessageRepo = getRepository(MemorialMessage);

      if (memorialMessageRepo) {
        let newMemorialHall = {
          title: req.body.title,
          content: req.body.content,
          memorialHall: req.body.memorial_id,
          user: req.user.id,
        };

        const memorialMessage = memorialMessageRepo.create(newMemorialHall);
        let result = await memorialMessageRepo.save(memorialMessage);
        result = JSON.parse(JSON.stringify(result));

        if (result) {
          const newResult = {
            content: result.content,
          };
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                newResult,
                "Memorial Message added Succesfully",
                httpStatus.OK
              )
            );
        }

        throw new Error("Memorial Message Not Added");
      }
      throw new Error("Memorial Message already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Message already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const editMemorialHallMessage = {
  validator: celebrate({
    body: Joi.object().keys({
      title: Joi.string().allow(null, "").required(),
      content: Joi.string().required(),
    }),
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialMessageRepo = getRepository(MemorialMessage);

      const memorialMessage = await memorialMessageRepo.findOne({
        where: { id: req.params.id, is_deleted: false },
      });

      if (memorialMessage) {
        const data = {
          title: req.body.title,
          content: req.body.content,
          updated_at: new Date().toUTCString(),
        };

        memorialMessageRepo.merge(memorialMessage, data);
        const result = await memorialMessageRepo.save(memorialMessage);

        if (result) {
          const newResult = {
            content: result.content,
          };
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                newResult,
                "Memorial Message edited successfully",
                httpStatus.OK
              )
            );
        }
        throw new Error("Memorial Message not edited");
      }

      throw new Error("Memorial Message not edited");
    } catch (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new APIResponse(
            null,
            "Memorial Message not edited",
            httpStatus.INTERNAL_SERVER_ERROR,
            error
          )
        );
    }
  },
};

const getMemorialHallMessageByID = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialMessageRepo = getRepository(MemorialMessage);

      let memorialMessageData = await memorialMessageRepo
        .createQueryBuilder("memorial_message")
        .select(["memorial_message", "user"])
        .leftJoin("memorial_message.user", "user")
        .where("memorial_message.id = :id", { id: req.params.id })
        .andWhere("memorial_message.is_deleted = :is_del", { is_del: false })
        .getOne();

      const result = {
        title: memorialMessageData.title,
        content: memorialMessageData.content,
        user_id: memorialMessageData.user.id,
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(result, "Memorial Message found", httpStatus.OK)
          );
      }

      throw new Error("Memorial Message Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Message not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteMemorialMessageById = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialMessageRepo = getRepository(MemorialMessage);

      const memorialMessage = await memorialMessageRepo
        .createQueryBuilder("memorial_message")
        .update({ is_deleted: true })
        .where("id = :id", { id: req.params.id })
        .execute();

      if (!memorialMessage) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete memorial message",
              httpStatus.BAD_REQUEST
            )
          );
      }

      return res
        .status(httpStatus.OK)
        .json(
          new APIResponse(null, "Memorial message  deleted", httpStatus.OK)
        );
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Can not delete memorial message",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteMemorialMessageByIdAdmin = {
  validator: celebrate({
    body: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialMessageRepo = getRepository(MemorialMessage);

      const memorialMessage = await memorialMessageRepo
        .createQueryBuilder("memorial_message")
        .update({ is_deleted: true })
        .where("id IN(:...ids)", { ids: req.body.id.split(",").map((x) => x) })
        .execute();

      if (!memorialMessage) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete memorial message",
              httpStatus.BAD_REQUEST
            )
          );
      }

      return res
        .status(httpStatus.OK)
        .json(
          new APIResponse(null, "Memorial message  deleted", httpStatus.OK)
        );
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Can not delete memorial message",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getAllMemorialHallMessageByID = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialMessageRepo = getRepository(MemorialMessage);

      let memorialMessageData = await memorialMessageRepo
        .createQueryBuilder("memorial_message")
        .select(["memorial_message", "user"])
        .leftJoin("memorial_message.user", "user")
        .where("memorial_message.memorial_id = :id", { id: req.params.id })
        .andWhere("memorial_message.is_deleted = :is_del", { is_del: false })
        .getMany();

      const result = {
        memorialMessageData: memorialMessageData.map((x) => {
          return {
            id: x.id,
            title: x.title,
            content: x.content,
            user_id: x.user.id,
          };
        }),
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(result, "All Memorial Message found", httpStatus.OK)
          );
      }

      throw new Error("All Memorial Message Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "All Memorial Message not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const createMemorialHallPost = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      content: Joi.string().required(),
      writer: Joi.string().required(),
      memorial_id: Joi.string().required(),
      album_url: Joi.string().allow("").required(),
      video_url: Joi.string().allow("").required(),
      file_size_album: Joi.string().allow(0).required(),
      file_size_video: Joi.string().allow(0).required(),
      password: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialPostRepo = getRepository(MemorialPost);
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      if (memorialPostRepo) {
        let newMemorialPost = {
          content: req.body.content,
          writer: req.body.writer,
          memorialHall: req.body.memorial_id,
          user: req.user.id,
          album_url: req.body.album_url,
          video_url: req.body.video_url,
          file_size_album: req.body.file_size_album,
          file_size_video: req.body.file_size_video,
          password: req.body.password,
        };

        const memorialPost = memorialPostRepo.create(newMemorialPost);
        let result = await memorialPostRepo.save(memorialPost);
        result = JSON.parse(JSON.stringify(result));

        if (result) {
          const newResult = {
            content: result.content,
            writer: result.writer,
          };
          if (req.body.album_url != "") {
            let NewVideoAndAlbumData = {
              post_type: PostType.Album,
              media_url: req.body.album_url,
              memorialHall: req.body.memorial_id,
              user: req.user.id,
              writer: req.body.writer,
              file_size: req.body.file_size_album,
            };

            const memorialAlbumVideo =
              memorialAlbumVideoRepo.create(NewVideoAndAlbumData);
            await memorialAlbumVideoRepo.save(memorialAlbumVideo);
          } else if (req.body.video_url != "") {
            let NewVideoAndAlbumData = {
              post_type: PostType.Video,
              media_url: req.body.video_url,
              memorialHall: req.body.memorial_id,
              user: req.user.id,
              writer: req.body.writer,
              file_size: req.body.file_size_video,
            };

            const memorialAlbumVideo =
              memorialAlbumVideoRepo.create(NewVideoAndAlbumData);
            await memorialAlbumVideoRepo.save(memorialAlbumVideo);
          }

          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                newResult,
                "Memorial Post added Succesfully",
                httpStatus.OK
              )
            );
        }

        throw new Error("Memorial Post Not Added");
      }
      throw new Error("Memorial Post already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Post already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const editMemorialHallPost = {
  validator: celebrate({
    body: Joi.object().keys({
      content: Joi.string().required(),
      writer: Joi.string().required(),
      album_url: Joi.string().required(),
      video_url: Joi.string().required(),
      old_album_url: Joi.string().allow("").required(),
      old_video_url: Joi.string().allow("").required(),
      file_size_album: Joi.string().allow(0).required(),
      file_size_video: Joi.string().allow(0).required(),
      password: Joi.string().required(),
    }),
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialPostRepo = getRepository(MemorialPost);
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      const memorialPost = await memorialPostRepo.findOne({
        where: {
          id: req.params.id,
          password: req.body.password,
          is_deleted: false,
        },
      });

      if (req.body.old_album_url) {
        await memorialAlbumVideoRepo
          .createQueryBuilder()
          .delete()
          .where("media_url = :url", { url: req.body.old_album_url })
          .where("post_type = :post_type", { post_type: PostType.Album })
          .execute();
      } else {
        await memorialAlbumVideoRepo
          .createQueryBuilder()
          .delete()
          .where("media_url = :url", { url: req.body.old_video_url })
          .where("post_type = :post_type", { post_type: PostType.Video })
          .execute();
      }

      if (memorialPost) {
        const data = {
          content: req.body.content,
          writer: req.body.writer,
          updated_at: new Date().toUTCString(),
          album_url: req.body.album_url,
          video_url: req.body.video_url,
          file_size_album: req.body.file_size_album,
          file_size_video: req.body.file_size_video,
        };

        memorialPostRepo.merge(memorialPost, data);
        const result = await memorialPostRepo.save(memorialPost);

        if (result) {
          const newResult = {
            content: result.content,
            writer: result.writer,
          };
          if (req.body.album_url) {
            let NewVideoAndAlbumData = {
              post_type: PostType.Album,
              media_url: req.body.album_url,
              memorialHall: req.body.memorial_id,
              user: req.user.id,
              writer: req.body.writer,
              file_size: req.body.file_size_album,
            };

            const memorialAlbumVideo =
              memorialAlbumVideoRepo.create(NewVideoAndAlbumData);
            await memorialAlbumVideoRepo.save(memorialAlbumVideo);
          } else {
            let NewVideoAndAlbumData = {
              post_type: PostType.Video,
              media_url: req.body.video_url,
              memorialHall: req.body.memorial_id,
              user: req.user.id,
              writer: req.body.writer,
              file_size: req.body.file_size_video,
            };

            const memorialAlbumVideo =
              memorialAlbumVideoRepo.create(NewVideoAndAlbumData);
            await memorialAlbumVideoRepo.save(memorialAlbumVideo);
          }
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                newResult,
                "Memorial post edited successfully",
                httpStatus.OK
              )
            );
        }
        throw new Error("Memorial post not edited");
      }

      throw new Error("Memorial Message not edited");
    } catch (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new APIResponse(
            null,
            "Memorial post not edited",
            httpStatus.INTERNAL_SERVER_ERROR,
            error
          )
        );
    }
  },
};

const getMemorialHallPostByID = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialPostRepo = getRepository(MemorialPost);

      let memorialPostData = await memorialPostRepo
        .createQueryBuilder("memorial_post")
        .select(["memorial_post", "user"])
        .leftJoin("memorial_post.user", "user")
        .where("memorial_post.id = :id", { id: req.params.id })
        .andWhere("memorial_post.is_deleted = :is_del", { is_del: false })
        .getOne();

      const result = {
        content: memorialPostData.content,
        writer: memorialPostData.writer,
        user_id: memorialPostData.user.id,
        album_url: memorialPostData.album_url,
        video_url: memorialPostData.video_url,
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(result, "Memorial post found", httpStatus.OK));
      }

      throw new Error("Memorial post Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial post not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteMemorialPostById = {
  validator: celebrate({
    body: Joi.object().keys({
      id: Joi.string().required(),
      password: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialPostRepo = getRepository(MemorialPost);
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      const checkMemorialPost = await memorialPostRepo.findOne({
        where: { id: req.body.id, password: req.body.password },
      });

      if (checkMemorialPost.album_url) {
        await memorialAlbumVideoRepo
          .createQueryBuilder()
          .delete()
          .where("media_url = :url", { url: checkMemorialPost.album_url })
          .andWhere("post_type = :post_type", { post_type: PostType.Album })
          .execute();
      } else if (checkMemorialPost.video_url) {
        await memorialAlbumVideoRepo
          .createQueryBuilder()
          .delete()
          .where("media_url = :url", { url: checkMemorialPost.video_url })
          .andWhere("post_type = :post_type", { post_type: PostType.Video })
          .execute();
      }

      const memorialPost = await memorialPostRepo
        .createQueryBuilder("memorial_post")
        .update({ is_deleted: true })
        .where("id = :id", { id: req.body.id, password: req.body.password })
        .execute();

      if (!memorialPost) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete memorial post",
              httpStatus.BAD_REQUEST
            )
          );
      }

      return res
        .status(httpStatus.OK)
        .json(new APIResponse(null, "Memorial post deleted", httpStatus.OK));
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Can not delete memorial post",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteMemorialPostByIdNoPassword = {
  validator: celebrate({
    body: Joi.object().keys({
      id: Joi.string().required()
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialPostRepo = getRepository(MemorialPost);
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      const checkMemorialPost = await memorialPostRepo.findOne({
        where: { id: req.body.id },
      });

      if (checkMemorialPost.album_url) {
        await memorialAlbumVideoRepo
          .createQueryBuilder()
          .delete()
          .where("media_url = :url", { url: checkMemorialPost.album_url })
          .andWhere("post_type = :post_type", { post_type: PostType.Album })
          .execute();
      } else if (checkMemorialPost.video_url) {
        await memorialAlbumVideoRepo
          .createQueryBuilder()
          .delete()
          .where("media_url = :url", { url: checkMemorialPost.video_url })
          .andWhere("post_type = :post_type", { post_type: PostType.Video })
          .execute();
      }

      const memorialPost = await memorialPostRepo
        .createQueryBuilder("memorial_post")
        .update({ is_deleted: true })
        .where("id = :id", { id: req.body.id })
        .execute();

      if (!memorialPost) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete memorial post",
              httpStatus.BAD_REQUEST
            )
          );
      }

      return res
        .status(httpStatus.OK)
        .json(new APIResponse(null, "Memorial post deleted", httpStatus.OK));
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Can not delete memorial post",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getAllMemorialHallPostByID = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialPostRepo = getRepository(MemorialPost);

      let memorialPostData = await memorialPostRepo
        .createQueryBuilder("memorial_post")
        .select(["memorial_post", "user"])
        .leftJoin("memorial_post.user", "user")
        .where("memorial_post.memorial_id = :id", { id: req.params.id })
        .andWhere("memorial_post.is_deleted = :is_del", { is_del: false })
        .getMany();

      const result = {
        memorialPostData: memorialPostData.map((x) => {
          return {
            id: x.id,
            content: x.content,
            writer: x.writer,
            user_id: x.user.id,
            user_image: x.user.avatar ?? "",
            post_create_date: moment(x.created_at).format("YYYY.MM.DD"),
          };
        }),
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(result, "All Memorial Post found", httpStatus.OK)
          );
      }

      throw new Error("All Memorial Post Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "All Memorial Post not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getAllMemorialHallPostByIDAdmin = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
      per_page: Joi.number().required(),
      page_number: Joi.number().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialPostRepo = getRepository(MemorialPost);

      let query = await memorialPostRepo
        .createQueryBuilder("memorial_post")
        .select(["memorial_post", "user"])
        .leftJoin("memorial_post.user", "user")
        .where("memorial_post.memorial_id = :id", { id: req.params.id })
        .andWhere("memorial_post.is_deleted = :is_del", { is_del: false });

      const [memorialPostData, count] = await query
        .skip(req.query.per_page * (req.query.page_number - 1))
        .take(req.query.per_page)
        .orderBy("memorial_post.updated_at", "DESC")
        .getManyAndCount();

      const AllCount = await memorialPostRepo
        .createQueryBuilder("memorial_post")
        .select(["memorial_post"])
        .where("memorial_post.memorial_id = :id", { id: req.params.id })
        .andWhere("memorial_post.is_deleted = :is_del", { is_del: false })
        .getCount();

      const result = {
        memorialPostData: memorialPostData.map((x) => {
          return {
            id: x.id,
            content: x.content,
            name: x.writer,
            user_id: x.user.id,
            image: x.album_url != "" || null ? "1개" : "-",
            video: x.video_url != "" || null ? "1개" : "-",
            post_create_date: moment(x.created_at).format("YYYY.MM.DD"),
          };
        }),
        count: count,
        AllCount: AllCount,
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(result, "All Memorial Post found", httpStatus.OK)
          );
      }

      throw new Error("All Memorial Post Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "All Memorial Post not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const createMemorialHallAlbumAndVideo = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      post_type: Joi.string()
        .valid(...Object.values(PostType))
        .allow(null, "All", "")
        .required(),
      memorial_id: Joi.string().required(),
      writer: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      if (req.body.post_type == PostType.Album) {
        const userRepo = getRepository(User);
        const checkUser = await userRepo.findOne({
          where: {
            id: req.user.id,
          },
        });
        if (checkUser.is_admin === false) {
          const subcriptionRepo = getRepository(Subcription);
          const userSubcription = await subcriptionRepo.findOne({
            where: {
              user: req.user.id,
              plan_status: true,
            },
          });
          if (req.files.length <= userSubcription.MaxPictures) {
            const count = await memorialAlbumVideoRepo
              .createQueryBuilder("memorial_album_video")
              .where("memorial_album_video.memorialHall = :id", {
                id: req.body.memorial_id,
              })
              .andWhere("memorial_album_video.post_type = :post_type", {
                post_type: PostType.Album,
              })
              .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                is_deleted: false,
              })
              .getCount();

            if (req.files.length <= userSubcription.MaxPictures - count) {
              let newMemorialAlbumVideo = [];
              let functions = [];
              for (let i = 0; i < req.files.length; i++) {
                if (
                  userSubcription.MaxPicturesSize >=
                  req.files[i].size / (1024 * 1024)
                ) {
                  let newAlbumVideo = {};
                  let image = await uploadImage(req.files[i]);
                  newAlbumVideo["media_url"] = image;
                  newAlbumVideo["file_size"] = (
                    req.files[i].size /
                    (1024 * 1024)
                  ).toFixed(2);
                  newMemorialAlbumVideo.push(newAlbumVideo);
                } else {
                  return res
                    .status(httpStatus.OK)
                    .json(
                      new APIResponse(
                        null,
                        "Memorial album size maximum " +
                        userSubcription.MaxPicturesSize +
                        " mb",
                        httpStatus.BAD_REQUEST
                      )
                    );
                }
                if (
                  userSubcription.MaxPicturesSize <=
                  req.files[i].size / (1024 * 1024)
                ) {
                  break;
                }
              }
              if (newMemorialAlbumVideo.length > 0) {
                functions.push(
                  newMemorialAlbumVideo.map((x) => {
                    x["post_type"] = req.body.post_type;
                    x["memorialHall"] = req.body.memorial_id;
                    x["user"] = req.user.id;
                    x["writer"] = req.body.writer;
                    const memorialAlbumVideo = memorialAlbumVideoRepo.create(x);
                    return memorialAlbumVideoRepo.save(memorialAlbumVideo);
                  })
                );

                await Promise.all(functions);

                return res
                  .status(httpStatus.OK)
                  .json(
                    new APIResponse(
                      null,
                      "Memorial Album added Succesfully",
                      httpStatus.OK
                    )
                  );
              }
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Album Save Max limit execute",
                    httpStatus.BAD_REQUEST
                  )
                );
            }
          } else {
            return res
              .status(httpStatus.BAD_REQUEST)
              .json(
                new APIResponse(
                  null,
                  "Cannot add Memorial Album ",
                  httpStatus.BAD_REQUEST
                )
              );
          }
        } else {
          let newMemorialAlbumVideo = [];
          let functions = [];

          for (let i = 0; i < req.files.length; i++) {
            let newAlbumVideo = {};
            let image = await uploadImage(req.files[i]);
            newAlbumVideo["media_url"] = image;
            newAlbumVideo["file_size"] = (
              req.files[i].size /
              (1024 * 1024)
            ).toFixed(2);
            newMemorialAlbumVideo.push(newAlbumVideo);
          }
          if (newMemorialAlbumVideo.length > 0) {
            functions.push(
              newMemorialAlbumVideo.map((x) => {
                x["post_type"] = req.body.post_type;
                x["memorialHall"] = req.body.memorial_id;
                x["user"] = req.user.id;
                x["writer"] = req.body.writer;
                const memorialAlbumVideo = memorialAlbumVideoRepo.create(x);
                return memorialAlbumVideoRepo.save(memorialAlbumVideo);
              })
            );

            await Promise.all(functions);

            return res
              .status(httpStatus.OK)
              .json(
                new APIResponse(
                  null,
                  "Memorial Album added Succesfully",
                  httpStatus.OK
                )
              );
          }
        }
      } else {
        const userRepo = getRepository(User);
        const checkUser = await userRepo.findOne({
          where: {
            id: req.user.id,
          },
        });
        if (checkUser.is_admin === false) {
          const subcriptionRepo = getRepository(Subcription);
          const userSubcription = await subcriptionRepo.findOne({
            where: {
              user: req.user.id,
              plan_status: true,
            },
          });
          if (req.files.length <= userSubcription.MaxPictures) {
            const count = await memorialAlbumVideoRepo
              .createQueryBuilder("memorial_album_video")
              .where("memorial_album_video.memorialHall = :id", {
                id: req.body.memorial_id,
              })
              .andWhere("memorial_album_video.post_type = :post_type", {
                post_type: PostType.Album,
              })
              .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                is_deleted: false,
              })
              .getCount();

            if (req.files.length <= userSubcription.MaxPictures - count) {
              let newMemorialAlbumVideo = [];
              let functions = [];
              for (let i = 0; i < req.files.length; i++) {
                if (
                  userSubcription.MaxPicturesSize >=
                  req.files[i].size / (1024 * 1024)
                ) {
                  let newAlbumVideo = {};
                  let image = await uploadImage(req.files[i]);
                  newAlbumVideo["media_url"] = image;
                  newAlbumVideo["file_size"] = (
                    req.files[i].size /
                    (1024 * 1024)
                  ).toFixed(2);
                  newMemorialAlbumVideo.push(newAlbumVideo);
                } else {
                  return res
                    .status(httpStatus.OK)
                    .json(
                      new APIResponse(
                        null,
                        "Memorial album size maximum " +
                        userSubcription.MaxPicturesSize +
                        " mb",
                        httpStatus.BAD_REQUEST
                      )
                    );
                }
                if (
                  userSubcription.MaxPicturesSize <=
                  req.files[i].size / (1024 * 1024)
                ) {
                  break;
                }
              }
              if (newMemorialAlbumVideo.length > 0) {
                functions.push(
                  newMemorialAlbumVideo.map((x) => {
                    x["post_type"] = req.body.post_type;
                    x["memorialHall"] = req.body.memorial_id;
                    x["user"] = req.user.id;
                    x["writer"] = req.body.writer;
                    const memorialAlbumVideo = memorialAlbumVideoRepo.create(x);
                    return memorialAlbumVideoRepo.save(memorialAlbumVideo);
                  })
                );

                await Promise.all(functions);

                return res
                  .status(httpStatus.OK)
                  .json(
                    new APIResponse(
                      null,
                      "Memorial Album added Succesfully",
                      httpStatus.OK
                    )
                  );
              }
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Album Save Max limit execute",
                    httpStatus.BAD_REQUEST
                  )
                );
            }
          } else {
            return res
              .status(httpStatus.BAD_REQUEST)
              .json(
                new APIResponse(
                  null,
                  "Cannot add Memorial Album ",
                  httpStatus.BAD_REQUEST
                )
              );
          }
        } else {
          let newMemorialAlbumVideo = [];
          let functions = [];

          for (let i = 0; i < req.files.length; i++) {
            let newAlbumVideo = {};
            let image = await uploadImage(req.files[i]);
            newAlbumVideo["media_url"] = image;
            newAlbumVideo["file_size"] = (
              req.files[i].size /
              (1024 * 1024)
            ).toFixed(2);
            newMemorialAlbumVideo.push(newAlbumVideo);
          }
          if (newMemorialAlbumVideo.length > 0) {
            functions.push(
              newMemorialAlbumVideo.map((x) => {
                x["post_type"] = req.body.post_type;
                x["memorialHall"] = req.body.memorial_id;
                x["user"] = req.user.id;
                x["writer"] = req.body.writer;
                const memorialAlbumVideo = memorialAlbumVideoRepo.create(x);
                return memorialAlbumVideoRepo.save(memorialAlbumVideo);
              })
            );

            await Promise.all(functions);

            return res
              .status(httpStatus.OK)
              .json(
                new APIResponse(
                  null,
                  "Memorial Video added Succesfully",
                  httpStatus.OK
                )
              );
          }
        }
      }
    } catch (error) {
      for (let i = 0; i < req.files.length; i++) {
        fs.unlinkSync(req.files[i].path);
      }
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Album And Video already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const editMemorialHallAlbumAndVideo = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      post_type: Joi.string()
        .valid(...Object.values(PostType))
        .allow(null, "All", "")
        .required(),
      memorial_id: Joi.string().required(),
      writer: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      await memorialAlbumVideoRepo
        .createQueryBuilder("memorial_album_video")
        .delete()
        .where("memorial_album_video.memorialHall = :id", {
          id: req.body.memorial_id,
        })
        .where("memorial_album_video.post_type = :posttype", {
          posttype: req.body.post_type,
        })
        .andWhere("memorial_album_video.is_deleted = :is_deleted", {
          is_deleted: false,
        })
        .execute();

      if (req.body.post_type == PostType.Album) {
        const userRepo = getRepository(User);
        const checkUser = await userRepo.findOne({
          where: {
            id: req.user.id,
          },
        });
        if (checkUser.is_admin === false) {
          const subcriptionRepo = getRepository(Subcription);
          const userSubcription = await subcriptionRepo.findOne({
            where: {
              user: req.user.id,
              plan_status: true,
            },
          });
          if (req.files.length <= userSubcription.MaxPictures) {
            const count = await memorialAlbumVideoRepo
              .createQueryBuilder("memorial_album_video")
              .where("memorial_album_video.memorialHall = :id", {
                id: req.body.memorial_id,
              })
              .andWhere("memorial_album_video.post_type = :post_type", {
                post_type: PostType.Album,
              })
              .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                is_deleted: false,
              })
              .getCount();

            if (req.files.length <= userSubcription.MaxPictures - count) {
              let newMemorialAlbumVideo = [];
              let functions = [];
              for (let i = 0; i < req.files.length; i++) {
                if (
                  userSubcription.MaxPicturesSize >=
                  req.files[i].size / (1024 * 1024)
                ) {
                  let newAlbumVideo = {};
                  let image = await uploadImage(req.files[i]);
                  newAlbumVideo["media_url"] = image;
                  newAlbumVideo["file_size"] = (
                    req.files[i].size /
                    (1024 * 1024)
                  ).toFixed(2);
                  newMemorialAlbumVideo.push(newAlbumVideo);
                } else {
                  return res
                    .status(httpStatus.OK)
                    .json(
                      new APIResponse(
                        null,
                        "Memorial album size maximum " +
                        userSubcription.MaxPicturesSize +
                        " mb",
                        httpStatus.BAD_REQUEST
                      )
                    );
                }
                if (
                  userSubcription.MaxPicturesSize <=
                  req.files[i].size / (1024 * 1024)
                ) {
                  break;
                }
              }
              if (newMemorialAlbumVideo.length > 0) {
                functions.push(
                  newMemorialAlbumVideo.map((x) => {
                    x["post_type"] = req.body.post_type;
                    x["memorialHall"] = req.body.memorial_id;
                    x["user"] = req.user.id;
                    x["writer"] = req.body.writer;
                    const memorialAlbumVideo = memorialAlbumVideoRepo.create(x);
                    return memorialAlbumVideoRepo.save(memorialAlbumVideo);
                  })
                );

                await Promise.all(functions);

                return res
                  .status(httpStatus.OK)
                  .json(
                    new APIResponse(
                      null,
                      "Memorial Album update Succesfully",
                      httpStatus.OK
                    )
                  );
              }
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Album update Max limit execute",
                    httpStatus.BAD_REQUEST
                  )
                );
            }
          } else {
            return res
              .status(httpStatus.BAD_REQUEST)
              .json(
                new APIResponse(
                  null,
                  "Cannot update Memorial Album ",
                  httpStatus.BAD_REQUEST
                )
              );
          }
        } else {
          let newMemorialAlbumVideo = [];
          let functions = [];

          for (let i = 0; i < req.files.length; i++) {
            let newAlbumVideo = {};
            let image = await uploadImage(req.files[i]);
            newAlbumVideo["media_url"] = image;
            newAlbumVideo["file_size"] = (
              req.files[i].size /
              (1024 * 1024)
            ).toFixed(2);
            newMemorialAlbumVideo.push(newAlbumVideo);
          }
          if (newMemorialAlbumVideo.length > 0) {
            functions.push(
              newMemorialAlbumVideo.map((x) => {
                x["post_type"] = req.body.post_type;
                x["memorialHall"] = req.body.memorial_id;
                x["user"] = req.user.id;
                x["writer"] = req.body.writer;
                const memorialAlbumVideo = memorialAlbumVideoRepo.create(x);
                return memorialAlbumVideoRepo.save(memorialAlbumVideo);
              })
            );

            await Promise.all(functions);

            return res
              .status(httpStatus.OK)
              .json(
                new APIResponse(
                  null,
                  "Memorial Album added Succesfully",
                  httpStatus.OK
                )
              );
          }
        }
      } else {
        const userRepo = getRepository(User);
        const checkUser = await userRepo.findOne({
          where: {
            id: req.user.id,
          },
        });
        if (checkUser.is_admin === false) {
          const subcriptionRepo = getRepository(Subcription);
          const userSubcription = await subcriptionRepo.findOne({
            where: {
              user: req.user.id,
              plan_status: true,
            },
          });

          if (req.files.length <= userSubcription.MaxVideo) {
            const count = await memorialAlbumVideoRepo
              .createQueryBuilder("memorial_album_video")
              .where("memorial_album_video.memorialHall = :id", {
                id: req.body.memorial_id,
              })
              .andWhere("memorial_album_video.post_type = :post_type", {
                post_type: PostType.Video,
              })
              .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                is_deleted: false,
              })
              .getCount();

            if (req.files.length <= userSubcription.MaxVideo - count) {
              let newMemorialAlbumVideo = [];
              let functions = [];

              for (let i = 0; i < req.files.length; i++) {
                if (
                  userSubcription.MaxVideoSize >=
                  req.files[i].size / (1024 * 1024)
                ) {
                  let newAlbumVideo = {};
                  let image = await uploadImage(req.files[i]);
                  newAlbumVideo["media_url"] = image;
                  newAlbumVideo["file_size"] = (
                    req.files[i].size /
                    (1024 * 1024)
                  ).toFixed(2);
                  newMemorialAlbumVideo.push(newAlbumVideo);
                } else {
                  return res
                    .status(httpStatus.OK)
                    .json(
                      new APIResponse(
                        null,
                        "Memorial Video size maximum " +
                        userSubcription.MaxVideoSize +
                        " mb",
                        httpStatus.BAD_REQUEST
                      )
                    );
                }
                if (
                  userSubcription.MaxVideoSize <=
                  req.files[i].size / (1024 * 1024)
                ) {
                  break;
                }
              }

              if (newMemorialAlbumVideo.length > 0) {
                functions.push(
                  newMemorialAlbumVideo.map((x) => {
                    x["post_type"] = req.body.post_type;
                    x["memorialHall"] = req.body.memorial_id;
                    x["user"] = req.user.id;
                    x["writer"] = req.body.writer;
                    const memorialAlbumVideo = memorialAlbumVideoRepo.create(x);
                    return memorialAlbumVideoRepo.save(memorialAlbumVideo);
                  })
                );

                await Promise.all(functions);

                return res
                  .status(httpStatus.OK)
                  .json(
                    new APIResponse(
                      null,
                      "Memorial Video update Succesfully",
                      httpStatus.OK
                    )
                  );
              }
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Video update Max limit execute",
                    httpStatus.BAD_REQUEST
                  )
                );
            }
          } else {
            return res
              .status(httpStatus.BAD_REQUEST)
              .json(
                new APIResponse(
                  null,
                  "Cannot update Memorial Video ",
                  httpStatus.BAD_REQUEST
                )
              );
          }
        } else {
          let newMemorialAlbumVideo = [];
          let functions = [];

          for (let i = 0; i < req.files.length; i++) {
            let newAlbumVideo = {};
            let image = await uploadImage(req.files[i]);
            newAlbumVideo["media_url"] = image;
            newAlbumVideo["file_size"] = (
              req.files[i].size /
              (1024 * 1024)
            ).toFixed(2);
            newMemorialAlbumVideo.push(newAlbumVideo);
          }
          if (newMemorialAlbumVideo.length > 0) {
            functions.push(
              newMemorialAlbumVideo.map((x) => {
                x["post_type"] = req.body.post_type;
                x["memorialHall"] = req.body.memorial_id;
                x["user"] = req.user.id;
                x["writer"] = req.body.writer;
                const memorialAlbumVideo = memorialAlbumVideoRepo.create(x);
                return memorialAlbumVideoRepo.save(memorialAlbumVideo);
              })
            );

            await Promise.all(functions);

            return res
              .status(httpStatus.OK)
              .json(
                new APIResponse(
                  null,
                  "Memorial Video added Succesfully",
                  httpStatus.OK
                )
              );
          }
        }
      }
    } catch (error) {
      for (let i = 0; i < req.files.length; i++) {
        fs.unlinkSync(req.files[i].path);
      }
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Album And Video already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const memorialHallMessageImage = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),
  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      // const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo)
      // const userRepo = getRepository(User);
      // const checkUser = await userRepo.findOne({
      //     where: {
      //         id: req.user.id
      //     }
      // })
      // if (checkUser.is_admin === false) {
      //     const subcriptionRepo = getRepository(Subcription);
      //     const userSubcription = await subcriptionRepo.findOne({
      //         where: {
      //             user: req.query.user_id, plan_status: true
      //         }
      //     })
      //     if (req.files.length <= userSubcription.MaxPictures) {

      //         const count = await memorialAlbumVideoRepo
      //             .createQueryBuilder("memorial_album_video")
      //             .where("memorial_album_video.memorialHall = :id", { id: req.body.memorial_id })
      //             .andWhere("memorial_album_video.post_type = :post_type", { post_type: PostType.Album })
      //             .getCount();

      //         if (req.files.length <= (userSubcription.MaxPictures - count)) {
      //             let newAlbumImage = [];
      //             let functions = [];
      //             for (let i = 0; i < req.files.length; i++) {
      //                 if (userSubcription.MaxPicturesSize >= (req.files[i].size / (1024 * 1024))) {
      //                     let newAlbum = {}
      //                     let image = await uploadImage(req.files[i]);
      //                     newAlbum["media_url"] = image;
      //                     newAlbumImage.push(newAlbum)
      //                 } else {
      //                     return res
      //                         .status(httpStatus.OK)
      //                         .json(
      //                             new APIResponse(
      //                                 null,
      //                                 "Memorial Post Image size maximum " + userSubcription.MaxPicturesSize + " mb",
      //                                 httpStatus.BAD_REQUEST
      //                             )
      //                         );

      //                 }
      //                 if (userSubcription.MaxPicturesSize <= (req.files[i].size / (1024 * 1024))) {
      //                     break;
      //                 }
      //             }
      //             if (newAlbumImage.length > 0) {

      //                 return res.status(200).json({
      //                     uploaded: true,
      //                     url: newAlbumImage["media_url"]
      //                 });

      //             }
      //         } else {
      //             return res
      //                 .status(httpStatus.OK)
      //                 .json(
      //                     new APIResponse(
      //                         null,
      //                         "Memorial Post Image save Max limit execute",
      //                         httpStatus.BAD_REQUEST
      //                     )
      //                 );
      //         }

      //     } else {
      //         return res
      //             .status(httpStatus.BAD_REQUEST)
      //             .json(
      //                 new APIResponse(
      //                     null,
      //                     "Cannot insert Memorial Post Image ",
      //                     httpStatus.BAD_REQUEST
      //                 )
      //             );
      //     }
      // } else {

      //     if (req.files.length) {
      //         let image = await uploadImage(req.files[0]);
      //         return res.status(200).json({
      //             uploaded: true,
      //             url: image
      //         });
      //     }

      // }

      if (req.files.length) {
        let image = await uploadImage(req.files[0]);
        return res.status(200).json({
          uploaded: true,
          url: image,
        });
      }
    } catch (error) {
      fs.unlinkSync(req.files[0].path);
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in Image insert",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getAllMemorialHallAlbumAndVideoByID = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
      post_type: Joi.string()
        .valid(...Object.values(PostType))
        .required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      let memorialAlbumVideoData = await memorialAlbumVideoRepo
        .createQueryBuilder("memorial_album_video")
        .select([
          "memorial_album_video",
          // "user"
        ])
        // .leftJoin("memorial_album_video.user", "user")
        .where("memorial_album_video.memorial_id = :id", { id: req.params.id })
        .andWhere("memorial_album_video.is_deleted = :is_del", {
          is_del: false,
        })
        .andWhere("memorial_album_video.post_type = :post_type", {
          post_type: req.query.post_type,
        })
        .getMany();

      const result = {
        memorialAlbumVideoData: memorialAlbumVideoData.filter(x => x.media_url != ""),
        // memorialAlbumVideoData: memorialAlbumVideoData.map((x) => {
        //     return {
        //         id: x.id,
        //         media_url: x.media_url,
        //         user_id: x.user.id
        //     }

        // })
      };

      if (result) {
        if (PostType.Album == req.query.post_type) {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(result, "All Memorial Album found", httpStatus.OK)
            );
        } else {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(result, "All Memorial Video found", httpStatus.OK)
            );
        }
      }

      throw new Error("All Memorial Post Not found");
    } catch (error) {
      if (PostType.Album == req.query.post_type) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "All Memorial Album not found",
              httpStatus.BAD_REQUEST,
              error
            )
          );
      } else {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "All Memorial Video not found",
              httpStatus.BAD_REQUEST,
              error
            )
          );
      }
    }
  },
};

const getAllMemorialHallAlbumAndVideoByIDAdmin = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
      post_type: Joi.string()
        .valid(...Object.values(PostType))
        .allow(null, "")
        .required(),
      per_page: Joi.number().required(),
      page_number: Joi.number().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);
      let query;
      if (req.query.post_type == null || req.query.post_type == "") {
        query = await memorialAlbumVideoRepo
          .createQueryBuilder("memorial_album_video")
          .select(["memorial_album_video"])
          .where("memorial_album_video.memorial_id = :id", {
            id: req.params.id,
          })
          .andWhere("memorial_album_video.is_deleted = :is_del", {
            is_del: false,
          });
      } else {
        query = await memorialAlbumVideoRepo
          .createQueryBuilder("memorial_album_video")
          .select(["memorial_album_video"])
          .where("memorial_album_video.memorial_id = :id", {
            id: req.params.id,
          })
          .andWhere("memorial_album_video.is_deleted = :is_del", {
            is_del: false,
          })
          .andWhere("memorial_album_video.post_type = :post_type", {
            post_type: req.query.post_type,
          });
      }

      const [memorialAlbumVideoData, Count] = await query
        .skip(req.query.per_page * (req.query.page_number - 1))
        .take(req.query.per_page)
        .orderBy("memorial_album_video.updated_at", "DESC")
        .getManyAndCount();

      const AllCount = await memorialAlbumVideoRepo
        .createQueryBuilder("memorial_album_video")
        .select(["memorial_album_video"])
        .where("memorial_album_video.memorial_id = :id", { id: req.params.id })
        .andWhere("memorial_album_video.is_deleted = :is_del", {
          is_del: false,
        })
        .getCount();

      const AlbumCount = await memorialAlbumVideoRepo
        .createQueryBuilder("memorial_album_video")
        .select(["memorial_album_video"])
        .where("memorial_album_video.memorial_id = :id", { id: req.params.id })
        .andWhere("memorial_album_video.is_deleted = :is_del", {
          is_del: false,
        })
        .andWhere("memorial_album_video.post_type = :post_type", {
          post_type: PostType.Album,
        })
        .getCount();

      const VideoCount = await memorialAlbumVideoRepo
        .createQueryBuilder("memorial_album_video")
        .select(["memorial_album_video"])
        .where("memorial_album_video.memorial_id = :id", { id: req.params.id })
        .andWhere("memorial_album_video.is_deleted = :is_del", {
          is_del: false,
        })
        .andWhere("memorial_album_video.post_type = :post_type", {
          post_type: PostType.Video,
        })
        .getCount();

      const result = {
        memorialAlbumVideoData: memorialAlbumVideoData.map((x) => {
          return {
            id: x.id,
            writer: x.writer ?? "",
            fileName:
              x.media_url
                .split("/")
              [x.media_url.split("/").length - 1].split("?")[0] ?? "",
            fileFormat: x.post_type,
            fileFormat_ko: x.post_type == PostType.Album ? "이미지" : "동영상",
            fileSize: (x.file_size ?? 0) + " MB",
            date_of_entry: moment(x.created_at).format("YYYY.MM.DD"),
          };
        }),
        Count: Count,
        AllCount: AllCount,
        AlbumCount: AlbumCount,
        VideoCount: VideoCount,
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              result,
              "All Memorial Album And Video found",
              httpStatus.OK
            )
          );
      }

      throw new Error("All Memorial Post Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "All Memorial Album And Video not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteMemorialAlbumAndVideoById = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
    body: Joi.object().keys({
      id: Joi.string().required(),
      post_type: Joi.string()
        .valid(...Object.values(PostType))
        .required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      const memorialAlbumVideo = await memorialAlbumVideoRepo
        .createQueryBuilder("memorial_post")
        .update({ is_deleted: true })
        .where("id IN(:...ids)", { ids: req.body.id.split(",").map((x) => x) })
        .andWhere("post_type = :post_type", { post_type: req.body.post_type })
        .execute();

      if (!memorialAlbumVideo) {
        if (PostType.Album === req.body.post_type) {
          return res
            .status(httpStatus.BAD_REQUEST)
            .json(
              new APIResponse(
                null,
                "Can not delete memorial Album",
                httpStatus.BAD_REQUEST
              )
            );
        } else {
          return res
            .status(httpStatus.BAD_REQUEST)
            .json(
              new APIResponse(
                null,
                "Can not delete memorial Video",
                httpStatus.BAD_REQUEST
              )
            );
        }
      }
      if (PostType.Album === req.body.post_type) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(null, "Memorial Album deleted", httpStatus.OK));
      } else {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(null, "Memorial Video deleted", httpStatus.OK));
      }
    } catch (error) {
      if (PostType.Album === req.body.post_type) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete memorial album",
              httpStatus.BAD_REQUEST,
              error
            )
          );
      } else {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete memorial video",
              httpStatus.BAD_REQUEST,
              error
            )
          );
      }
    }
  },
};

const deleteMemorialAlbumAndVideoByIdByAdmin = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
    body: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      const memorialAlbumVideo = await memorialAlbumVideoRepo
        .createQueryBuilder("memorial_post")
        .update({ is_deleted: true })
        .where("id IN(:...ids)", { ids: req.body.id.split(",").map((x) => x) })
        .execute();

      if (!memorialAlbumVideo) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete memorial Album/Video",
              httpStatus.BAD_REQUEST
            )
          );
      }
      return res
        .status(httpStatus.OK)
        .json(
          new APIResponse(null, "Memorial Album/Video deleted", httpStatus.OK)
        );
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Can not delete memorial Album/Video",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const memorialHallPostImage = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string().required(),
      post_type: Joi.string()
        .valid(...Object.values(PostType))
        .required(),
      memorial_id: Joi.string().required(),
      user_id: Joi.string().required(),
    }),
  }),
  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);
      const userRepo = getRepository(User);
      const checkUser = await userRepo.findOne({
        where: {
          id: req.query.user_id,
        },
      });
      if (checkUser.is_admin === false) {
        if (PostType.Album == req.query.post_type) {
          const subcriptionRepo = getRepository(Subcription);
          const userSubcription = await subcriptionRepo.findOne({
            where: {
              user: req.query.user_id,
              plan_status: true,
            },
          });
          if (req.files.length <= userSubcription.MaxPictures) {
            const count = await memorialAlbumVideoRepo
              .createQueryBuilder("memorial_album_video")
              .where("memorial_album_video.memorialHall = :id", {
                id: req.query.memorial_id,
              })
              .andWhere("memorial_album_video.post_type = :post_type", {
                post_type: req.query.post_type,
              })
              .andWhere("memorial_album_video.created_by = :created_by", {
                created_by: req.query.user_id,
              })
              .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                is_deleted: false,
              })

              .getCount();

            if (req.files.length <= userSubcription.MaxPictures - count) {
              let newMemorialAlbumVideo = [];
              let functions = [];
              for (let i = 0; i < req.files.length; i++) {
                if (
                  userSubcription.MaxPicturesSize >=
                  req.files[i].size / (1024 * 1024)
                ) {
                  let newAlbum = {};
                  let image = await uploadImage(req.files[i]);
                  newAlbum["media_url"] = image;
                  newAlbum["file_size"] = req.files[i].size / (1024 * 1024);
                  newMemorialAlbumVideo.push(newAlbum);
                } else {
                  return res
                    .status(httpStatus.OK)
                    .json(
                      new APIResponse(
                        null,
                        "Memorial Post Image size maximum " +
                        userSubcription.MaxPicturesSize +
                        " mb",
                        httpStatus.BAD_REQUEST
                      )
                    );
                }

                if (
                  userSubcription.MaxPicturesSize <=
                  req.files[i].size / (1024 * 1024)
                ) {
                  break;
                }
              }
              if (newMemorialAlbumVideo.length > 0) {
                return res.status(httpStatus.OK).json({
                  link: newMemorialAlbumVideo[0].media_url,
                  file_size: newMemorialAlbumVideo[0].file_size,
                });
              }
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Post Image save Max limit execute",
                    httpStatus.BAD_REQUEST
                  )
                );
            }
          } else {
            return res
              .status(httpStatus.BAD_REQUEST)
              .json(
                new APIResponse(
                  null,
                  "Cannot insert Memorial Post Image ",
                  httpStatus.BAD_REQUEST
                )
              );
          }
        } else {
          const subcriptionRepo = getRepository(Subcription);
          const userSubcription = await subcriptionRepo.findOne({
            where: {
              user: req.query.user_id,
              plan_status: true,
            },
          });
          if (req.files.length <= userSubcription.MaxPictures) {
            const count = await memorialAlbumVideoRepo
              .createQueryBuilder("memorial_album_video")
              .where("memorial_album_video.memorialHall = :id", {
                id: req.query.memorial_id,
              })
              .andWhere("memorial_album_video.post_type = :post_type", {
                post_type: req.query.post_type,
              })
              .andWhere("memorial_album_video.created_by = :created_by", {
                created_by: req.query.user_id,
              })
              .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                is_deleted: false,
              })
              .getCount();

            if (req.files.length <= userSubcription.MaxVideo - count) {
              let newMemorialAlbumVideo = [];
              for (let i = 0; i < req.files.length; i++) {
                if (
                  userSubcription.MaxVideoSize >=
                  req.files[i].size / (1024 * 1024)
                ) {
                  let newAlbum = {};
                  let image = await uploadImage(req.files[i]);
                  newAlbum["media_url"] = image;
                  newAlbum["file_size"] = req.files[i].size / (1024 * 1024);
                  newMemorialAlbumVideo.push(newAlbum);
                } else {
                  return res
                    .status(httpStatus.OK)
                    .json(
                      new APIResponse(
                        null,
                        "Memorial Post Video size maximum " +
                        userSubcription.MaxVideoSize +
                        " mb",
                        httpStatus.BAD_REQUEST
                      )
                    );
                }
                if (
                  userSubcription.MaxPicturesSize <=
                  req.files[i].size / (1024 * 1024)
                ) {
                  break;
                }
              }
              if (newMemorialAlbumVideo.length > 0) {
                return res.status(httpStatus.OK).json({
                  link: newMemorialAlbumVideo[0].media_url,
                  file_size: newMemorialAlbumVideo[0].file_size,
                });
              }
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Post Video save Max limit execute",
                    httpStatus.BAD_REQUEST
                  )
                );
            }
          } else {
            return res
              .status(httpStatus.BAD_REQUEST)
              .json(
                new APIResponse(
                  null,
                  "Cannot insert Memorial Post Video ",
                  httpStatus.BAD_REQUEST
                )
              );
          }
        }
      } else {
        if (req.files.length) {
          let image = await uploadImage(req.files[0]);
          return res.status(httpStatus.OK).json({
            link: image,
            file_size: req.files[0].size / (1024 * 1024),
          });
        }
      }
    } catch (error) {
      fs.unlinkSync(req.files[0].path);
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in Image insert",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const memorialHallMainImage = {
  validator: celebrate({
    body: Joi.object().keys({
      memorial_id: Joi.string().required(),
      album_and_video_id: Joi.string().required(),
      post_type: Joi.string()
        .valid(...Object.values(PostType))
        .required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const memorialHallRepo = getRepository(memorialHall);
      const checkMemorialHall = await memorialHallRepo.findOne({
        where: { id: req.body.memorial_id },
      });

      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);
      const checkMemorialAlbumVideo = await memorialAlbumVideoRepo.findOne({
        where: { id: req.body.album_and_video_id },
      });

      if (!checkMemorialAlbumVideo) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Memorial Album not found",
              httpStatus.BAD_REQUEST,
              httpStatus.BAD_REQUEST
            )
          );
      }

      if (PostType.Album == req.body.post_type) {
        let data = {
          main_image: checkMemorialAlbumVideo.media_url,
        };

        memorialHallRepo.merge(checkMemorialHall, data);
        const result = await memorialHallRepo.save(checkMemorialHall);
        if (result) {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                null,
                "Main Image Save Successfully",
                httpStatus.OK
              )
            );
        }
      } else {
        let data = {
          main_video: checkMemorialAlbumVideo.media_url,
        };

        memorialHallRepo.merge(checkMemorialHall, data);
        const result = await memorialHallRepo.save(checkMemorialHall);
        if (result) {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                null,
                "Main Video Save Successfully",
                httpStatus.OK
              )
            );
        }
      }

      throw new Error("Main Image not Exists");
    } catch (error) {
      if (PostType.Album == req.body.post_type) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Error in Main Image insert",
              httpStatus.BAD_REQUEST,
              error
            )
          );
      } else {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Error in Main Video insert",
              httpStatus.BAD_REQUEST,
              error
            )
          );
      }
    }
  },
};

const deleteMemorialPostVideoAndAlbum = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      media_url: Joi.string().required(),
      post_type: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

      const response = await memorialAlbumVideoRepo
        .createQueryBuilder()
        .delete()
        .where("media_url = :url", { url: req.body.media_url })
        .where("post_type = :post_type", { post_type: req.body.post_type })
        .execute();

      if (response) {
        if (PostType.Album == req.body.post_type) {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                null,
                "Memorial Post Album  deleted",
                httpStatus.OK
              )
            );
        } else {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                null,
                "Memorial Post  Video deleted",
                httpStatus.OK
              )
            );
        }
      }

      if (PostType.Album == req.body.post_type) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Error in deleting memorial Post Album ",
              httpStatus.BAD_REQUEST
            )
          );
      } else {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Error in deleting memorial Post  Video",
              httpStatus.BAD_REQUEST
            )
          );
      }
    } catch (error) {
      if (PostType.Album == req.body.post_type) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Error in accepting memorial Post Album ",
              httpStatus.BAD_REQUEST,
              error
            )
          );
      } else {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Error in accepting memorial Post Video",
              httpStatus.BAD_REQUEST,
              error
            )
          );
      }
    }
  },
};

const addFriend = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      sender_id: Joi.string().required(),
      receiver_id: Joi.string().required(),
      memorial_id: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const friendListRepo = getRepository(FriendList);
      const checkFriendList = await friendListRepo.findOne({
        where: {
          sender_id: req.body.sender_id,
          receiver_id: req.body.receiver_id,
          memorialHall: req.body.memorial_id,
        },
      });
      if (!checkFriendList) {
        let newFriendList = {
          sender_id: req.body.sender_id,
          receiver_id: req.body.receiver_id,
          memorialHall: req.body.memorial_id,
          status: StatusType.Waiting,
        };

        const friendList = friendListRepo.create(newFriendList);
        let result = await friendListRepo.save(friendList);
        result = JSON.parse(JSON.stringify(result));

        if (result) {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                null,
                "Friend Request send Succesfully",
                httpStatus.OK
              )
            );
        }

        throw new Error("Friend List Not send Request");
      }
      throw new Error("Friend List already exists");
    } catch (error) {
      return res
        .status(httpStatus.OK)
        .json(
          new APIResponse(
            null,
            "Friend List already exists",
            httpStatus.OK,
            error
          )
        );
    }
  },
};

const getAllFriendList = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const friendListRepo = getRepository(FriendList);

      let friendListData = await friendListRepo
        .createQueryBuilder("friend_list")
        .select(["friend_list", "memorialHall", "user_sender", "user_receiver"])
        .leftJoin("friend_list.memorialHall", "memorialHall")
        .leftJoin("friend_list.sender_id", "user_sender")
        .leftJoin("friend_list.receiver_id", "user_receiver")
        .where("sender_id = :sender_id OR receiver_id = :receiver_id", {
          sender_id: req.user.id,
          receiver_id: req.user.id,
        })
        .getMany();

      const result = {
        friendListData: friendListData.map((x) => {
          return {
            id: x.id,
            sender_id: x.sender_id.id,
            receiver_id: x.receiver_id.id,
            image: x.memorialHall.image,
            name: x.memorialHall.name,
            date_of_birth: moment(x.memorialHall.date_of_birth).format(
              "YYYY.MM.DD"
            ),
            date_of_death: moment(x.memorialHall.date_of_death).format(
              "YYYY.MM.DD"
            ),
            job_title: x.memorialHall.job_title,
            display_status: GetStatusDisplay(
              x.status,
              req.user.id,
              x.sender_id.id,
              x.receiver_id.id
            ),
            status: x.status,
          };
        }),
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(result, "All Friend List found", httpStatus.OK)
          );
      }

      throw new Error("All Friend List Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "All Friend List not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

function GetStatusDisplay(
  Status: string,
  user_id: string,
  sender_id: string,
  receiver_id: string
) {
  let StatusReturn = "";
  if (receiver_id == user_id && receiver_id != sender_id) {
    if (Status == StatusType.Waiting) {
      StatusReturn = StatusType.AddFriend;
    } else if (Status == StatusType.Confirm) {
      StatusReturn = StatusType.Confirm;
    } else {
      StatusReturn = StatusType.AddFriend;
    }
  } else if (sender_id == user_id && receiver_id != sender_id) {
    if (Status == StatusType.Waiting) {
      StatusReturn = StatusType.Waiting;
    } else if (Status == StatusType.Confirm) {
      StatusReturn = StatusType.Confirm;
    } else {
      StatusReturn = StatusType.AddFriend;
    }
  } else {
    StatusReturn = StatusType.AddFriend;
  }

  return StatusReturn;
}

const chnageFriendStatus = {
  validator: celebrate({
    body: Joi.object().keys({
      id: Joi.string().required(),
      status: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const friendListRepo = getRepository(FriendList);

      const friendList = await friendListRepo.findOne({
        where: { id: req.body.id },
      });
      if (friendList) {
        if (StatusType.Waiting === req.body.status) {
          await friendListRepo
            .createQueryBuilder()
            .update({ status: StatusType.Confirm })
            .where("id = :id", { id: req.body.id })
            .execute();

          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(null, "Add Friend successfully", httpStatus.OK)
            );
        } else {
          await friendListRepo
            .createQueryBuilder()
            .delete()
            .where("id = :id", { id: req.body.id })
            .execute();

          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(null, "Remove Friend successfully", httpStatus.OK)
            );
        }
      }

      throw new Error("Friend Not Found");
    } catch (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new APIResponse(
            null,
            "Friend ",
            httpStatus.INTERNAL_SERVER_ERROR,
            error
          )
        );
    }
  },
};

const getDonationMoneyDetailByID = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const donationSerivesRepo = getRepository(DonationSerives);

      let donationSerivesData = await donationSerivesRepo
        .createQueryBuilder("donation_serives")
        .select(["donation_serives"])
        .where("donation_serives.memorial_id = :id", { id: req.params.id })
        .getOne();

      const result = {
        id: donationSerivesData.id,
        donation_field: donationSerivesData.donation_field,
        donation_field_ko: donationSerivesData.donation_field_ko,
        bank_name: donationSerivesData.bank_name,
        recipient_organization: donationSerivesData.recipient_organization,
        ac_number: donationSerivesData.ac_number,
        Introduction: donationSerivesData.Introduction,
        service_duration: donationSerivesData.service_duration,
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              result,
              " Memorial Donation Money Detail found",
              httpStatus.OK
            )
          );
      }

      throw new Error("Memorial Donation Money Detail Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Donation Money Detail not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const createMemorialHallDonation = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      recipient_name: Joi.string().required(),
      name: Joi.string().required(),
      organization: Joi.string().required(),
      donation_amount: Joi.string().required(),
      memorial_id: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const donationHistoryRepo = getRepository(DonationHistory);

      if (donationHistoryRepo) {
        let newDonationHistory = {
          recipient_name: req.body.recipient_name,
          name: req.body.name,
          organization: req.body.organization,
          donation_amount: req.body.donation_amount,
          memorialHall: req.body.memorial_id,
          user: req.user.id,
          is_deleted: false,
        };

        const donationHistory = donationHistoryRepo.create(newDonationHistory);
        let result = await donationHistoryRepo.save(donationHistory);
        result = JSON.parse(JSON.stringify(result));

        if (result) {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                null,
                "Memorial Hall Donation added Succesfully",
                httpStatus.OK
              )
            );
        }

        throw new Error("Memorial Hall Donation Not Added");
      }
      throw new Error("Memorial Hall Donation already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall Donation already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const createMemorialHallDonationByAdmin = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      name: Joi.string().required(),
      organization: Joi.string().required(),
      donation_amount: Joi.string().required(),
      memorial_id: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const donationHistoryRepo = getRepository(DonationHistory);
      const donationSerivesRepo = getRepository(DonationSerives);

      const donationSerivesData = await donationSerivesRepo.findOne({
        where: {
          memorialHall: req.body.memorial_id,
        },
      });

      if (donationHistoryRepo) {
        let newDonationHistory = {
          recipient_name:
            donationSerivesData.bank_name +
            donationSerivesData.ac_number +
            donationSerivesData.donation_field,
          name: req.body.name,
          organization: req.body.organization,
          donation_amount: req.body.donation_amount,
          memorialHall: req.body.memorial_id,
          user: req.user.id,
          is_deleted: false,
        };

        const donationHistory = donationHistoryRepo.create(newDonationHistory);
        let result = await donationHistoryRepo.save(donationHistory);
        result = JSON.parse(JSON.stringify(result));

        if (result) {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                null,
                "Memorial Hall Donation added Succesfully",
                httpStatus.OK
              )
            );
        }

        throw new Error("Memorial Hall Donation Not Added");
      }
      throw new Error("Memorial Hall Donation already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall Donation already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteMemorialHallDonationById = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const donationHistoryRepo = getRepository(DonationHistory);

      const donationHistory = await donationHistoryRepo
        .createQueryBuilder("donation_history")
        .update({ is_deleted: true, deleted_at: new Date().toUTCString() })
        .where("id = :id", { id: req.params.id })
        .execute();

      if (!donationHistory) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete memorial hall donation",
              httpStatus.BAD_REQUEST
            )
          );
      }

      return res
        .status(httpStatus.OK)
        .json(
          new APIResponse(null, "Memorial hall donation deleted", httpStatus.OK)
        );
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Can not delete memorial hall donation",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const getAllMemorialHallDonationByID = {
  validator: celebrate({
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
    query: Joi.object().keys({
      lang: Joi.string().required(),
      per_page: Joi.number().required(),
      page_number: Joi.number().required(),
    }),
  }),

  controller: async (req: any, res: Response) => {
    try {
      const donationHistoryRepo = getRepository(DonationHistory);

      let query = await donationHistoryRepo
        .createQueryBuilder("donation_history")
        .select(["donation_history"])
        .where("donation_history.memorial_id = :id", { id: req.params.id })
        .andWhere("donation_history.is_deleted = :is_del", { is_del: false });

      const [donationHistoryData, count] = await query
        .skip(req.query.per_page * (req.query.page_number - 1))
        .take(req.query.per_page)
        .orderBy("donation_history.updated_at", "DESC")
        .getManyAndCount();

      const AllCount = await donationHistoryRepo
        .createQueryBuilder("donation_history")
        .select(["donation_history"])
        .where("donation_history.memorial_id = :id", { id: req.params.id })
        .andWhere("donation_history.is_deleted = :is_del", { is_del: false })
        .getCount();

      const result = {
        donationHistoryData: donationHistoryData.map((x) => {
          return {
            id: x.id,
            name: x.name,
            organization: x.organization,
            donation_amount: x.donation_amount,
            donation_created_date: moment(x.created_at).format("YYYY.MM.DD"),
          };
        }),
        count: count,
        AllCount: AllCount,
      };

      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              result,
              "All Memorial Hall Donation found",
              httpStatus.OK
            )
          );
      }

      throw new Error("All Memorial Hall Donation Not found");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "All Memorial Hall Donation not found",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteMemorialHallDonationByAdmin = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string().required(),
    }),
    body: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const donationHistoryRepo = getRepository(DonationHistory);

      const donationHistory = await donationHistoryRepo
        .createQueryBuilder("donation_istory")
        .update({ is_deleted: true })
        .where("id IN(:...ids)", { ids: req.body.id.split(",").map((x) => x) })
        .execute();

      if (!donationHistory) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(
            new APIResponse(
              null,
              "Can not delete donation history",
              httpStatus.BAD_REQUEST
            )
          );
      }
      return res
        .status(httpStatus.OK)
        .json(new APIResponse(null, "Donation history deleted", httpStatus.OK));
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Can not delete donation history",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteMemorialPostByIdByAdmin = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const memorialPostRepo = getRepository(MemorialPost);
      const response = await memorialPostRepo
        .createQueryBuilder("memorial_post")
        .update({ is_deleted: true, updated_at: new Date().toUTCString() })
        .where("id IN(:...ids)", { ids: req.body.id.split(",").map((x) => x) })
        .execute();

      if (response) {
        return res
          .status(httpStatus.OK)
          .json(new APIResponse(null, "Memorial post deleted", httpStatus.OK));
      }

      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in deleting memorial post",
            httpStatus.BAD_REQUEST
          )
        );
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in accepting memorial post",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

// send sms
const sendSMS = {
  validator: celebrate({
    body: Joi.object().keys({
      memorial_id: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response) => {
    try {
      const friendListRepo = getRepository(FriendList);
      const fListData = await friendListRepo.query(
        `select * from friend_list WHERE memorial_id = '` +
        req.body.memorial_id +
        `';
    `
      );

      if (fListData.lengh != 0) {
        const userRepo = getRepository(User);
        const sendUser = await userRepo.findOne({
          where: { id: fListData[0].sender_id },
        });

        const memorialHallRepo = getRepository(memorialHall);
        const mHallData = await memorialHallRepo.findOne({
          where: { id: req.body.memorial_id },
        });

        let dod = new Date(mHallData.date_of_death);
        let doctoo = new Date(mHallData.date_of_carrying_the_coffin_out);

        let setSMSBody =
          mHallData.name +
          "님께서 " +
          dod.getFullYear() +
          "년" +
          dod.getMonth() +
          "월" +
          dod.getDate() +
          "일" +
          " 별세하셨기에 삼가 알려드립니다.\n\n" +
          "발인 : " +
          doctoo.getFullYear() +
          "년" +
          doctoo.getMonth() +
          "월" +
          doctoo.getDate() +
          "일" +
          doctoo.getHours() +
          "시" +
          doctoo.getMinutes() +
          "분\n" +
          "빈소 : " +
          mHallData.burial_plot +
          "\n\n" +
          "부고확인\n" +
          process.env.APP_URL +
          "/memorialview?id=" +
          req.body.memorial_id +
          "\n\n" +
          "직접 연락드려야 하나 황망중이라 모바일 부고장으로 부고를 알려 드림을 헤아려 주시기 바랍니다.\n\n" +
          "상주 " +
          sendUser.name +
          " 배상";

        for (var key in fListData) {
          if (fListData[key].receiver_id) {
            const userRepo = getRepository(User);
            const userData = await userRepo.findOne({
              where: { id: fListData[key].receiver_id },
            });

            const SMS_HOST_FRONT =
              "https://api-sms.cloud.toast.com/sms/v2.4/appKeys";
            const SMS_HOST_KEY = process.env.NHN_SMS_KEY;
            const SMS_HOST_BACK = "sender/mms";

            axios
              .post(`${SMS_HOST_FRONT}/${SMS_HOST_KEY}/${SMS_HOST_BACK}`, {
                title: "[訃告]",
                body: setSMSBody,
                sendNo: process.env.NHN_SMS_SEND_NO,
                recipientList: [{ internationalRecipientNo: userData.mobile }],
              })
              .then(async (message) => { });
          }
        }

        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(fListData, "success sms message", httpStatus.OK)
          );
      } else {
        res
          .status(httpStatus.OK)
          .json(new APIResponse(null, "empty follow user", httpStatus.OK));
      }
    } catch (error) {
      res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(null, "occur some error", httpStatus.BAD_REQUEST)
        );
    }
  },
};

const getFuneralAddress = {
  validator: celebrate({
    query: Joi.object().keys({
      per_page: Joi.number().required(),
      page_number: Joi.number().required(),
      funeral_term: Joi.string().allow(""),
      lang: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const funeralListRepo = getRepository(FuneralList);

      let conditions = [];

      Object.keys(req.query).map((query) => {
        switch (query) {
          case "funeral_term":
            if (req.query.funeral_term != "") {
              req.query.funeral_term.split(" ").map((x) => {
                conditions.push(
                  `(funeral_list.type_of_operation ILIKE '%${x}%') OR (funeral_list.facility_name ILIKE '%${x}%') OR (funeral_list.address ILIKE '%${x}%')`
                );
              });
            }
            break;
        }
      });

      let query = await funeralListRepo
        .createQueryBuilder("funeral_list")
        .select(["funeral_list"]);

      conditions.map((x, i) => {
        if (!i) {
          query = query.where(x);
        } else {
          query = query.andWhere(x);
        }
      });

      const funeralList = await query
        .skip(req.query.per_page * (req.query.page_number - 1))
        .take(req.query.per_page)
        .getMany();

      const result = {
        funeralList: funeralList.map((x) => {
          return {
            id: x.idx,
            type_of_operation: x.type_of_operation,
            type_of_operation_en: type_of_operation_en(x.type_of_operation),
            facility_name: x.facility_name,
            address: x.address,
          };
        }),
      };
      if (result) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              result,
              "funeral list get successfully.",
              httpStatus.OK
            )
          );
      }
    } catch (err) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new APIResponse(
            err,
            "Error in getting funeral list",
            httpStatus.INTERNAL_SERVER_ERROR
          )
        );
    }
  },
};

function type_of_operation_en(typeName: string) {
  let return_string = "";
  switch (typeName) {
    case "전문":
      return_string = "specialty";
      break;
    case "병원":
      return_string = "hospital";
      break;

    default:
      return_string = "";
      break;
  }
  return return_string;
}

function GetFuneralAddressList(id: string, value: string) {
  return new Promise(async (resolve, reject) => {
    try {
      let friendAddress = "";

      const funeralListRepo = getRepository(FuneralList);
      let query = funeralListRepo
        .createQueryBuilder("funeral_list")
        .where("funeral_list.idx = :id", { id: id });

      const funeralList = await query.getOne();
      if (value == "funeral_Address") {
        if (funeralList) {
          friendAddress = funeralList.type_of_operation + "," + funeralList.facility_name + "," + funeralList.address
        } else {
          friendAddress = "";
        }
      } else if (value == "mobile") {
        if (funeralList) {
          friendAddress = funeralList.tel
        } else {
          friendAddress = "";
        }
      }

      resolve(friendAddress);
    } catch (e) {
      reject(e);
    }
  });
}

const memorialHallPostImageNon = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string().required(),
      post_type: Joi.string()
        .valid(...Object.values(PostType))
        .required(),
      memorial_id: Joi.string().required(),
      random_number: Joi.string().required(),
    }),
  }),
  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      if (PostType.Album == req.query.post_type) {
        const planRepo = getRepository(Plan);
        const plan = await planRepo.findOne({
          where: {
            plan_type: "Non",
          },
        });
        if (req.files.length <= plan.MaxPictures) {
          let newMemorialAlbumVideo = [];
          for (let i = 0; i < req.files.length; i++) {
            if (plan.MaxPicturesSize >= req.files[i].size / (1024 * 1024)) {
              let newAlbum = {};
              let image = await uploadImage(req.files[i]);
              newAlbum["media_url"] = image;
              newAlbum["file_size"] = req.files[i].size / (1024 * 1024);
              newMemorialAlbumVideo.push(newAlbum);
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Post Image size maximum " +
                    plan.MaxPicturesSize +
                    " mb",
                    httpStatus.BAD_REQUEST
                  )
                );
            }

            if (plan.MaxPicturesSize <= req.files[i].size / (1024 * 1024)) {
              break;
            }
          }
          if (newMemorialAlbumVideo.length > 0) {
            const nonMemberMemorialPostRepo = getRepository(
              NonMemberMemorialPost
            );
            let tempFile = await nonMemberMemorialPostRepo.findOne({
              random_number: req.query.random_number,
              memorial_id: req.query.memorial_id,
            });

            if (tempFile) {
              const nonMemberMemorialPostInsert = {
                album_url: newMemorialAlbumVideo[0].media_url,
                file_size_album: newMemorialAlbumVideo[0].file_size,
              };
              nonMemberMemorialPostRepo.merge(
                tempFile,
                nonMemberMemorialPostInsert
              );
              await nonMemberMemorialPostRepo.save(tempFile);
            } else {
              const nonMemberMemorialPostInsert = {
                random_number: req.query.random_number,
                memorial_id: req.query.memorial_id,
                album_url: newMemorialAlbumVideo[0].media_url,
                file_size_album: newMemorialAlbumVideo[0].file_size,
              };
              const nonMemberMemorialPost = nonMemberMemorialPostRepo.create(
                nonMemberMemorialPostInsert
              );
              await nonMemberMemorialPostRepo.save(nonMemberMemorialPost);
            }
            return res.status(httpStatus.OK).json({
              link: newMemorialAlbumVideo[0].media_url,
              file_size: newMemorialAlbumVideo[0].file_size,
            });
          }
        } else {
          return res
            .status(httpStatus.BAD_REQUEST)
            .json(
              new APIResponse(
                null,
                "Cannot insert Memorial Post Image ",
                httpStatus.BAD_REQUEST
              )
            );
        }
      } else {
        const planRepo = getRepository(Plan);
        const plan = await planRepo.findOne({
          where: {
            plan_type: "Non",
          },
        });
        if (req.files.length <= plan.MaxPictures) {
          let newMemorialAlbumVideo = [];
          for (let i = 0; i < req.files.length; i++) {
            if (plan.MaxVideoSize >= req.files[i].size / (1024 * 1024)) {
              let newAlbum = {};
              let image = await uploadImage(req.files[i]);
              newAlbum["media_url"] = image;
              newAlbum["file_size"] = req.files[i].size / (1024 * 1024);
              newMemorialAlbumVideo.push(newAlbum);
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Post Video size maximum " +
                    plan.MaxVideoSize +
                    " mb",
                    httpStatus.BAD_REQUEST
                  )
                );
            }
            if (plan.MaxPicturesSize <= req.files[i].size / (1024 * 1024)) {
              break;
            }
          }
          if (newMemorialAlbumVideo.length > 0) {
            const nonMemberMemorialPostRepo = getRepository(
              NonMemberMemorialPost
            );
            let tempFile = await nonMemberMemorialPostRepo.findOne({
              random_number: req.query.random_number,
              memorial_id: req.query.memorial_id,
            });

            if (tempFile) {
              const nonMemberMemorialPostInsert = {
                video_url: newMemorialAlbumVideo[0].media_url,
                file_size_video: newMemorialAlbumVideo[0].file_size,
              };
              nonMemberMemorialPostRepo.merge(
                tempFile,
                nonMemberMemorialPostInsert
              );
              await nonMemberMemorialPostRepo.save(tempFile);
            } else {
              const nonMemberMemorialPostInsert = {
                random_number: req.query.random_number,
                memorial_id: req.query.memorial_id,
                video_url: newMemorialAlbumVideo[0].media_url,
                file_size_video: newMemorialAlbumVideo[0].file_size,
              };
              const nonMemberMemorialPost = nonMemberMemorialPostRepo.create(
                nonMemberMemorialPostInsert
              );
              await nonMemberMemorialPostRepo.save(nonMemberMemorialPost);
            }

            return res.status(httpStatus.OK).json({
              link: newMemorialAlbumVideo[0].media_url,
              file_size: newMemorialAlbumVideo[0].file_size,
            });
          }
        } else {
          return res
            .status(httpStatus.BAD_REQUEST)
            .json(
              new APIResponse(
                null,
                "Cannot insert Memorial Post Video ",
                httpStatus.BAD_REQUEST
              )
            );
        }
      }
    } catch (error) {
      for (let i = 0; i < req.files.length; i++) {
        fs.unlinkSync(req.files[0].path);
      }
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in Image insert",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const createMemorialPostByNonMember = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      content: Joi.string().required(),
      writer: Joi.string().required(),
      memorial_id: Joi.string().required(),
      random_number: Joi.string().required(),
      mobile_no: Joi.string().required(),
      password: Joi.string().required(),
    }),
  }),

  controller: async (req: any, res: Response): Promise<Response> => {
    try {
      const userRepo = getRepository(User);
      const user = await userRepo.findOne({
        mobile: req.body.mobile_no,
      });

      if (user) {
        if (user.plan_type != UserType.Non) {
          return res
            .status(httpStatus.OK)
            .json(
              new APIResponse(
                null,
                "You have already joined. Please login and leave a memorial post",
                httpStatus.OK
              )
            );
        } else {
          const nonMemberMemorialPostRepo = getRepository(
            NonMemberMemorialPost
          );

          const nonMemberMemorialPost = await nonMemberMemorialPostRepo.findOne(
            {
              memorial_id: req.body.memorial_id,
              random_number: req.body.random_number,
            }
          );

          if (nonMemberMemorialPost) {
            const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);
            const count = await memorialAlbumVideoRepo
              .createQueryBuilder("memorial_album_video")
              .where("memorial_album_video.memorialHall = :id", {
                id: req.query.memorial_id,
              })
              .andWhere(
                "memorial_album_video.post_type = :post_type OR memorial_album_video.post_type = :post_video_type",
                {
                  post_type: PostType.Album,
                  post_video_type: PostType.Video,
                }
              )
              .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                is_deleted: false,
              })
              .andWhere("memorial_album_video.created_by = :created_by", {
                created_by: user.id,
              })
              .getCount();

            const planRepo = getRepository(Plan);
            const plan = await planRepo.findOne({
              where: {
                plan_type: "Non",
              },
            });
            if (plan.MaxPictures + plan.MaxVideo <= count) {
              const memorialPostRepo = getRepository(MemorialPost);

              let newMemorialPost = {
                content: req.body.content,
                writer: req.body.writer,
                memorialHall: req.body.memorial_id,
                album_url: nonMemberMemorialPost.album_url,
                video_url: nonMemberMemorialPost.video_url,
                password: req.body.password,
              };

              newMemorialPost["user"] = user.id;

              const memorialPost = memorialPostRepo.create(newMemorialPost);
              let result = await memorialPostRepo.save(memorialPost);
              result = JSON.parse(JSON.stringify(result));

              if (result) {

                if (nonMemberMemorialPost.album_url != "") {
                  const count = await memorialAlbumVideoRepo
                    .createQueryBuilder("memorial_album_video")
                    .where("memorial_album_video.memorialHall = :id", {
                      id: req.query.memorial_id,
                    })
                    .andWhere("memorial_album_video.post_type = :post_type", {
                      post_type: PostType.Album,
                    })
                    .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                      is_deleted: false,
                    })
                    .andWhere("memorial_album_video.created_by = :created_by", {
                      created_by: user.id,
                    })
                    .getCount();

                  const planRepo = getRepository(Plan);
                  const plan = await planRepo.findOne({
                    where: {
                      plan_type: "Non",
                    },
                  });
                  if (plan.MaxPictures <= count) {
                    let NewVideoAndAlbumData = {
                      post_type: PostType.Album,
                      media_url: nonMemberMemorialPost.album_url,
                      memorialHall: req.body.memorial_id,
                      writer: req.body.writer,
                      file_size: nonMemberMemorialPost.file_size_album,
                    };

                    NewVideoAndAlbumData["user"] = user.id;

                    const memorialAlbumVideo =
                      memorialAlbumVideoRepo.create(NewVideoAndAlbumData);
                    await memorialAlbumVideoRepo.save(memorialAlbumVideo);
                  } else {
                    return res
                      .status(httpStatus.OK)
                      .json(
                        new APIResponse(
                          null,
                          "Memorial Post Album save Max limit execute",
                          httpStatus.BAD_REQUEST
                        )
                      );
                  }

                } else if (nonMemberMemorialPost.video_url != "") {

                  const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo)

                  const count = await memorialAlbumVideoRepo
                    .createQueryBuilder("memorial_album_video")
                    .where("memorial_album_video.memorialHall = :id", {
                      id: req.body.memorial_id,
                    })
                    .andWhere("memorial_album_video.post_type = :post_type", {
                      post_type: PostType.Video,
                    })
                    .andWhere("memorial_album_video.is_deleted = :is_deleted", {
                      is_deleted: false,
                    })
                    .andWhere("memorial_album_video.created_by = :created_by", {
                      created_by: user.id,
                    })
                    .getCount();

                  const planRepo = getRepository(Plan);
                  const plan = await planRepo.findOne({
                    where: {
                      plan_type: "Non",
                    },
                  });
                  if (plan.MaxPictures <= count) {
                    let NewVideoAndAlbumData = {
                      post_type: PostType.Video,
                      media_url: nonMemberMemorialPost.album_url,
                      memorialHall: req.body.memorial_id,
                      writer: req.body.writer,
                      file_size: nonMemberMemorialPost.file_size_album,
                    };

                    NewVideoAndAlbumData["user"] = user.id;

                    const memorialAlbumVideo =
                      memorialAlbumVideoRepo.create(NewVideoAndAlbumData);
                    await memorialAlbumVideoRepo.save(memorialAlbumVideo);

                    await nonMemberMemorialPostRepo
                      .createQueryBuilder("non_member_memorial_post")
                      .delete()
                      .where(
                        "non_member_memorial_post.memorial_id = :memorial_id",
                        { memorial_id: req.body.memorial_id }
                      )
                      .andWhere(
                        "non_member_memorial_post.random_number =:random_number",
                        { random_number: req.body.random_number }
                      )
                      .execute();

                    return res
                      .status(httpStatus.OK)
                      .json(
                        new APIResponse(
                          null,
                          "Memorial Hall Post Save successfully",
                          httpStatus.OK
                        )
                      );
                  } else {
                    return res
                      .status(httpStatus.OK)
                      .json(
                        new APIResponse(
                          null,
                          "Memorial Post Video save Max limit execute",
                          httpStatus.BAD_REQUEST
                        )
                      );
                  }
                }

                await nonMemberMemorialPostRepo
                  .createQueryBuilder("non_member_memorial_post")
                  .delete()
                  .where(
                    "non_member_memorial_post.memorial_id = :memorial_id",
                    { memorial_id: req.body.memorial_id }
                  )
                  .andWhere(
                    "non_member_memorial_post.random_number =:random_number",
                    { random_number: req.body.random_number }
                  )
                  .execute();

                return res
                  .status(httpStatus.OK)
                  .json(
                    new APIResponse(
                      null,
                      "Memorial Hall Post Save successfully",
                      httpStatus.OK
                    )
                  );
              }
            } else {
              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Album And Video save Max limit execute",
                    httpStatus.BAD_REQUEST
                  )
                );
            }
          } else {
            return res
              .status(httpStatus.OK)
              .json(new APIResponse(null, "Record Not Found", httpStatus.OK));
          }
        }
      } else {
        const newUserInsert = {
          mobile: req.body.mobile_no,
          is_verified: false,
          is_admin: false,
          plan_type: UserType.Non,
        };

        const userNew = userRepo.create(newUserInsert);
        let resultUser = await userRepo.save(userNew);
        resultUser = JSON.parse(JSON.stringify(resultUser));

        if (resultUser) {
          const nonMemberMemorialPostRepo = getRepository(
            NonMemberMemorialPost
          );

          const nonMemberMemorialPost = await nonMemberMemorialPostRepo.findOne(
            {
              memorial_id: req.body.memorial_id,
              random_number: req.body.random_number,
            }
          );
          if (nonMemberMemorialPost) {
            const memorialPostRepo = getRepository(MemorialPost);
            const memorialAlbumVideoRepo = getRepository(MemorialAlbumVideo);

            let newMemorialPost = {
              content: req.body.content,
              writer: req.body.writer,
              memorialHall: req.body.memorial_id,
              album_url: nonMemberMemorialPost.album_url,
              video_url: nonMemberMemorialPost.video_url,
              password: req.body.password,
            };

            newMemorialPost["user"] = resultUser.id;

            const memorialPost = memorialPostRepo.create(newMemorialPost);
            let result = await memorialPostRepo.save(memorialPost);
            result = JSON.parse(JSON.stringify(result));

            if (result) {
              if (nonMemberMemorialPost.album_url) {
                let NewVideoAndAlbumData = {
                  post_type: PostType.Album,
                  media_url: nonMemberMemorialPost.album_url,
                  memorialHall: req.body.memorial_id,
                  writer: req.body.writer,
                  file_size: nonMemberMemorialPost.file_size_album,
                };

                NewVideoAndAlbumData["user"] = resultUser.id;

                const memorialAlbumVideo =
                  memorialAlbumVideoRepo.create(NewVideoAndAlbumData);
                await memorialAlbumVideoRepo.save(memorialAlbumVideo);
              } else if (nonMemberMemorialPost.video_url) {
                let NewVideoAndAlbumData = {
                  post_type: PostType.Video,
                  media_url: nonMemberMemorialPost.album_url,
                  memorialHall: req.body.memorial_id,
                  writer: req.body.writer,
                  file_size: nonMemberMemorialPost.file_size_video,
                };

                NewVideoAndAlbumData["user"] = resultUser.id;

                const memorialAlbumVideo =
                  memorialAlbumVideoRepo.create(NewVideoAndAlbumData);
                await memorialAlbumVideoRepo.save(memorialAlbumVideo);
              }

              await nonMemberMemorialPostRepo
                .createQueryBuilder("non_member_memorial_post")
                .delete()
                .where("non_member_memorial_post.memorial_id = :memorial_id", {
                  memorial_id: req.body.memorial_id,
                })
                .andWhere(
                  "non_member_memorial_post.random_number =:random_number",
                  { random_number: req.body.random_number }
                )
                .execute();

              return res
                .status(httpStatus.OK)
                .json(
                  new APIResponse(
                    null,
                    "Memorial Hall Post Save successfully",
                    httpStatus.OK
                  )
                );
            }
          } else {
            return res
              .status(httpStatus.OK)
              .json(new APIResponse(null, "Record Not Found", httpStatus.OK));
          }
        }
      }

      throw new Error("Memorial Hall Post already exists");
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Memorial Hall Post already exists",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

const deleteNonMemberMemorialPost = {
  validator: celebrate({
    query: Joi.object().keys({
      lang: Joi.string(),
    }),
    body: Joi.object().keys({
      random_number: Joi.string().required(),
    }),
  }),

  controller: async (req: Request, res: Response): Promise<Response> => {
    try {
      const nonMemberMemorialPostRepo = getRepository(NonMemberMemorialPost);

      const response = await nonMemberMemorialPostRepo
        .createQueryBuilder()
        .delete()
        .where("random_number = :random_number", {
          random_number: req.body.random_number,
        })
        .execute();

      if (response) {
        return res
          .status(httpStatus.OK)
          .json(
            new APIResponse(
              null,
              "Non Member Memorial Post deleted",
              httpStatus.OK
            )
          );
      }

      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in deleting Non Member Memorial Post",
            httpStatus.BAD_REQUEST
          )
        );
    } catch (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          new APIResponse(
            null,
            "Error in accepting Non Member Memorial Post",
            httpStatus.BAD_REQUEST,
            error
          )
        );
    }
  },
};

export {
  createMemorialHall,
  createMemorialHallByAdmin,
  memorialHallImage,
  getMemorialHall,
  getMemorialHallAuth,
  getMemorialHallByID,
  editMemorialHall,
  editMemorialHallByAdmin,
  deleteMemorialHall,
  memorialHallSByUser,
  getMemorialHallByView,
  createMemorialHallVisitor,
  getmemorialHallByAdmin,
  getMemorialHallViewNoAuth,
  getMemorialHallByViewByInvitation,
  createMemorialHallMessage,
  editMemorialHallMessage,
  getMemorialHallMessageByID,
  deleteMemorialMessageById,
  deleteMemorialMessageByIdAdmin,
  getAllMemorialHallMessageByID,
  createMemorialHallPost,
  editMemorialHallPost,
  getMemorialHallPostByID,
  deleteMemorialPostById,
  deleteMemorialPostByIdByAdmin,
  getAllMemorialHallPostByID,
  getAllMemorialHallPostByIDAdmin,
  createMemorialHallAlbumAndVideo,
  editMemorialHallAlbumAndVideo,
  memorialHallMessageImage,
  getAllMemorialHallAlbumAndVideoByID,
  getAllMemorialHallAlbumAndVideoByIDAdmin,
  deleteMemorialAlbumAndVideoById,
  deleteMemorialAlbumAndVideoByIdByAdmin,
  memorialHallPostImage,
  memorialHallMainImage,
  deleteMemorialPostVideoAndAlbum,
  addFriend,
  getAllFriendList,
  chnageFriendStatus,
  getDonationMoneyDetailByID,
  createMemorialHallDonation,
  createMemorialHallDonationByAdmin,
  deleteMemorialHallDonationById,
  deleteMemorialHallDonationByAdmin,
  getAllMemorialHallDonationByID,
  getFuneralAddress,
  sendSMS,
  memorialHallPostImageNon,
  createMemorialPostByNonMember,
  deleteNonMemberMemorialPost,
  deleteMemorialPostByIdNoPassword
};
