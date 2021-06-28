const ctx = document.getElementById('planets').getContext('2d');
ctx.translate(320, 320);  // Translate to center

const txtDate = document.querySelector('#date');
const earth = document.querySelector("#earth");
//const test = document.querySelector("#test");

// Buttons
const b7 = document.querySelector('#backward-7');
const b6 = document.querySelector('#backward-6');
const b5 = document.querySelector('#backward-5');
const b4 = document.querySelector('#backward-4');
const B0 = document.querySelector('#real-time');
const B4 = document.querySelector('#forward-4');
const B5 = document.querySelector('#forward-5');
const B6 = document.querySelector('#forward-6');
const B7 = document.querySelector('#forward-7');
const BNow = document.querySelector('#jump-now');

// Planets
const plColors = {
  'sun': '#ffd400',
  'moon': '#f7f7f7',

  'mercury': '#7f7f7f',
  'venus': '#afafaf',
  'mars': '#893400',
  'jupiter': '#89632a',
  'saturn': '#56451a',
  'uranus': '#5580aa',
  'neptune': '#366896',

  'vesta': '#404040',
  'iris': '#404040',
  'ceres': '#404040',
  'pallas': '#404040'
};

let indexDB;
function loadIndexDB() {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'data/full/index.json', true);
  xhr.responseType = 'json';
  xhr.onload = function (e) {
    if (this.status == 200) {
      indexDB = this.response;
    }
  };
  xhr.send();
}
loadIndexDB();

function date2YMD(date) {
  let d = new Date(date);
  return d.getUTCFullYear().toString().padStart(4, '0')  // year
         + (d.getUTCMonth() + 1).toString().padStart(2, '0')  // month
         + d.getUTCDate().toString().padStart(2, '0');  // day
}

function YMD2Date(ymd) {
  return Date.UTC(parseInt(ymd.slice(0, 4)),  // year
                  parseInt(ymd.slice(4, 6)) - 1,  // month
                  parseInt(ymd.slice(6, 8)));  // day
}

class Database {
  constructor(name, body, load = false) {
    this.name = name;
    this.body = body;
    this.jsonPath = `data/${name}/${body}.json`;

    this.content;
    this.requested = false;
    this.loaded = false;
    if (load) { this.loadData(); }
  }

  get data() {
    if (!this.requested) { this.loadData(); }
    if (!this.loaded) { return; }
    return this.content;
  }

  loadData() {
    if (this.requested) { return; }
    this.requested = true;

    // Get JSON content
    const xhr = new XMLHttpRequest();
    xhr.open('GET', this.jsonPath, true);
    xhr.responseType = 'json';
    let self = this;
    xhr.onload = function (e) {
      if (this.status == 200) {
        self.content = this.response;
        self.loaded = true;
      }
    };
    xhr.send();
  }
}

class Interpolator {
  constructor(body) {
    this.body = body;
    this.DB = {'lite': new Database('lite', body, true)};
    this.loadedDB = false;
    this.current = 'lite';
    this.outOfBounds = false;
    this.waiting = true;

    this.lon1;
    this.lon2;
    this.date1;
    this.date2;
    this.span;
  }

  changeCurrentDatabase(date) {
    if (!this.loadedDB) {
      if (indexDB === undefined) {
        this.current = undefined;
        return;
      } else {
        indexDB[this.body].forEach((name) => { this.DB[name] = new Database(`full/${name}`, this.body, false); })
        this.loadedDB = true;
      }
    }

    let year = (new Date(date)).getUTCFullYear();
    let current;
    if (
      Object.keys(this.DB).some((name) => {
        if (name == 'lite') { return false; }
        current = name;
        let [start, stop] = name.split('-');
        return (parseInt(start) <= year && parseInt(stop) >= year);
      })
    ) {
      this.current = current;
    } else {
      this.current = undefined;
    }
  }

  updateDates(date) {
    this.waiting = !this.DB[this.current].loaded;
    if (this.waiting) {
      this.DB[this.current].loadData();
      return;
    }

    let d;

    this.date1 = undefined;
    for (let days=0; days<60; days++) {
      d = date2YMD(date - days * 86400000);
      if (this.DB[this.current].data.hasOwnProperty(d)) {
        this.lon1 = this.DB[this.current].data[d];
        this.date1 = YMD2Date(d);
        break;
      }
    }

    this.date2 = undefined;
    for (let days=1; days<60; days++) {
      d = date2YMD(date + days * 86400000);
      if (this.DB[this.current].data.hasOwnProperty(d)) {
        this.lon2 = this.DB[this.current].data[d];
        this.date2 = YMD2Date(d);
        break;
      }
    }

    if (this.lon1 - this.lon2 > Math.PI) {
      this.lon2 += 2 * Math.PI;
    } else if (this.lon2 - this.lon1 > Math.PI) {
      this.lon1 += 2 * Math.PI;
    }
    this.span = this.date2 - this.date1;

    this.outOfBounds = (this.date1 === undefined || this.date2 === undefined);
    if (this.outOfBounds) {
      this.changeCurrentDatabase(date);
      return;
    }
  }

  longitude(date) {
    if (this.waiting || this.outOfBounds) {
      this.updateDates(date);
      return;
    } else if (date < this.date1 || date > this.date2) {
      this.updateDates(date);
    }
    let x = (date - this.date1) / this.span;
    return -(this.lon1 * (1 - x) + this.lon2 * x);
  }
}

const sun = new Interpolator('sun');
const moon = new Interpolator('moon');

const mercury = new Interpolator('mercury');
const venus = new Interpolator('venus');
const mars = new Interpolator('mars');
const jupiter = new Interpolator('jupiter');
const saturn = new Interpolator('saturn');
const uranus = new Interpolator('uranus');
const neptune = new Interpolator('neptune');

const vesta = new Interpolator('vesta');
const iris = new Interpolator('iris');
const ceres = new Interpolator('ceres');
const pallas = new Interpolator('pallas');

function drawHand(color, angle) {
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(300 * Math.cos(angle), 300 * Math.sin(angle));
  ctx.stroke();
}

function drawDisk(color, radius, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.fill();
}

function drawEarth(date, sunLongitude) {
  ctx.globalAlpha = 1;

  let d = new Date(date);
  let angle = sunLongitude - Math.PI * (1 + (
                3600 * d.getUTCHours()
                + 60 * d.getUTCMinutes()
                + d.getUTCSeconds()
              ) / 43200);
  ctx.rotate(angle);
  ctx.drawImage(earth, -150, -150, 300, 300);
  ctx.rotate(-angle);
}

let offset = 0;
let speed = 1;
let targetSpeed = 1;
let date;

function updateSpeed() {
  if (Math.abs((targetSpeed - speed) / targetSpeed) < 0.001) {
    speed = targetSpeed;
  } else {
    speed += (targetSpeed - speed) / 5;
  }

  offset = date - speed * Date.now();
}

function setSpeed(x) {
  return () => { targetSpeed = x; };
}

b7.onclick = setSpeed(-10000000);
b6.onclick = setSpeed(-1000000);
b5.onclick = setSpeed(-100000);
b4.onclick = setSpeed(-10000);
B0.onclick = setSpeed(1);
B4.onclick = setSpeed(10000);
B5.onclick = setSpeed(100000);
B6.onclick = setSpeed(1000000);
B7.onclick = setSpeed(10000000);

txtDate.oninput = () => {
  targetSpeed = 1;
  offset = txtDate.valueAsNumber - speed * Date.now();
};
BNow.onclick = () => { offset = Date.now() * (1 - speed); };

function updateClock() {
  date = offset + speed * Date.now();
  updateSpeed();
  txtDate.valueAsNumber = date;

  ctx.clearRect(-320, -320, 640, 640);
  drawDisk('black', 310, alpha=0.6);

  ctx.lineCap = 'round';
  sunLongitude = sun.longitude(date);

  drawHand(plColors.sun, sunLongitude);
  if (Math.abs(speed) < 5000000) {
    drawHand(plColors.moon, moon.longitude(date));
  }

  drawHand(plColors.mercury, mercury.longitude(date));
  drawHand(plColors.venus, venus.longitude(date));
  drawHand(plColors.mars, mars.longitude(date));
  drawHand(plColors.jupiter, jupiter.longitude(date));
  drawHand(plColors.saturn, saturn.longitude(date));
  drawHand(plColors.uranus, neptune.longitude(date));
  drawHand(plColors.neptune, uranus.longitude(date));

  drawHand(plColors.vesta, vesta.longitude(date));
  drawHand(plColors.iris, iris.longitude(date));
  drawHand(plColors.ceres, ceres.longitude(date));
  drawHand(plColors.pallas, pallas.longitude(date));

  drawEarth(date, sunLongitude);
}

updateClock();
setInterval(updateClock, 1000 / 50);
