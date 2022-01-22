import * as functions from "firebase-functions";
import * as express from "express";
import "dotenv/config";
import * as admin from "firebase-admin";
import * as csrf from "csurf";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";

admin.initializeApp();

const csrfMiddleware = csrf({cookie: true});

const db = admin.database();

const app = express();
app.use(bodyParser());
app.use(cookieParser());
app.use(csrfMiddleware);

app.set("views", "./src/views");
app.set("view engine", "ejs");

app.all("*", (req, res, next) => {
  res.cookie("XSRF-TOKEN", req.csrfToken());
  next();
});


// crud for book block

app.get("/api/books", async (req, res) => {
  const books = (await db.ref("books").once("value")).val();
  res.json(books || {});
});

app.post("/api/books", async (req, res) => {
  const book = req.body;
  const bookId = await db.ref("books").push(book);
  const bookObj = await db.ref("books").child(bookId.key!).once("value");
  res.json({
    id: bookId.key,
    value: bookObj,
  });
});

app.get("/api/books/:id", async (req, res) => {
  const {id} = req.params;
  const book = await db.ref("books").child(id).once("value");
  if (!book.val()) {
    res.status(404).end();
  }
  res.json(book);
});


app.delete("/api/books/:id", async (req, res) => {
  const {id} = req.params;
  await db.ref("books").child(id).remove();
  res.json("ok");
});

app.put("/api/books/:id", async (req, res) => {
  const {id} = req.params;
  const book = req.body;
  const bookObj = await db.ref("books").child(id).once("value");
  if (!bookObj.val()) {
    res.status(404);
    res.json("error");
  }

  await db
      .ref("books")
      .child(id)
      .update(book);
  const updatedBook = await db.ref("books").child(id).once("value");
  res.json(updatedBook);
});

// auth block

app.get("/login", function(req, res) {
  res.render("login.ejs", {title: "Авторизация"});
});

app.get("/signup", function(req, res) {
  res.render("signup.ejs", {
    title: "Регистрация",
    csrfToken: req.csrfToken(),
  });
});

app.post("/signup", function(req, res) {
  const {name, email, password} = req.body;
  console.log("req.body", req.body);
  admin.auth().createUser({
    email: email,
    password: password,
    displayName: name,
  })
      .then((userRecord) => {
        console.log("Successfully created new user:", userRecord.uid);
        res.redirect("/login");
      })
      .catch((error) => {
        console.log("Error creating new user:", error);
        res.redirect("/signup");
      });
});


app.post("/sessionLogin", (req, res) => {
  const idToken = req.body.idToken.toString();

  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  admin
      .auth()
      .createSessionCookie(idToken, {expiresIn})
      .then(
          (sessionCookie) => {
            res.cookie("session", sessionCookie);
            res.json({status: "success"});
          },
          (error) => {
            console.error("error", error);
            res.status(401).redirect("/login");
          }
      );
});

app.get("/profile", function(req, res) {
  const sessionCookie = req.cookies.session || "";

  admin
      .auth()
      .verifySessionCookie(sessionCookie)
      .then((userRecord) => {
        res.render("profile.ejs", {
          title: "Профиль",
          userRecord: userRecord,
        });
      })
      .catch((error) => {
        res.redirect("/login");
      });
});

app.get("/", function(req, res) {
  res.render("index.ejs", {title: "Главная"});
});

app.post("/sessionLogin", (req, res) => {
  const idToken = req.body.idToken.toString();
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  admin
      .auth()
      .createSessionCookie(idToken, {expiresIn})
      .then(
          (sessionCookie: any) => {
            res.cookie("session", sessionCookie);
            res.json({status: "success"});
          },
          (error: any) => {
            res.status(401).send("UNAUTHORIZED REQUEST!");
          }
      );
});

app.get("/sessionLogout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/login");
});


exports.app = functions.https.onRequest(app);

exports.moderator = functions.database.ref("/books/{bookId}").onWrite((change) => {
  const book = change.after.val();

  if (!book.description || book.description == "") {
    return change.after.ref.update({
      description: "Скоро здесь будет описание…",
    });
  }
  return null;
});


export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
