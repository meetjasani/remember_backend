import firebase from "firebase";

// const firebaseConfig = {
//   apiKey: "AIzaSyBThcFRv9d2YvXlZhGX9Xpd0I-I6NKVf78",
//   authDomain: "compastrips-185ec.firebaseapp.com",
//   projectId: "compastrips-185ec",
//   storageBucket: "compastrips-185ec.appspot.com",
//   messagingSenderId: "1028300276700",
//   appId: "1:1028300276700:web:caa3a9919e877524fb4519",
// };
const firebaseConfig = {
  apiKey: "AIzaSyDWHVbOfF2R_I1TX8cP6C7oydgDPXF34Ew",
  authDomain: "compastrips.firebaseapp.com",
  projectId: "compastrips",
  storageBucket: "compastrips.appspot.com",
  messagingSenderId: "819037704776",
  appId: "1:819037704776:web:77591a295929bf7220be7d",
};

const firebaseApp = firebase.initializeApp(firebaseConfig);

const db = firebaseApp.firestore();

export { db };
