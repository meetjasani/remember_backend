import jwt from "jsonwebtoken";
import { jwtSecret } from "../../config";

function decodeToken(token) {
  return jwt.decode(token.replace("Bearer ", ""));
}

function getJWTToken(data) {
  const token = `Bearer ${jwt.sign(data, jwtSecret)}`;
  return token;
}

export { decodeToken, getJWTToken };
