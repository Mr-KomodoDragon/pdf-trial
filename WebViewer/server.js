const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const opn = require('opn');
const os = require('os');

const app = express();

const options = process.argv.reduce((acc, arg) => {
  const pair = arg.split('=');
  if (pair.length === 2) {
    acc[pair[0]] = pair[1];
  }
  return acc;
}, {});

const handleAnnotation = (req, res, handler) => {
  const dir = path.resolve(__dirname, 'annotations');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  handler(dir);
  res.end();
};

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        addresses.push({
          name,
          address: interface.address,
          priority: getPriority(name, interface.address)
        });
      }
    }
  }

  if (addresses.length === 0) {
    return '127.0.0.1';
  }

  addresses.sort((a, b) => b.priority - a.priority);
  return addresses[0].address;
}

function getPriority(interfaceName, address) {
  if (interfaceName.startsWith('en') || interfaceName.startsWith('eth')) {
    return 100;
  }

  if (interfaceName.includes('vpn') || interfaceName.includes('tun') || interfaceName.includes('tap')) {
    return 10;
  }

  if (interfaceName.includes('docker') || interfaceName.includes('veth') || address.startsWith('172.17.')) {
    return 5;
  }

  if (address.startsWith('192.168.') || address.startsWith('10.')) {
    return 80;
  }

  return 50; // default priority
}

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/annotations', (req, res) => {
  handleAnnotation(req, res, (dir) => {
    const xfdfFile = (req.query.did) ? path.resolve(dir, `${req.query.did}.xfdf`) : path.resolve(dir, 'default.xfdf');
    if (fs.existsSync(xfdfFile)) {
      res.header('Content-Type', 'text/xml');
      res.send(fs.readFileSync(xfdfFile));
    } else {
      res.status(204);
    }
  });
});

app.post('/annotations', (req, res) => {
  handleAnnotation(req, res, (dir) => {
    const xfdfFile = (req.body.did) ? path.resolve(dir, `${req.body.did}.xfdf`) : path.resolve(dir, 'default.xfdf');
    try {
      res.send(fs.writeFileSync(xfdfFile, req.body.data));
    } catch (e) {
      res.status(500);
    }
  });
  res.end();
});

app.get('/ip', (req, res) => {
  res.send(getLocalIPAddress());
});

app.get('/', (req, res) => {
  res.redirect('/samples');
});

app.get(/\/samples(.*)(\/|\.html)$/, (req, res, next) => {
  if (req.query.key || !options.key) {
    next();
  } else if (req.originalUrl.slice(-10) === 'index.html') {
    res.redirect(`${req.originalUrl}?key=${options.key}`);
  } else {
    res.redirect(`./index.html?key=${options.key}`);
  }
});

app.use(express.static(path.resolve(__dirname), {
  setHeaders: (res) => {
    let csp = '';
    // Check if the query parameter `use-csp` exists in the request URL
    if (res.req.query['use-csp'] === 'true') {
      // Add the desired header when `use-csp` is present
      csp += "script-src 'self' 'wasm-unsafe-eval' blob:; font-src 'self' data: blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://www.pdftron.com/ https://pws-collect.pdftron.com/ https://proxy.pdftron.com/ https://pdftron.s3.amazonaws.com/;";
    }
    if (res.req.query['use-trusted-types'] === 'true') {
      csp += "require-trusted-types-for 'script'; trusted-types webviewer;";
    }
    if (csp) {
      res.set('Content-Security-Policy', csp);
    }
    res.set('Service-Worker-Allowed', '/');
  },
}));

app.listen(3000, '0.0.0.0', (err) => {
  if (err) {
    console.error(err);
  } else {
    console.info(`Listening at localhost:3000 (http://${getLocalIPAddress()}:3000)`);
    if (process.argv[2] === 'samples') {
      opn('http://localhost:3000/samples');
    } else if (process.argv[2] === 'doc') {
      opn('http://localhost:3000/doc/WebViewerInstance.html');
    }
  }
});