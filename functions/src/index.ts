import * as functions from "firebase-functions";
import * as express from "express";
import "dotenv/config";
import * as admin from "firebase-admin";
import {ServiceAccount} from "firebase-admin";

const adminConfig: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};
admin.initializeApp({
  credential: admin.credential.cert(adminConfig),
  databaseURL:
    "https://dem-proj-nestjs-default-rtdb.europe-west1.firebasedatabase.app/",
});

const db = admin.database();

const app = express();

app.get("books/api", async (req, res) => {
  try {
    const books = (await db.ref("books").once("value")).val();
    res.json(books || {});
  } catch (e) {
    console.log(e);
  }
});

app.post("books/api", async (req, res) => {
  const {book} = req.body;
  try {
    const bookId = await db.ref("books").push(book);
    const bookObj = await db.ref("books").child(bookId.key!).once("value");
    res.json({
      id: bookId.key,
      value: bookObj,
    });
  } catch (e) {
    console.error(e);
  }
});

app.get("books/api/:id", async (req, res) => {
  const {id} = req.params;
  try {
    const book = await db.ref("books").child(id).once("value");
    if (!book) {
      res.status(404).end();
    }
    res.json(book);
  } catch (e) {
    console.log(e);
  }
});


app.get("books/api/:id", async (req, res) => {
  const {id} = req.params;
  try {
    await db.ref("books").child(id).remove();
    res.json("ok");
  } catch (e) {
    console.error(e);
  }
});

app.get("books/api/:id", async (req, res) => {
  const {id} = req.params;
  const {book} = req.body;
  try {
    const bookObj = await db.ref("books").child(id).once("value");
    if (!bookObj.val()) {
      res.status(404).end();
    }

    await db
        .ref("books")
        .child(id)
        .update({...book});
    const updatedBook = await db.ref("books").child(id).once("value");
    res.json(updatedBook);
  } catch (e) {
    console.error(e);
  }
});


exports.crud = functions.https.onRequest(app);
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
