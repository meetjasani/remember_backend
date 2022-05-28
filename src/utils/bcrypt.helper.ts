// import bcrypt, { hash } from "bcrypt";

// const hashPassword = (password: string, salt: number): Promise<any> => {
//   return bcrypt.hash(password, salt);
// };

// const comparePassword = (password, hashPassword): Promise<boolean> => {
//   return bcrypt.compare(password, hashPassword);
// };

// export { hashPassword, comparePassword };

const crypto = require('crypto');
const algorithm = 'aes-256-ctr'; //Using AES encryption
const SecureKey = 'RJ23edrf';

const encrypt = (password: string): Promise<string> => {
  var cipher = crypto.createCipher(algorithm, SecureKey)
  var crypted = cipher.update(password, 'utf8', 'hex')
  crypted += cipher.final('hex');
  return crypted;
};

const decrypt = (password: any): Promise<string> => {

  var decipher = crypto.createDecipher(algorithm, SecureKey)
  var dec = decipher.update(password, 'hex', 'utf8')
  dec += decipher.final('utf8');
  return dec;
};

export { encrypt, decrypt };
