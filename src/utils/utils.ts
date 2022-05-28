import { getRepository } from "typeorm";
import { db } from "../../firebaseConfig";
import { Country } from "../api/entity";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import firebase from "firebase";

const getRandomNumber = (): string => {
  return (Math.floor(Math.random() * 9) + 1).toString();
};

const generateRandomNumber = (): any => {
  let str =
    getRandomNumber() +
    getRandomNumber() +
    getRandomNumber() +
    getRandomNumber() +
    getRandomNumber() +
    getRandomNumber();
  return parseInt(str);
};

const updateUserDataInFirestore = async (user: any) => {
  try {
    const users = await db
      .collection("users")
      .where("ids", "array-contains", user.id)
      .get();

    let userId = [];

    users.forEach((doc) => {
      userId.push(doc.id);
    });

    await Promise.all(
      userId.map(async (x) => {
        db.collection("users")
          .doc(x)
          .update({
            [`${user.id}.profile_url`]: user.image,
            [`${user.id}.name`]: user.name,
          });
      })
    );
  } catch (error) {
    console.log(error.message);
  }
};

// const addNotification = (
//   n_by: string,
//   n_to: string,
//   msg: string,
//   msg_ko: string,
//   seen: boolean,
//   itinerary_id: string,
//   hosting_id: string,
//   type: NotificationType
// ) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       const ref = db.collection("notification");

//       const data = {
//         sendBy: n_by,
//         reciever: n_to,
//         msg,
//         msg_ko,
//         seen,
//         itinerary_id,
//         hosting_id,
//         type,
//         timestamp: firebase.firestore.FieldValue.serverTimestamp(),
//       };
//       const notify = await ref.add(data);
//       if (notify) {
//         resolve(notify);
//       }
//       reject("Data not added");
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

const writeFile = (headers, data, name) => {
  let ws = XLSX.utils.json_to_sheet(data, { header: headers });
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SheetJS");
  let exportFileName = `files/${name}.xls`;
  XLSX.writeFile(wb, exportFileName);
};

const deleteFile = (path) => {
  fs.unlink(path, function (err) {
    if (err) throw err;
  });
};

const deleteAllFileOfFolder = async (directory) => {
  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), (err) => {
        if (err) throw err;
      });
    }
  });
};

export {
  generateRandomNumber,
  updateUserDataInFirestore,
  writeFile,
  deleteAllFileOfFolder,
  deleteFile,
  // addNotification,
};
