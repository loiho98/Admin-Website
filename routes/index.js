var express = require("express");
var router = express.Router();
var bodyParser = require("body-parser");
const { ref } = require("firebase-functions/lib/providers/database");
const { user } = require("firebase-functions/lib/providers/auth");
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const json2xls = require('json2xls');
router.use(json2xls.middleware);

////Authentication
router.post("/submit-signin", urlencodedParser, (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var Firebase = require("../public/firebase/Firebase");
  Firebase.auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      res.redirect('/preview')
    })
    .catch(function (error) {
      res.render('signin', { error: error.message })
    });
});
router.get("/", (req, res) => {
  res.render("signin");
})
router.get("/signin-to-another-account", (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.auth().signOut().then(() => res.redirect('/'))
});
router.get("/forgot_password", (req, res) => {
  res.render('error', { error: 'Please contact your administrator to recieve new password.' })
});
router.get("/signup", (req, res) => {
  res.render('signup')
});
router.post('/submit-signup', urlencodedParser, (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var confirm = req.body.confirm;
  var name = req.body.name;
  var Firebase = require("../public/firebase/Firebase");
  if (password != confirm) { res.render('signup', { error: 'Password not match.' }) }
  Firebase.auth().createUserWithEmailAndPassword(email, password).then(() => {
    res.redirect('/')
  }).catch((err) => {
    res.render('signup', { error: err })
  })
})
router.get("/profile", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      res.render("profile", { email: Firebase.auth().currentUser.email, role: Object.keys(currentCustomClaims) })
    })
    .catch((error) => {
      console.log(error);
    });
});

////////Preview
router.get("/preview", (req, res, next) => {
  var Firebase = require("../public/firebase/Firebase");
  const ref = Firebase.database().ref()
  const product = ref.child('product')
  const category = ref.child('category')
  var listProduct = []
  var listType = []
  var name = ''
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor'] && !currentCustomClaims['consultant']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
      else {
        product.once('value', function (snap) {
          snap.forEach((item) => {
            var i = item.val()
            i.key = item.key
            listProduct.push(i)
          })
          res.render('preview', { product: listProduct })
        })
      }
    })
    .catch((error) => {
      console.log(error);
    });

});
////Categories
router.get("/category", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
      else {
        Firebase.database().ref('/category/').once('value').then(snapshot => {
          var category = []
          snapshot.forEach(item => {
            var i = item.val()
            i.key = item.key
            category.push(i)
          })
          res.render('category', { category: category })
        })
      }
    })
    .catch((error) => {
      console.log(error);
    });

});
router.post("/addcategory", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/category/').push().set({
    image: req.body.add_image,
    name: req.body.add_name
  })
  res.redirect('/category')
});
router.post("/removecategory", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/category/' + req.body.remove_key).remove()
  res.redirect('/category')
});
router.post("/updatecategory", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/category/' + req.body.update_key).update({
    image: req.body.update_image,
    name: req.body.update_name
  })
  res.redirect('/category')
});


///////Product

router.get("/product", (req, res) => {
  var product = [], category = [], size = [], supplier = []
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
      else {
        if (req.query.key) {
          getSizeList().then(() => getSupplier()).then(() => getCategory()).then(() => getProductWithKey()).then(() => res.render("product", { product: product, category: category, supplier: supplier, size: size }))
        }
        else {
          getSizeList().then(() => getSupplier()).then(() => getCategory()).then(() => getProduct()).then(() => res.render("product", { product: product, category: category, supplier: supplier, size: size }))
        }

      }
    })
    .catch((error) => {
      console.log(error);
    });
  async function getSizeList() {
    await Firebase.database().ref("/size/").once("value", snap => {
      snap.forEach(item => {
        size.push(item.val())
      })
    })
  }
  async function getSupplier() {
    await Firebase.database().ref("/supplier/").once("value", snap => {
      snap.forEach(item => {
        supplier.push(item.val().name)
      })
    })
  }
  async function getCategory() {
    await Firebase.database().ref("/category/").once("value", snap => {
      snap.forEach(item => {
        category.push(item.val().name)
      })
    })
  }
  async function getProduct() {
    await Firebase.database()
      .ref("/product/")
      .once("value")
      .then((snapshot) => {
        snapshot.forEach(element => {
          var i = element.val()
          i.key = element.key
          product.push(i)
        })
      })
  }
  async function getProductWithKey() {
    await Firebase.database()
      .ref("/product/" + req.query.key)
      .once("value")
      .then((snap) => {
        var i = snap.val()
        i.key = snap.key
        product.push(i)
      })
  }

})

router.post("/removeproduct", urlencodedParser, (req, res, next) => {
  let product = []
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database()
    .ref("/product/" + req.body.remove_id)
    .remove()
  res.redirect('/product')
});
router.get("/addproductpage", (req, res) => {
  var product = [], category = [], size = "", supplier = []
  var Firebase = require("../public/firebase/Firebase");
  async function getSizeList() {
    await Firebase.database().ref("/size/").once("value", snap => {
      snap.forEach(item => {
        size = size + item.val().name + ","
      })
    })
  }
  async function getSupplier() {
    await Firebase.database().ref("/supplier/").once("value", snap => {
      snap.forEach(item => {
        supplier.push(item.val().name)
      })
    })
  }
  async function getCategory() {
    await Firebase.database().ref("/category/").once("value", snap => {
      snap.forEach(item => {
        category.push(item.val().name)
      })
    })
  }
  getSizeList().then(() => getSupplier()).then(() => getCategory()).then(() => res.render("addProduct", { supplier: supplier, size: size, category: category }))
})
router.get("/updateproductpage", (req, res) => {
  var product = {}, category = [], size = "", supplier = []
  var Firebase = require("../public/firebase/Firebase");
  var key = req.query.key
  async function getSupplier() {
    await Firebase.database().ref("/supplier/").once("value", snap => {
      snap.forEach(item => {
        supplier.push(item.val().name)
      })
    })
  }
  async function getCategory() {
    await Firebase.database().ref("/category/").once("value", snap => {
      snap.forEach(item => {
        category.push(item.val().name)
      })
    })
  }
  async function getProduct() {
    await Firebase.database().ref("/product/" + key).once("value", snap => {
      product = snap.val()
      product.key = key
    })
  }
  getSupplier().then(() => getCategory()).then(() => getProduct()).then(() => res.render("updateProduct", { supplier: supplier, product: product, category: category }))
})
router.post("/addproduct", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var maxIndex = 0
  var moment = require('moment');
  var add_time = moment().format('llll').toString()
  async function getMaxIndex() {
    await Firebase.database().ref("/product/").limitToLast(1).once("value", snap => {
      snap.forEach(item => {
        maxIndex = Number(item.key) + 1
      })
    })
  }
  getMaxIndex().then(() => {
    Firebase.database().ref('/product/' + maxIndex).update({
      add: add_time,
      name: req.body.name,
      category: req.body.category,
      material: req.body.material,
      description: req.body.description,
      supplier: req.body.supplier,
      variant: JSON.parse(req.body.variant),
      image: JSON.parse(req.body.image),
      color: JSON.parse(req.body.color),
      size: JSON.parse(req.body.size),
      view: 0,
      discount: req.body.discount,
      original_price: req.body.price,
      price: Math.ceil(req.body.price - (req.body.discount * req.body.price / 100)),
      rating: {
        count: 0,
        value: 0
      },
      comment: 0,
    })
    res.redirect("/product")
  })

});
router.post("/updateproduct", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var maxIndex = 0
  var moment = require('moment');
  var add_time = moment().format('llll').toString()
  Firebase.database().ref('/product/' + req.body.key).update({
    add: add_time,
    name: req.body.name,
    category: req.body.category,
    material: req.body.material,
    description: req.body.description,
    supplier: req.body.supplier,
    variant: JSON.parse(req.body.variant),
    image: JSON.parse(req.body.image),
    color: JSON.parse(req.body.color),
    size: JSON.parse(req.body.size),
    view: 0,
    discount: req.body.discount,
    original_price: req.body.price,
    price: Math.ceil(req.body.price - (req.body.discount * req.body.price / 100)),
    rating: {
      count: 0,
      value: 0
    },
    comment: 0,
  })
  res.redirect("/product")
});
///quantity
router.get("/quantity", (req, res, next) => {
  var product = [], size = []
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
    })
    .catch((error) => {
      console.log(error);
    });
  async function getSizeList() {
    await Firebase.database().ref("/size/").once("value", snap => {
      snap.forEach(item => {
        size.push(item.val())
      })
    })
  }
  async function getProduct() {
    await Firebase.database()
      .ref("/product/")
      .orderByChild("add")
      .once("value")
      .then((snapshot) => {
        snapshot.forEach(element => {
          var i = element.val()
          i.key = element.key
          product.push(i)
        })
      })
  }
  getSizeList().then(() => getProduct()).then(() => res.render("quantity", { product: product.reverse(), size: size }))
})

router.post("/updatequantity", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var size = req.body.update_size
  var obj = new Object()
  obj[size] = Number(req.body.update_quantity)
  Firebase.database().ref('/product/' + req.body.update_key + '/quantity/').update(obj)
  res.redirect('/quantity')
})
////Size
router.get("/size", urlencodedParser, (req, res) => {
  const key = req.query.key
  var Firebase = require("../public/firebase/Firebase");
  var size = []
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
    })
    .catch((error) => {
      console.log(error);
    });
  Firebase.database().ref('/size/').once('value').then(snapshot => {
    snapshot.forEach(item => {
      var i = item.val()
      i.key = item.key
      size.push(i)
    })
    res.render('size', { size: size })
  })
});
router.post("/updatesize", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/size/' + req.body.update_key).update({
    name: req.body.update_name,
    detail: req.body.update_detail,
  })
  res.redirect('/size')
})
router.post("/addsize", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/size/').push().update({
    name: req.body.add_name,
    detail: req.body.add_detail
  })
  res.redirect('/size')
})
router.post("/removesize", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/size/' + req.body.remove_key).remove()
  res.redirect('/size')
})
////Comment
router.get("/comments", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var comments = []
  if (req.query.key) {
    const key = req.query.key
    Firebase.database().ref('/review/' + key + '/').once('value').then(snapshot => {
      snapshot.forEach((user) => {
        var u = user.val()
        u.uid = user.key
        u.pid = key
        comments.push(u)
      })
      res.render('comment', { comment: comments, key: key })
    })
  }
  else {
    Firebase.database().ref('/review/').once('value').then(snapshot => {
      snapshot.forEach((p) => {
        comments.push(p.val().comment)
      })
      res.render('comment', { comment: comments, key: "All Comments" })
    })
  }
});
router.post("/reply", urlencodedParser, (req, res) => {
  // res.send(req.body)
  var Firebase = require("../public/firebase/Firebase");
  var moment = require('moment'); // require
  var time = moment().format('llll').toString()
  Firebase.database().ref('/review/' + req.body.reply_pid + '/' + req.body.reply_uid + '/comment').update({
    reply: req.body.reply_content,
    reply_time: time
  })
  res.redirect("/comments?key=" + req.body.reply_pid)
})
////////Miscellaneous
router.get('/changeall', urlencodedParser, (req, res) => {
  var moment = require('moment'); // require
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/product/').once('value', snapshot => {
    snapshot.forEach(item => {
      Firebase.database().ref('/product/' + item.key).update({
        // add: moment().format('llll').toString(),
        // quantity: null,
        // image:{
        //   0:item.val().link1,
        //   1:item.val().link2,
        // } ,
        // color:[
        //   {
        //     name: item.val().color,
        //     image:item.val().link1
        //   }
        // ]
        // ,
        // bid_price:null,
        // size:[
        //   {name:"S"},
        //   {name:"M"},
        //   {name:"L"},
        // ],
        // coupon:null,
        // original_price:item.val().price,
        variant: [
          {
            name: item.val().color + "/S",
            quantity: 100,
            sku: item.val().category.slice(0, 2).toUpperCase() + item.val().supplier.slice(0, 2).toUpperCase() +
              item.val().color.slice(0, 2).toUpperCase() + item.key + "01"
          },
          {
            name: item.val().color + "/M",
            quantity: 100,
            sku: item.val().category.slice(0, 2).toUpperCase() + item.val().supplier.slice(0, 2).toUpperCase() +
              item.val().color.slice(0, 2).toUpperCase() + item.key + "02"
          },
          {
            name: item.val().color + "/L",
            quantity: 100,
            sku: item.val().category.slice(0, 2).toUpperCase() + item.val().supplier.slice(0, 2).toUpperCase() +
              item.val().color.slice(0, 2).toUpperCase() + item.key + "03"
          },
        ]
      })
    })
  }).catch(err => console.log(err))
})

router.get('/chart', urlencodedParser, (req, res) => {
  var moment = require('moment'); // require
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/product/').once('value', snapshot => {
    snapshot.forEach(item => {
      if (item.key % 3 == 0) {
        Firebase.database().ref('/product/' + item.key).update({
          provider: null,
          supplier: "Mercy Fashion"
        })
      }
      if (item.key % 3 == 1) {
        Firebase.database().ref('/product/' + item.key).update({
          provider: null,
          supplier: "Linda Fashion"
        })
      }
      if (item.key % 3 == 2) {
        Firebase.database().ref('/product/' + item.key).update({
          provider: null,
          supplier: "ANN"
        })
      }
    });
  })
})
router.get('/admin', urlencodedParser, (req, res) => {
  var moment = require('moment'); // require
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/product/').once('value', snapshot => {
    snapshot.forEach(item => {
      let key = item.key
      item.val().variant.forEach(i => {
        Firebase.database().ref('/product/' + key + "/variant/0").update({ quantity: 100 })
      })
    });
  })
})

///Group

router.get('/group', urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var group = []
  //   var obj = {};
  //   obj[key] = "admin";
  //   Firebase.database().ref("/group/").update(obj)
  // })

})

///User
router.get('/user', urlencodedParser, (req, res) => {
  var admin = require('../public/firebase/FirebaseAdmin')
  var Firebase = require("../public/firebase/Firebase");
  var group = [], user = [], list = []
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin']) {
        res.render("error", { error: 'Permission Denied!' })
      }
      else {
        admin.auth().listUsers()
          .then(function (listUsersResult) {
            res.render("user", { user: listUsersResult.users })
          })
          .catch(function (error) {
            console.log('Error listing users:', error);
          });
      }
    })
    .catch((error) => {
      console.log(error);
    });

})
router.post('/updateuser', urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  var uid = req.body.update_uid
  var email = req.body.update_email
  var password = req.body.update_password
  var name = req.body.update_name
  var role = req.body.update_role
  var oldRole = req.body.update_oldRole
  admin.auth().updateUser(uid, {
    displayName: name,
    email: email
  })
    .then(function (userRecord) {
      console.log('Successfully updated user', userRecord.toJSON());
    })
    .catch(function (error) {
      console.log('Error updating user:', error);
    });
  admin.auth().updateUser(uid, {
    password: password,
  })
    .then(function (userRecord) {
      console.log('Successfully updated user', userRecord.toJSON());
    })
    .catch(function (error) {
      console.log('Error updating user:', error);
    });
  var o = new Object()
  o[role] = true
  admin.auth().setCustomUserClaims(uid, o);
  res.redirect('/user')
})
router.post('/removeuser', urlencodedParser, (req, res) => {
  var admin = require('../public/firebase/FirebaseAdmin')
  var Firebase = require("../public/firebase/Firebase");
  var uid = req.body.remove_key
  admin.auth().deleteUser(uid)
    .then(function () {
      console.log('Successfully deleted user');
    })
    .catch(function (error) {
      // console.log('Error deleting user:', error);
      res.send(error + uid)
    });
  res.redirect('/user')
})

router.post('/adduser', urlencodedParser, (req, res) => {
  var admin = require('../public/firebase/FirebaseAdmin')
  var name = req.body.add_name
  var email = req.body.add_email
  var password = req.body.add_password
  admin.auth().createUser({
    email: email,
    password: password,
    displayName: name,
  })
    .then(function (userRecord) {
      console.log('Successfully created new user:', userRecord.uid);
    })
    .catch(function (error) {
      console.log('Error creating new user:', error);
    })
})
///////////////Chat
router.get('/message', urlencodedParser, (req, res) => {
  var chat = []
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor'] && !currentCustomClaims['consultant']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
      else {
        Firebase.database().ref('/chat/').orderByKey().once("value", (snapshot) => {
          snapshot.forEach((item) => {
            chat.push({ key: item.key, message: Object.values(item.val()).pop() })
          })
          res.render('message', { chat: chat })
        })
      }
    })
    .catch((error) => {
      console.log(error);
    });

})
router.get('/enterchatroom', urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var obj = new Object()
  var key = req.query.key
  Firebase.database().ref('/chat/' + key).once("value", snap => {
    snap.forEach(item => {
      if (item.val().name != "Victoria Store") {
        Firebase.database().ref('/chat/' + key + "/" + item.key).update({ seen: true })
      }
    })
  })
  res.render("chatRoom", { key: key })
})
router.get('/sendmessage', urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor'] && !currentCustomClaims['consultant']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
      else {
        admin.auth().listUsers()
          .then(function (listUsersResult) {
            res.render("sendMessage", { user: listUsersResult.users })
          })
          .catch(function (error) {
            console.log('Error listing users:', error);
          });
      }
    })
    .catch((error) => {
      console.log(error);
    });

})

///supplier
router.get('/supplier', urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
      else {
        if (req.query.key) {
          Firebase.database().ref('/supplier/').orderByChild("name").equalTo(req.query.key + "").once("value", snap => {
            var supplier = []
            snap.forEach(item => {
              var i = item.val()
              i.key = item.key
              supplier.push(i)
            })
            res.render("supplier", { supplier: supplier })
          })
        } else {
          Firebase.database().ref('/supplier/').once("value", snap => {
            var supplier = []
            snap.forEach(item => {
              var i = item.val()
              i.key = item.key
              supplier.push(i)
            })
            res.render("supplier", { supplier: supplier })
          })
        }
      }
    })
    .catch((error) => {
      console.log(error);
    });


})
router.post("/addsupplier", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/supplier/').push().set({
    name: req.body.name,
    phone: req.body.phone,
    address: req.body.address,
    email: req.body.email,
  })
  res.redirect('/supplier')
});
router.post("/removesupplier", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/supplier/' + req.body.key).remove()
  res.redirect('/supplier')
});
router.post("/updatesupplier", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref('/supplier/' + req.body.update_key).update({
    name: req.body.name,
    phone: req.body.phone,
    address: req.body.address,
    email: req.body.email
  })
  res.redirect('/supplier')
});
//////Order
router.get("/order", urlencodedParser, (req, res) => {
  var admin = require('../public/firebase/FirebaseAdmin')
  let Firebase = require("../public/firebase/Firebase");
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
      else {
        var order = []
        Firebase.database().ref("/order/").orderByKey().once("value", snap => {
          snap.forEach(item => {
            var i = item.val()
            i.key = item.key
            order.push(i)
          })
          res.render("order", { order: order.reverse() })
        })
      }
    })
    .catch((error) => {
      console.log(error);
    });

})
router.get("/orderdetail", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var key = req.query.key
  Firebase.database().ref('/order/' + key).once("value", snap => {
    res.render("orderDetail", { order: snap.val(), key: snap.key })
  })
})
router.post('/updateorder', urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  Firebase.database().ref("/order/" + req.body.update_key).update({
    status: req.body.update_status,
  })
  Firebase.database().ref("/order/" + req.body.update_key + "/transaction").update({
    status: req.body.update_paid,
  })
  res.redirect('/order')
})
/////Revenue
router.get("/report", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var admin = require('../public/firebase/FirebaseAdmin')
  admin
    .auth()
    .getUserByEmail(Firebase.auth().currentUser.email)
    .then((user) => {
      const currentCustomClaims = user.customClaims;
      if (!currentCustomClaims['admin'] && !currentCustomClaims['editor']) {
        return res.render("error", { error: 'Permission Denied!' })
      }
      else {
        res.render("report")
      }
    })
    .catch((error) => {
      console.log(error);
    });

});
router.post("/reportbyproduct", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var report = [], order = [], list = []
  var moment = require("moment")
  var time = moment()
  var startDate = req.body.start
  var endDate = req.body.end
  Firebase.database().ref("/order/").once("value").then(snap => {
    var uid = snap.uid
    snap.forEach(item => {
      if (moment(item.val().order_time).subtract(1, 'day').isAfter(startDate) && moment(endDate).add(1, 'day').isAfter(item.val().order_time)) {
        Array.prototype.push.apply(order, Object.values(item.val().cart));
      }
    })
    order.forEach(item => {
      var index = list.findIndex(e => e.key == item.key)
      if (index == -1) {
        list.push(item)
      }
      else {
        list[index].buy_quantity += item.buy_quantity
      }
    })
    if (req.body.action == "export") {
      var ex = []
      list.forEach(item => {
        ex.push({ "Key": item.key, "Name": item.name, "Quantity": item.buy_quantity, "Sales": item.buy_quantity * item.original_price, "Discount": item.buy_quantity * Math.round(item.discount * item.price / 100), "Net sales": item.buy_quantity * item.price, "Total": item.buy_quantity * item.original_price + 10, "Recieved": item.buy_quantity * item.original_price + 10 })
      });
      res.xls("product_report_" + time + ".xlsx", ex)
    }
    res.render("reportByProduct", { report: list, start: startDate, end: endDate })
  })
});
router.post("/reportbycustomer", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var report = [], order = [], list = []
  var moment = require("moment")
  var time = moment()
  var startDate = req.body.start
  var endDate = req.body.end
  Firebase.database().ref("/order/").once("value").then(snap => {
    snap.forEach(item => {
      if (moment(item.val().order_time).subtract(1, 'day').isAfter(startDate) && moment(endDate).add(1, 'day').isAfter(item.val().order_time)) {
        var i = item.val()
        var discount = 0
        item.val().cart.forEach(e => {
          discount += Math.round(e.discount * e.price / 100)
        })
        i.discount = discount
        order.push(i)
      }
    })
    order.forEach(item => {
      var index = list.findIndex(e => e.uid == item.uid)
      if (index == -1) {
        list.push(item)
      }
      else {
        list[index].amount += item.amount
        list[index].discount += item.discount
      }
    })
    if (req.body.action == "export") {
      var ex = []
      list.forEach(item => {
        ex.push({ "UID": item.uid, name: item.name, "Sales": item.amount + item.discount, "Discount": item.discount, "Net sales": item.amount, "Total": item.amount + 10, "Received": item.amount + 10 })
      });
      res.xls("customer_report_" + time + ".xlsx", ex)
    }
  }).then(() => res.render("reportByCustomer", { report: list, start: startDate, end: endDate }))
});
router.post("/reportbycategory", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var report = [], order = [], list = []
  var moment = require("moment")
  var time = moment()
  var startDate = req.body.start
  var endDate = req.body.end
  Firebase.database().ref("/order/").once("value").then(snap => {
    snap.forEach(item => {
      if (moment(item.val().order_time).subtract(1, 'day').isAfter(startDate) && moment(endDate).add(1, 'day').isAfter(item.val().order_time)) {
        Array.prototype.push.apply(order, Object.values(item.val().cart));
      }
    })
    order.forEach(item => {
      var index = list.findIndex(e => e.name == item.category)
      if (index == -1) {
        list.push({ name: item.category, buy_quantiy: item.buy_quantity, discount: Math.round(item.discount * item.price / 100), sales: item.buy_quantity * item.original_price, net_sales: item.buy_quantity * item.price })
      }
      else {
        list[index].buy_quantity += item.buy_quantity
        list[index].discount += Math.round(item.discount * item.price / 100)
        list[index].sales += item.buy_quantity * item.original_price
        list[index].net_sales += item.buy_quantity * item.price
      }
    })
    if (req.body.action == "export") {
      var ex = []
      list.forEach(item => {
        ex.push({ "Name": item.category, "Sales": item.sales, "Discount": item.discount, "Net sales": item.net_sales, "Total": item.net_sales + 10, "Received": item.net_sales + 10 })
      });
      res.xls("product_report_" + time + ".xlsx", ex)
    }
    res.render("reportByCategory", { report: list, start: startDate, end: endDate })
  })
});
router.post("/reportbysupplier", urlencodedParser, (req, res) => {
  var Firebase = require("../public/firebase/Firebase");
  var report = [], order = [], list = []
  var moment = require("moment")
  var time = moment()
  var startDate = req.body.start
  var endDate = req.body.end
  Firebase.database().ref("/order/").once("value").then(snap => {
    snap.forEach(item => {
      if (moment(item.val().order_time).subtract(1, 'day').isAfter(startDate) && moment(endDate).add(1, 'day').isAfter(item.val().order_time)) {
        Array.prototype.push.apply(order, Object.values(item.val().cart));
      }
    })
    order.forEach(item => {
      var index = list.findIndex(e => e.name == item.supplier)
      if (index == -1) {
        list.push({ name: item.supplier, buy_quantiy: item.buy_quantity, discount: Math.round(item.discount * item.price / 100), sales: item.buy_quantity * item.original_price, net_sales: item.buy_quantity * item.price })
      }
      else {
        list[index].buy_quantity += item.buy_quantity
        list[index].discount += Math.round(item.discount * item.price / 100)
        list[index].sales += item.buy_quantity * item.original_price
        list[index].net_sales += item.buy_quantity * item.price
      }
    })
    if (req.body.action == "export") {
      var ex = []
      list.forEach(item => {
        ex.push({ "Name": item.category, "Sales": item.sales, "Discount": item.discount, "Net sales": item.net_sales, "Total": item.net_sales + 10, "Received": item.net_sales + 10 })
      });
      res.xls("product_report_" + time + ".xlsx", ex)
    }
    res.render("reportBySupplier", { report: list, start: startDate, end: endDate })
  })
  });
  module.exports = router;
