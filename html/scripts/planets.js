const ctx = document.getElementById('planets').getContext('2d');
ctx.translate(400, 400);  // Translate to center

const txtDate = document.querySelector('#date');
const earth = document.querySelector("#earth");
// const test = document.querySelector('#test');

const b7 = document.querySelector('#b7');
const b6 = document.querySelector('#b6');
const b5 = document.querySelector('#b5');
const b4 = document.querySelector('#b4');
const B0 = document.querySelector('#B0');
const B4 = document.querySelector('#B4');
const B5 = document.querySelector('#B5');
const B6 = document.querySelector('#B6');
const B7 = document.querySelector('#B7');
const BNow = document.querySelector('#B-now');

const plColors = {
  sun: '#ffd400',
  moon: '#f7f7f7',
  mercury: '#7f7f7f',
  venus: '#afafaf',
  mars: '#893400',
  jupiter: '#89632a',
  saturn: '#56451a',
};

class Database {
  constructor(name, size) {
    this.name = name;
    this.size = size;
    this.csvPath = `data/${size}/${name}.csv`;

    this.dateMin = undefined;  // TODO
    this.dateMax = undefined;

    // Get raw CSV content
    let txt = undefined;
    let rawFile = new XMLHttpRequest();
    rawFile.open('GET', this.csvPath, false);
    rawFile.onreadystatechange = function () {
      if (rawFile.readyState === 4) {
        if (rawFile.status === 200 || rawFile.status == 0) {
          txt = rawFile.responseText;
        }
      }
    }
    rawFile.send(null);

    //Extract rows
    this.rows = txt.split('\n');
  }
}

class Interpolator {
  constructor(name) {
    this.name = name;

    this.smallDatabase = new Database(name, 'small');

    this.lon1 = undefined;
    this.lon2 = undefined;
    this.date1 = undefined;
    this.date2 = undefined;
    this.span = undefined;
  }

  updateDates(date) {
    let nextIndex = -1;

    this.smallDatabase.rows.some(function(row) {
      nextIndex += 1;
      if (nextIndex === 0) { return false; }
      return Date.UTC(
        parseInt(row.slice(0, 4)),  // year
        parseInt(row.slice(5, 7)) - 1,  // month
        parseInt(row.slice(8, 10))  // day
      ) > date;  // Exit loop when (row date > required date)
    });

    let row1 = this.smallDatabase.rows[nextIndex - 1];
    this.lon1 = parseFloat(row1.split(',')[1]);  // Ecliptic longitude
    this.date1 = Date.UTC(
      parseInt(row1.slice(0, 4)),  // year
      parseInt(row1.slice(5, 7)) - 1,  // month
      parseInt(row1.slice(8, 10))  // day
    );

    let row2 = this.smallDatabase.rows[nextIndex];
    this.lon2 = parseFloat(row2.split(',')[1]);  // Ecliptic longitude
    this.date2 = Date.UTC(
      parseInt(row2.slice(0, 4)),  // year
      parseInt(row2.slice(5, 7)) - 1,  // month
      parseInt(row2.slice(8, 10))  // day
    );

    if (this.lon1 - this.lon2 > Math.PI) {
      this.lon2 += 2 * Math.PI;
    } else if (this.lon2 - this.lon1 > Math.PI) {
      this.lon1 += 2 * Math.PI;
    }

    this.span = this.date2 - this.date1;
  }

  longitude(date) {
    if (this.date1 == undefined || date < this.date1 || date > this.date2) {
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

function drawHand(color, angle) {
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(350 * Math.cos(angle), 350 * Math.sin(angle));
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

  UTCDate = new Date(date);
  hours = UTCDate.getUTCHours();
  minutes = UTCDate.getUTCMinutes();
  seconds = UTCDate.getUTCSeconds();

  angle = sunLongitude - Math.PI * (seconds + 60 * minutes + 3600 * hours) / 43200 + Math.PI;
  ctx.rotate(angle);
  ctx.drawImage(earth, -150, -150, 300, 300);
  ctx.rotate(-angle);
}

let offset = 0;
let speed = 1;
let date = undefined;

function setSpeed(x) {
  return function() {
    speed = x;
    offset = date - speed * Date.now();
  };
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
txtDate.oninput = function() {
  speed = 1;
  offset = txtDate.valueAsNumber - speed * Date.now();
};
BNow.onclick = function() {
  offset = Date.now() * (1 - speed);
};

function updateClock() {
  date = offset + speed * Date.now();
  txtDate.valueAsNumber = date;

  ctx.clearRect(-400, -400, 800, 800);
  drawDisk('black', 380, alpha=0.6);

  ctx.lineCap = 'round';
  sunLongitude = sun.longitude(date);
  drawHand(plColors.sun, sunLongitude);
  if (Math.abs(speed) < 10000000) {
    drawHand(plColors.moon, moon.longitude(date));
  }
  drawHand(plColors.mercury, mercury.longitude(date));
  drawHand(plColors.venus, venus.longitude(date));
  drawHand(plColors.mars, mars.longitude(date));
  drawHand(plColors.jupiter, jupiter.longitude(date));
  drawHand(plColors.saturn, saturn.longitude(date));

  drawEarth(date, sunLongitude);
}

updateClock();
setInterval(updateClock, 1000 / 50);
