# AutoMart

A car marketplace with a clean grey and white UI, a **real-time 3D showroom** built with three.js, and an **Express REST API** with JWT authentication.

![AutoMart hero](public/images/cars/porsche-911.jpg)

## Highlights

- **3D hero.** A WebGL car drives onto a glowing podium, turns slowly like a showroom turntable, and follows the cursor and the page scroll. Visitors can repaint it live.
- **Interactive 3D showroom.** Orbit controls, seven paint finishes, Front/Side/Rear/Top camera presets, zoom, and a *drive mode* with spinning wheels and a moving road.
- **Real car photography.** Thirteen real photos from Wikimedia Commons, credited on the About page.
- **Inventory.** Filter by make, body type, fuel and condition, set a price limit, search, sort, and save favourites. Filters are stored in the URL, so a filtered view can be shared.
- **Car detail modal.** Specs, a finance estimate, *Make an offer* (creates an order through the API), and *Book a test drive* (pre-fills the contact form).
- **Finance calculator.** Animated monthly payment, with a link to cars within budget.
- **Auth.** Sign up and sign in modal backed by JWT. The nav shows the signed-in user.
- **Motion.** Scroll reveals, 3D card tilt, animated counters, a marquee and an animated background. The site respects `prefers-reduced-motion`.
- **Runs without the API.** On static hosting (GitHub Pages, Netlify), the front end falls back to bundled data and `localStorage`, so the demo still works.

## Tech

| Layer | Stack |
| --- | --- |
| Front end | Vanilla HTML/CSS/ES modules, three.js r160 (vendored), Manrope + Instrument Serif |
| Back end | Node.js, Express 5, bcryptjs, jsonwebtoken |
| Tests | Mocha, Chai, Supertest |

## Getting started

```bash
npm install
npm start          # http://localhost:5000
npm run dev        # restarts on file changes
npm test           # API test suite
```

Express serves both the API (`/api/v1`) and the site (`public/`).
A demo admin account is seeded: `admin@automart.dev` / `admin1234`.

To deploy only the front end, publish the `public/` folder to any static host.

## Project structure

```
public/                 Front end (static)
  index.html            Home: 3D hero, quick search, showroom, finance calculator
  inventory.html        Filterable inventory and detail modal
  about.html            Story, timeline, team, image credits
  contact.html          Contact form and FAQ
  css/styles.css        Design system
  js/
    car3d.js            three.js hero and showroom scenes
    api.js              API client with static fallback
    main.js             Nav, reveals, counters, tilt, toasts, auth modal
    cards.js            Car cards and detail modal
    home.js | inventory.js | about.js | contact.js
    data.js             Generated from server seed (npm run build:data)
  images/cars/          Photos and credits.json
  models/               glTF car model and shadow texture
  vendor/three/         three.js modules and Draco decoder
server/
  app.js                Express app (API and static files)
  routes/ controllers/ models/ middleware/ data/
test/api.test.js
```

## REST API

Base URL: `/api/v1`. Routes marked 🔒 need an `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/signup` | Create an account (`email, first_name, last_name, password`) |
| POST | `/auth/signin` | Sign in and receive a JWT |
| GET 🔒 | `/auth/me` | Current user |
| GET | `/car` | List cars. Query: `status, state, manufacturer, body_type, fuel, min_price, max_price, q, featured, sort` |
| GET | `/car/:id` | Single car |
| POST 🔒 | `/car` | Post a car ad |
| PATCH 🔒 | `/car/:id/price` | Update the price (owner or admin) |
| PATCH 🔒 | `/car/:id/status` | Mark as sold (owner or admin) |
| DELETE 🔒 | `/car/:id` | Delete an ad (admin only) |
| POST 🔒 | `/order` | Make a purchase offer (`car_id, amount`) |
| GET 🔒 | `/order` | My orders |
| PATCH 🔒 | `/order/:id/price` | Update a pending offer |
| POST | `/contact` | Send a message |

Data is kept in memory and resets on restart. Swapping in a database only touches the files in `server/models`.

## Credits

- **Photos:** Wikimedia Commons contributors, under CC BY / CC BY-SA licences. Author, licence and source for each photo are in [`public/images/cars/credits.json`](public/images/cars/credits.json) and on the About page.
- **3D model:** "Ferrari 458 Italia" by vicent091036 (CC BY 4.0), from the three.js examples.
- **three.js:** MIT licence.

Brand names are used for illustration only. AutoMart is not a real dealership.
