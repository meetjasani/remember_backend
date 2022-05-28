import { createConnection } from "typeorm";
import { getRepository } from "typeorm";
import { Admin } from "../api/entity";
import { development, production } from "../database/config";

let environment;

switch (process.env.NODE_ENV) {
  case "development":
    environment = development;
    break;
  case "production":
    environment = production;
  default:
    break;
}

createConnection(environment).then(async () => {
  const admin = await getRepository("admin").findOne();

  if (admin) {
    console.log("admin already available");
    return;
  }
  getRepository("admin")
    .createQueryBuilder()
    .insert()
    .into(Admin)
    .values([
      {
        avatar:
          "https://cdn.analyticsvidhya.com/wp-content/uploads/2020/04/featured_image-1.jpg",
        email: "admin@gmail.com",
        password: "11111111",
        failed_count: 0,
      },
    ])
    .execute()
    .then(() => console.log("1 admin added successfully"))
    .catch((err) => console.log(err));
});
