var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");
require("firebase/storage");
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
let Firebase;
if (!firebase.apps.length) {
  Firebase = firebase.initializeApp({
    apiKey: "AIzaSyAPwQjNHF1SKjdggxEk_vfQCXdsMxaMlF8",
    authDomain: "shop-35888.firebaseapp.com",
    databaseURL: "https://shop-35888.firebaseio.com",
    projectId: "shop-35888",
    storageBucket: "shop-35888.appspot.com",
    messagingSenderId: "110055469672",
    appId: "1:110055469672:web:2ce0d68b0e0fcaba7581dd",
    measurementId: "G-HFSTJ1NY03",
  });
}
module.exports = Firebase;
