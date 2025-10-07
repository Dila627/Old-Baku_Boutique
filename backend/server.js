import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import crypto from "crypto";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Security
app.use(helmet());
app.use(bodyParser.json({ limit: "100kb" }));
app.use(bodyParser.urlencoded({ extended: false }));

// CORS
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:8000";
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

// Rate limit
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// Static frontend (optional serve)
app.use("/", express.static(path.resolve(__dirname, "..")));

const DATA_DIR = path.resolve(__dirname, "../data");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf-8")); }
function writeJSON(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf-8"); }

function auth(req,res,next){
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({error:"No token"});
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; next();
  }catch(e){ return res.status(401).json({error:"Invalid token"}); }
}

// ---- Auth ----
app.post("/api/auth/login", async (req,res)=>{
  const {email, password} = req.body || {};
  if (email !== process.env.ADMIN_EMAIL) return res.status(401).json({error:"Invalid credentials"});
  const ok = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || "");
  if (!ok) return res.status(401).json({error:"Invalid credentials"});
  const token = jwt.sign({sub: email, role:"owner"}, process.env.JWT_SECRET, {expiresIn:"8h"});
  res.json({token});
});

// ---- Rooms (public GET, private PUT) ----
app.get("/api/rooms", (req,res)=>{
  const rooms = readJSON(ROOMS_FILE);
  res.json(rooms);
});

app.put("/api/rooms/:id", auth, (req,res)=>{
  const id = Number(req.params.id);
  const patch = req.body || {};
  const rooms = readJSON(ROOMS_FILE);
  const idx = rooms.findIndex(r=> Number(r.id) === id);
  if (idx === -1) return res.status(404).json({error:"Not found"});

  if (patch.title?.ru) rooms[idx].title.ru = String(patch.title.ru).slice(0, 120);
  if (patch.description?.ru) rooms[idx].description = {...(rooms[idx].description||{}), ru: String(patch.description.ru).slice(0, 500)};
  if (patch.image) rooms[idx].image = String(patch.image).slice(0, 400);
  if (typeof patch.price === "number" && patch.price >=0) rooms[idx].price = Math.round(patch.price);

  writeJSON(ROOMS_FILE, rooms);
  res.json(rooms[idx]);
});

// ---- Booking + Email ----
function buildTransport(){
  if (process.env.SMTP_HOST){
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return null;
}

app.post("/api/book", async (req,res)=>{
  const {name,email,phone,checkin,checkout,room,guests} = req.body || {};
  if (!name || !email || !checkin || !checkout || !room) return res.status(400).json({error:"Invalid booking"});
  if (new Date(checkout) <= new Date(checkin)) return res.status(400).json({error:"Dates invalid"});

  const booking = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name, email, phone, checkin, checkout, room, guests: Number(guests||1), paid: false
  };

  const bookings = fs.existsSync(BOOKINGS_FILE) ? readJSON(BOOKINGS_FILE) : [];
  bookings.push(booking);
  writeJSON(BOOKINGS_FILE, bookings);

  const transporter = buildTransport();
  if (transporter && process.env.OWNER_NOTIFY_EMAIL){
    try{
      await transporter.sendMail({
        from: `"Old Baku Bookings" <${process.env.SMTP_USER}>`,
        to: process.env.OWNER_NOTIFY_EMAIL,
        subject: "Новая бронь на сайте",
        text: `Гость: ${name}\nEmail: ${email}\nТелефон: ${phone}\nЗаезд: ${checkin}\nОтъезд: ${checkout}\nНомер: ${room}\nГостей: ${guests}`
      });
    }catch(e){
      console.error("Email error:", e.message);
    }
  }

  res.json({ok:true, bookingId: booking.id});
});

// ---- Payments (Stripe Checkout) ----
app.post("/api/create-checkout-session", async (req,res)=>{
  if (!stripe) return res.status(500).json({error:"Stripe not configured"});
  const {roomId, nights=1, email} = req.body || {};
  const rooms = readJSON(ROOMS_FILE);
  const room = rooms.find(r=> Number(r.id) === Number(roomId));
  if (!room || !room.price) return res.status(400).json({error:"Room/price missing"});

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [{
      price_data: {
        currency: "azn",
        product_data: { name: `Бронирование номера #${roomId}` },
        unit_amount: room.price * 100
      },
      quantity: Number(nights)||1
    }],
    success_url: CLIENT_ORIGIN + "/booking_contacts.html?status=success",
    cancel_url: CLIENT_ORIGIN + "/booking_contacts.html?status=cancel"
  });

  res.json({url: session.url});
});

// ---- Stripe webhook (mark paid) ----
app.post("/webhook/stripe", bodyParser.raw({type: "application/json"}), (req,res)=>{
  const sig = req.headers["stripe-signature"];
  let event;
  try{
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  }catch (err){
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed"){
    // Here you could update booking as paid using metadata
    console.log("Payment succeeded");
  }
  res.json({received:true});
});

// ---- Start ----
const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log("Backend running on http://localhost:"+PORT));
