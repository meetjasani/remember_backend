import { ConnectionOptions } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

const development: ConnectionOptions = {
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "1234",
  database: "memorial",
  entities: ["src/api/entity/**/*.ts"],
  migrations: ["src/migration/**/*.ts"],
  subscribers: ["src/subscriber/**/*.ts"],
  synchronize: true,
};

// const development: ConnectionOptions = {
//   type: "postgres",
//   host: "newbizstart.iptime.org",
//   port: 5432,
//   username: "admin",
//   password: "nbs01029!Q",
//   database: "compastrips",
//   entities: ["src/api/entity/**/*.ts"],
//   migrations: ["src/migration/**/*.ts"],
//   subscribers: ["src/subscriber/**/*.ts"],
//   synchronize: true,
// };

const test: ConnectionOptions = {
  type: "postgres",
  host: "ec2-54-78-36-245.eu-west-1.compute.amazonaws.com",
  port: 5432,
  username: "qoigjfczwjmgjn",
  password: "152e9bd3bda9fb851639e716735bfc8873453b3e1192789d1af1be5fec62e8a7",
  database: "d2gdapj5i84lap",
  entities: ["src/api/entity/**/*.ts"],
  migrations: ["src/migration/**/*.ts"],
  subscribers: ["src/subscriber/**/*.ts"],
  synchronize: true,
};

const production: ConnectionOptions = {
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  entities: ["src/api/entity/**/*.ts"],
  migrations: ["src/migration/**/*.ts"],
  subscribers: ["src/subscriber/**/*.ts"],
  synchronize: true,
  logging: false,
};

export { development, production, test };
