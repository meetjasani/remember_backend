import { createConnection } from "typeorm";
import { getRepository } from "typeorm";
import { Country } from "../api/entity";
import { development, production } from "../database/config";

const fs = require("fs");
const countryFile = require("path").join(__dirname, "../utils/countries.json");

let countries = [
  {
    name: "South Korea",
    name_ko: "대한민국",
    code: "+82",
    flag_image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Flag_of_North_Korea.svg/1920px-Flag_of_North_Korea.svg.png",
  },
];

// Read countries.json file, if it exists
if (fs.existsSync(countryFile)) {
  var countryData = fs.readFileSync(countryFile, "utf-8");
  countries = JSON.parse(countryData);
}

console.log("countries", countries);

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
  await getRepository("country").delete({});

  getRepository("country")
    .createQueryBuilder()
    .insert()
    .into(Country)
    .values(countries)
    .execute()
    .then(() => console.log(`${countries.length} countries added successfully`))
    .catch((err) => console.log(err));
});
