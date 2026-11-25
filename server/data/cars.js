// Seed inventory. Images are real photographs from Wikimedia Commons
// (see public/images/cars/credits.json for authors & licenses).
const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const seed = [
  { manufacturer: 'Porsche', model: '911 Carrera', year: 2024, price: 124900, mileage: 3900, body_type: 'Coupe', fuel: 'Petrol', transmission: 'Automatic', color: 'Carrara White', state: 'used', engine: '3.0L twin-turbo flat-six', horsepower: 379, image: 'porsche-911', featured: true,
    description: 'Practically new 911 with the Sport Chrono package, red calipers and a spotless service record. The everyday supercar, ready for your favourite road.' },
  { manufacturer: 'Tesla', model: 'Model 3 Long Range', year: 2024, price: 38990, mileage: 6200, body_type: 'Sedan', fuel: 'Electric', transmission: 'Automatic', color: 'Pearl White', state: 'used', engine: 'Dual-motor AWD', horsepower: 394, image: 'tesla-model-3', featured: true,
    description: 'The refreshed "Highland" Model 3 with ventilated seats, ambient lighting and up to 341 miles of range. Battery health certified at 99%.' },
  { manufacturer: 'Range Rover', model: 'Sport P400 Dynamic SE', year: 2023, price: 89500, mileage: 12600, body_type: 'SUV', fuel: 'Hybrid', transmission: 'Automatic', color: 'Fuji White', state: 'used', engine: '3.0L inline-six mild hybrid', horsepower: 395, image: 'range-rover-sport', featured: true,
    description: 'Refined, quiet and seriously capable. Panoramic roof, Meridian sound and adaptive air suspension. One owner, full dealer history.' },
  { manufacturer: 'BMW', model: 'M340i xDrive', year: 2021, price: 46500, mileage: 22800, body_type: 'Sedan', fuel: 'Petrol', transmission: 'Automatic', color: 'Black Sapphire', state: 'used', engine: '3.0L turbo inline-six', horsepower: 382, image: 'bmw-3-series', featured: true,
    description: 'The sweet spot of the 3 Series range. M Sport brakes, adaptive suspension and the silky B58 straight-six. Non-smoker, garage kept.' },
  { manufacturer: 'Toyota', model: 'Camry XSE', year: 2023, price: 29900, mileage: 18400, body_type: 'Sedan', fuel: 'Petrol', transmission: 'Automatic', color: 'Celestial Silver', state: 'used', engine: '2.5L inline-four', horsepower: 206, image: 'toyota-camry',
    description: 'Comfortable, efficient and famously reliable. Sport-tuned suspension, heated leather seats and Toyota Safety Sense 2.5+.' },
  { manufacturer: 'Honda', model: 'Civic LX', year: 2022, price: 23500, mileage: 24100, body_type: 'Sedan', fuel: 'Petrol', transmission: 'Automatic', color: 'Rallye Red', state: 'used', engine: '2.0L inline-four', horsepower: 158, image: 'honda-civic',
    description: 'The eleventh-generation Civic: clean design, a beautifully finished cabin and 36 mpg on the highway. A perfect first car.' },
  { manufacturer: 'Ford', model: 'F-150 XL SuperCrew', year: 2021, price: 38900, mileage: 41300, body_type: 'Truck', fuel: 'Petrol', transmission: 'Automatic', color: 'Stone Gray', state: 'used', engine: '2.7L EcoBoost V6', horsepower: 325, image: 'ford-f150',
    description: "America's best-selling truck with 4x4, tow package and a 5.5 ft bed. Ready to work hard all week and head out on weekends." },
  { manufacturer: 'Mercedes-Benz', model: 'C 300 AMG Line', year: 2023, price: 44200, mileage: 9800, body_type: 'Sedan', fuel: 'Petrol', transmission: 'Automatic', color: 'Cavansite Blue', state: 'used', engine: '2.0L turbo inline-four', horsepower: 255, image: 'mercedes-c-class',
    description: 'A mini S-Class: 11.9" portrait touchscreen, Burmester audio and a sumptuous interior wrapped in a stunning deep-blue finish.' },
  { manufacturer: 'Audi', model: 'A4 40 TFSI S line', year: 2020, price: 27800, mileage: 33700, body_type: 'Sedan', fuel: 'Petrol', transmission: 'Automatic', color: 'Tango Red', state: 'used', engine: '2.0L turbo inline-four', horsepower: 201, image: 'audi-a4',
    description: 'Sharp S line styling, Virtual Cockpit and quattro confidence in every season. Recently serviced with new tyres all round.' },
  { manufacturer: 'Mazda', model: 'CX-5 2.5 Turbo', year: 2022, price: 26900, mileage: 27400, body_type: 'SUV', fuel: 'Petrol', transmission: 'Automatic', color: 'Machine Gray', state: 'used', engine: '2.5L turbo inline-four', horsepower: 256, image: 'mazda-cx5',
    description: 'Premium feel without the premium price. AWD, Bose audio, head-up display and that signature Machine Gray paint.' },
  { manufacturer: 'Jeep', model: 'Wrangler Rubicon', year: 2021, price: 41700, mileage: 30200, body_type: 'SUV', fuel: 'Petrol', transmission: 'Automatic', color: 'Hydro Blue', state: 'used', engine: '3.6L Pentastar V6', horsepower: 285, image: 'jeep-wrangler',
    description: 'Locking diffs, disconnecting sway bar and 33" all-terrain tyres. Removable roof for open-air adventures. Never off-roaded hard.' },
  { manufacturer: 'Kia', model: 'EV6 GT-Line', year: 2023, price: 39400, mileage: 11500, body_type: 'SUV', fuel: 'Electric', transmission: 'Automatic', color: 'Yacht Blue', state: 'used', engine: 'Dual-motor AWD', horsepower: 320, image: 'kia-ev6',
    description: '800V ultra-fast charging (10-80% in 18 minutes), vehicle-to-load and a futuristic curved display. Electric done brilliantly.' },
  { manufacturer: 'Lexus', model: 'RX 500h F Sport', year: 2024, price: 64900, mileage: 0, body_type: 'SUV', fuel: 'Hybrid', transmission: 'Automatic', color: 'Ultra White', state: 'new', engine: '2.4L turbo hybrid', horsepower: 366, image: 'lexus-rx',
    description: 'Brand-new RX in its most dynamic form. DIRECT4 all-wheel drive, Mark Levinson audio and Lexus\' legendary build quality.' },
];

const cars = seed.map((car, i) => ({
  id: i + 1,
  owner: 1,
  created_on: new Date(now - (i + 1) * 3 * day).toISOString(),
  status: 'available',
  featured: false,
  ...car,
  image: `images/cars/${car.image}.jpg`,
}));

module.exports = cars;
