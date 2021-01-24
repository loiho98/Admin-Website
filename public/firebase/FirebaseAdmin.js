var admin = require("firebase-admin");
var serviceAccount = require("./auth.json");
if (!admin.apps.length) {
  const FirebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://shop-35888.firebaseio.com",
  });
  module.exports = FirebaseAdmin;
}
