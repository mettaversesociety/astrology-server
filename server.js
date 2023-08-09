const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/astro', async (req, res) => {
  const birthDateTime = new Date(req.body.birthDate + 'T' + req.body.birthTime + 'Z');
  const birthLocation = req.body.birthLocation;

  // Rest of the code...

});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
