import * as functions from "firebase-functions";
import * as express from "express";
import "dotenv/config";
import * as admin from "firebase-admin";
import * as cors from "cors";

admin.initializeApp();

const db = admin.database();

const app = express();
app.use(express.json());
app.use(cors({origin: true}));


app.get("/", async (req, res) => {
  const books = (await db.ref("books").once("value")).val();
  res.json(books || {});
});

app.post("/", async (req, res) => {
  const book = req.body;
  const bookId = await db.ref("books").push(book);
  const bookObj = await db.ref("books").child(bookId.key!).once("value");
  res.json({
    id: bookId.key,
    value: bookObj,
  });
});

app.get("/:id", async (req, res) => {
  const {id} = req.params;
  const book = await db.ref("books").child(id).once("value");
  if (!book.val()) {
    res.status(404).end();
  }
  res.json(book);
});


app.delete("/:id", async (req, res) => {
  const {id} = req.params;
  await db.ref("books").child(id).remove();
  res.json("ok");
});

app.put("/:id", async (req, res) => {
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


exports.crud = functions.https.onRequest(app);

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
